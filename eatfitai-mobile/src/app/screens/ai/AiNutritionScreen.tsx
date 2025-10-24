// Man hinh AI Nutrition: xem muc tieu hien tai va de xuat lai bang AI
// Chu thich bang tieng Viet khong dau

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
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
        {
          borderColor: highlight ? theme.colors.primary : theme.colors.border,
          backgroundColor: highlight ? theme.colors.primaryLight : theme.colors.card,
        },
      ]}
    >
      <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </ThemedText>
      {target ? (
        <>
          <ThemedText variant="h2" color={highlight ? 'primary' : undefined} style={{ marginBottom: theme.spacing.sm }}>
            {target.calories} kcal
          </ThemedText>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Protein
              </ThemedText>
              <ThemedText variant="body" weight="600">
                {target.protein} g
              </ThemedText>
            </View>
            <View style={styles.macroItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Carb
              </ThemedText>
              <ThemedText variant="body" weight="600">
                {target.carbs} g
              </ThemedText>
            </View>
            <View style={styles.macroItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Fat
              </ThemedText>
              <ThemedText variant="body" weight="600">
                {target.fat} g
              </ThemedText>
            </View>
          </View>
        </>
      ) : (
        <ThemedText variant="body" color="textSecondary">
          Chưa có dữ liệu
        </ThemedText>
      )}
    </View>
  );

  return (
    <Screen contentContainerStyle={styles.container}>
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          Mục tiêu dinh dưỡng
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
          AI giúp cân bằng calo và macro theo trạng thái hiện tại. Bạn có thể đề xuất lại và áp dụng ngay.
        </ThemedText>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              Đang tải...
            </ThemedText>
          </View>
        ) : (
          renderTargetBox('Mục tiêu hiện tại', currentTarget)
        )}

        {suggestedTarget ? renderTargetBox('Đề xuất mới', suggestedTarget, true) : null}

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
          <Button
            variant="primary"
            loading={isRecalculating}
            disabled={isRecalculating}
            onPress={handleRecalculate}
            title={isRecalculating ? 'Đang tính...' : 'Đề xuất mục tiêu mới'}
          />

          <Button
            variant="secondary"
            loading={isApplying}
            disabled={isApplying}
            onPress={handleApply}
            title={isApplying ? 'Đang áp dụng...' : 'Áp dụng mục tiêu AI'}
          />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  targetBox: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
});

export default AiNutritionScreen;

