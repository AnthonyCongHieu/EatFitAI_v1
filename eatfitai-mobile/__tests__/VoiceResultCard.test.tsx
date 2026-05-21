import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import VoiceResultCard from '../src/components/voice/VoiceResultCard';
import type { ParsedVoiceCommand, VoiceReviewDraft } from '../src/services/voiceService';

jest.mock('../src/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: { children?: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('../src/components/Button', () => ({
  __esModule: true,
  default: ({
    title,
    onPress,
    disabled,
    testID,
  }: {
    title?: string;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../src/components/ui/AppCard', () => ({
  AppCard: ({ children, ...props }: { children?: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      mode: 'dark',
      spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
      radius: { sm: 8, md: 12 },
      colors: {
        primary: '#4be277',
        success: '#4be277',
        warning: '#f59e0b',
        info: '#38bdf8',
        textSecondary: '#9ca3af',
      },
    },
  }),
}));

const command: ParsedVoiceCommand = {
  intent: 'ADD_FOOD',
  rawText: 'thêm 1 bát phở bữa trưa',
  confidence: 0.91,
  reviewRequired: true,
  entities: { foodName: 'phở', quantity: 1, unit: 'bát', mealType: 'lunch' },
};

const draft: VoiceReviewDraft = {
  intent: 'ADD_FOOD',
  rawText: 'thêm 1 bát phở bữa trưa',
  confidence: 0.91,
  reviewRequired: true,
  mealType: 'lunch',
  date: '2026-05-16',
  items: [
    {
      clientId: 'item-1',
      heardText: 'phở',
      foodName: 'phở',
      grams: 100,
      quantity: 1,
      unit: 'bát',
      selectedCandidate: {
        id: 10,
        source: 'catalog',
        name: 'Phở bò',
        caloriesPer100: 450,
        proteinPer100: 24,
        carbsPer100: 55,
        fatPer100: 12,
        matchScore: 1,
      },
      candidates: [],
      warnings: [],
    },
  ],
  totals: { calories: 450, protein: 24, carbs: 55, fat: 12 },
  warnings: [],
  canSave: true,
};

describe('VoiceResultCard review draft form', () => {
  it('renders editable add-food review fields and commits only valid drafts', () => {
    const onDraftChange = jest.fn();
    const onCommit = jest.fn();

    const screen = render(
      <VoiceResultCard
        command={command}
        reviewDraft={draft}
        onDraftChange={onDraftChange}
        onCommit={onCommit}
      />,
    );

    expect(screen.getByText('Kiểm tra món trước khi lưu')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('voice-review-grams-item-1'), '150');
    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ grams: 150 })],
      }),
    );

    fireEvent.press(screen.getByTestId('voice-review-commit-button'));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('disables commit when the draft cannot be saved', () => {
    const onCommit = jest.fn();
    const blockedDraft = {
      ...draft,
      canSave: false,
      blockingReason: 'Không tìm thấy món phù hợp trong dữ liệu.',
    };

    const screen = render(
      <VoiceResultCard command={command} reviewDraft={blockedDraft} onCommit={onCommit} />,
    );

    expect(screen.getByText('Không tìm thấy món phù hợp trong dữ liệu.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('voice-review-commit-button'));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('shows query results as read-only information after execution', () => {
    const onExecute = jest.fn();
    const queryCommand: ParsedVoiceCommand = {
      intent: 'QUERY_MEAL',
      rawText: 'bua trua hom qua an gi',
      confidence: 0.9,
      reviewRequired: false,
      entities: { mealType: 'lunch', date: '2026-05-20' },
    };

    const screen = render(
      <VoiceResultCard
        command={queryCommand}
        onExecute={onExecute}
        executedData={{
          type: 'QUERY_MEAL',
          details: 'Bua trua co 1 mon: Voice rice query',
          totalCalories: 300,
        }}
      />,
    );

    expect(screen.getByText('Bua trua co 1 mon: Voice rice query')).toBeTruthy();
    expect(screen.queryByTestId('voice-execute-button')).toBeNull();
  });
});
