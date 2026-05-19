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
    // Soft Pastel #2 — Warm cream base, organic mint accents
    background: '#fdfbf7',
    backgroundGradient: ['#fdfbf7', '#f9f6f0', '#f4f1ea'] as const,
    screenGradient: ['#fdfbf7', '#f7f3ec', '#f4f1ea'] as const,
    card: '#FFFFFF',
    text: '#2c3e38',
    textSecondary: '#5a7a6e',
    border: '#e8e4db',
    // Primary - Mint Green
    primary: '#43b581',
    primaryLight: '#d4f0e3',
    primaryDark: '#2e9666',
    // Secondary - Deep Mint
    secondary: '#2e9666',
    secondaryLight: '#e0f5ec',
    // Muted
    muted: '#8ca39a',
    // Semantic colors (softened for pastel context)
    danger: '#e67373',
    success: '#43b581',
    warning: '#e6a23c',
    info: '#2e9666',
    // Overlay colors for modals/sheets
    overlay: {
      light: 'rgba(44, 62, 56, 0.35)',
      medium: 'rgba(44, 62, 56, 0.45)',
      heavy: 'rgba(44, 62, 56, 0.55)',
    },
    // Glassmorphism colors (warm cream + mint tint)
    glass: {
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(67, 181, 129, 0.10)',
      backgroundAlt: 'rgba(253, 251, 247, 0.90)',
      borderAlt: 'rgba(67, 181, 129, 0.08)',
    },
    // Chart colors (mint theme)
    chart: {
      bar: '#43b581',
      barSecondary: '#2e9666',
      barRemaining: 'rgba(244, 241, 234, 0.6)',
      line: '#43b581',
    },
    // Gamification/Streak colors (warm amber on cream)
    streak: {
      active: '#e6a23c',
      background: '#fef3cd',
      border: '#e6a23c',
    },
  },
  mealGradients: {
    breakfast: ['#fde8d4', '#fdd8c8'] as const,  // Warm peach
    lunch: ['#d4f0e3', '#c8ecd8'] as const,      // Mint green
    dinner: ['#e0f5ec', '#d4f0e3'] as const,     // Lighter mint
    snack: ['#f0ebe2', '#e8e4db'] as const,      // Warm beige
  },
  gradients: {
    primary: ['#43b581', '#2e9666'],
    secondary: ['#2e9666', '#1f7a50'],
    accent: ['#43b581', '#2e9666'],
    danger: ['#e67373', '#d45b5b'],
    success: ['#43b581', '#2e9666'],
  },
  statsCards: {
    calories: {
      gradient: ['#d4f0e3', '#c2ebd6'] as const,  // Pastel mint
      textColor: '#2e9666',
      borderColor: '#a8dfc2',
    },
    average: {
      gradient: ['#e0f5ec', '#d4f0e3'] as const,  // Lighter mint
      textColor: '#2e9666',
      borderColor: '#b8e6d1',
    },
    daysLogged: {
      gradient: ['#d4f0e3', '#c8ecd8'] as const,  // Green pastel
      textColor: '#2e9666',
      borderColor: '#a8dfc2',
    },
    target: {
      gradient: ['#fef3cd', '#fde8a8'] as const,  // Warm amber pastel
      textColor: '#b8860b',
      borderColor: '#f5d680',
    },
  },
  achievementGradients: {
    first_log: ['#fdd8c8', '#fde8d4'] as const,   // Peach pastel
    streak_3: ['#c8ecd8', '#d4f0e3'] as const,    // Mint pastel
    streak_7: ['#a8dfc2', '#c8ecd8'] as const,    // Deeper mint
    log_100_meals: ['#d4f0e3', '#e0f5ec'] as const,
    default: ['#c8ecd8', '#d4f0e3'] as const,
    header: ['#43b581', '#2e9666'] as const,
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
    },
    h2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    h3: {
      fontFamily: 'BeVietnamPro_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
    },
    h4: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    body: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodyLarge: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodySmall: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    button: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
    },
    heading1: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    heading2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    display: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.5,
    },
    emoji: {
      fontFamily: 'System',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#43b581',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#43b581',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    lg: {
      shadowColor: '#43b581',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
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
    // Premium Mesh Wallet — Ultra-deep navy, mesh ambient glows
    background: '#05070d',
    backgroundGradient: ['#05070d', '#0d1427', '#070b16'] as const,
    screenGradient: ['#05070d', '#0a1020', '#0d1427'] as const,
    card: 'rgba(26, 31, 47, 0.84)',

    text: '#dee1f7', // Soft lavender-white
    textSecondary: '#9aa9c1', // Cool muted blue-gray
    border: 'rgba(226, 232, 240, 0.12)',
    // Primary - Bright Emerald (mesh accent)
    primary: '#4be277',
    primaryLight: 'rgba(75, 226, 119, 0.20)',
    primaryDark: '#22c55e',
    // Secondary - Cyan (mesh spectrum)
    secondary: '#32d7f0',
    secondaryLight: 'rgba(50, 215, 240, 0.18)',
    muted: '#728099',
    // Semantic colors
    danger: '#ff8c8c',
    success: '#4be277',
    warning: '#f7c052',
    info: '#32d7f0',
    // Overlay colors for modals/sheets
    overlay: {
      light: 'rgba(5, 7, 13, 0.50)',
      medium: 'rgba(5, 7, 13, 0.70)',
      heavy: 'rgba(5, 7, 13, 0.85)',
    },
    // Glassmorphism — mesh glass surfaces
    glass: {
      background: '#1a1f2f',             // Solid navy fallback (Android safe)
      border: 'rgba(226, 232, 240, 0.10)', // Subtle warm-white edge
      backgroundAlt: '#252b3f',          // Elevated glass
      borderAlt: 'rgba(226, 232, 240, 0.16)', // Stronger edge
    },
    // Chart colors (mesh palette)
    chart: {
      bar: '#4be277',           // Primary green
      barSecondary: '#32d7f0',  // Cyan accent
      barRemaining: '#0f1625',  // Deep navy
      line: '#4be277',
    },
    // Gamification/Streak colors
    streak: {
      active: '#f7c052',
      background: '#2a2418',    // Warm dark (solid)
      border: '#f7c052',
    },
  },
  mealGradients: {
    breakfast: ['#FF9A9E', '#FECFEF'] as const,   // Warm pink
    lunch: ['#4be277', '#32d7f0'] as const,        // Green → Cyan mesh
    dinner: ['#0f1625', '#4be277'] as const,       // Deep navy → Green
    snack: ['#32d7f0', '#9d7cff'] as const,        // Cyan → Violet mesh
  },
  gradients: {
    primary: ['#4be277', '#22c55e'],               // Emerald gradient
    secondary: ['#32d7f0', '#0891b2'],             // Cyan gradient
    accent: ['#0a1020', '#4be277'],                // Deep mesh → Green
    danger: ['#ff8c8c', '#ff6b6b'],                // Warm red
    success: ['#22c55e', '#4be277'],               // Green success
  },
  statsCards: {
    calories: {
      gradient: ['#0f1625', '#1a2940'] as const,   // Deep navy mesh
      textColor: '#32d7f0',
      borderColor: 'rgba(50, 215, 240, 0.20)',
    },
    average: {
      gradient: ['#0d2818', '#163d28'] as const,   // Deep emerald
      textColor: '#4be277',
      borderColor: 'rgba(75, 226, 119, 0.20)',
    },
    daysLogged: {
      gradient: ['#141030', '#1e1845'] as const,   // Deep violet
      textColor: '#9d7cff',
      borderColor: 'rgba(157, 124, 255, 0.20)',
    },
    target: {
      gradient: ['#2a2010', '#3d3018'] as const,   // Warm amber dark
      textColor: '#f7c052',
      borderColor: 'rgba(247, 192, 82, 0.20)',
    },
  },
  achievementGradients: {
    first_log: ['#ff8c8c', '#ff6b6b'] as const,   // Warm red
    streak_3: ['#32d7f0', '#0891b2'] as const,     // Cyan mesh
    streak_7: ['#4be277', '#32d7f0'] as const,     // Green → Cyan
    log_100_meals: ['#9d7cff', '#4be277'] as const, // Violet → Green
    default: ['#4be277', '#32d7f0'] as const,      // Green → Cyan
    header: ['#05070d', '#0d1427'] as const,       // Deep navy mesh
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
    },
    h2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    h3: {
      fontFamily: 'BeVietnamPro_500Medium',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.1,
    },
    h4: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    body: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodyLarge: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodySmall: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    button: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
    },
    heading1: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    heading2: {
      fontFamily: 'BeVietnamPro_600SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    display: {
      fontFamily: 'BeVietnamPro_700Bold',
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.5,
    },
    emoji: {
      fontFamily: 'System',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.30,
      shadowRadius: 24,
      elevation: 8,
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
