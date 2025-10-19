import type { Theme } from '@react-navigation/native';

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    card: string;
    text: string;
    border: string;
    primary: string;
    secondary: string;
    muted: string;
    danger?: string;
  };
  statusBarStyle: 'light' | 'dark';
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#F7F9F8',
    card: '#FFFFFF',
    text: '#1A1C1A',
    border: '#E2E8E5',
    primary: '#0A8F62',
    secondary: '#0A4D3C',
    muted: '#9FA6A3',
    danger: '#E53935',
  },
  statusBarStyle: 'dark',
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 24 },
  radius: { sm: 8, md: 12, lg: 16, full: 999 },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#0D1110',
    card: '#18201E',
    text: '#F5F7F6',
    border: '#2A3432',
    primary: '#32D29A',
    secondary: '#1B8C68',
    muted: '#7D8884',
    danger: '#E53935',
  },
  statusBarStyle: 'light',
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 24 },
  radius: { sm: 8, md: 12, lg: 16, full: 999 },
};

// Chuẩn hóa theme cho React Navigation để màu đồng bộ
export const toNavigationTheme = (theme: AppTheme): Theme => ({
  dark: theme.mode === 'dark',
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.card,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.secondary,
  },
});
