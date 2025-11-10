// Màn AI Dinh dưỡng: xem mục tiêu hiện tại, gợi ý nhanh và áp dụng
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type NutritionTarget } from '../../../services/aiService';
import { useDiaryStore } from '../../../store/useDiaryStore';

const formatTarget = (t: NutritionTarget | null): NutritionTarget | null =>
  t ? { calories: Math.round(t.calories), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) } : null;

const AiNutritionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTarget, setCurrentTarget] = useState<NutritionTarget | null>(null);
  const [suggestedTarget, setSuggestedTarget] = useState<NutritionTarget | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const loadCurrent = useCallback(async () => {
    setIsLoading(true);
    try {
      const t = await aiService.getCurrentNutritionTarget();
      setCurrentTarget(formatTarget(t));
    } catch {
      Toast.show({ type: 'error', text1: 'Không tải được mục tiêu dinh dưỡng hiện tại' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent().catch(() => {});
  }, [loadCurrent]);

  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const t = await aiService.recalculateNutritionTarget();
      setSuggestedTarget(formatTarget(t));
      Toast.show({ type: 'success', text1: 'Đã gợi ý mục tiêu mới' });
    } catch {
      Toast.show({ type: 'error', text1: 'Gợi ý mục tiêu thất bại' });
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  const handleApply = useCallback(async () => {
    const target = suggestedTarget ?? currentTarget;
    if (!target) {
      Toast.show({ type: 'info', text1: 'Chưa có mục tiêu để áp dụng' });
      return;
    }
    setIsApplying(true);
    try {
      await aiService.applyNutritionTarget(target);
      Toast.show({ type: 'success', text1: 'Đã áp dụng mục tiêu AI' });
      setCurrentTarget(target);
      setSuggestedTarget(null);
      await refreshSummary().catch(() => {});
    } catch {
      Toast.show({ type: 'error', text1: 'Lưu mục tiêu thất bại' });
    } finally {
      setIsApplying(false);
    }
  }, [currentTarget, suggestedTarget, refreshSummary]);

  const TargetBox = ({ title, target, highlight = false }: { title: string; target: NutritionTarget | null; highlight?: boolean }) => (
    <View
      style={[
        styles.targetBox,
        { borderColor: highlight ? theme.colors.primary : theme.colors.border, backgroundColor: highlight ? theme.colors.primaryLight : theme.colors.card },
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
          AI gợi ý calo và macro theo trạng thái hiện tại.
        </ThemedText>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              Đang tải...
            </ThemedText>
          </View>
        ) : (
          <TargetBox title="Mục tiêu hiện tại" target={currentTarget} />
        )}

        {suggestedTarget ? <TargetBox title="Gợi ý mới" target={suggestedTarget} highlight /> : null}

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
          <Button variant="primary" loading={isRecalculating} disabled={isRecalculating} onPress={handleRecalculate} title={isRecalculating ? 'Đang tính...' : 'Gợi ý nhanh'} />
          <Button variant="secondary" loading={isApplying} disabled={isApplying} onPress={handleApply} title={isApplying ? 'Đang áp dụng...' : 'Áp dụng mục tiêu AI'} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  targetBox: { borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 16 },
  macroRow: { flexDirection: 'row', gap: 16 },
  macroItem: { flex: 1, alignItems: 'center' },
});

export default AiNutritionScreen;

