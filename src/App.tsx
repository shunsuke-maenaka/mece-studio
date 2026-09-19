import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Alert, Avatar, Box, Breadcrumbs, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, FormControl, FormControlLabel, IconButton, InputAdornment, InputLabel,
  LinearProgress, List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Radio, RadioGroup,
  Select, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined'
import GridViewRounded from '@mui/icons-material/GridViewRounded'
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import LayersOutlined from '@mui/icons-material/LayersOutlined'
import MenuRounded from '@mui/icons-material/MenuRounded'
import NotesRounded from '@mui/icons-material/NotesRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import TableRowsRounded from '@mui/icons-material/TableRowsRounded'
import TrackChangesRounded from '@mui/icons-material/TrackChangesRounded'
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined'
import ConfigurationDialog from './ConfigurationDialog'
import EvaluationDialog from './EvaluationDialog'
import { importFileSchema } from './schema'
import { cellKey, csv, makeProject, normalize, parseProject, priorities, segments, STORAGE_KEY } from './model'
import type { Evaluation, Priority, Project, Segment, Stage } from './model'

function loadProject() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return { project: saved ? parseProject(saved) : makeProject(), error: '' }
  } catch {
    return { project: makeProject(), error: '保存データを読み込めないため、自動保存を停止しました。元のデータは上書きされません。編集内容はCSV・JSONで保存できます。' }
  }
}

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename.replace(/[\\/:*?"<>|]/g, '_')
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function PriorityChip({ priority }: { priority: Priority }) {
  if (!priority) return <Typography component="span" color="text.disabled">—</Typography>
  const item = priorities[priority]
  return <Chip label={item.label} color={item.color} sx={{ minWidth: 48, height: 24, borderRadius: 1, fontWeight: 600,
    bgcolor: priority === 'high' ? 'success.light' : priority === 'medium' ? 'warning.light' : '#f0f2f1',
    color: priority === 'high' ? 'success.main' : priority === 'medium' ? 'warning.main' : 'text.secondary' }} />
}

function App() {
  const [initial] = useState(loadProject)
  const [project, setProject] = useState(initial.project)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error'>('saved')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(16)
  const [configuration, setConfiguration] = useState<number | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [help, setHelp] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')
  const [newOpen, setNewOpen] = useState(false)
  const [imported, setImported] = useState<Project | null>(null)
  const [toast, setToast] = useState('')
  const [fileError, setFileError] = useState('')
  const [editing, setEditing] = useState<{ row: Segment; stage: Stage; value: Evaluation } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function updateProject(next: Project) {
    setProject(next)
    if (!initial.error) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSaveStatus('saved') }
      catch { setSaveStatus('error') }
    }
  }

  const rows = segments(project.axes)
  const cellCount = rows.length * project.stages.length
  const scored = Object.values(project.evaluations).filter(value => value.priority).length
  const highCount = Object.values(project.evaluations).filter(value => value.priority === 'high').length
  const search = normalize(query)
  const filtered = rows.filter(row => {
    const values = project.stages.map(stage => project.evaluations[cellKey(row.id, stage.id)])
    const matchesSearch = !search || normalize([...row.options.map(option => option.label), ...values.map(value => value?.note ?? '')].join(' ')).includes(search)
    const matchesFilter = filter === 'all' || (filter === 'empty' ? values.some(value => !value?.priority) : values.some(value => value?.priority === filter))
    return matchesSearch && matchesFilter
  })
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const visibleRows = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const openConfiguration = (tab = 1) => { setConfiguration(tab); setDrawer(false) }
  const exportProject = () => {
    if (exportFormat === 'csv') download(csv(project), `${project.name}.csv`, 'text/csv;charset=utf-8')
    else download(JSON.stringify(project, null, 2), `${project.name}.json`, 'application/json;charset=utf-8')
    setExportOpen(false)
    setToast(`${exportFormat.toUpperCase()}ファイルを出力しました`)
  }
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const validation = importFileSchema.safeParse(file)
      if (!validation.success) throw new Error(validation.error.issues[0].message)
      setImported(parseProject(await file.text()))
      setFileError('')
    } catch (error) { setFileError(error instanceof Error ? error.message : 'ファイルを読み込めませんでした。') }
  }

  const navigation = <Stack sx={{ height: '100%', p: 2.5 }}>
    <Stack direction="row" spacing={1.2} sx={{alignItems: "center",  px: 0.5, pt: 1, pb: 4 }}>
      <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 35, height: 35 }}><AccountTreeRounded sx={{ fontSize: 22 }} /></Avatar>
      <Typography variant="h6" sx={{ fontSize: 19, letterSpacing: '-0.5px' }}>MECE <Box component="span" sx={{ fontWeight: 400 }}>Studio</Box></Typography>
    </Stack>
    <Button variant="outlined" startIcon={<AddRounded />} color="primary" onClick={() => { setNewOpen(true); setDrawer(false) }} sx={{ bgcolor: 'background.paper', mb: 4 }}>新しい分析</Button>
    <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontSize: 10 }}>WORKSPACE</Typography>
    <List sx={{ mx: -1 }}>
      <ListItemButton selected onClick={() => { setDrawer(false); setView(0) }} sx={{ borderRadius: 1, mb: 0.5 }}><ListItemIcon sx={{ minWidth: 35, color: 'primary.main' }}><GridViewRounded fontSize="small" /></ListItemIcon><ListItemText primary="分析マトリクス" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 13, color: 'primary.main' } } }} /></ListItemButton>
      <ListItemButton onClick={() => openConfiguration()} sx={{ borderRadius: 1, mb: 0.5 }}><ListItemIcon sx={{ minWidth: 35 }}><AccountTreeRounded fontSize="small" /></ListItemIcon><ListItemText primary="分類軸の設定" slotProps={{ primary: { sx: { fontSize: 13 } } }} /></ListItemButton>
      <ListItemButton onClick={() => { setExportOpen(true); setDrawer(false) }} sx={{ borderRadius: 1 }}><ListItemIcon sx={{ minWidth: 35 }}><DownloadRounded fontSize="small" /></ListItemIcon><ListItemText primary="データの出力" slotProps={{ primary: { sx: { fontSize: 13 } } }} /></ListItemButton>
    </List>
    <Divider sx={{ my: 3 }} />
    <Typography variant="overline" color="text.secondary" sx={{ px: 1, mb: 1, fontSize: 10 }}>CURRENT PROJECT</Typography>
    <Stack direction="row" spacing={1} sx={{alignItems: "flex-start",  px: 1 }}><Box sx={{ mt: 0.9, bgcolor: 'primary.main', width: 6, height: 6, borderRadius: '50%', flexShrink: 0 }} /><Typography variant="caption" sx={{ lineHeight: 1.9, overflowWrap: 'anywhere' }}>{project.name}</Typography></Stack>
    <Box sx={{ flexGrow: 1, minHeight: 60 }} />
    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f4f8f5', mb: 2.5 }}>
      <Stack direction="row" spacing={0.7} sx={{alignItems: "center",  mb: 1 }}><WorkspacePremiumOutlined color="primary" fontSize="small" /><Typography variant="subtitle2" sx={{ fontSize: 12 }}>小さく分けて、全体を見る。</Typography></Stack>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.9, display: 'block' }}>漏れなく、重複なく。<br />市場の可能性を整理しましょう。</Typography>
      <Button size="small" endIcon={<ArrowOutwardRounded />} onClick={() => setHelp(true)} sx={{ px: 0, mt: 1, fontSize: 11 }}>MECE分類のヒント</Button>
    </Paper>
    <Stack direction="row" spacing={1.3} sx={{alignItems: "center",  pt: 2, borderTop: 1, borderColor: 'divider' }}><Avatar sx={{ width: 32, height: 32, bgcolor: '#e9eee9', color: 'primary.dark', fontSize: 12 }}>MY</Avatar><Box><Typography variant="caption" sx={{ fontWeight: 600 }}>マイワークスペース</Typography><Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10 }}>このブラウザに保存</Typography></Box></Stack>
  </Stack>

  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <Box component="nav" aria-label="メインナビゲーション" sx={{ width: 224, flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
      <Box sx={{ position: 'fixed', top: 0, bottom: 0, width: 224, borderRight: 1, borderColor: 'divider', bgcolor: '#fbfcfb', overflowY: 'auto' }}>{navigation}</Box>
    </Box>
    <Drawer open={drawer} onClose={() => setDrawer(false)} sx={{ '& .MuiDrawer-paper': { width: 244 } }}>{navigation}</Drawer>
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Stack component="header" direction="row" sx={{alignItems: "center", justifyContent: "space-between",  height: 70, px: { xs: 2, md: 4 }, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton aria-label="メニューを開く" onClick={() => setDrawer(true)} sx={{ display: { lg: 'none' } }}><MenuRounded /></IconButton>
          <Breadcrumbs separator={<ChevronRightRounded sx={{ fontSize: 15 }} />} sx={{ fontSize: 12 }}><Typography color="text.secondary" sx={{fontSize: 12,  display: { xs: 'none', sm: 'block' } }}>ワークスペース</Typography><Typography sx={{ fontSize: 12 }}>セグメント分析</Typography></Breadcrumbs>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Stack direction="row" spacing={0.7} aria-live="polite" sx={{ alignItems: "center" }}><CheckCircleOutlineRounded sx={{ fontSize: 15 }} color={saveStatus === 'saved' && !initial.error ? 'success' : 'disabled'} /><Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{initial.error || saveStatus === 'error' ? '自動保存できません' : saveStatus === 'saved' ? 'このブラウザに保存済み' : '保存中…'}</Typography></Stack>
          <Divider orientation="vertical" flexItem /><Tooltip title="使い方"><IconButton aria-label="使い方" size="small" onClick={() => setHelp(true)}><HelpOutlineRounded fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </Stack>
      <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1700, mx: 'auto' }}>
        {(initial.error || saveStatus === 'error') && <Alert severity="warning" sx={{ mb: 2 }}>{initial.error || '保存領域が不足しているか、ブラウザによって保存が制限されています。CSV・JSONでダウンロードして保存してください。'}</Alert>}
        {fileError && <Alert severity="error" onClose={() => setFileError('')} sx={{ mb: 2 }}>{fileError}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2.5 }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{alignItems: "center",  mb: 1 }}><Typography variant="overline" color="primary" sx={{ fontSize: 10 }}>SEGMENT EXPLORER</Typography>{project.sample && <Chip label="サンプル" variant="outlined" sx={{ height: 20, fontSize: 10, color: 'text.secondary', borderColor: 'divider' }} />}</Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><Typography variant="h4" sx={{ overflowWrap: 'anywhere' }}>{project.name}</Typography><Tooltip title="分析名・対象市場を編集"><IconButton aria-label="分析名・対象市場を編集" size="small" onClick={() => openConfiguration(0)}><EditOutlined sx={{ fontSize: 17 }} /></IconButton></Tooltip></Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>顧客セグメントとバリューチェーンから、事業機会を見つけましょう。</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Tooltip title="JSONファイルを読み込む"><IconButton aria-label="JSONファイルを読み込む" onClick={() => fileInput.current?.click()} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', p: 1.1 }}><FileUploadOutlined fontSize="small" /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<DownloadRounded />} onClick={() => setExportOpen(true)} sx={{ px: 2.5, whiteSpace: 'nowrap' }}>CSVエクスポート</Button>
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
          {[
            { label: '顧客セグメント', value: rows.length.toLocaleString(), unit: 'セグメント', detail: `${project.axes.length}階層の分類軸から生成`, icon: <LayersOutlined />, bg: '#edf4ef' },
            { label: 'バリューチェーン', value: project.stages.length, unit: '工程', detail: '顧客の業務・行動プロセス', icon: <HubOutlined />, bg: '#edf2f5' },
            { label: '分析対象の機会', value: cellCount.toLocaleString(), unit: 'セル', detail: `優先度「高」の機会 ${highCount}件`, icon: <TrackChangesRounded />, bg: '#f7f3e9' },
          ].map(item => <Paper variant="outlined" key={item.label} sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}><Box><Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>{item.label}</Typography><Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}><Typography sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-1px' }}>{item.value}</Typography><Typography variant="caption" color="text.secondary">{item.unit}</Typography></Stack></Box><Avatar variant="rounded" sx={{ bgcolor: item.bg, color: 'primary.main', width: 40, height: 40 }}>{item.icon}</Avatar></Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{item.detail}</Typography>
          </Paper>)}
        </Box>
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
          <Stack direction="row" sx={{justifyContent: "space-between", alignItems: "center",  mb: 1 }}><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><AccountTreeRounded color="primary" fontSize="small" /><Typography variant="subtitle2">セグメントの分類軸</Typography><Chip label={`${project.axes.length}階層`} sx={{ height: 21, fontSize: 10, bgcolor: 'background.default' }} /></Stack><Button size="small" startIcon={<SettingsOutlined sx={{ fontSize: 15 }} />} onClick={() => openConfiguration()}>分類を編集</Button></Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(project.axes.length, 3)}, 1fr)`, xl: `repeat(${project.axes.length}, 1fr)` }, gap: 1.5 }}>
            {project.axes.map((axis, index) => <ButtonBase key={axis.id} onClick={() => openConfiguration()} sx={{ display: 'block', textAlign: 'left', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fcfdfc', width: '100%', '&:hover': { bgcolor: 'primary.light' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>第{index + 1}階層 {index === 0 ? ' / 大セグメント' : index === 1 ? ' / 中セグメント' : index === 2 ? ' / 小セグメント' : ''}</Typography><Typography variant="caption" color="text.disabled">{String(index + 1).padStart(2, '0')}</Typography></Stack>
              <Typography variant="subtitle2" sx={{ mt: 0.5, mb: 0.7, overflowWrap: 'anywhere' }}>{axis.name}</Typography>
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.6 }}>{axis.options.map(option => <Chip key={option.id} label={option.label} variant="outlined" sx={{ height: 24, fontSize: 11, borderColor: '#e0e7e2', bgcolor: 'background.paper', maxWidth: '100%' }} />)}</Stack>
            </ButtonBase>)}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{justifyContent: "space-between", gap: 1,  mt: 1.2 }}>
            <Stack direction="row" spacing={0.7} sx={{ alignItems: "center" }}><CheckCircleOutlineRounded sx={{ fontSize: 14 }} color="success" /><Typography variant="caption" color="text.secondary">同じ階層内の項目名に重複なし</Typography><Tooltip title="項目名の重複のみを確認しています。意味の重複や、対象市場を網羅できているかは分類基準を確認してください。"><InfoOutlined sx={{ fontSize: 13, color: 'text.disabled' }} tabIndex={0} aria-label="自動チェックの範囲" /></Tooltip></Stack>
            <Typography variant="caption" color="text.secondary">{project.axes.map(axis => axis.options.length).join(' × ')} = <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>{rows.length.toLocaleString()} セグメント</Box></Typography>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{alignItems: { sm: 'center' }, justifyContent: "space-between",  borderBottom: 1, borderColor: 'divider', px: 1 }}>
            <Tabs value={view} onChange={(_, value: number) => setView(value)} aria-label="分析の表示方法"><Tab icon={<GridViewRounded sx={{ fontSize: 17 }} />} iconPosition="start" label="マトリクス" /><Tab icon={<TableRowsRounded sx={{ fontSize: 17 }} />} iconPosition="start" label="セグメント一覧" /></Tabs>
            <Button size="small" color="secondary" endIcon={<EditOutlined sx={{ fontSize: 14 }} />} onClick={() => openConfiguration(2)} sx={{ mr: 1, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>バリューチェーンを編集</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{justifyContent: "space-between", gap: 2,  px: 2.5, py: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <TextField placeholder="セグメント・メモを検索" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} sx={{ maxWidth: 285, minWidth: 0 }} slotProps={{ htmlInput: { 'aria-label': 'セグメント・メモを検索' }, input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 19 }} /></InputAdornment>, endAdornment: query ? <InputAdornment position="end"><IconButton size="small" aria-label="検索をクリア" onClick={() => { setQuery(''); setPage(0) }}><CloseRounded fontSize="small" /></IconButton></InputAdornment> : undefined } }} />
              <FormControl size="small" sx={{ minWidth: { xs: 115, sm: 145 } }}><InputLabel id="priority-filter-label">優先度</InputLabel><Select labelId="priority-filter-label" label="優先度" value={filter} startAdornment={<FilterAltOutlined sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />} onChange={event => { setFilter(event.target.value); setPage(0) }}><MenuItem value="all">すべて</MenuItem><MenuItem value="high">高を含む</MenuItem><MenuItem value="medium">中を含む</MenuItem><MenuItem value="low">低を含む</MenuItem><MenuItem value="empty">未評価を含む</MenuItem></Select></FormControl>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>評価済み {scored} / {cellCount}</Typography><LinearProgress variant="determinate" value={scored / cellCount * 100} sx={{ width: 72, height: 5, borderRadius: 1, bgcolor: '#edf1ee' }} aria-label="評価の進捗" /></Stack>
          </Stack>
          <TableContainer sx={{ maxHeight: 650, borderTop: 1, borderColor: 'divider' }}>
            <Table size="small" stickyHeader aria-label={view === 0 ? 'セグメントとバリューチェーンの分析マトリクス' : 'セグメント一覧'} sx={{ minWidth: view === 0 ? project.axes.length * 110 + project.stages.length * 96 : 650, tableLayout: 'fixed' }}>
              <TableHead>
                {view === 0 && <TableRow>
                  <TableCell colSpan={project.axes.length} align="left" sx={{ bgcolor: '#f3f6f4', width: project.axes.length * 110, top: 0, height: 35, fontSize: 10, letterSpacing: '0.1em', px: 2.5 }}>顧客セグメント <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>↓</Box></TableCell>
                  <TableCell colSpan={project.stages.length} sx={{ bgcolor: '#eaf3ee', top: 0, height: 35, fontSize: 10, letterSpacing: '0.08em', color: 'primary.main' }}>バリューチェーン <ArrowForwardRounded sx={{ fontSize: 12, verticalAlign: 'middle', ml: 1 }} /></TableCell>
                </TableRow>}
                <TableRow>{project.axes.map((axis, index) => <TableCell key={axis.id} sx={{ bgcolor: '#f7f9f8', top: view === 0 ? 35 : 0, py: 1.7, borderRight: 1, borderColor: 'divider', fontSize: 11, overflowWrap: 'anywhere' }}><Typography variant="caption" sx={{ display: 'block', fontSize: 9, color: 'text.disabled', mb: 0.3 }}>第{index + 1}階層</Typography>{axis.name}</TableCell>)}
                  {view === 0 ? project.stages.map((stage, index) => <TableCell key={stage.id} align="center" sx={{ bgcolor: '#f4f8f5', top: 35, py: 1.7, fontSize: 11, overflowWrap: 'anywhere' }}><Typography variant="caption" sx={{ display: 'block', fontSize: 9, color: '#98afa1', mb: 0.3 }}>{String(index + 1).padStart(2, '0')}</Typography>{stage.name}</TableCell>) : <><TableCell align="center">評価済み</TableCell><TableCell align="center">優先度「高」</TableCell></>}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row, rowIndex) => <TableRow key={row.id} hover>
                  {row.options.map((option, axisIndex) => {
                    const prefix = row.options.slice(0, axisIndex + 1).map(item => item.id).join('/')
                    const samePrefix = (other: Segment) => other.options.slice(0, axisIndex + 1).map(item => item.id).join('/') === prefix
                    if (view === 0 && rowIndex > 0 && samePrefix(visibleRows[rowIndex - 1])) return null
                    let span = 1
                    if (view === 0) while (rowIndex + span < visibleRows.length && samePrefix(visibleRows[rowIndex + span])) span++
                    return <TableCell key={option.id} component="th" scope="row" rowSpan={span} sx={{ borderRight: 1, borderColor: 'divider', bgcolor: axisIndex === 0 ? '#fafcfb' : 'background.paper', color: axisIndex === 0 ? 'primary.dark' : 'text.primary', fontWeight: axisIndex === 0 ? 600 : 400, py: 1.5, fontSize: 11, overflowWrap: 'anywhere' }}>{option.label}</TableCell>
                  })}
                  {view === 0 ? project.stages.map(stage => {
                    const value = project.evaluations[cellKey(row.id, stage.id)] ?? { priority: '', note: '' }
                    return <TableCell key={stage.id} align="center" sx={{ p: 0, borderRight: 1, borderColor: '#f0f3f1' }}>
                      <Tooltip title={value.note || 'クリックして優先度・メモを編集'}><ButtonBase aria-label={`${row.options.map(option => option.label).join(' / ')}、${stage.name}：${value.priority ? priorities[value.priority].label : '未評価'}${value.note ? '、メモあり' : ''}`} onClick={() => setEditing({ row, stage, value: { ...value } })} sx={{ minHeight: 46, width: '100%', gap: 0.4, '&:hover': { bgcolor: 'primary.light' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}><PriorityChip priority={value.priority} />{value.note && <NotesRounded sx={{ fontSize: 12, color: 'text.secondary' }} />}</ButtonBase></Tooltip>
                    </TableCell>
                  }) : <><TableCell align="center">{project.stages.filter(stage => project.evaluations[cellKey(row.id, stage.id)]?.priority).length} / {project.stages.length}</TableCell><TableCell align="center">{project.stages.filter(stage => project.evaluations[cellKey(row.id, stage.id)]?.priority === 'high').length}</TableCell></>}
                </TableRow>)}
                {visibleRows.length === 0 && <TableRow><TableCell colSpan={project.axes.length + (view === 0 ? project.stages.length : 2)} sx={{ textAlign: 'center', py: 7 }}><SearchRounded color="disabled" sx={{ fontSize: 32, mb: 1 }} /><Typography variant="subtitle2">該当するセグメントがありません</Typography><Button onClick={() => { setQuery(''); setFilter('all'); setPage(0) }}>検索・絞り込みを解除</Button></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{justifyContent: "space-between", alignItems: { md: 'center' },  px: 2.5, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>{filtered.length === rows.length ? `全 ${rows.length.toLocaleString()} セグメント` : `${filtered.length.toLocaleString()} / ${rows.length.toLocaleString()} セグメント`}</Typography>
            <TablePagination component="div" count={filtered.length} page={safePage} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={event => { setPageSize(Number(event.target.value)); setPage(0) }} rowsPerPageOptions={[8, 16, 32, 64]} labelRowsPerPage="表示件数" labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`} sx={{ border: 0, '& .MuiTablePagination-toolbar': { px: 0, minHeight: 48 }, '& .MuiTablePagination-spacer': { display: 'none' } }} />
          </Stack>
        </Paper>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{justifyContent: "space-between", alignItems: { sm: 'center' }, gap: 1.5,  mt: 2 }}>
          <Stack direction="row" spacing={0.7} sx={{ alignItems: "center" }}><InfoOutlined sx={{ fontSize: 15, color: 'text.secondary' }} /><Typography variant="caption" color="text.secondary">セルをクリックして、優先度や課題メモを追加できます。</Typography></Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>優先度</Typography><PriorityChip priority="high" /><PriorityChip priority="medium" /><PriorityChip priority="low" /><Typography variant="caption" color="text.disabled">— 未評価</Typography></Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{alignItems: "flex-start",  mt: 3.5, pt: 2, borderTop: 1, borderColor: 'divider' }}><TrackChangesRounded sx={{ fontSize: 15, color: 'text.disabled', mt: 0.3 }} /><Box><Typography variant="caption" color="text.secondary">対象市場：{project.scope}</Typography>{project.sample && <Typography variant="caption" color="text.disabled" sx={{display: "block",  mt: 0.4 }}>サンプルの分類・評価です。実際の市場やヒアリング結果に合わせて編集してください。</Typography>}</Box></Stack>
      </Box>
    </Box>
    {configuration !== null && <ConfigurationDialog project={project} initialTab={configuration} onClose={() => setConfiguration(null)} onSave={next => { updateProject(next); setConfiguration(null); setToast('分析の設定を更新しました') }} />}
    {editing && <EvaluationDialog {...editing} onClose={() => setEditing(null)} onSave={value => {
      const evaluations = { ...project.evaluations }
      const key = cellKey(editing.row.id, editing.stage.id)
      if (!value.priority && !value.note) delete evaluations[key]
      else evaluations[key] = value
      updateProject({ ...project, evaluations })
      setEditing(null)
    }} />}
    <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs" aria-labelledby="export-title"><DialogTitle id="export-title">分析データを出力</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>検索・絞り込みにかかわらず、全{rows.length.toLocaleString()}セグメントの評価とメモを出力します。</Typography><RadioGroup value={exportFormat} onChange={event => setExportFormat(event.target.value)}><FormControlLabel value="csv" control={<Radio />} label="CSV — Excel・スプレッドシート用" /><FormControlLabel value="json" control={<Radio />} label="JSON — 編集を再開するためのバックアップ" /></RadioGroup><Alert severity="info" sx={{ mt: 2 }}>{exportFormat === 'csv' ? '日本語が文字化けしにくいUTF-8（BOM付き）です。工程ごとに優先度とメモの列を出力します。' : '分析名・対象市場・分類基準・評価をまとめて保存します。JSON読み込みボタンから復元できます。'}</Alert></DialogContent><DialogActions sx={{ p: 2.5 }}><Button color="inherit" onClick={() => setExportOpen(false)}>キャンセル</Button><Button variant="contained" startIcon={<DownloadRounded />} onClick={exportProject}>ダウンロード</Button></DialogActions></Dialog>
    <Dialog open={newOpen || !!imported} onClose={() => { setNewOpen(false); setImported(null) }} maxWidth="xs" aria-labelledby="replace-title"><DialogTitle id="replace-title">{imported ? '分析データを読み込む' : '新しい分析を作成'}</DialogTitle><DialogContent><Typography variant="body2" sx={{ mb: 2 }}>{imported ? `「${imported.name}」を読み込みます。` : '2階層の空の分析から始めます。'}現在の分析は置き換えられます。残したい場合は、先にJSONで保存してください。</Typography><Button startIcon={<DownloadRounded />} onClick={() => download(JSON.stringify(project, null, 2), `${project.name}.json`, 'application/json')}>現在の分析をJSONで保存</Button></DialogContent><DialogActions sx={{ p: 2.5 }}><Button color="inherit" onClick={() => { setNewOpen(false); setImported(null) }}>キャンセル</Button><Button variant="contained" onClick={() => { updateProject(imported ?? makeProject(false)); setQuery(''); setFilter('all'); setNewOpen(false); if (!imported) setConfiguration(0); setImported(null); setToast(imported ? '分析データを読み込みました' : '新しい分析を作成しました') }}>{imported ? '読み込む' : '作成する'}</Button></DialogActions></Dialog>
    <Dialog open={help} onClose={() => setHelp(false)} maxWidth="sm" aria-labelledby="help-title"><DialogTitle id="help-title">MECE Studio の使い方</DialogTitle><DialogContent><Stack spacing={2.5}>{[
      ['1. 対象市場と分類基準を決める', '分析名の鉛筆アイコンから対象市場を設定します。「分類を編集」で2〜5階層を選び、各階層に2〜8個の項目を入力します。'],
      ['2. 漏れ・重複を確認する', '各対象が各階層のどれか1項目だけに当てはまるよう、境界や不明な場合の扱いを定義します。すべての組み合わせを自動生成しますが、意味の重複や市場の網羅性は人が確認する必要があります。'],
      ['3. 機会を評価する', 'バリューチェーンの各セルをクリックして、優先度とメモを記録します。検索・絞り込み・表示件数で、大きな表も確認できます。'],
      ['4. 保存・出力する', '編集はこのブラウザに自動保存されます。CSVで共有し、JSONでバックアップや別のブラウザへの移行ができます。ブラウザのデータを消す前にJSONを保存してください。'],
    ].map(([title, description]) => <Box key={title}><Typography variant="subtitle2" gutterBottom>{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>{description}</Typography></Box>)}<Alert severity="info">階層数と組み合わせ数は異なります。2項目ずつの5階層なら2⁵ = 32セグメント。項目数が2 × 2 × 2 × 2 × 4なら64セグメントです。</Alert></Stack></DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={() => setHelp(false)}>閉じる</Button></DialogActions></Dialog>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importProject} />
    <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')} message={toast} action={<IconButton color="inherit" size="small" aria-label="通知を閉じる" onClick={() => setToast('')}><CloseRounded fontSize="small" /></IconButton>} />
  </Box>
}

export default App
