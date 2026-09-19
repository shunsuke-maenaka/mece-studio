import assert from 'node:assert/strict'
import Papa from 'papaparse'
import { generateSample } from './generate-sample.mjs'
import { cellKey, csv, makeAxis, makeProject, parseProject, pruneEvaluations, segments } from '../src/model.ts'
import { evaluationSchema, projectSchema } from '../src/schema.ts'

for (const levels of [2, 3, 4, 5]) {
  const project = generateSample(levels)
  assert.equal(segments(project.axes).length, 2 ** levels)
  assert.equal(new Set(segments(project.axes).map(row => row.id)).size, 2 ** levels)
  assert.deepEqual(parseProject(JSON.stringify(project)), project)
  assert.deepEqual(generateSample(levels), project, 'Mock generation must be reproducible')
}

const project = makeProject()
assert.equal(segments(project.axes).length, 8)
assert.equal(projectSchema.safeParse(project).success, true)
assert.equal(evaluationSchema.safeParse({ priority: [], note: '' }).success, false)
assert.equal(evaluationSchema.safeParse({ priority: 'high', note: 'a'.repeat(2001) }).success, false)
const duplicate = structuredClone(project)
duplicate.axes[0].options[1].label = ` ${duplicate.axes[0].options[0].label} `
assert.equal(projectSchema.safeParse(duplicate).success, false)
const normalizedDuplicate = structuredClone(project)
normalizedDuplicate.axes[0].options[0].label = 'A'
normalizedDuplicate.axes[0].options[1].label = 'Ａ'
assert.equal(projectSchema.safeParse(normalizedDuplicate).success, false)
assert.equal(projectSchema.safeParse({ ...project, axes: [project.axes[0]] }).success, false)
assert.equal(projectSchema.safeParse({ ...project, axes: Array.from({ length: 6 }, (_, i) => makeAxis(i + 1)) }).success, false)
const excessive = { ...project, axes: Array.from({ length: 5 }, (_, i) => ({ ...makeAxis(i + 1), options: Array.from({ length: 8 }, (_, j) => ({ id: `option-${i}-${j}`, label: `項目 ${j}` })) })) }
assert.equal(projectSchema.safeParse(excessive).success, false)
const sixtyFour = { ...project, axes: Array.from({ length: 5 }, (_, i) => makeAxis(i + 1)) }
sixtyFour.axes[4].options.push({ id: 'third', label: 'C' }, { id: 'fourth', label: 'D' })
assert.equal(segments(sixtyFour.axes).length, 64)

const renamed = structuredClone(project)
renamed.axes[0].options[0].label = '自由診療'
assert.deepEqual(pruneEvaluations(renamed).evaluations, project.evaluations, 'Renaming must preserve cell data')
const reduced = { ...project, stages: project.stages.slice(1) }
assert.equal(Object.keys(pruneEvaluations(reduced).evaluations).length, 10)
assert.equal(Object.keys(pruneEvaluations({ ...project, axes: project.axes.slice(0, 2) }).evaluations).length, 0)
assert.throws(() => parseProject('{broken'))
assert.throws(() => parseProject(JSON.stringify({ ...project, version: 2 })))

const row = segments(project.axes)[0]
const special = '日本語,"引用"\n次の行'
project.evaluations[cellKey(row.id, project.stages[0].id)] = { priority: 'high', note: special }
project.evaluations[cellKey(row.id, project.stages[1].id)] = { priority: '', note: ' =HYPERLINK("https://example.com")' }
const output = csv(project)
assert.equal(output.charCodeAt(0), 0xFEFF)
const parsed = Papa.parse(output)
assert.deepEqual(parsed.errors, [])
assert.equal(parsed.data.length, 9)
assert.ok(parsed.data.every(line => line.length === 17))
assert.equal(parsed.data[1][3], '高')
assert.equal(parsed.data[1][4], special)
assert.equal(parsed.data[1][6], '\' =HYPERLINK("https://example.com")')
process.stdout.write('OK: 2–5 levels, 64 combinations, schema validation, seeded mocks, data retention, JSON and CSV round trips.\n')
