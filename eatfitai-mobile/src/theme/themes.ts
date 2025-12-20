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
    // Premium light gradient - Ice Blue / Soft Cloud theme
    background: '#F8FAFF', // Soft white with hint of blue
    backgroundGradient: ['#F8FAFF', '#EEF4FF', '#E8F0FE'] as const, // Soft cloud gradient
    screenGradient: ['#E8F3FF', '#D6E8FF', '#C4DCFF'] as const, // Ice blue gradient
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: 'rgba(59, 130, 246, 0.12)', // Blue border tint
    // Primary - Bright Blue (matching Dark mode)
    primary: '#3B82F6',
    primaryLight: '#DBEAFE',
    primaryDark: '#2563EB',
    // Secondary - Light blue accent
    secondary: '#0EA5E9',
    secondaryLight: '#E0F2FE',
    // Muted
    muted: '#94A3B8',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
    // Overlay colors for modals/sheets
    overlay: {
      light: 'rgba(15, 23, 42, 0.4)',
      medium: 'rgba(15, 23, 42, 0.5)',
      heavy: 'rgba(15, 23, 42, 0.6)',
    },
    // Glassmorphism colors (light mode with blue tint)
    glass: {
      background: 'rgba(255, 255, 255, 0.88)',
      border: 'rgba(59, 130, 246, 0.1)',
      backgroundAlt: 'rgba(240, 247, 255, 0.85)',
      borderAlt: 'rgba(59, 130, 246, 0.08)',
    },
    // Chart colors (blue theme)
    chart: {
      bar: '#3B82F6', // Primary blue
      barSecondary: '#0EA5E9', // Sky blue
      barRemaining: 'rgba(186, 230, 253, 0.6)',
      line: '#3B82F6',
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
    lunch: ['#BAE6FD', '#A5F3FC'] as const, // Sky blue to cyan
    dinner: ['#C7D2FE', '#DDD6FE'] as const, // Indigo to violet light
    snack: ['#BBF7D0', '#A7F3D0'] as const, // Light green
  },
  gradients: {
    primary: ['#3B82F6', '#2563EB'], // Blue gradient
    secondary: ['#0EA5E9', '#0284C7'], // Sky blue gradient
    accent: ['#6366F1', '#4F46E5'], // Indigo for AI features
    danger: ['#EF4444', '#DC2626'],
    success: ['#22C55E', '#16A34A'],
  },
  statsCards: {
    calories: {
      gradient: ['#DBEAFE', '#BFDBFE'] as const, // Blue
      textColor: '#1D4ED8',
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    average: {
      gradient: ['#E0F2FE', '#BAE6FD'] as const, // Sky blue
      textColor: '#0369A1',
      borderColor: 'rgba(14, 165, 233, 0.2)',
    },
    daysLogged: {
      gradient: ['#DCFCE7', '#BBF7D0'] as const, // Green
      textColor: '#15803D',
      borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    target: {
      gradient: ['#FEF3C7', '#FDE68A'] as const, // Amber
      textColor: '#B45309',
      borderColor: 'rgba(245, 158, 11, 0.2)',
    },
  },
  achievementGradients: {
    first_log: ['#FCA5A5', '#FECACA'] as const, // Light red
    streak_3: ['#6EE7B7', '#A7F3D0'] as const, // Light green
    streak_7: ['#93C5FD', '#BFDBFE'] as const, // Light blue
    log_100_meals: ['#C4B5FD', '#DDD6FE'] as const, // Light purple
    default: ['#93C5FD', '#A5F3FC'] as const, // Blue to cyan
    header: ['#3B82F6', '#0EA5E9'] as const, // Blue header
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
    background: '#050810', // Very deep blue-black
    backgroundGradient: ['#050810', '#0C1220', '#080E18'] as const, // Deep ocean gradient
    screenGradient: ['#0A1628', '#101E3A', '#1A2A4A'] as const, // Aurora navy gradient
    card: 'rgba(20, 27, 45, 0.95)', // Navy blue tint card

    text: '#F5F7FA', // White text

    textSecondary: '#9CA3AF', // Muted gray
    border: 'rgba(74, 144, 226, 0.15)', // Blue border tint
    // Primary - Bright Blue (like Welcome button)
    primary: '#4A90D9',
    primaryLight: 'rgba(74, 144, 226, 0.25)',
    primaryDark: '#3B7BC8',
    // Secondary - Lighter blue accent  
    secondary: '#64B5F6',
    secondaryLight: 'rgba(100, 181, 246, 0.2)',
    muted: '#6B7280',
    // Semantic colors
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#4A90D9',
    // Overlay colors for modals/sheets (darker navy)
    overlay: {
      light: 'rgba(10, 14, 26, 0.5)',
      medium: 'rgba(10, 14, 26, 0.7)',
      heavy: 'rgba(10, 14, 26, 0.85)',
    },
    // Glassmorphism colors (navy blue tint)
    glass: {
      background: 'rgba(20, 27, 45, 0.78)',
      border: 'rgba(74, 144, 226, 0.12)',
      backgroundAlt: 'rgba(26, 39, 68, 0.7)',
      borderAlt: 'rgba(100, 181, 246, 0.1)',
    },
    // Chart colors (blue theme)
    chart: {
      bar: '#4A90D9', // Primary blue
      barSecondary: '#64B5F6', // Light blue
      barRemaining: 'rgba(20, 27, 45, 0.7)',
      line: '#4A90D9',
    },
    // Gamification/Streak colors
    streak: {
      active: '#FF9500',
      background: 'rgba(255, 149, 0, 0.15)',
      border: '#FF9500',
    },
  },
  mealGradients: {
    breakfast: ['#FF9A9E', '#FECFEF'] as const, // Warm pink
    lunch: ['#4A90D9', '#64B5F6'] as const, // Blue gradient
    dinner: ['#1A2744', '#3B7BC8'] as const, // Deep navy to blue
    snack: ['#64B5F6', '#90CAF9'] as const, // Light blue gradient
  },
  gradients: {
    primary: ['#4A90D9', '#3B7BC8'], // Blue gradient
    secondary: ['#64B5F6', '#42A5F5'], // Light blue gradient
    accent: ['#1A2744', '#4A90D9'], // Navy to bright blue
    danger: ['#EF4444', '#F87171'], // Red gradient
    success: ['#22C55E', '#4ADE80'], // Green success
  },
  statsCards: {
    calories: {
      gradient: ['#1A2744', '#2A3F68'] as const, // Navy blue
      textColor: '#64B5F6',
      borderColor: 'rgba(74, 144, 226, 0.3)',
    },
    average: {
      gradient: ['#1E3A5F', '#2C5282'] as const, // Deep blue
      textColor: '#90CAF9',
      borderColor: 'rgba(100, 181, 246, 0.3)',
    },
    daysLogged: {
      gradient: ['#22543d', '#276749'] as const, // Green
      textColor: '#68d391',
      borderColor: 'rgba(72, 187, 120, 0.3)',
    },
    target: {
      gradient: ['#744210', '#975a16'] as const, // Orange
      textColor: '#f6ad55',
      borderColor: 'rgba(237, 137, 54, 0.3)',
    },
  },
  achievementGradients: {
    first_log: ['#FF6B6B', '#FF8E53'] as const, // Red-orange
    streak_3: ['#4ECDC4', '#44A08D'] as const, // Teal
    streak_7: ['#4A90D9', '#64B5F6'] as const, // Blue (updated)
    log_100_meals: ['#1A2744', '#4A90D9'] as const, // Navy to blue
    default: ['#4A90D9', '#64B5F6'] as const, // Blue gradient
    header: ['#0D1321', '#1A2744'] as const, // Dark navy header
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
