/**
 * useSmartContext - Hook cung cấp context-aware suggestions
 * Dựa trên time of day, nutrition status, và user patterns
 * Aligns với 2026 AI Personalization trend
 */

import { useMemo } from 'react';
import type { DaySummary } from '../services/diaryService';

type MealContext = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type NutritionGap = 'protein' | 'carbs' | 'fat' | 'balanced';

interface SmartContext {
  /** Thời điểm trong ngày */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  /** Bữa ăn được suggest */
  suggestedMeal: MealContext;

  /** Dinh dưỡng đang thiếu */
  nutritionGap: NutritionGap | null;

  /** FAB action được suggest */
  fabAction: {
    icon: string;
    label: string;
    color?: string;
    hint: string;
  };

  /** Quick action suggestion */
  quickSuggestion: string;

  /** Priority level (1-3, 3 = highest) */
  priority: 1 | 2 | 3;
}

export const useSmartContext = (summary?: DaySummary | null): SmartContext => {
  return useMemo(() => {
    const hour = new Date().getHours();

    // Determine time of day
    let timeOfDay: SmartContext['timeOfDay'] = 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';

    // Suggest meal based on time
    let suggestedMeal: MealContext = 'snack';
    if (hour >= 6 && hour < 10) suggestedMeal = 'breakfast';
    else if (hour >= 11 && hour < 14) suggestedMeal = 'lunch';
    else if (hour >= 17 && hour < 20) suggestedMeal = 'dinner';

    // Analyze nutrition gaps
    let nutritionGap: NutritionGap | null = null;
    if (summary) {
      const { protein = 0, carbs = 0, fat = 0 } = summary;
      const totalCalories = summary.totalCalories || 0;

      // Rough macro targets (example: 30% protein, 40% carbs, 30% fat in calories)
      const caloriesFromProtein = (protein ?? 0) * 4;
      const caloriesFromCarbs = (carbs ?? 0) * 4;
      const caloriesFromFat = (fat ?? 0) * 9;

      const proteinPercent =
        totalCalories > 0 ? (caloriesFromProtein / totalCalories) * 100 : 0;
      const carbsPercent =
        totalCalories > 0 ? (caloriesFromCarbs / totalCalories) * 100 : 0;
      const fatPercent = totalCalories > 0 ? (caloriesFromFat / totalCalories) * 100 : 0;

      // Identify biggest gap (simplified logic)
      if (proteinPercent < 20 && totalCalories > 300) {
        nutritionGap = 'protein';
      } else if (carbsPercent < 30 && totalCalories > 300) {
        nutritionGap = 'carbs';
      } else if (fatPercent < 15 && totalCalories > 300) {
        nutritionGap = 'fat';
      } else if (totalCalories > 100) {
        nutritionGap = 'balanced';
      }
    }

    // Generate FAB action based on context
    let fabAction: SmartContext['fabAction'];
    let quickSuggestion: string;
    let priority: SmartContext['priority'] = 1;

    // Morning breakfast context
    if (timeOfDay === 'morning' && suggestedMeal === 'breakfast') {
      fabAction = {
        icon: 'sunny-outline',
        label: 'Thêm bữa sáng',
        color: '#F59E0B', // Amber
        hint: 'Thời điểm này bạn thường ăn sáng',
      };
      quickSuggestion = '🌅 Bữa sáng giàu protein giúp bạn tỉnh táo!';
      priority = 3;
    }
    // Lunch time
    else if (timeOfDay === 'afternoon' && suggestedMeal === 'lunch') {
      fabAction = {
        icon: 'restaurant-outline',
        label: 'Thêm bữa trưa',
        color: '#10B981', // Green
        hint: 'Đã đến giờ ăn trưa',
      };
      quickSuggestion = '☀️ Bữa trưa cân bằng cho năng lượng cả ngày!';
      priority = 3;
    }
    // Dinner time
    else if (timeOfDay === 'evening' && suggestedMeal === 'dinner') {
      fabAction = {
        icon: 'moon-outline',
        label: 'Thêm bữa tối',
        color: '#8B5CF6', // Purple
        hint: 'Đã đến giờ ăn tối',
      };
      quickSuggestion = '🌙 Bữa tối nhẹ nhàng cho giấc ngủ ngon!';
      priority = 3;
    }
    // Protein gap detected
    else if (nutritionGap === 'protein' && hour >= 9 && hour < 21) {
      fabAction = {
        icon: 'fitness-outline',
        label: 'Thiếu protein',
        color: '#3B82F6', // Blue
        hint: 'Cần bổ sung protein',
      };
      quickSuggestion = '💪 Bạn đang thiếu protein - thử thịt gà, cá, hoặc đậu!';
      priority = 2;
    }
    // Default fallback
    else {
      fabAction = {
        icon: 'add',
        label: 'Thêm món ăn',
        hint: 'Thêm món ăn vào nhật ký',
      };
      quickSuggestion = '🍽️ Hãy ghi lại mọi bữa ăn để theo dõi tốt hơn!';
      priority = 1;
    }

    return {
      timeOfDay,
      suggestedMeal,
      nutritionGap,
      fabAction,
      quickSuggestion,
      priority,
    };
  }, [summary]);
};
