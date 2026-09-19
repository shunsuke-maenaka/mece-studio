import Papa from 'papaparse'
import { projectSchema } from './schema.ts'
import type { Axis, Option, Priority, Project } from './schema.ts'
export type { Axis, Option, Priority, Project, Evaluation, Stage } from './schema.ts'
export { MAX_SEGMENTS, normalize } from './schema.ts'

export type Segment = { id: string; options: Option[] }

export const STORAGE_KEY = 'mece-studio-project-v1'
export const priorities = {
  high: { label: '高', color: 'success' },
  medium: { label: '中', color: 'warning' },
  low: { label: '低', color: 'default' },
} as const

export function segments(axes: Axis[]): Segment[] {
  return axes.reduce<Segment[]>((rows, axis) => rows.flatMap(row =>
    axis.options.map(option => ({ id: [row.id, option.id].filter(Boolean).join('/'), options: [...row.options, option] })),
  ), [{ id: '', options: [] }])
}

export const cellKey = (segmentId: string, stageId: string) => `${segmentId}::${stageId}`
export const combinationCount = (axes: Axis[]) => axes.reduce((count, axis) => count * axis.options.length, 1)

export function pruneEvaluations(project: Project): Project {
  const rows = new Set(segments(project.axes).map(row => row.id))
  const stages = new Set(project.stages.map(stage => stage.id))
  return { ...project, evaluations: Object.fromEntries(Object.entries(project.evaluations).filter(([key]) => {
    const [row, stage] = key.split('::')
    return rows.has(row) && stages.has(stage)
  })) }
}

export function parseProject(text: string): Project {
  const result = projectSchema.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(result.error.issues.map(issue => issue.message).join(' / '))
  return pruneEvaluations(result.data)
}

export function csv(project: Project, rows = segments(project.axes)): string {
  const header = [...project.axes.map(axis => axis.name), ...project.stages.flatMap(stage => [`${stage.name}：優先度`, `${stage.name}：メモ`])]
  const body = rows.map(row => [...row.options.map(option => option.label), ...project.stages.flatMap(stage => {
    const evaluation = project.evaluations[cellKey(row.id, stage.id)]
    return [evaluation?.priority ? priorities[evaluation.priority].label : '', evaluation?.note ?? '']
  })])
  return '\uFEFF' + Papa.unparse([header, ...body], { quotes: true, newline: '\r\n', escapeFormulae: /^[\s]*[=+@-]|^[\t\r\n]/ })
}

export function makeAxis(level: number): Axis {
  return { id: crypto.randomUUID(), name: `分類軸 ${level}`, basis: '', options: ['項目 A', '項目 B'].map(label => ({ id: crypto.randomUUID(), label })) }
}

export function makeProject(sample = true): Project {
  const axes: Axis[] = [
    { id: 'treatment', name: '診療領域', basis: '診療売上に占める自費治療の割合が50%以上なら自費治療、50%未満なら保険治療。', options: [{ id: 'private', label: '自費治療' }, { id: 'insurance', label: '保険治療' }] },
    { id: 'business', name: '経営形態', basis: '運営拠点が1院なら個人経営、2院以上ならチェーンとして分類。', options: [{ id: 'individual', label: '個人経営' }, { id: 'chain', label: 'チェーン' }] },
    { id: 'direction', name: '経営方針', basis: '今後1年以内に拠点・診療枠を増やす計画があれば拡大志向、それ以外（縮小を含む）は現状維持に分類。', options: [{ id: 'growth', label: '拡大志向' }, { id: 'maintain', label: '現状維持' }] },
  ]
  const project: Project = {
    version: 1,
    name: sample ? '歯科クリニックの市場分析' : '新しい市場分析',
    scope: sample ? '国内の歯科クリニック（経営方針を確認できる事業者）' : '分析する市場・顧客の範囲を入力してください',
    axes: sample ? axes : [makeAxis(1), makeAxis(2)],
    stages: (sample ? ['集客', '予約管理', 'ドタキャン対応', '患者管理', '患者定着化', '事務処理', '人事労務'] : ['認知', '検討', '購入', '継続']).map((name, index) => ({ id: `stage-${index}`, name })),
    evaluations: {},
    sample,
  }
  if (sample) {
    const samples: [number, number, Priority][] = [[0, 0, 'high'], [0, 1, 'medium'], [0, 4, 'high'], [1, 3, 'low'], [1, 4, 'medium'], [2, 0, 'high'], [2, 5, 'medium'], [3, 6, 'low'], [4, 1, 'medium'], [4, 2, 'high'], [6, 6, 'medium'], [7, 5, 'low']]
    const rows = segments(project.axes)
    samples.forEach(([row, column, priority]) => {
      project.evaluations[cellKey(rows[row].id, project.stages[column].id)] = { priority, note: row === 0 && column === 0 ? '新規患者の獲得に課題があるか、ヒアリングで確認する。（サンプル）' : '' }
    })
  }
  return projectSchema.parse(project)
}
