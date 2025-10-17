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
  };
  statusBarStyle: 'light' | 'dark';
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
  },
  statusBarStyle: 'dark',
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
  },
  statusBarStyle: 'light',
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
