import { z } from 'zod'

z.config(z.locales.ja())

export const MAX_SEGMENTS = 4096
export const normalize = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('ja')
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/, '項目IDの形式が正しくありません。')
const labelSchema = z.string().trim().min(1, '入力してください。').max(100, '100文字以内で入力してください。')

export const optionSchema = z.object({ id: idSchema, label: labelSchema })
export const axisSchema = z.object({
  id: idSchema,
  name: labelSchema,
  basis: z.string().max(500, '分類基準は500文字以内で入力してください。'),
  options: z.array(optionSchema).min(2, '各階層には2項目以上必要です。').max(8, '各階層は8項目までです。')
    .refine(options => new Set(options.map(option => normalize(option.label))).size === options.length, '同じ階層の項目名が重複しています。'),
})
export const stageSchema = z.object({ id: idSchema, name: labelSchema })
export const evaluationSchema = z.object({
  priority: z.enum(['', 'high', 'medium', 'low']),
  note: z.string().max(2000, 'メモは2,000文字以内で入力してください。'),
})
export const projectSchema = z.object({
  version: z.literal(1),
  name: labelSchema,
  scope: z.string().trim().min(1, '対象市場を入力してください。').max(500, '対象市場は500文字以内で入力してください。'),
  axes: z.array(axisSchema).min(2, '分類軸は2階層以上必要です。').max(5, '分類軸は5階層までです。')
    .refine(axes => new Set(axes.map(axis => normalize(axis.name))).size === axes.length, '分類軸の名前が重複しています。')
    .refine(axes => axes.reduce((count, axis) => count * axis.options.length, 1) <= MAX_SEGMENTS, `組み合わせは${MAX_SEGMENTS.toLocaleString()}件以内にしてください。`),
  stages: z.array(stageSchema).min(1, '工程を1つ以上設定してください。').max(12, '工程は12個までです。')
    .refine(stages => new Set(stages.map(stage => normalize(stage.name))).size === stages.length, 'バリューチェーンの工程名が重複しています。'),
  evaluations: z.record(z.string().regex(/^[a-zA-Z0-9_/-]+::[a-zA-Z0-9_-]+$/), evaluationSchema),
  sample: z.boolean(),
}).refine(project => {
  const ids = [...project.axes.flatMap(axis => [axis.id, ...axis.options.map(option => option.id)]), ...project.stages.map(stage => stage.id)]
  return new Set(ids).size === ids.length
}, 'ファイル内の項目IDが重複しています。')

export const importFileSchema = z.file().max(5 * 1024 * 1024, '5MB以下のJSONファイルを選んでください。')

export type Option = z.infer<typeof optionSchema>
export type Axis = z.infer<typeof axisSchema>
export type Stage = z.infer<typeof stageSchema>
export type Evaluation = z.infer<typeof evaluationSchema>
export type Priority = Evaluation['priority']
export type Project = z.infer<typeof projectSchema>
