import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import CustomTabBar from '../src/components/navigation/CustomTabBar';
import { TEST_IDS } from '../src/testing/testIds';

const mockNavigateRoot = jest.fn();
const mockNavigate = jest.fn();
const mockEmit = jest.fn();

jest.mock('../src/app/navigation/navigationRef', () => ({
  navigateRoot: (...args: unknown[]) => mockNavigateRoot(...args),
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      mode: 'dark',
      colors: {
        primary: '#4be277',
        text: '#f5f7fa',
        textSecondary: '#94a3b8',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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
    Easing: {
      cubic: jest.fn(),
      out: jest.fn((value) => value),
    },
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, name);
  },
}));

jest.mock('../src/features/mochi/MoChiSprite', () => ({
  __esModule: true,
  default: ({
    poseKey,
    size,
    testID,
    variant,
  }: {
    poseKey: string;
    size: number;
    testID?: string;
    variant?: string;
  }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID }, `mochi-${poseKey}-${size}-${variant ?? 'auto'}`);
  },
}));

jest.mock('../src/components/ui/SmartAddSheet', () => ({
  __esModule: true,
  default: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    if (!visible) return null;
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID });
  },
  SmartAddSheet: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    if (!visible) return null;
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID });
  },
}));

const renderTabBar = () =>
  render(
    <CustomTabBar
      state={{
        stale: false,
        type: 'tab',
        key: 'tab-state',
        index: 0,
        history: [{ type: 'route', key: 'HomeTab-key' }],
        routeNames: ['HomeTab', 'MealDiary', 'VoiceTab', 'StatsTab', 'ProfileTab'],
        routes: [
          { key: 'HomeTab-key', name: 'HomeTab' },
          { key: 'MealDiary-key', name: 'MealDiary' },
          { key: 'VoiceTab-key', name: 'VoiceTab' },
          { key: 'StatsTab-key', name: 'StatsTab' },
          { key: 'ProfileTab-key', name: 'ProfileTab' },
        ],
      }}
      descriptors={{} as any}
      navigation={{ emit: mockEmit, navigate: mockNavigate } as any}
      insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
    />,
  );

describe('CustomTabBar MoChi hub layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateRoot.mockReturnValue(true);
  });

  it('shows home, diary, MoChi hub, stats, and profile as the five bottom slots', () => {
    const screen = renderTabBar();

    expect(screen.getByTestId(TEST_IDS.navigation.homeTabButton)).toBeTruthy();
    expect(screen.getByTestId(TEST_IDS.navigation.diaryTabButton)).toBeTruthy();
    expect(screen.getByTestId(TEST_IDS.navigation.mochiHubButton)).toBeTruthy();
    expect(screen.getByTestId(TEST_IDS.navigation.statsTabButton)).toBeTruthy();
    expect(screen.getByTestId(TEST_IDS.navigation.profileTabButton)).toBeTruthy();
    expect(screen.queryByTestId(TEST_IDS.navigation.voiceTabButton)).toBeNull();
    expect(screen.queryByTestId(TEST_IDS.navigation.aiScanTabButton)).toBeNull();
    expect(screen.queryByTestId(TEST_IDS.navigation.addMealCommandButton)).toBeNull();
  });

  it('renders the center dock with a calm non-face MoChi sprite', () => {
    const screen = renderTabBar();

    expect(screen.getByText('mochi-boxIdle-54-auto')).toBeTruthy();
  });

  it('opens the hub sheet from the center button instead of navigating directly to scan', () => {
    const screen = renderTabBar();

    fireEvent.press(screen.getByTestId(TEST_IDS.navigation.mochiHubButton));

    expect(screen.getByTestId(TEST_IDS.navigation.mochiHubSheet)).toBeTruthy();
    expect(screen.getByText('mochi-nutritionCoachNotice-54-auto')).toBeTruthy();
    expect(mockNavigateRoot).not.toHaveBeenCalledWith('AiCamera');
  });

  it('emits tabPress and switches diary/profile as real tabs', () => {
    const screen = renderTabBar();

    fireEvent.press(screen.getByTestId(TEST_IDS.navigation.diaryTabButton));
    fireEvent.press(screen.getByTestId(TEST_IDS.navigation.profileTabButton));

    expect(mockEmit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'MealDiary-key',
      canPreventDefault: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith('MealDiary', undefined);
    expect(mockNavigate).toHaveBeenCalledWith('ProfileTab', undefined);
    expect(mockNavigateRoot).not.toHaveBeenCalledWith('MealDiary');
  });
});
