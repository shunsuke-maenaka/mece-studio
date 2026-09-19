import { createTheme } from '@mui/material/styles'
import { jaJP } from '@mui/material/locale'

export const theme = createTheme({
  palette: {
    primary: { main: '#22765c', light: '#eaf4ef', dark: '#174e3f' },
    secondary: { main: '#68796f' },
    success: { main: '#27835f', light: '#eaf5ef' },
    warning: { main: '#a67b2a', light: '#fbf3e2' },
    background: { default: '#f7f9f8', paper: '#ffffff' },
    text: { primary: '#243b32', secondary: '#75827b' },
    divider: '#e5ebe7',
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 13,
    h4: { fontWeight: 700, fontSize: '1.7rem', letterSpacing: '-0.035em' },
    h5: { fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontWeight: 700, fontSize: '1rem' },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { letterSpacing: '0.12em', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { padding: '8px 16px' }, outlined: { borderColor: '#dde5df' } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiChip: { defaultProps: { size: 'small' } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#e5ebe7' }, head: { fontWeight: 600, color: '#62736a' } } },
    MuiTab: { styleOverrides: { root: { minHeight: 52, padding: '12px 20px' } } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiDialog: { defaultProps: { fullWidth: true } },
  },
}, jaJP)
