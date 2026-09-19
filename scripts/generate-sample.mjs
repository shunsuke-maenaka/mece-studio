import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { faker } from '@faker-js/faker'
import { fake, setFaker, seed } from 'zod-schema-faker/v4'
import { axisSchema, evaluationSchema, optionSchema, projectSchema, stageSchema } from '../src/schema.ts'
import { cellKey, segments } from '../src/model.ts'

setFaker(faker)

export function generateSample(levels = 5) {
  seed(20260919 + levels)
  const schema = projectSchema.safeExtend({
    axes: z.array(axisSchema.safeExtend({ options: z.array(optionSchema).length(2) })).length(levels),
    stages: z.array(stageSchema).length(7),
    evaluations: z.object({}),
    sample: z.literal(true),
  })
  const project = projectSchema.parse(fake(schema))
  const row = segments(project.axes)[0]
  project.evaluations[cellKey(row.id, project.stages[0].id)] = fake(evaluationSchema)
  return projectSchema.parse(project)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(generateSample(), null, 2) + '\n')
}
