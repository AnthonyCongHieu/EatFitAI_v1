// Màn AI Dinh dưỡng: xem mục tiêu hiện tại, gợi ý nhanh và áp dụng
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import type { RootStackParamList } from '../../types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type NutritionTarget } from '../../../services/aiService';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';

const formatTarget = (t: NutritionTarget | null): NutritionTarget | null =>
  t
    ? {
        calories: Math.round(t.calories),
        protein: Math.round(t.protein),
        carbs: Math.round(t.carbs),
        fat: Math.round(t.fat),
      }
    : null;

const AiNutritionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xxl,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    targetBox: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.card,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    macroRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    macroItem: {
      flex: 1,
      alignItems: 'center',
    },
    buttonContainer: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xl,
    },
  });

  const [currentTarget, setCurrentTarget] = useState<NutritionTarget | null>(null);
  const [suggestedTarget, setSuggestedTarget] = useState<NutritionTarget | null>(null);
  const queryClient = useQueryClient();

  const {
    data: currentTargetData,
    isLoading,
    error,
  } = useQuery<NutritionTarget | null, unknown>({
    queryKey: ['nutrition-target'],
    queryFn: async () => {
      const t = await aiService.getCurrentNutritionTarget();
      return formatTarget(t);
    },
  });
  const current = currentTargetData ?? null;

  useEffect(() => {
    setCurrentTarget(current);
  }, [current]);

  useEffect(() => {
    if (error) {
      handleApiErrorWithCustomMessage(error, {
        server_error: {
          text1: 'L?i',
          text2: 'M?y ch? ?ang g?p s? c?. Vui l?ng th? l?i.',
        },
        network_error: { text1: 'Kh?ng c? k?t n?i', text2: 'Ki?m tra m?ng v? th? l?i' },
        unknown: {
          text1: 'Kh?ng t?i ???c m?c ti?u dinh d??ng hi?n t?i',
          text2: 'Vui l?ng th? l?i.',
        },
      });
    }
  }, [error]);

  const recalcMutation = useMutation({
    mutationFn: () => aiService.recalculateNutritionTarget(),
    onSuccess: (data) => {
      setSuggestedTarget(formatTarget(data));
      Toast.show({ type: 'success', text1: '�?A� g���i A� m���c tiA�u m��>i' });
    },
    onError: (err) => {
      handleApiErrorWithCustomMessage(err, {
        server_error: {
          text1: 'L?i',
          text2: 'M?y ch? ?ang g?p s? c?. Vui l?ng th? l?i.',
        },
        network_error: { text1: 'Kh?ng c? k?t n?i', text2: 'Ki?m tra m?ng v? th? l?i' },
        unknown: { text1: 'G?i ? m?c ti?u th?t b?i', text2: 'Vui l?ng th? l?i sau.' },
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (target: NutritionTarget) => aiService.applyNutritionTarget(target),
    onSuccess: async (_, target) => {
      Toast.show({ type: 'success', text1: '�?A� A�p d���ng m���c tiA�u AI' });
      setCurrentTarget(target);
      setSuggestedTarget(null);
      await refreshSummary().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['nutrition-target'] }).catch(() => {});
    },
    onError: (err) => {
      handleApiErrorWithCustomMessage(err, {
        server_error: {
          text1: 'L?i',
          text2: 'M?y ch? ?ang g?p s? c?. Vui l?ng th? l?i.',
        },
        network_error: { text1: 'Kh?ng c? k?t n?i', text2: 'Ki?m tra m?ng v? th? l?i' },
        unknown: { text1: 'L?u m?c ti?u th?t b?i', text2: 'Vui l?ng th? l?i.' },
      });
    },
  });

  const handleRecalculate = useCallback(() => {
    recalcMutation.mutate();
  }, [recalcMutation]);

  const handleApply = useCallback(() => {
    const target = suggestedTarget ?? currentTarget;
    if (!target) {
      Toast.show({ type: 'info', text1: 'Ch��a cA3 m���c tiA�u �`��� A�p d���ng' });
      return;
    }
    applyMutation.mutate(target);
  }, [applyMutation, currentTarget, suggestedTarget]);

  const TargetBox = ({
    title,
    target,
    highlight = false,
  }: {
    title: string;
    target: NutritionTarget | null;
    highlight?: boolean;
  }) => (
    <View
      style={[
        styles.targetBox,
        highlight && {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primaryLight,
        },
      ]}
    >
      <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </ThemedText>
      {target ? (
        <>
          <ThemedText
            variant="h2"
            color={highlight ? 'primary' : undefined}
            style={{ marginBottom: theme.spacing.sm }}
          >
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
    <Screen style={styles.screen}>
      <ScreenHeader
        title="AI Dinh dưỡng"
        subtitle="Mục tiêu và gợi ý từ trí tuệ nhân tạo"
      />

      <AppCard style={styles.card}>
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md }}>
          Mục tiêu dinh dưỡng
        </ThemedText>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText
              variant="body"
              color="textSecondary"
              style={{ marginTop: theme.spacing.md }}
            >
              Đang tải...
            </ThemedText>
          </View>
        ) : (
          <TargetBox title="Mục tiêu hiện tại" target={currentTarget} />
        )}

        {suggestedTarget ? (
          <TargetBox title="Gợi ý mới" target={suggestedTarget} highlight />
        ) : null}

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            loading={recalcMutation.isPending}
            disabled={recalcMutation.isPending}
            onPress={handleRecalculate}
            title={recalcMutation.isPending ? 'Đang tính...' : 'Gợi ý nhanh'}
          />
          <Button
            variant="secondary"
            loading={applyMutation.isPending}
            disabled={applyMutation.isPending}
            onPress={handleApply}
            title={applyMutation.isPending ? 'Đang áp dụng...' : 'Áp dụng mục tiêu AI'}
          />
          <Button
            variant="outline"
            onPress={() => navigation.navigate('NutritionInsights')}
            title="Xem phân tích chi tiết"
          />
          <Button
            variant="outline"
            onPress={() => navigation.navigate('AdaptiveTarget')}
            title="Mục tiêu tự động (AI+)"
          />
          <Button
            variant="outline"
            onPress={() => navigation.navigate('VisionHistory')}
            title="Lịch sử nhận diện Vision"
          />
          <Button
            variant="outline"
            onPress={() => navigation.navigate('RecipeSuggestions', { ingredients: [] })}
            title="Gợi ý công thức (Thủ công)"
          />
        </View>
      </AppCard>
    </Screen>
  );
};

export default AiNutritionScreen;
