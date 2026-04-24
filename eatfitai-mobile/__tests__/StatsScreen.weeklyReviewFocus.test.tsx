import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TEST_IDS } from '../src/testing/testIds';

const mockNavigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
};

const mockRouteState = {
  key: 'StatsTab',
  name: 'StatsTab',
  params: {
    source: 'weekly-review' as const,
    focusWeeklyReview: true,
  },
};

const mockWeekSummary = {
  totalCalories: 12600,
  totalProtein: 700,
  totalCarbs: 1400,
  totalFat: 420,
  days: [
    { date: '2026-04-20', calories: 1800 },
    { date: '2026-04-21', calories: 1700 },
    { date: '2026-04-22', calories: 1900 },
    { date: '2026-04-23', calories: 1600 },
    { date: '2026-04-24', calories: 1750 },
    { date: '2026-04-25', calories: 1850 },
    { date: '2026-04-26', calories: 2000 },
  ],
};

const mockSummary = {
  totalCalories: 1800,
  targetCalories: 2200,
  protein: 120,
  carbs: 180,
  fat: 50,
  targetProtein: 120,
  targetCarbs: 250,
  targetFat: 70,
  meals: [],
};

const mockWeeklyReview = {
  message: 'Ban da duy tri tot nhip an tuan nay.',
  dataQuality: 92,
  confidence: 87,
  status: 'ready',
  insights: {
    complianceScore: 81,
    energyLevel: 'on dinh',
    recommendations: ['Giu bua sang deu hon.', 'Uong them nuoc vao buoi chieu.'],
  },
  suggestedActions: {
    newTargetCalories: 2150,
  },
};

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, props, children);

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    FadeIn: {
      delay: () => ({
        springify: () => ({}),
      }),
    },
    FadeInDown: {
      delay: () => ({
        springify: () => ({}),
      }),
    },
    FadeInUp: {
      delay: () => ({
        springify: () => ({}),
      }),
    },
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, props, children);

  return {
    __esModule: true,
    default: Mock,
    Circle: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    Stop: Mock,
    Path: Mock,
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'Light',
  },
  impactAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, name);
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRouteState,
}));

jest.mock('../src/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

jest.mock('../src/components/skeletons/StatsSkeleton', () => ({
  StatsSkeleton: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'StatsSkeleton');
  },
}));

jest.mock('../src/components/stats', () => ({
  CalendarHeatmap: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null);
  },
}));

jest.mock('../src/components/ui/Tilt3DCard', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, children);
  },
}));

jest.mock('../src/store/useStatsStore', () => ({
  useStatsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      weekSummary: mockWeekSummary,
      isLoading: false,
      fetchWeekSummary: jest.fn(),
      selectedDate: '2026-04-20',
    }),
}));

jest.mock('../src/store/useDiaryStore', () => ({
  useDiaryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      summary: mockSummary,
      fetchSummary: jest.fn(),
    }),
}));

jest.mock('../src/store/useProfileStore', () => ({
  useProfileStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      profile: {
        weightKg: 68,
        targetWeightKg: 65,
      },
    }),
}));

jest.mock('../src/services/summaryService', () => ({
  summaryService: {
    getWeeklyReview: jest.fn(),
    getNutritionSummary: jest.fn(),
  },
}));

jest.mock('../src/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('../src/utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

jest.mock('../src/services/waterService', () => ({
  waterService: {
    getWaterIntake: jest.fn(),
    getMonthlyWaterIntake: jest.fn(),
  },
}));

jest.mock('../src/services/profileService', () => ({
  profileService: {
    getBodyMetricsHistory: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => {
    if (options.queryKey[0] === 'water-intake-today') {
      return {
        data: { amountMl: 1200, targetMl: 2000 },
      };
    }

    if (options.queryKey[0] === 'analytics' && options.queryKey[1] === 'weekly-review') {
      return {
        data: options.enabled ? mockWeeklyReview : undefined,
        isFetching: false,
        refetch: jest.fn(),
      };
    }

    return {
      data: undefined,
      isFetching: false,
      refetch: jest.fn(),
    };
  },
}));

describe('StatsScreen weekly review focus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consumes notification focus so users can switch away from Week', async () => {
    const StatsScreen =
      require('../src/app/screens/stats/StatsScreen').default as typeof import('../src/app/screens/stats/StatsScreen').default;

    const screen = render(<StatsScreen />);

    expect(await screen.findByTestId(TEST_IDS.stats.weeklyReviewCard)).toBeTruthy();

    fireEvent.press(screen.getByTestId(TEST_IDS.stats.todayTabButton));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.stats.weeklyReviewCard)).toBeNull();
    });
  });
});
