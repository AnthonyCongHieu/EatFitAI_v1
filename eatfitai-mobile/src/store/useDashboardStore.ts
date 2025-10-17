import { create } from 'zustand';

type Profile = {
  name: string;
  targetCalories: number;
};

type DashboardState = {
  profile: Profile | null;
  hydration: number;
  setProfile: (profile: Profile) => void;
  addHydration: (ml: number) => void;
  loadProfile: () => Promise<void>;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  profile: null,
  hydration: 0,
  setProfile: (profile) => set({ profile }),
  addHydration: (ml) =>
    set((state) => ({
      hydration: Math.max(0, state.hydration + ml),
    })),
  loadProfile: async () => {
    // TODO: thay bằng call API thật khi backend sẵn sàng
    const mockProfile: Profile = {
      name: 'EatFit AI',
      targetCalories: 1800,
    };
    set({ profile: mockProfile });
  },
}));
