import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ThemedText } from '../ThemedText';
import { AppCard } from './AppCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { aiService } from '../../services/aiService';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * HYBRID AI INSIGHTS SYSTEM
 * ─────────────────────────────────────────────
 * Architecture:
 * 1. Backend AI: Historical analysis (7 days)
 * 2. Client Validation: Real-time accuracy check
 * 3. User Profile: Personalization layer
 * 4. Smart Fallback: If backend fails/wrong
 */

// Helper: Get user's nutrition goal context
const getUserGoalContext = (user: any) => {
  // TODO: Get from user profile when available
  // For now, infer from BMI or default to maintain
  return {
    goal: 'maintain' as 'lose_weight' | 'maintain' | 'gain_muscle',
    activityLevel: 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active',
    dietType: 'omnivore' as 'omnivore' | 'vegetarian' | 'vegan' | 'keto',
  };
};

// Smart client-side recommendation generator
const generateSmartRecommendations = (
  summary: any,
  userContext: ReturnType<typeof getUserGoalContext>
): string[] => {
  const recommendations: string[] = [];

  const consumed = summary?.totalCalories || 0;
  const target = summary?.targetCalories || 2000;
  const protein = summary?.protein || 0;
  const carbs = summary?.carbs || 0;
  const fat = summary?.fat || 0;

  const hour = new Date().getHours();
  const deficit = target - consumed;
  const deficitPercent = Math.abs((deficit / target) * 100);

  // Dynamic thresholds based on user goal
  const thresholds = {
    lose_weight: {
      deficitOK: 20,  // 20% deficit is OK
      deficitWarning: 30, // >30% too aggressive
    },
    maintain: {
      deficitOK: 10,
      deficitWarning: 15,
    },
    gain_muscle: {
      deficitOK: 5,
      deficitWarning: 10,
    },
  };

  const userThreshold = thresholds[userContext.goal];

  // Calorie analysis với context-aware messaging
  if (consumed < 100) {
    recommendations.push('Bạn chưa ghi lại bữa ăn nào hôm nay. Hãy bắt đầu ghi nhật ký! 📝');
  } else if (deficit > 0) {
    // User in DEFICIT
    if (deficitPercent > userThreshold.deficitWarning) {
      // Too large deficit
      if (userContext.goal === 'lose_weight') {
        recommendations.push(`Thiếu ${Math.round(deficit)} calo (${Math.round(deficitPercent)}%). Quá aggressive - có thể làm chậm trao đổi chất! ⚠️`);
      } else {
        recommendations.push(`Thiếu ${Math.round(deficit)} calo - Không đủ cho mục tiêu của bạn. Hãy ăn thêm! 🍽️`);
      }
    } else if (deficitPercent > userThreshold.deficitOK) {
      // Acceptable deficit
      if (userContext.goal === 'lose_weight') {
        recommendations.push(`Deficit ${Math.round(deficit)} calo - Tốt cho giảm cân! Nhưng đừng đói quá nhé! 👍`);
      } else {
        recommendations.push(`Còn ${Math.round(deficit)} calo để đạt mục tiêu. ${hour >= 17 ? 'Bữa tối đầy đủ nhé!' : 'Cố gắng!'} 💪`);
      }
    }
  } else if (deficit < 0) {
    // User in SURPLUS
    const excess = -deficit;
    const excessPercent = (excess / target) * 100;

    if (excessPercent > 20) {
      recommendations.push(`Vượt mục tiêu ${Math.round(excess)} calo (${Math.round(excessPercent)}%). Hãy điều chỉnh bữa sau nhẹ hơn! ⚖️`);
    } else if (excessPercent > 10) {
      if (userContext.goal === 'gain_muscle') {
        recommendations.push(`Surplus ${Math.round(excess)} calo - Tốt cho tăng cơ! Nhớ tập luyện đều! 💪`);
      } else {
        recommendations.push(`Ăn hơi nhiều. Đã vượt ${Math.round(excess)} calo - Nhẹ tay ở bữa sau! 🥗`);
      }
    }
  }

  // Macro analysis (only if meaningful data)
  if (consumed > 300) {
    const totalMacroGrams = protein + carbs + fat;
    if (totalMacroGrams > 0) {
      const proteinCal = protein * 4;
      const carbsCal = carbs * 4;
      const fatCal = fat * 9;
      const totalMacroCal = proteinCal + carbsCal + fatCal;

      const proteinPercent = (proteinCal / totalMacroCal) * 100;
      const carbsPercent = (carbsCal / totalMacroCal) * 100;
      const fatPercent = (fatCal / totalMacroCal) * 100;

      // Protein check với diet-type personalization
      const proteinIdeal = userContext.goal === 'gain_muscle' ? [30, 40] : [20, 30];
      if (proteinIdeal?.[0] && proteinPercent < proteinIdeal[0] && recommendations.length < 2) {
        const foodSuggestions = userContext.dietType === 'vegetarian'
          ? 'đậu phụ, đậu lăng, quinoa'
          : userContext.dietType === 'vegan'
            ? 'đậu phụ, tempeh, hạt chia'
            : 'thịt gà, cá, trứng, sữa';

        recommendations.push(`Protein chỉ ${Math.round(proteinPercent)}% - quá thấp! Thêm ${foodSuggestions}! 🥩`);
      }

      // Carbs check với goal personalization
      if (userContext.dietType !== 'keto' && carbsPercent < 30 && recommendations.length < 2) {
        recommendations.push(`Carbs thấp (${Math.round(carbsPercent)}%). Thêm cơm, bánh mì hoặc khoai cho năng lượng! 🍚`);
      }

      // Fat check
      if (fatPercent > 45 && recommendations.length < 2) {
        recommendations.push(`Fat cao (${Math.round(fatPercent)}%). Hạn chế đồ chiên rán, chọn dầu olive/hạt! 🥑`);
      }
    }
  }

  // Time-based contextual advice
  if (hour >= 22 && consumed < target * 0.7 && recommendations.length < 2) {
    recommendations.push('Đã khuya nhưng chưa ăn đủ. Hãy ăn nhẹ (sữa, chuối) trước khi ngủ! 🌙');
  } else if (hour <= 14 && consumed < 500 && recommendations.length < 2) {
    recommendations.push('Sáng/trưa quan trọng cho năng lượng! Đừng bỏ bữa chính! ☀️');
  }

  // Good job message
  if (recommendations.length === 0 && consumed >= target * 0.9 && consumed <= target * 1.1) {
    recommendations.push('Tuyệt vời! Bạn đang ăn uống cân bằng và đúng mục tiêu! 🎯');
  }

  return recommendations.slice(0, 2); // Max 2
};

export const InsightsCard = () => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const summary = useDiaryStore((s) => s.summary);
  const user = useAuthStore((s) => s.user);

  // Get user goal context for personalization
  const userContext = useMemo(() => getUserGoalContext(user), [user]);

  // Fetch backend AI insights (7-day historical analysis)
  const { data, isLoading, error } = useQuery({
    queryKey: ['nutrition-insights'],
    queryFn: () => aiService.getNutritionInsights({ analysisDays: 7 }),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: (failureCount, error: any) => {
      // Stop retry on auth errors
      if (error?.response?.status === 401) return false;
      // Retry once for other errors
      return failureCount < 1;
    },
  });


  // Log error for debugging
  if (error) {
    console.warn('[InsightsCard] Failed to load AI insights:', error);
  }

  // HYBRID: Backend + Client validation + Personalization
  const finalRecommendations = useMemo(() => {
    const consumed = summary?.totalCalories || 0;
    const target = summary?.targetCalories || 2000;
    const deficit = target - consumed;

    // Try backend AI first (historical intelligence)
    if (data?.recommendations && data.recommendations.length > 0) {
      // Validate backend recommendations against current reality
      const validBackendRecs = data.recommendations.filter((rec: any) => {
        const message = rec.message?.toLowerCase() || '';

        // Accuracy check: Does backend align with current deficit/surplus?
        if (deficit > 0) {
          // User in DEFICIT - filter out "nạp dư" / "vượt" messages
          if (message.includes('nạp dư') || message.includes('vượt mục tiêu')) {
            console.warn('[AI Insights] Backend wrong: deficit but says surplus. Filtered.');
            return false;
          }
        } else if (deficit < -(target || 1) * 0.1) {
          // User in SURPLUS (>10%) - filter out "thiếu" messages
          if (message.includes('thiếu') || message.includes('ăn dưới')) {
            console.warn('[AI Insights] Backend wrong: surplus but says deficit. Filtered.');
            return false;
          }
        }

        return true;
      });

      // If backend has valid recommendations, use them
      if (validBackendRecs.length > 0) {
        console.log('[AI Insights] Using validated backend recommendations');
        return validBackendRecs.slice(0, 2).map((r: any) => r.message);
      }
    }

    // Fallback: Client-side smart recommendations with personalization
    console.log('[AI Insights] Using client-side smart logic with user context');
    return generateSmartRecommendations(summary, userContext);
  }, [data, summary, userContext]);

  // Don't show if loading or no recommendations
  if (isLoading || finalRecommendations.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
      borderWidth: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    insightItem: {
      marginBottom: theme.spacing.xs,
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
  });

  return (
    <AppCard style={styles.container}>
      <View style={styles.header}>
        <ThemedText variant="h4" color="primary">
          ✨ Gợi ý AI
        </ThemedText>
      </View>

      {finalRecommendations.map((message: string, index: number) => (
        <View key={index} style={styles.insightItem}>
          <ThemedText variant="bodySmall">💡</ThemedText>
          <ThemedText variant="bodySmall" style={{ flex: 1 }}>
            {message}
          </ThemedText>
        </View>
      ))}

      <ThemedText
        variant="caption"
        color="textSecondary"
        style={{ marginTop: theme.spacing.xs, textAlign: 'right' }}
      >
        {data?.recommendations && data.recommendations.length > 0
          ? 'Dựa trên 7 ngày qua'
          : 'Phân tích thông minh'}
      </ThemedText>
    </AppCard>
  );
};
