import type { Theme } from '@react-navigation/native';

export type ThemeMode = 'light' | 'dark';

export type Typography = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontWeight?: '300' | '400' | '500' | '600' | '700';
};

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    muted: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
  gradients: {
    primary: readonly [string, string];
    secondary: readonly [string, string];
    accent: readonly [string, string];
    danger: readonly [string, string];
    success: readonly [string, string];
  };
  statusBarStyle: 'light' | 'dark';
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    h1: Typography;
    h2: Typography;
    h3: Typography;
    h4: Typography;
    body: Typography;
    bodyLarge: Typography;
    bodySmall: Typography;
    caption: Typography;
    button: Typography;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#FAFAFA',
    card: '#FFFFFF',
    text: '#1A1C1A',
    textSecondary: '#5F6662',
    border: '#E2E8E5',
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',
    secondary: '#0A4D3C',
    secondaryLight: '#E6F0ED',
    muted: '#9FA6A3',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  gradients: {
    primary: ['#2563EB', '#3B82F6'],
    secondary: ['#0A4D3C', '#1B8C68'],
    accent: ['#F59E0B', '#FBBF24'],
    danger: ['#EF4444', '#F87171'],
    success: ['#10B981', '#34D399'],
  },
  statusBarStyle: 'dark',
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  typography: {
    h1: {
      fontFamily: 'Inter_700Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    h3: {
      fontFamily: 'Inter_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
      fontWeight: '500',
    },
    h4: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyLarge: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.1,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontWeight: '600',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#F5F7F6',
    textSecondary: '#A8B0AD',
    border: '#2A3432',
    primary: '#3B82F6',
    primaryLight: '#1E40AF',
    primaryDark: '#1D4ED8',
    secondary: '#1B8C68',
    secondaryLight: '#1A3D32',
    muted: '#7D8884',
    danger: '#EF4444',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  gradients: {
    primary: ['#3B82F6', '#2563EB'],
    secondary: ['#1B8C68', '#0A4D3C'],
    accent: ['#FBBF24', '#F59E0B'],
    danger: ['#EF4444', '#F87171'],
    success: ['#34D399', '#10B981'],
  },
  statusBarStyle: 'light',
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  typography: {
    h1: {
      fontFamily: 'Inter_700Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    h3: {
      fontFamily: 'Inter_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
      fontWeight: '500',
    },
    h4: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyLarge: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.1,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontWeight: '600',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 5,
    },
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
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
