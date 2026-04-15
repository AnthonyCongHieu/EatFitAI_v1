import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import ForgotPasswordScreen from '../src/app/screens/auth/ForgotPasswordScreen';
import { TEST_IDS } from '../src/testing/testIds';

const mockAuthState = {
  forgotPassword: jest.fn(),
  verifyResetCode: jest.fn(),
  resetPassword: jest.fn(),
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
    FadeInDown: {
      delay: () => ({
        springify: () => ({}),
      }),
    },
    FadeInRight: {
      duration: () => ({}),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (updater: () => unknown) => updater(),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values[0],
  };
});

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, ...props }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('../src/components/Screen', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, children);
  },
}));

jest.mock('../src/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        danger: '#ff4d4f',
      },
    },
  }),
}));

jest.mock('../src/components/ui/Tilt3DCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Tilt3DCard = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  const ParallaxLayer = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  return {
    __esModule: true,
    default: Tilt3DCard,
    ParallaxLayer,
  };
});

jest.mock('../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) =>
    selector(mockAuthState),
}));

describe('ForgotPasswordScreen', () => {
  const navigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.forgotPassword.mockResolvedValue(undefined);
    mockAuthState.verifyResetCode.mockResolvedValue(undefined);
    mockAuthState.resetPassword.mockResolvedValue(undefined);
  });

  it('keeps the user on the verify step when the reset code is invalid', async () => {
    mockAuthState.verifyResetCode.mockRejectedValue({
      response: {
        data: {
          message: 'Mã đặt lại hoặc email không hợp lệ.',
        },
      },
    });

    const screen = render(
      <ForgotPasswordScreen navigation={navigation as never} route={{ key: 'ForgotPassword', name: 'ForgotPassword' } as never} />,
    );

    fireEvent.changeText(
      screen.getByTestId(TEST_IDS.auth.forgotPasswordEmailInput),
      'demo@example.com',
    );
    fireEvent.press(screen.getByTestId(TEST_IDS.auth.forgotPasswordSendCodeButton));

    await waitFor(() => {
      expect(mockAuthState.forgotPassword).toHaveBeenCalledWith('demo@example.com');
    });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.changeText(
        screen.getByTestId(`${TEST_IDS.auth.forgotPasswordVerifyCodeInputPrefix}-${index}`),
        '1',
      );
    }

    fireEvent.press(screen.getByTestId(TEST_IDS.auth.forgotPasswordVerifyButton));

    await waitFor(() => {
      expect(mockAuthState.verifyResetCode).toHaveBeenCalledWith(
        'demo@example.com',
        '111111',
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.auth.forgotPasswordNewPasswordInput)).toBeNull();
      expect(screen.getByTestId(TEST_IDS.auth.forgotPasswordVerifyButton)).toBeTruthy();
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Xác minh thất bại',
        }),
      );
    });
  }, 15000);
});
