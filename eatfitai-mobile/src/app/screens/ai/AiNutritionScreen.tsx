// Man hinh AI Nutrition: xem muc tieu hien tai va de xuat lai bang AI
// Chu thich bang tieng Viet khong dau

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
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
      Toast.show({ type: 'error', text1: 'Khong tai duoc muc tieu dinh duong' });
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
      Toast.show({ type: 'success', text1: 'AI da de xuat muc tieu moi' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'AI khong de xuat duoc' });
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  const handleApply = useCallback(async () => {
    const targetToApply = suggestedTarget ?? currentTarget;
    if (!targetToApply) {
      Toast.show({ type: 'info', text1: 'Chua co muc tieu de ap dung' });
      return;
    }
    setIsApplying(true);
    try {
      await aiService.applyNutritionTarget(targetToApply);
      Toast.show({ type: 'success', text1: 'Da ap dung muc tieu AI' });
      setCurrentTarget(targetToApply);
      setSuggestedTarget(null);
      await refreshSummary().catch(() => {
        // bo qua loi refresh
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Luu muc tieu that bai' });
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">Muc tieu dinh duong</ThemedText>
        <ThemedText style={styles.infoText}>
          AI giup can bang calo va macro theo trang thai hien tai. Ban co the de xuat lai va ap dung ngay.
        </ThemedText>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          renderTargetBox('Muc tieu hien tai', currentTarget)
        )}

        {suggestedTarget ? renderTargetBox('De xuat moi', suggestedTarget, true) : null}

        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: isRecalculating ? 0.6 : 1 }]}
          onPress={handleRecalculate}
          disabled={isRecalculating}
        >
          <ThemedText style={styles.buttonText}>
            {isRecalculating ? 'Dang tinh...' : 'De xuat muc tieu moi'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.secondary, opacity: isApplying ? 0.6 : 1 }]}
          onPress={handleApply}
          disabled={isApplying}
        >
          <ThemedText style={styles.buttonText}>
            {isApplying ? 'Dang ap dung...' : 'Ap dung muc tieu AI'}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
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

