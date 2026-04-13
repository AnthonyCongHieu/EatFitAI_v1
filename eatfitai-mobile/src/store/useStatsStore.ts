import { create } from 'zustand';
import { summaryService, type WeekSummary } from '../services/summaryService';

export type StatsState = {
  weekSummary: WeekSummary | null;
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  // Cache để lưu dữ liệu các tuần đã fetch
  weekCache: Map<string, WeekSummary>;
  setSelectedDate: (date: string) => void;
  fetchWeekSummary: (date?: string) => Promise<void>;
  refreshWeekSummary: () => Promise<void>;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

export const useStatsStore = create<StatsState>((set: any, get: any) => ({
  weekSummary: null,
  selectedDate: formatDate(getStartOfWeek(new Date())),
  isLoading: false,
  error: null,
  weekCache: new Map<string, WeekSummary>(),

  setSelectedDate(date: string) {
    set({ selectedDate: date });
    get().fetchWeekSummary(date);
  },

  goToPreviousWeek() {
    const current = new Date(get().selectedDate);
    current.setDate(current.getDate() - 7);
    const newDate = formatDate(current);
    set({ selectedDate: newDate });
    get().fetchWeekSummary(newDate);
  },

  goToNextWeek() {
    const current = new Date(get().selectedDate);
    current.setDate(current.getDate() + 7);
    const newDate = formatDate(current);
    set({ selectedDate: newDate });
    get().fetchWeekSummary(newDate);
  },

  async fetchWeekSummary(date?: string) {
    const targetDate = date ?? get().selectedDate;
    const cache = get().weekCache;

    // Kiểm tra cache trước - nếu có thì hiển ngay (optimistic UI)
    if (cache.has(targetDate)) {
      const cachedData = cache.get(targetDate);
      set({ weekSummary: cachedData, selectedDate: targetDate });
      // Vẫn fetch mới nhưng không block UI
      summaryService
        .getWeekSummary(targetDate)
        .then((data) => {
          cache.set(targetDate, data);
          set({ weekSummary: data, weekCache: new Map(cache) });
        })
        .catch(() => {}); // Silent refresh
      return;
    }

    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await summaryService.getWeekSummary(targetDate);
      cache.set(targetDate, data);
      set({ weekSummary: data, weekCache: new Map(cache) });
    } catch (error: any) {
      set({ error: error?.message ?? 'Không thể tải thống kê' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  async refreshWeekSummary() {
    set({ error: null });
    try {
      const data = await summaryService.getWeekSummary(get().selectedDate);
      set({ weekSummary: data });
    } catch (error: any) {
      set({ error: error?.message ?? 'Không thể tải thống kê' });
      throw error;
    }
  },
}));
