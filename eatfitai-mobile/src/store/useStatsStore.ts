import { create } from 'zustand';
import { summaryService, type WeekSummary } from '../services/summaryService';
import { formatLocalDate } from '../utils/localDate';

export type StatsState = {
  weekSummary: WeekSummary | null;
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  // Cache để lưu dữ liệu các tuần đã fetch
  weekCache: Map<string, WeekSummary>;
  weekFetchedAt: Map<string, number>;
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

const formatDate = (date: Date): string => formatLocalDate(date);
const WEEK_SUMMARY_FRESH_MS = 5000;
const weekSummaryInFlight = new Map<string, Promise<void>>();

export const useStatsStore = create<StatsState>((set: any, get: any) => ({
  weekSummary: null,
  selectedDate: formatDate(getStartOfWeek(new Date())),
  isLoading: false,
  error: null,
  weekCache: new Map<string, WeekSummary>(),
  weekFetchedAt: new Map<string, number>(),

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
    const fetchedAt = get().weekFetchedAt;
    const inFlight = weekSummaryInFlight.get(targetDate);
    if (inFlight) {
      return inFlight;
    }

    // Kiểm tra cache trước - nếu có thì hiển ngay (optimistic UI)
    if (cache.has(targetDate)) {
      const cachedData = cache.get(targetDate);
      set({ weekSummary: cachedData, selectedDate: targetDate });
      if (Date.now() - (fetchedAt.get(targetDate) ?? 0) < WEEK_SUMMARY_FRESH_MS) {
        return;
      }

      // Vẫn fetch mới nhưng không block UI
      const backgroundRefresh = summaryService
        .getWeekSummary(targetDate)
        .then((data) => {
          cache.set(targetDate, data);
          fetchedAt.set(targetDate, Date.now());
          set({
            weekSummary: data,
            weekCache: new Map(cache),
            weekFetchedAt: new Map(fetchedAt),
          });
        })
        .catch(() => {}) // Silent refresh
        .finally(() => {
          weekSummaryInFlight.delete(targetDate);
        });
      weekSummaryInFlight.set(targetDate, backgroundRefresh);
      return;
    }

    if (get().isLoading) {
      return;
    }
    const request = (async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await summaryService.getWeekSummary(targetDate);
        cache.set(targetDate, data);
        fetchedAt.set(targetDate, Date.now());
        set({
          weekSummary: data,
          weekCache: new Map(cache),
          weekFetchedAt: new Map(fetchedAt),
        });
      } catch (error: any) {
        set({ error: error?.message ?? 'Không thể tải thống kê' });
        throw error;
      } finally {
        weekSummaryInFlight.delete(targetDate);
        set({ isLoading: false });
      }
    })();

    weekSummaryInFlight.set(targetDate, request);
    return request;
  },

  async refreshWeekSummary() {
    set({ error: null });
    try {
      const cache = get().weekCache;
      const fetchedAt = get().weekFetchedAt;
      const data = await summaryService.getWeekSummary(get().selectedDate);
      cache.set(get().selectedDate, data);
      fetchedAt.set(get().selectedDate, Date.now());
      set({
        weekSummary: data,
        weekCache: new Map(cache),
        weekFetchedAt: new Map(fetchedAt),
      });
    } catch (error: any) {
      set({ error: error?.message ?? 'Không thể tải thống kê' });
      throw error;
    }
  },
}));
