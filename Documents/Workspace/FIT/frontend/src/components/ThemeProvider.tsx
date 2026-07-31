import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useUIStore } from '../store/uiStore';
import { lightTheme, darkTheme } from '../theme/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkMode = useUIStore((s) => s.darkMode);
  return (
    <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      {children}
    </MuiThemeProvider>
  );
};
