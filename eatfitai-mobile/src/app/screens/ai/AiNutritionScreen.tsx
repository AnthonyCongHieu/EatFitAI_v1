// Man hinh AI Nutrition: xem muc tieu hien tai va de xuat lai bang AI
// Chu thich bang tieng Viet khong dau

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type NutritionTarget } from '../../../services/aiService';
import { useDiaryStore } from '../../../store/useDiaryStore';

const formatTarget = (target: NutritionTarget | null): NutritionTarget | null => {
  if (!target) {
    return null;
  }
  return {
    calories: Math.round(target.calories),
    protein: Math.round(target.protein),
    carbs: Math.round(target.carbs),
    fat: Math.round(target.fat),
  };
};

const AiNutritionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const refreshSummary = useDiaryStore((state) => state.refreshSummary);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTarget, setCurrentTarget] = useState<NutritionTarget | null>(null);
  const [suggestedTarget, setSuggestedTarget] = useState<NutritionTarget | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const loadCurrentTarget = useCallback(async () => {
    setIsLoading(true);
    try {
      const target = await aiService.getCurrentNutritionTarget();
      setCurrentTarget(formatTarget(target));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Không tải được mục tiêu dinh dưỡng' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentTarget().catch(() => {
      // da xu ly toast
    });
  }, [loadCurrentTarget]);

  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const target = await aiService.recalculateNutritionTarget();
      setSuggestedTarget(formatTarget(target));
      Toast.show({ type: 'success', text1: 'AI đã đề xuất mục tiêu mới' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'AI không đề xuất được' });
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  const handleApply = useCallback(async () => {
    const targetToApply = suggestedTarget ?? currentTarget;
    if (!targetToApply) {
      Toast.show({ type: 'info', text1: 'Chưa có mục tiêu để áp dụng' });
      return;
    }
    setIsApplying(true);
    try {
      await aiService.applyNutritionTarget(targetToApply);
      Toast.show({ type: 'success', text1: 'Đã áp dụng mục tiêu AI' });
      setCurrentTarget(targetToApply);
      setSuggestedTarget(null);
      await refreshSummary().catch(() => {
        // bo qua loi refresh
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Lưu mục tiêu thất bại' });
    } finally {
      setIsApplying(false);
    }
  }, [currentTarget, refreshSummary, suggestedTarget]);

  const renderTargetBox = (title: string, target: NutritionTarget | null, highlight = false) => (
    <View
      style={[
        styles.targetBox,
        { borderColor: highlight ? theme.colors.primary : theme.colors.border },
      ]}
    >
      <ThemedText variant="subtitle">{title}</ThemedText>
      {target ? (
        <>
          <ThemedText style={styles.targetValue}>{target.calories} kcal</ThemedText>
          <ThemedText style={styles.targetMeta}>Protein: {target.protein} g</ThemedText>
          <ThemedText style={styles.targetMeta}>Carb: {target.carbs} g</ThemedText>
          <ThemedText style={styles.targetMeta}>Fat: {target.fat} g</ThemedText>
        </>
      ) : (
        <ThemedText style={styles.infoText}>Chua co du lieu</ThemedText>
      )}
    </View>
  );

  return (
    <Screen contentContainerStyle={styles.container}>
      <Card>
        <ThemedText variant="title">Mục tiêu dinh dưỡng</ThemedText>
        <ThemedText style={styles.infoText}>
          AI giúp cân bằng calo và macro theo trạng thái hiện tại. Bạn có thể đề xuất lại và áp dụng ngay.
        </ThemedText>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          renderTargetBox('Mục tiêu hiện tại', currentTarget)
        )}

        {suggestedTarget ? renderTargetBox('Đề xuất mới', suggestedTarget, true) : null}

        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: isRecalculating ? 0.6 : 1 }]}
          onPress={handleRecalculate}
          disabled={isRecalculating}
        >
          <ThemedText style={styles.buttonText}>
            {isRecalculating ? 'Đang tính...' : 'Đề xuất mục tiêu mới'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.secondary, opacity: isApplying ? 0.6 : 1 }]}
          onPress={handleApply}
          disabled={isApplying}
        >
          <ThemedText style={styles.buttonText}>
            {isApplying ? 'Đang áp dụng...' : 'Áp dụng mục tiêu AI'}
          </ThemedText>
        </Pressable>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {},
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  infoText: {
    opacity: 0.8,
  },
  targetBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  targetValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
  },
  targetMeta: {
    opacity: 0.8,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default AiNutritionScreen;

