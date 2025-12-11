/**
 * Weekly Check-in Store
 * State management for weekly tracking feature
 */

import { create } from 'zustand';
import {
  weeklyService,
  type CurrentWeekResponse,
  type WeeklyCheckInData,
  type WeeklySummary,
  type CheckInRequest,
} from '../services/weeklyService';

interface WeeklyStore {
  // State
  currentWeek: CurrentWeekResponse | null;
  history: WeeklyCheckInData[];
  summary: WeeklySummary | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  fetchCurrentWeek: () => Promise<void>;
  submitCheckIn: (request: CheckInRequest) => Promise<boolean>;
  fetchHistory: (page?: number) => Promise<void>;
  fetchSummary: () => Promise<void>;
  clearError: () => void;
}

export const useWeeklyStore = create<WeeklyStore>((set, get) => ({
  // Initial state
  currentWeek: null,
  history: [],
  summary: null,
  isLoading: false,
  isSubmitting: false,
  error: null,

  // Fetch current week status
  fetchCurrentWeek: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await weeklyService.getCurrentWeek();
      set({ currentWeek: data, isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Không thể tải dữ liệu';
      set({ error: message, isLoading: false });
    }
  },

  // Submit check-in
  submitCheckIn: async (request: CheckInRequest) => {
    try {
      set({ isSubmitting: true, error: null });
      const result = await weeklyService.submitCheckIn(request);

      // Refresh current week after submitting
      await get().fetchCurrentWeek();

      set({ isSubmitting: false });
      return true;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Không thể check-in';
      set({ error: message, isSubmitting: false });
      return false;
    }
  },

  // Fetch history
  fetchHistory: async (page = 1) => {
    try {
      set({ isLoading: true, error: null });
      const data = await weeklyService.getHistory(page);
      set({ history: data.items, isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Không thể tải lịch sử';
      set({ error: message, isLoading: false });
    }
  },

  // Fetch summary
  fetchSummary: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await weeklyService.getSummary();
      set({ summary: data, isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Không thể tải thống kê';
      set({ error: message, isLoading: false });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
