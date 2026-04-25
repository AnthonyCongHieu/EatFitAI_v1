import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import CommonMealTemplateScreen from '../src/app/screens/diary/CommonMealTemplateScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    key: 'CommonMealTemplate-test',
    name: 'CommonMealTemplate',
    params: undefined,
  }),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#0a0e1a',
        card: '#161b2b',
        text: '#ffffff',
        textSecondary: '#94a3b8',
        border: 'rgba(255,255,255,0.08)',
        primary: '#4be277',
        primaryText: '#003915',
        danger: '#ef4444',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
      },
      borderRadius: {
        button: 12,
        input: 12,
      },
    },
  }),
}));

jest.mock('../src/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: { children?: React.ReactNode }) => {
    const ReactRef = require('react');
    const { Text } = require('react-native');
    return ReactRef.createElement(Text, props, children);
  },
}));

jest.mock('../src/components/Screen', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => {
    const ReactRef = require('react');
    const { View } = require('react-native');
    return ReactRef.createElement(View, null, children);
  },
}));

jest.mock('../src/components/Button', () => ({
  __esModule: true,
  default: ({ title, onPress, testID }: { title?: string; onPress?: () => void; testID?: string }) => {
    const ReactRef = require('react');
    const { Text } = require('react-native');
    return ReactRef.createElement(Text, { onPress, testID }, title ?? 'button');
  },
}));

jest.mock('../src/components/ThemedTextInput', () => ({
  __esModule: true,
  default: ({
    value,
    onChangeText,
    testID,
    placeholder,
  }: {
    value?: string;
    onChangeText?: (value: string) => void;
    testID?: string;
    placeholder?: string;
  }) => {
    const ReactRef = require('react');
    const { TextInput } = require('react-native');
    return ReactRef.createElement(TextInput, {
      value,
      onChangeText,
      testID,
      placeholder,
    });
  },
}));

jest.mock('../src/services/foodService', () => ({
  __esModule: true,
  foodService: {
    searchFoods: jest.fn(),
    createCustomDish: jest.fn(),
    getCommonMealDetail: jest.fn(),
    updateCommonMeal: jest.fn(),
  },
}));

const { foodService: mockFoodService } = require('../src/services/foodService');

describe('CommonMealTemplateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFoodService.searchFoods.mockResolvedValue({
      items: [
        {
          id: '7',
          name: 'Ức gà áp chảo',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          source: 'catalog',
        },
      ],
    });
    mockFoodService.createCustomDish.mockResolvedValue(undefined);
    mockFoodService.getCommonMealDetail.mockResolvedValue(null);
    mockFoodService.updateCommonMeal.mockResolvedValue(undefined);
  });

  it('creates a common meal template from selected ingredients', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <CommonMealTemplateScreen />
      </QueryClientProvider>,
    );

    fireEvent.changeText(screen.getByTestId('common-meal-name-input'), 'Lunch Prep');
    fireEvent.changeText(screen.getByTestId('common-meal-search-input'), 'ức gà');
    await waitFor(() => {
      expect(screen.getByTestId('common-meal-search-input').props.value).toBe('ức gà');
    });

    await act(async () => {
      screen.getByTestId('common-meal-search-button').props.onPress();
    });

    await waitFor(() => {
      expect(mockFoodService.searchFoods).toHaveBeenCalledWith('ức gà', 12);
    });

    fireEvent.press(screen.getByTestId('common-meal-search-result-7'));

    await act(async () => {
      screen.getByTestId('common-meal-save-button').props.onPress();
    });

    await waitFor(() => {
      expect(mockFoodService.createCustomDish).toHaveBeenCalledWith({
        dishName: 'Lunch Prep',
        description: '',
        ingredients: [{ foodItemId: 7, grams: 100 }],
      });
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});
