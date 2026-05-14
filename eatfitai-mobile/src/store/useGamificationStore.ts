import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { diaryService } from '../services/diaryService';

export const GAMIFICATION_STORAGE_KEY = 'gamification-storage';

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

/** Wipe persisted gamification data from SecureStore (call on logout) */
export const clearGamificationStorage = async () => {
  try {
    await SecureStore.deleteItemAsync(GAMIFICATION_STORAGE_KEY);
  } catch { /* ignore */ }
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
  totalXP: number;
  achievements: Achievement[];
  /** 7 ngày gần nhất: true = đã log, false = chưa log (index 0 = 6 ngày trước, index 6 = hôm nay) */
  weeklyLogs: boolean[];
  lastWeeklyFetch: number; // timestamp
  lastStreakCheck: string | null; // date string yyyy-MM-dd
  dailyQuestsClaimed: Record<string, string>; // questId -> date string yyyy-MM-dd

  // Actions
  checkStreak: () => Promise<void>;
  fetchWeeklyLogs: () => Promise<void>;
  unlockAchievement: (id: string) => void;
  addXP: (amount: number) => void;
  claimDailyQuest: (questId: string, xp: number) => void;
  syncAchievementProgress: () => void;
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
    id: 'log_30_meals',
    title: 'Khởi động tốt',
    description: 'Ghi lại 30 món ăn',
    icon: 'pizza',
    progress: 0,
    target: 30,
  },
  {
    id: 'log_50_meals',
    title: 'Người sành ăn',
    description: 'Ghi lại 50 món ăn',
    icon: 'fast-food',
    progress: 0,
    target: 50,
  },
  {
    id: 'log_100_meals',
    title: 'Chuyên gia dinh dưỡng',
    description: 'Ghi lại 100 món ăn',
    icon: 'restaurant',
    progress: 0,
    target: 100,
  },
  {
    id: 'streak_14',
    title: 'Gương mặt thân quen',
    description: 'Duy trì chuỗi 14 ngày',
    icon: 'star',
    progress: 0,
    target: 14,
  },
  {
    id: 'streak_30',
    title: 'Kỷ luật thép',
    description: 'Duy trì chuỗi 30 ngày',
    icon: 'shield-checkmark',
    progress: 0,
    target: 30,
  },
  {
    id: 'streak_50',
    title: 'Kiên trì',
    description: 'Duy trì chuỗi 50 ngày',
    icon: 'flame',
    progress: 0,
    target: 50,
  },
  {
    id: 'streak_100',
    title: 'Huyền thoại',
    description: 'Duy trì chuỗi 100 ngày',
    icon: 'trophy',
    progress: 0,
    target: 100,
  },
  {
    id: 'streak_200',
    title: 'Nửa năm kiên trì',
    description: 'Duy trì chuỗi 200 ngày',
    icon: 'ribbon',
    progress: 0,
    target: 200,
  },
  {
    id: 'log_200_meals',
    title: 'Chiến thần ăn kiêng',
    description: 'Ghi lại 200 món ăn',
    icon: 'restaurant',
    progress: 0,
    target: 200,
  },
  {
    id: 'log_500_meals',
    title: 'Thực thần',
    description: 'Ghi lại 500 món ăn',
    icon: 'medal',
    progress: 0,
    target: 500,
  },
  {
    id: 'log_1000_meals',
    title: 'Chuyên gia nghìn bữa',
    description: 'Ghi lại 1000 món ăn',
    icon: 'star-half',
    progress: 0,
    target: 1000,
  },
  {
    id: 'water_master',
    title: 'Bậc thầy cấp nước',
    description: 'Đạt mục tiêu nước uống 7 ngày',
    icon: 'water',
    progress: 0,
    target: 7,
  },
  {
    id: 'water_30',
    title: 'Đại dương xanh',
    description: 'Đạt mục tiêu nước 30 ngày',
    icon: 'water-outline',
    progress: 0,
    target: 30,
  },
  {
    id: 'water_100',
    title: 'Thủy thần',
    description: 'Đạt mục tiêu nước 100 ngày',
    icon: 'boat',
    progress: 0,
    target: 100,
  },
  {
    id: 'early_bird',
    title: 'Chim sớm',
    description: 'Ghi lại bữa sáng trước 8 giờ',
    icon: 'sunny',
    progress: 0,
    target: 1,
  },
  {
    id: 'early_bird_7',
    title: 'Thói quen tốt',
    description: 'Ghi bữa sáng sớm 7 ngày',
    icon: 'partly-sunny',
    progress: 0,
    target: 7,
  },
];

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      totalDaysLogged: 0,
      totalXP: 0,
      achievements: INITIAL_ACHIEVEMENTS,
      weeklyLogs: [false, false, false, false, false, false, false],
      lastWeeklyFetch: 0,
      lastStreakCheck: null,
      dailyQuestsClaimed: {},

      fetchWeeklyLogs: async () => {
        try {
          const now = Date.now();
          const { lastWeeklyFetch } = get();

          // Cooldown 2 phút cho weekly logs
          if (now - lastWeeklyFetch < 2 * 60 * 1000) {
            console.log('[GamificationStore] Weekly logs fresh, skipping fetch');
            return;
          }

          const today = new Date();
          const todayStr = today.toISOString().split('T')[0] ?? '';
          const summary = await diaryService.getWeekSummary(todayStr);

          const logs: boolean[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0] ?? '';
            // Nếu có calories > 0 thì coi là đã log
            const hasLog = (summary.dailyCalories[dateStr] ?? 0) > 0;
            logs.push(hasLog);
          }

          set({ weeklyLogs: logs, lastWeeklyFetch: now });
        } catch (error) {
          console.error('Error fetching weekly logs:', error);
        }
      },

      checkStreak: async () => {
        try {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0] ?? '';
          const { longestStreak } = get();

          // Lấy dữ liệu 14 ngày gần nhất để tính streak chính xác hơn
          const summary = await diaryService.getWeekSummary(todayStr);

          // Tính currentStreak từ dữ liệu thực tế (đếm ngược từ hôm nay)
          let calculatedStreak = 0;
          let totalDays = 0;

          // Tạo danh sách 14 ngày gần nhất
          const dates: string[] = [];
          for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0] ?? '');
          }

          // Đếm streak (ngày liên tiếp từ hôm nay hoặc hôm qua)
          let foundFirstLog = false;
          for (let i = 0; i < dates.length; i++) {
            const dateStr = dates[i] ?? '';
            const hasLog = (summary.dailyCalories[dateStr] ?? 0) > 0;

            if (hasLog) {
              totalDays++;
              if (!foundFirstLog) {
                foundFirstLog = true;
                calculatedStreak = 1;
              } else {
                calculatedStreak++;
              }
            } else {
              // Nếu hôm nay chưa log nhưng hôm qua có log thì vẫn tiếp tục đếm
              if (i === 0) {
                continue; // Bỏ qua hôm nay nếu chưa log
              }
              // Gặp ngày không log thì dừng streak
              if (foundFirstLog) break;
            }
          }

          // Update weeklyLogs (7 ngày gần nhất cho UI)
          const weeklyLogs: boolean[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0] ?? '';
            const hasLog = (summary.dailyCalories[dateStr] ?? 0) > 0;
            weeklyLogs.push(hasLog);
          }

          // Cập nhật state
          const newLongestStreak = Math.max(longestStreak, calculatedStreak);

          set({
            currentStreak: calculatedStreak,
            longestStreak: newLongestStreak,
            totalDaysLogged: totalDays,
            weeklyLogs,
            lastWeeklyFetch: Date.now(),
            lastStreakCheck: todayStr,
            lastLogDate: weeklyLogs[6] ? todayStr : null, // Hôm nay đã log?
            // Sync progress cho achievements
            achievements: get().achievements.map((a) => {
              if (a.id === 'streak_3') {
                return { ...a, progress: Math.min(calculatedStreak, a.target) };
              }
              if (a.id === 'streak_7') {
                return { ...a, progress: Math.min(calculatedStreak, a.target) };
              }
              if (a.id === 'first_log') {
                return { ...a, progress: Math.min(totalDays, a.target) };
              }
              return a;
            }),
          });

          // Unlock achievements nếu đạt target
          const { unlockAchievement } = get();
          if (calculatedStreak >= 3) unlockAchievement('streak_3');
          if (calculatedStreak >= 7) unlockAchievement('streak_7');
          if (totalDays >= 1) unlockAchievement('first_log');

          console.log('[GamificationStore] Streak calculated:', {
            calculatedStreak,
            totalDays,
            newLongestStreak,
          });
        } catch (error) {
          console.error('Error checking streak:', error);
        }
      },

      unlockAchievement: (id: string) => {
        set((state) => {
          const achievement = state.achievements.find((a) => a.id === id);
          if (achievement && !achievement.unlockedAt) {
            return {
              achievements: state.achievements.map((a) =>
                a.id === id
                  ? { ...a, unlockedAt: new Date().toISOString(), progress: a.target }
                  : a,
              ),
              totalXP: state.totalXP + 50, // +50 XP per achievement
            };
          }
          return state;
        });
      },

      addXP: (amount: number) => {
        set((state) => ({ totalXP: state.totalXP + amount }));
      },

      claimDailyQuest: (questId: string, xp: number) => {
        const todayStr = new Date().toISOString().split('T')[0]!;
        set((state) => {
          const lastClaimed = state.dailyQuestsClaimed?.[questId];
          if (lastClaimed === todayStr) return state; // Already claimed today

          return {
            totalXP: state.totalXP + xp,
            dailyQuestsClaimed: {
              ...(state.dailyQuestsClaimed || {}),
              [questId]: todayStr,
            },
          };
        });
      },

      // Sync progress của achievements với state hiện tại (gọi khi vào AchievementsScreen)
      syncAchievementProgress: () => {
        const { currentStreak, totalDaysLogged, achievements } = get();

        const updatedAchievements = achievements.map((a) => {
          // Không cập nhật nếu đã unlock
          if (a.unlockedAt) return a;

          let newProgress = a.progress;
          if (a.id === 'streak_3' || a.id === 'streak_7') {
            newProgress = Math.min(currentStreak, a.target);
          } else if (a.id === 'first_log') {
            newProgress = Math.min(totalDaysLogged, a.target);
          }

          // Auto unlock nếu đạt target
          if (newProgress >= a.target) {
            return { ...a, progress: a.target, unlockedAt: new Date().toISOString() };
          }

          return { ...a, progress: newProgress };
        });

        set({ achievements: updatedAchievements });
      },

      reset: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastLogDate: null,
          totalDaysLogged: 0,
          totalXP: 0,
          achievements: INITIAL_ACHIEVEMENTS,
          weeklyLogs: [false, false, false, false, false, false, false],
          lastWeeklyFetch: 0,
          lastStreakCheck: null,
          dailyQuestsClaimed: {},
        });
      },
    }),
    {
      name: GAMIFICATION_STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      merge: (persistedState: any, currentState: GamificationState) => {
        if (!persistedState) return currentState;
        // Ensure new achievements are added to existing persisted accounts
        const persistedAchievements = persistedState.achievements || [];
        const mergedAchievements = [...persistedAchievements];

        INITIAL_ACHIEVEMENTS.forEach((initialAchv) => {
          if (!mergedAchievements.some((a) => a.id === initialAchv.id)) {
            mergedAchievements.push(initialAchv);
          }
        });

        return {
          ...currentState,
          ...persistedState,
          achievements: mergedAchievements,
        };
      },
    },
  ),
);
