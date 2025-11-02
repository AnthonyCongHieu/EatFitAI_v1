import { create } from "zustand";
import { summaryService, type WeekSummary } from "../services/summaryService";
import type { NutritionSummaryDto } from '../types';

export type StatsState = {
  weekSummary: WeekSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchWeekSummary: () => Promise<void>;
  refreshWeekSummary: () => Promise<void>;
};

export const useStatsStore = create<StatsState>((set, get) => ({
  weekSummary: null,
  isLoading: false,
  error: null,

  async fetchWeekSummary() {
    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await summaryService.getWeekSummary();
      set({ weekSummary: data });
    } catch (error: any) {
      set({ error: error?.message ?? "Khong the tai thong ke" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  async refreshWeekSummary() {
    set({ error: null });
    try {
      const data = await summaryService.getWeekSummary();
      set({ weekSummary: data });
    } catch (error: any) {
      set({ error: error?.message ?? "Khong the tai thong ke" });
      throw error;
    }
  },
}));
