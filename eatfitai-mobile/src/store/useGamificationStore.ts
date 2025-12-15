import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { diaryService } from '../services/diaryService';

// SecureStore adapter for Zustand
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO date
  progress: number; // 0-100
  target: number;
}

interface GamificationState {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  totalDaysLogged: number;
  achievements: Achievement[];
  /** 7 ngày gần nhất: true = đã log, false = chưa log (index 0 = 6 ngày trước, index 6 = hôm nay) */
  weeklyLogs: boolean[];

  // Actions
  checkStreak: () => Promise<void>;
  fetchWeeklyLogs: () => Promise<void>;
  unlockAchievement: (id: string) => void;
  reset: () => void;
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_log',
    title: 'Khởi đầu mới',
    description: 'Ghi lại món ăn đầu tiên',
    icon: 'rocket',
    progress: 0,
    target: 1,
  },
  {
    id: 'streak_3',
    title: 'Kiên trì',
    description: 'Duy trì chuỗi 3 ngày liên tiếp',
    icon: 'flame',
    progress: 0,
    target: 3,
  },
  {
    id: 'streak_7',
    title: 'Thói quen tốt',
    description: 'Duy trì chuỗi 7 ngày liên tiếp',
    icon: 'calendar',
    progress: 0,
    target: 7,
  },
  {
    id: 'log_100_meals',
    title: 'Chuyên gia dinh dưỡng',
    description: 'Ghi lại 100 món ăn',
    icon: 'restaurant',
    progress: 0,
    target: 100,
  },
];

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      totalDaysLogged: 0,
      achievements: INITIAL_ACHIEVEMENTS,
      weeklyLogs: [false, false, false, false, false, false, false],

      fetchWeeklyLogs: async () => {
        try {
          const logs: boolean[] = [];
          const today = new Date();

          // Check 7 ngày gần nhất (index 0 = 6 ngày trước, index 6 = hôm nay)
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0] ?? '';

            try {
              const entries = await diaryService.getEntriesByDate(dateStr);
              logs.push(entries.length > 0);
            } catch {
              logs.push(false);
            }
          }

          set({ weeklyLogs: logs });
        } catch (error) {
          console.error('Error fetching weekly logs:', error);
        }
      },

      checkStreak: async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const { lastLogDate, currentStreak, longestStreak, totalDaysLogged } = get();

          // Check if user logged today by fetching summary
          const summary = await diaryService.getTodaySummary();
          const hasLoggedToday = summary.meals.some((m) => m.entries.length > 0);

          if (!hasLoggedToday) {
            // If haven't logged today, we don't break streak yet (streak breaks if missed yesterday)
            // But we don't increment either.
            // However, we need to check if yesterday was missed.
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (
              lastLogDate !== today &&
              lastLogDate !== yesterdayStr &&
              lastLogDate !== null
            ) {
              // Missed yesterday, reset streak
              set({ currentStreak: 0 });
            }
            return;
          }

          // User has logged today
          if (lastLogDate === today) {
            // Already counted for today
            return;
          }

          // New day logged
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          let newStreak = currentStreak;

          if (lastLogDate === yesterdayStr) {
            // Consecutive day
            newStreak += 1;
          } else if (lastLogDate === null) {
            // First day ever
            newStreak = 1;
          } else {
            // Broken streak, restart
            newStreak = 1;
          }

          set({
            currentStreak: newStreak,
            longestStreak: Math.max(longestStreak, newStreak),
            lastLogDate: today,
            totalDaysLogged: totalDaysLogged + 1,
          });

          // Check achievements
          const { unlockAchievement } = get();
          if (newStreak >= 3) unlockAchievement('streak_3');
          if (newStreak >= 7) unlockAchievement('streak_7');
          if (totalDaysLogged + 1 >= 1) unlockAchievement('first_log');
        } catch (error) {
          console.error('Error checking streak:', error);
        }
      },

      unlockAchievement: (id: string) => {
        set((state) => {
          const achievement = state.achievements.find((a) => a.id === id);
          if (achievement && !achievement.unlockedAt) {
            // Show toast or notification here if needed
            return {
              achievements: state.achievements.map((a) =>
                a.id === id
                  ? { ...a, unlockedAt: new Date().toISOString(), progress: a.target }
                  : a,
              ),
            };
          }
          return state;
        });
      },

      reset: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastLogDate: null,
          totalDaysLogged: 0,
          achievements: INITIAL_ACHIEVEMENTS,
          weeklyLogs: [false, false, false, false, false, false, false],
        });
      },
    }),
    {
      name: 'gamification-storage',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
