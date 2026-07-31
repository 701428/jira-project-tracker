import { createTheme, Theme } from '@mui/material/styles';

const baseTheme = {
  shape: {
    borderRadius: 3,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          elevation: 0,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }),
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 24,
          fontSize: '0.75rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 3,
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#0052CC',
      light: '#4C9AFF',
      dark: '#0747A6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0065FF',
      light: '#2684FF',
      dark: '#0049B0',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F5F7',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#172B4D',
      secondary: '#5E6C84',
    },
    divider: '#DFE1E6',
    success: { main: '#00875A' },
    warning: { main: '#FF8B00' },
    error: { main: '#DE350B' },
    info: { main: '#0052CC' },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#4C9AFF',
      light: '#85B8FF',
      dark: '#0052CC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2684FF',
      light: '#85B8FF',
      dark: '#0065FF',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#1D2125',
      paper: '#22272B',
    },
    text: {
      primary: '#C7D1DB',
      secondary: '#8C9BAB',
    },
    divider: '#3B4555',
    success: { main: '#4BCE97' },
    warning: { main: '#F5CD47' },
    error: { main: '#FF5630' },
    info: { main: '#4C9AFF' },
  },
});
