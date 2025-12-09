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
    backgroundGradient: readonly [string, string, string]; // Gradient background
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
  borderRadius: {
    card: number;
    button: number;
    input: number;
    chip: number;
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
    heading1: Typography;
    heading2: Typography;
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
    // Base colors
    background: '#F8FAFC',
    backgroundGradient: ['#F8FAFC', '#E2E8F0', '#F1F5F9'] as const, // Light gradient
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: 'rgba(15, 23, 42, 0.08)',
    // Primary - Fresh emerald green
    primary: '#10B981',
    primaryLight: '#D1FAE5',
    primaryDark: '#059669',
    // Secondary - Deep teal
    secondary: '#0D9488',
    secondaryLight: '#CCFBF1',
    // Muted
    muted: '#94A3B8',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  gradients: {
    primary: ['#10B981', '#059669'],
    secondary: ['#0D9488', '#0F766E'],
    accent: ['#8B5CF6', '#7C3AED'], // Purple for AI features
    danger: ['#EF4444', '#DC2626'],
    success: ['#22C55E', '#16A34A'],
  },
  statusBarStyle: 'dark',
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  borderRadius: { card: 20, button: 12, input: 12, chip: 12 },
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
      fontSize: 16,
      lineHeight: 24,
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
      fontSize: 14,
      lineHeight: 20,
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
    heading1: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    heading2: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
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
      shadowOpacity: 0.08,
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
    // Premium dark gradient with subtle green tint (health theme)
    background: '#080B0A', // Deep dark with green hint
    backgroundGradient: ['#080B0A', '#0D1512', '#0A0F0D'] as const, // Dark green gradient
    card: 'rgba(18, 25, 22, 0.95)', // Dark green tint card

    text: '#F5F7FA',

    textSecondary: '#9CA3AF',
    border: 'rgba(255, 255, 255, 0.1)',
    // Primary - Vibrant blue like reference
    primary: '#3B82F6',
    primaryLight: 'rgba(59, 130, 246, 0.2)',
    primaryDark: '#2563EB',
    // Secondary - Teal accent
    secondary: '#06B6D4',
    secondaryLight: 'rgba(6, 182, 212, 0.2)',
    muted: '#6B7280',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  gradients: {
    primary: ['#3B82F6', '#8B5CF6'], // Blue to purple gradient
    secondary: ['#06B6D4', '#0891B2'],
    accent: ['#8B5CF6', '#A855F7'], // Purple accent
    danger: ['#EF4444', '#F87171'],
    success: ['#22C55E', '#4ADE80'],
  },
  statusBarStyle: 'light',
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  borderRadius: { card: 20, button: 12, input: 12, chip: 12 },
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
      fontSize: 16,
      lineHeight: 24,
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
      fontSize: 14,
      lineHeight: 20,
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
    heading1: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    heading2: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
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
