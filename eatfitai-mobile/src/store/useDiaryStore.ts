// Store quan ly nhat ky hom nay
// Chu thich bang tieng Viet khong dau

import { create } from 'zustand';

import { diaryService, type DaySummary, type DiaryMealGroup } from '../services/diaryService';

type DiaryState = {
  summary: DaySummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchSummary: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
};

const removeEntryFromMeals = (meals: DiaryMealGroup[], entryId: string) => {
  return meals
    .map((meal) => {
      const filteredEntries = meal.entries.filter((entry) => entry.id !== entryId);
      if (filteredEntries.length === meal.entries.length) {
        return meal;
      }

      const removedEntry = meal.entries.find((entry) => entry.id === entryId);
      const calories = removedEntry?.calories ?? 0;
      const protein = removedEntry?.protein ?? 0;
      const carbs = removedEntry?.carbs ?? 0;
      const fat = removedEntry?.fat ?? 0;

      return {
        ...meal,
        entries: filteredEntries,
        totalCalories:
          typeof meal.totalCalories === 'number' ? Math.max(0, meal.totalCalories - calories) : meal.totalCalories,
        protein: typeof meal.protein === 'number' ? Math.max(0, meal.protein - protein) : meal.protein,
        carbs: typeof meal.carbs === 'number' ? Math.max(0, meal.carbs - carbs) : meal.carbs,
        fat: typeof meal.fat === 'number' ? Math.max(0, meal.fat - fat) : meal.fat,
      };
    })
    .filter((meal) => meal.entries.length > 0);
};

export const useDiaryStore = create<DiaryState>((set, get) => ({
  summary: null,
  isLoading: false,
  isRefreshing: false,
  error: null,

  async fetchSummary() {
    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const summary = await diaryService.getTodaySummary();
      set({ summary });
    } catch (error: any) {
      set({ error: error?.message ?? 'Khong the tai du lieu' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  async refreshSummary() {
    if (get().isRefreshing) {
      return;
    }
    set({ isRefreshing: true, error: null });
    try {
      const summary = await diaryService.getTodaySummary();
      set({ summary });
    } catch (error: any) {
      set({ error: error?.message ?? 'Khong the tai du lieu' });
      throw error;
    } finally {
      set({ isRefreshing: false });
    }
  },

  async deleteEntry(entryId: string) {
    const currentSummary = get().summary;
    if (!currentSummary) {
      return;
    }

    // Luu tam de rollback khi delete that bai
    const previousSummary = currentSummary;
    const removedEntry = currentSummary.meals
      .flatMap((meal) => meal.entries)
      .find((entry) => entry.id === entryId);
    set({
      summary: {
        ...currentSummary,
        meals: removeEntryFromMeals(currentSummary.meals, entryId),
        totalCalories:
          typeof currentSummary.totalCalories === 'number'
            ? Math.max(0, currentSummary.totalCalories - (removedEntry?.calories ?? 0))
            : currentSummary.totalCalories,
        protein:
          typeof currentSummary.protein === 'number'
            ? Math.max(0, currentSummary.protein - (removedEntry?.protein ?? 0))
            : currentSummary.protein,
        carbs:
          typeof currentSummary.carbs === 'number'
            ? Math.max(0, currentSummary.carbs - (removedEntry?.carbs ?? 0))
            : currentSummary.carbs,
        fat:
          typeof currentSummary.fat === 'number'
            ? Math.max(0, currentSummary.fat - (removedEntry?.fat ?? 0))
            : currentSummary.fat,
      },
    });

    try {
      await diaryService.deleteEntry(entryId);
    } catch (error) {
      // Rollback neu co loi
      set({ summary: previousSummary });
      throw error;
    }
  },
}));
