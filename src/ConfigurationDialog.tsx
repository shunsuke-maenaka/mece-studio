import { useState } from 'react'
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Paper, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import LayersOutlined from '@mui/icons-material/LayersOutlined'
import { combinationCount, makeAxis, pruneEvaluations } from './model'
import { projectSchema } from './schema'
import type { Project } from './schema'

function AxisFields({ index }: { index: number }) {
  const { control } = useFormContext<Project>()
  const options = useFieldArray({ control, name: `axes.${index}.options` })
  return <Paper variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Chip label={`第${index + 1}階層`} color="primary" variant="outlined" />
      <Controller control={control} name={`axes.${index}.name`} render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label="分類軸の名前" error={!!fieldState.error} helperText={fieldState.error?.message} />} />
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
      {options.fields.map((option, optionIndex) => <Stack direction="row" key={option.id} sx={{ alignItems: 'flex-start' }}>
        <Controller control={control} name={`axes.${index}.options.${optionIndex}.label`} render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label={`項目 ${optionIndex + 1}`} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
        <IconButton disabled={options.fields.length <= 2} aria-label={`第${index + 1}階層の項目 ${optionIndex + 1} を削除`} onClick={() => options.remove(optionIndex)}><DeleteOutlineRounded fontSize="small" /></IconButton>
      </Stack>)}
    </Box>
    <Button startIcon={<AddRounded />} size="small" disabled={options.fields.length >= 8} onClick={() => options.append({ id: crypto.randomUUID(), label: '' })} sx={{ alignSelf: 'flex-start' }}>項目を追加</Button>
    <Controller control={control} name={`axes.${index}.basis`} render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label="分類基準・境界の定義" placeholder="例：従業員50人未満／50人以上。不明な場合の扱いも定義します。" multiline minRows={2} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
  </Stack></Paper>
}

export default function ConfigurationDialog({ project, initialTab, onClose, onSave }: {
  project: Project; initialTab: number; onClose: () => void; onSave: (project: Project) => void
}) {
  const [tab, setTab] = useState(initialTab)
  const form = useForm<Project>({ resolver: zodResolver(projectSchema), defaultValues: project, mode: 'onChange' })
  const axes = useFieldArray({ control: form.control, name: 'axes' })
  const stages = useFieldArray({ control: form.control, name: 'stages' })
  const draft = useWatch({ control: form.control, defaultValue: project }) as Project
  const validation = projectSchema.safeParse(draft)
  const count = combinationCount(draft.axes)
  const lost = validation.success ? Object.keys(project.evaluations).length - Object.keys(pruneEvaluations(validation.data).evaluations).length : 0

  return <Dialog open onClose={onClose} maxWidth="md" aria-labelledby="configuration-title">
    <FormProvider {...form}>
      <Box component="form" noValidate onSubmit={form.handleSubmit(data => onSave(pruneEvaluations(data)))} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DialogTitle id="configuration-title"><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><LayersOutlined color="primary" /><Typography variant="h6" component="span">分析の設定</Typography></Stack><IconButton aria-label="設定を閉じる" onClick={onClose}><CloseRounded /></IconButton></Stack></DialogTitle>
        <Tabs value={tab} onChange={(_, value: number) => setTab(value)} aria-label="設定項目" sx={{ px: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}><Tab label="基本情報" /><Tab label="分類軸" /><Tab label="バリューチェーン" /></Tabs>
        <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
          {tab === 0 && <Stack spacing={3}>
            <Controller control={form.control} name="name" render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label="分析名" error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Controller control={form.control} name="scope" render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label="対象市場・顧客の範囲" multiline minRows={3} error={!!fieldState.error} helperText={fieldState.error?.message ?? '誰を分類するかを先に定めると、漏れや重複を確認しやすくなります。'} />} />
          </Stack>}
          {tab === 1 && <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Box><Typography variant="subtitle2" gutterBottom>分類の階層数</Typography><Typography variant="body2" color="text.secondary">各階層の項目を掛け合わせ、すべての組み合わせを作ります。</Typography></Box>
              <ToggleButtonGroup size="small" exclusive value={axes.fields.length} aria-label="分類の階層数" onChange={(_, value: number | null) => {
                if (value === null) return
                if (value < axes.fields.length) axes.remove(Array.from({ length: axes.fields.length - value }, (_, index) => value + index))
                if (value > axes.fields.length) axes.append(Array.from({ length: value - axes.fields.length }, (_, index) => makeAxis(axes.fields.length + index + 1)))
              }}>{[2, 3, 4, 5].map(value => <ToggleButton key={value} value={value} aria-label={`${value}階層`} sx={{ px: 2 }}>{value}</ToggleButton>)}</ToggleButtonGroup>
            </Stack>
            {axes.fields.map((axis, index) => <AxisFields index={index} key={axis.id} />)}
            <Alert severity="info">{draft.axes.map(axis => axis.options.length).join(' × ')} = {count.toLocaleString()}セグメント。各階層が2項目なら、5階層で32セグメントになります。</Alert>
          </Stack>}
          {tab === 2 && <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">顧客の業務や行動を、左から右に並べます。最大12工程まで設定できます。</Typography>
            {stages.fields.map((stage, index) => <Stack direction="row" key={stage.id} spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 24, pt: 1 }}>{String(index + 1).padStart(2, '0')}</Typography>
              <Controller control={form.control} name={`stages.${index}.name`} render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label={`工程 ${index + 1}`} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
              <IconButton aria-label={`工程 ${index + 1} を削除`} disabled={stages.fields.length <= 1} onClick={() => stages.remove(index)}><DeleteOutlineRounded /></IconButton>
            </Stack>)}
            <Button startIcon={<AddRounded />} disabled={stages.fields.length >= 12} sx={{ alignSelf: 'flex-start' }} onClick={() => stages.append({ id: crypto.randomUUID(), name: '' })}>工程を追加</Button>
          </Stack>}
          {!validation.success && <Alert severity="error" sx={{ mt: 2 }}>{[...new Set(validation.error.issues.map(issue => issue.message))].map(message => <Box key={message}>{message}</Box>)}</Alert>}
          {lost > 0 && <Alert severity="warning" sx={{ mt: 2 }}>この変更により、削除・再構成されるセグメントや工程の評価・メモが{lost}件削除されます。必要な場合は、先にJSONで保存してください。</Alert>}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}><Button color="inherit" onClick={onClose}>キャンセル</Button><Button type="submit" variant="contained" disabled={!validation.success}>設定を反映</Button></DialogActions>
      </Box>
    </FormProvider>
  </Dialog>
}
