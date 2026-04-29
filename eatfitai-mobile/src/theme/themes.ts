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
    screenGradient: readonly [string, string, string]; // 3-color screen gradient
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
    // Overlay colors for modals/sheets
    overlay: {
      light: string;
      medium: string;
      heavy: string;
    };
    // Glassmorphism colors
    glass: {
      background: string;
      border: string;
      backgroundAlt: string;
      borderAlt: string;
    };
    // Chart colors
    chart: {
      bar: string;
      barSecondary: string;
      barRemaining: string;
      line: string;
    };
    // Gamification/Streak colors
    streak: {
      active: string;
      background: string;
      border: string;
    };
  };

  // Meal type gradients
  mealGradients: {
    breakfast: readonly [string, string];
    lunch: readonly [string, string];
    dinner: readonly [string, string];
    snack: readonly [string, string];
  };

  gradients: {
    primary: readonly [string, string];
    secondary: readonly [string, string];
    accent: readonly [string, string];
    danger: readonly [string, string];
    success: readonly [string, string];
  };

  // Stats card gradients and colors
  statsCards: {
    calories: {
      gradient: readonly [string, string];
      textColor: string;
      borderColor: string;
    };
    average: {
      gradient: readonly [string, string];
      textColor: string;
      borderColor: string;
    };
    daysLogged: {
      gradient: readonly [string, string];
      textColor: string;
      borderColor: string;
    };
    target: {
      gradient: readonly [string, string];
      textColor: string;
      borderColor: string;
    };
  };

  // Achievement/Gamification gradients
  achievementGradients: {
    first_log: readonly [string, string];
    streak_3: readonly [string, string];
    streak_7: readonly [string, string];
    log_100_meals: readonly [string, string];
    default: readonly [string, string];
    header: readonly [string, string];
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
    display: Typography; // 48px for large hero elements
    emoji: Typography; // 28-32px for emoji display
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
    // Spring configs cho micro-interactions mượt hơn
    spring: {
      gentle: { damping: number; stiffness: number };
      bouncy: { damping: number; stiffness: number };
      snappy: { damping: number; stiffness: number };
    };
  };
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    // Premium light gradient - Emerald Cloud theme
    background: '#F8FBF7',
    backgroundGradient: ['#F8FBF7', '#EEF8F0', '#E6F5E9'] as const,
    screenGradient: ['#EAF8EE', '#D8F2DE', '#C8EAD1'] as const,
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: 'rgba(34, 197, 94, 0.14)',
    // Primary - Emerald (matching Dark mode)
    primary: '#16A34A',
    primaryLight: '#DCFCE7',
    primaryDark: '#15803D',
    // Secondary - Teal accent
    secondary: '#0F766E',
    secondaryLight: '#CCFBF1',
    // Muted
    muted: '#94A3B8',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#0F766E',
    // Overlay colors for modals/sheets
    overlay: {
      light: 'rgba(15, 23, 42, 0.4)',
      medium: 'rgba(15, 23, 42, 0.5)',
      heavy: 'rgba(15, 23, 42, 0.6)',
    },
    // Glassmorphism colors (light mode with emerald tint)
    glass: {
      background: 'rgba(255, 255, 255, 0.88)',
      border: 'rgba(34, 197, 94, 0.1)',
      backgroundAlt: 'rgba(240, 253, 244, 0.85)',
      borderAlt: 'rgba(34, 197, 94, 0.08)',
    },
    // Chart colors (emerald theme)
    chart: {
      bar: '#16A34A',
      barSecondary: '#0F766E',
      barRemaining: 'rgba(187, 247, 208, 0.6)',
      line: '#16A34A',
    },
    // Gamification/Streak colors
    streak: {
      active: '#F59E0B',
      background: '#FEF3C7',
      border: '#F59E0B',
    },
  },
  mealGradients: {
    breakfast: ['#FED7AA', '#FECACA'] as const, // Warm peach-pink
    lunch: ['#BBF7D0', '#99F6E4'] as const,
    dinner: ['#D9F99D', '#BBF7D0'] as const,
    snack: ['#BBF7D0', '#A7F3D0'] as const, // Light green
  },
  gradients: {
    primary: ['#22C55E', '#16A34A'],
    secondary: ['#14B8A6', '#0F766E'],
    accent: ['#4BE277', '#14B8A6'],
    danger: ['#EF4444', '#DC2626'],
    success: ['#22C55E', '#16A34A'],
  },
  statsCards: {
    calories: {
      gradient: ['#DCFCE7', '#BBF7D0'] as const,
      textColor: '#15803D',
      // Solid colors để fix 2 màu trên Android
      borderColor: '#86EFAC',
    },
    average: {
      gradient: ['#CCFBF1', '#99F6E4'] as const,
      textColor: '#0F766E',
      borderColor: '#5EEAD4',
    },
    daysLogged: {
      gradient: ['#DCFCE7', '#BBF7D0'] as const, // Green
      textColor: '#15803D',
      borderColor: '#86EFAC',
    },
    target: {
      gradient: ['#FEF3C7', '#FDE68A'] as const, // Amber
      textColor: '#B45309',
      borderColor: '#FCD34D',
    },
  },
  achievementGradients: {
    first_log: ['#FCA5A5', '#FECACA'] as const, // Light red
    streak_3: ['#6EE7B7', '#A7F3D0'] as const, // Light green
    streak_7: ['#86EFAC', '#BBF7D0'] as const,
    log_100_meals: ['#A7F3D0', '#CCFBF1'] as const,
    default: ['#86EFAC', '#99F6E4'] as const,
    header: ['#22C55E', '#0F766E'] as const,
  },
  statusBarStyle: 'dark',
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  borderRadius: { card: 20, button: 12, input: 12, chip: 12 },
  typography: {
    h1: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    h3: {
      fontFamily: 'BeVietnamPro_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
      fontWeight: '500',
    },
    h4: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    body: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyLarge: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    caption: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontWeight: '600',
    },
    heading1: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    heading2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    display: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    emoji: {
      fontFamily: 'System',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
      fontWeight: '400',
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
    spring: {
      gentle: { damping: 20, stiffness: 100 },
      bouncy: { damping: 12, stiffness: 200 },
      snappy: { damping: 18, stiffness: 300 },
    },
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    // Premium dark gradient - Aurora / Deep Ocean theme
    background: '#0E1322',
    backgroundGradient: ['#0E1322', '#161B2B', '#1A1F2F'] as const,
    screenGradient: ['#0E1322', '#161B2B', '#25293A'] as const,
    card: 'rgba(26, 31, 47, 0.95)',

    text: '#F5F7FA', // White text

    textSecondary: '#9CA3AF', // Muted gray
    border: 'rgba(75, 226, 119, 0.15)',
    // Primary - Bright Emerald
    primary: '#4BE277',
    primaryLight: 'rgba(75, 226, 119, 0.25)',
    primaryDark: '#22C55E',
    // Secondary - Teal accent
    secondary: '#2DD4BF',
    secondaryLight: 'rgba(45, 212, 191, 0.2)',
    muted: '#6B7280',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#2DD4BF',
    // Overlay colors for modals/sheets (darker navy)
    overlay: {
      light: 'rgba(10, 14, 26, 0.5)',
      medium: 'rgba(10, 14, 26, 0.7)',
      heavy: 'rgba(10, 14, 26, 0.85)',
    },
    // Glassmorphism colors - Solid colors để tránh lỗi 2 màu trên Android
    glass: {
      background: '#1A1F2F', // Solid navy thay vì rgba
      border: '#3D4A3D', // Solid border
      backgroundAlt: '#25293A', // Solid alt background
      borderAlt: '#4B5F4A', // Solid alt border
    },
    // Chart colors (emerald theme)
    chart: {
      bar: '#4BE277', // Primary emerald
      barSecondary: '#2DD4BF', // Teal
      barRemaining: '#111827', // Solid dark navy
      line: '#4BE277',
    },
    // Gamification/Streak colors
    streak: {
      active: '#FF9500',
      background: '#2A2A1A', // Solid warm dark thay vì rgba
      border: '#FF9500',
    },
  },
  mealGradients: {
    breakfast: ['#FF9A9E', '#FECFEF'] as const, // Warm pink
    lunch: ['#4BE277', '#2DD4BF'] as const, // Emerald to teal
    dinner: ['#1A1F2F', '#22C55E'] as const, // Deep surface to emerald
    snack: ['#2DD4BF', '#99F6E4'] as const, // Teal gradient
  },
  gradients: {
    primary: ['#4BE277', '#22C55E'], // Emerald gradient
    secondary: ['#2DD4BF', '#0F766E'], // Teal gradient
    accent: ['#1A1F2F', '#4BE277'], // Deep surface to bright emerald
    danger: ['#EF4444', '#F87171'], // Red gradient
    success: ['#22C55E', '#4ADE80'], // Green success
  },
  statsCards: {
    calories: {
      gradient: ['#1A1F2F', '#3D4A3D'] as const, // Deep emerald surface
      textColor: '#2DD4BF',
      // Solid colors để fix 2 màu trên Android
      borderColor: '#4B5F4A',
    },
    average: {
      gradient: ['#143824', '#1F5132'] as const, // Deep emerald
      textColor: '#99F6E4',
      borderColor: '#2F6F45',
    },
    daysLogged: {
      gradient: ['#22543d', '#276749'] as const, // Green
      textColor: '#68d391',
      borderColor: '#3A7A5A',
    },
    target: {
      gradient: ['#744210', '#975a16'] as const, // Orange
      textColor: '#f6ad55',
      borderColor: '#B07A30',
    },
  },
  achievementGradients: {
    first_log: ['#FF6B6B', '#FF8E53'] as const, // Red-orange
    streak_3: ['#4ECDC4', '#44A08D'] as const, // Teal
    streak_7: ['#4BE277', '#2DD4BF'] as const, // Emerald to teal
    log_100_meals: ['#1A1F2F', '#4BE277'] as const, // Deep surface to emerald
    default: ['#4BE277', '#2DD4BF'] as const, // Emerald gradient
    header: ['#0E1322', '#1A1F2F'] as const, // Dark navy header
  },
  statusBarStyle: 'light',
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  borderRadius: { card: 20, button: 12, input: 12, chip: 12 },
  typography: {
    h1: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    h3: {
      fontFamily: 'BeVietnamPro_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
      fontWeight: '500',
    },
    h4: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    body: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyLarge: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    caption: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontWeight: '600',
    },
    heading1: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    heading2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    display: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    emoji: {
      fontFamily: 'System',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
      fontWeight: '400',
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
    spring: {
      gentle: { damping: 20, stiffness: 100 },
      bouncy: { damping: 12, stiffness: 200 },
      snappy: { damping: 18, stiffness: 300 },
    },
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
