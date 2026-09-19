import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { evaluationSchema } from './schema'
import type { Evaluation, Stage } from './schema'
import type { Segment } from './model'

export default function EvaluationDialog({ row, stage, value, onClose, onSave }: {
  row: Segment; stage: Stage; value: Evaluation; onClose: () => void; onSave: (value: Evaluation) => void
}) {
  const { control, handleSubmit } = useForm<Evaluation>({ resolver: zodResolver(evaluationSchema), defaultValues: value, mode: 'onChange' })
  const note = useWatch({ control, name: 'note' })
  return <Dialog open onClose={onClose} maxWidth="sm" aria-labelledby="evaluation-title">
    <Box component="form" noValidate onSubmit={handleSubmit(onSave)} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DialogTitle id="evaluation-title"><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6" component="span">機会の評価</Typography><IconButton aria-label="評価を閉じる" onClick={onClose}><CloseRounded /></IconButton></Stack></DialogTitle>
      <DialogContent><Stack spacing={3}>
        <Box><Typography variant="caption" color="text.secondary">顧客セグメント</Typography><Typography variant="subtitle2" sx={{ mt: 0.5 }}>{row.options.map(option => option.label).join(' / ')}</Typography><Chip label={stage.name} color="primary" variant="outlined" sx={{ mt: 1.5 }} /></Box>
        <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>優先度</Typography><Controller control={control} name="priority" render={({ field }) => <ToggleButtonGroup exclusive value={field.value} aria-label="機会の優先度" onChange={(_, next) => { if (next !== null) field.onChange(next) }} onBlur={field.onBlur} fullWidth size="small"><ToggleButton value="">未評価</ToggleButton><ToggleButton value="high">高</ToggleButton><ToggleButton value="medium">中</ToggleButton><ToggleButton value="low">低</ToggleButton></ToggleButtonGroup>} /></Box>
        <Controller control={control} name="note" render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref} label="課題・仮説のメモ" multiline minRows={4} placeholder="顧客の困りごと、検証したい仮説などを記録しましょう。" error={!!fieldState.error} helperText={fieldState.error?.message ?? `${note.length} / 2,000文字`} />} />
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button color="inherit" onClick={onClose}>キャンセル</Button><Button type="submit" variant="contained" startIcon={<CheckRounded />}>保存する</Button></DialogActions>
    </Box>
  </Dialog>
}
