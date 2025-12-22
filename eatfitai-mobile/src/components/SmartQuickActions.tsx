// SmartQuickActions component - Hiển thị quick action dựa theo thời gian trong ngày
// Inspired by Lifesum & Yazio smart suggestions

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import Icon from './Icon';
import type { MealTypeId } from '../types';

interface MealSuggestion {
  type: MealTypeId;
  label: string;
  icon: string;
  greeting: string;
}

interface SmartQuickActionsProps {
  onAddMeal: (mealType: MealTypeId) => void;
  onScanFood?: () => void;
  onSearchFood?: () => void;
}

const getMealSuggestion = (hour: number): MealSuggestion => {
  if (hour >= 5 && hour < 10) {
    return { type: 1, label: 'Bữa sáng', icon: '🌅', greeting: 'Chào buổi sáng!' };
  }
  if (hour >= 10 && hour < 14) {
    return { type: 2, label: 'Bữa trưa', icon: '☀️', greeting: 'Đến giờ ăn trưa!' };
  }
  if (hour >= 14 && hour < 18) {
    return { type: 4, label: 'Bữa xế', icon: '🍵', greeting: 'Thời gian nghỉ ngơi!' };
  }
  if (hour >= 18 && hour < 22) {
    return { type: 3, label: 'Bữa tối', icon: '🌙', greeting: 'Chào buổi tối!' };
  }
  // Đêm khuya (22h - 5h) vẫn mặc định là Bữa tối
  return { type: 3, label: 'Bữa tối', icon: '🌙', greeting: 'Khuya rồi!' };
};

const getAllMealOptions = (): MealSuggestion[] => [
  { type: 1, label: 'Bữa sáng', icon: '🌅', greeting: '' },
  { type: 2, label: 'Bữa trưa', icon: '☀️', greeting: '' },
  { type: 3, label: 'Bữa tối', icon: '🌙', greeting: '' },
];

const QuickActionButton = ({
  icon,
  label,
  onPress,
  isPrimary = false,
  delay = 0,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
  delay?: number;
}) => {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View
          style={[
            animatedStyle,
            styles.actionButton,
            {
              backgroundColor: isPrimary
                ? theme.colors.primary
                // Solid colors để fix 2 màu trên Android
                : theme.mode === 'dark' ? '#1A2744' : '#EEF4FF',
              borderColor: isPrimary
                ? theme.colors.primary
                : theme.mode === 'dark' ? '#2A3F68' : '#D0E4FF',
              ...theme.shadows.sm,
            },
          ]}
        >
          <ThemedText style={styles.actionIcon}>{icon}</ThemedText>
          <ThemedText
            variant="bodySmall"
            weight="600"
            style={[styles.actionLabel, isPrimary && { color: '#FFFFFF' }]}
          >
            {label}
          </ThemedText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const SmartQuickActions: React.FC<SmartQuickActionsProps> = ({
  onAddMeal,
  onScanFood,
  onSearchFood,
}) => {
  const { theme } = useAppTheme();

  const { currentSuggestion, isLateNight } = useMemo(() => {
    const hour = new Date().getHours();
    // Đêm khuya: 22h - 5h sáng
    const lateNight = hour >= 22 || hour < 5;
    return {
      currentSuggestion: getMealSuggestion(hour),
      isLateNight: lateNight,
    };
  }, []);

  // Chỉ hiển thị 3 bữa chính
  const mainMeals = useMemo(() => getAllMealOptions(), []);

  return (
    <View style={styles.container}>
      {/* Greeting & Primary Suggestion */}
      <View style={styles.header}>
        <ThemedText variant="bodySmall" color="textSecondary">
          {isLateNight ? '🌃 Đêm khuya rồi!' : currentSuggestion.greeting}
        </ThemedText>
        <ThemedText variant="h3" weight="600" style={{ marginTop: theme.spacing.xs }}>
          {isLateNight ? 'Không nên ăn khuya!' : 'Thêm món ăn'}
        </ThemedText>
      </View>

      {/* Late night warning */}
      {isLateNight ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.colors.warning + '15',
              borderColor: theme.colors.warning + '30',
            },
          ]}
        >
          <ThemedText variant="body" color="warning" weight="600">
            💡 Ăn khuya không tốt cho sức khỏe
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
            Nên uống nước hoặc trà thảo mộc nếu đói. Hãy nghỉ ngơi sớm nhé!
          </ThemedText>
        </View>
      ) : (
        <>
          {/* Primary Action Row - Bữa ăn theo thời gian + Tìm kiếm */}
          <View style={styles.primaryRow}>
            <QuickActionButton
              icon={currentSuggestion.icon}
              label={`Thêm ${currentSuggestion.label}`}
              onPress={() => onAddMeal(currentSuggestion.type)}
              isPrimary
              delay={0}
            />
            {onSearchFood && (
              <QuickActionButton
                icon="🔍"
                label="Tìm kiếm"
                onPress={onSearchFood}
                delay={100}
              />
            )}
          </View>
        </>
      )}

      {/* Main Meals Row - Bữa sáng, trưa, tối */}
      <View style={styles.secondaryRow}>
        {mainMeals.map((meal, index) => (
          <Pressable
            key={meal.type}
            onPress={() => onAddMeal(meal.type)}
            style={[
              styles.secondaryButton,
              {
                // Solid colors để fix 2 màu trên Android
                backgroundColor: theme.mode === 'dark' ? '#1A2744' : '#EEF4FF',
                borderColor: theme.mode === 'dark' ? '#2A3F68' : '#D0E4FF',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Thêm ${meal.label}`}
          >
            <ThemedText style={styles.secondaryIcon}>{meal.icon}</ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              {meal.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  secondaryIcon: {
    fontSize: 18,
  },
  warningBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
});

export default SmartQuickActions;
