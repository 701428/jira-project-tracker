import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// ── Polaris Grids brand palette ───────────────────────────────────────────────
export const PG = {
  navy:        '#0a3690',   // primary — from polarisgrids.com nav/headings
  navyDark:    '#071f29',   // dark background
  navyDeep:    '#06152a',   // sidebar dark mode
  teal:        '#02C9A8',   // logo gradient start / accent
  tealLight:   '#1ccfb1',   // hover accent
  periwinkle:  '#ABC7FF',   // logo gradient end
  blue:        '#3959ff',   // CTA / links
  blueMid:     '#144bbd',   // secondary blue
  blueSky:     '#37aafe',   // gradient
  text:        '#464e5f',   // body text
  textLight:   '#7b8ab0',   // secondary text
  bgLight:     '#f7fafc',   // page background
  bgCard:      '#ffffff',
  divider:     'rgba(10,54,144,0.10)',
};

const ColorModeContext = createContext<{
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}>({ toggleColorMode: () => {}, mode: 'light' });

export const useColorMode = () => useContext(ColorModeContext);

const buildTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main:  PG.navy,
        dark:  '#071f29',
        light: '#1645a4',
        contrastText: '#ffffff',
      },
      secondary: {
        main:  PG.teal,
        light: PG.tealLight,
        dark:  '#01a588',
        contrastText: '#ffffff',
      },
      background: mode === 'light'
        ? { default: PG.bgLight, paper: '#ffffff' }
        : { default: '#0b1929', paper: '#111e33' },
      text: mode === 'light'
        ? { primary: PG.navy, secondary: PG.text, disabled: PG.textLight }
        : { primary: '#e8eef8', secondary: '#8fa3c4', disabled: '#4a5f7a' },
      divider: mode === 'light' ? PG.divider : 'rgba(255,255,255,0.08)',
      error:   { main: '#e53935' },
      warning: { main: '#f57c00' },
      success: { main: '#00897b' },
      info:    { main: PG.blueSky },
    },
    typography: {
      fontFamily: "'Satoshi', 'Inter', 'Arial', sans-serif",
      h1: { fontWeight: 900 },
      h2: { fontWeight: 900 },
      h3: { fontWeight: 800 },
      h4: { fontWeight: 800 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1: { fontWeight: 400, color: mode === 'light' ? PG.text : undefined },
      body2: { fontWeight: 400 },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    shape: { borderRadius: 10 },
    shadows: [
      'none',
      '0 1px 3px rgba(10,54,144,0.06), 0 1px 2px rgba(10,54,144,0.04)',
      '0 2px 6px rgba(10,54,144,0.08), 0 1px 3px rgba(10,54,144,0.05)',
      '0 4px 12px rgba(10,54,144,0.10)',
      '0 6px 16px rgba(10,54,144,0.12)',
      '0 8px 24px rgba(10,54,144,0.14)',
      '0 10px 30px rgba(10,54,144,0.16)',
      '0 12px 36px rgba(10,54,144,0.18)',
      '0 14px 42px rgba(10,54,144,0.20)',
      '0 16px 48px rgba(10,54,144,0.22)',
      '0 18px 54px rgba(10,54,144,0.22)',
      '0 20px 60px rgba(10,54,144,0.22)',
      '0 22px 64px rgba(10,54,144,0.22)',
      '0 24px 68px rgba(10,54,144,0.22)',
      '0 26px 72px rgba(10,54,144,0.22)',
      '0 28px 76px rgba(10,54,144,0.22)',
      '0 30px 80px rgba(10,54,144,0.22)',
      '0 32px 84px rgba(10,54,144,0.22)',
      '0 34px 88px rgba(10,54,144,0.22)',
      '0 36px 92px rgba(10,54,144,0.22)',
      '0 38px 96px rgba(10,54,144,0.22)',
      '0 40px 100px rgba(10,54,144,0.22)',
      '0 42px 104px rgba(10,54,144,0.22)',
      '0 44px 108px rgba(10,54,144,0.22)',
      '0 46px 112px rgba(10,54,144,0.22)',
    ] as any,
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 700, letterSpacing: 0.2 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${PG.navy} 0%, ${PG.blueMid} 100%)`,
            boxShadow: `0 4px 14px ${alpha(PG.navy, 0.35)}`,
            '&:hover': { boxShadow: `0 6px 20px ${alpha(PG.navy, 0.45)}` },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${PG.teal} 0%, ${PG.tealLight} 100%)`,
            boxShadow: `0 4px 14px ${alpha(PG.teal, 0.35)}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: mode === 'light' ? `1px solid ${PG.divider}` : '1px solid rgba(255,255,255,0.07)',
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700, borderRadius: 6 } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: mode === 'light' ? PG.textLight : '#8fa3c4',
              borderBottom: `2px solid ${mode === 'light' ? PG.divider : 'rgba(255,255,255,0.08)'}`,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 8 },
          notchedOutline: {
            borderColor: mode === 'light' ? PG.divider : 'rgba(255,255,255,0.15)',
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4 },
          bar: { background: `linear-gradient(90deg, ${PG.teal}, ${PG.blue})` },
        },
      },
    },
  });

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const colorMode = useMemo(() => ({
    toggleColorMode: () => setMode(m => m === 'light' ? 'dark' : 'light'),
    mode,
  }), [mode]);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default ColorModeContext;
