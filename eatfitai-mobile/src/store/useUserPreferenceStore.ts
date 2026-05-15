import { create } from 'zustand';
import { UserPreference } from '../app/types';
import { profileService } from '../services/profileService';
import { getDeviceTimeZone } from '../utils/businessDate';

interface UserPreferenceState {
  preferences: UserPreference | null;
  isLoading: boolean;
  error: string | null;

  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: UserPreference) => Promise<void>;
}

export const useUserPreferenceStore = create<UserPreferenceState>((set) => ({
  preferences: null,
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await profileService.getUserPreferences();
      set({ preferences, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updatePreferences: async (prefs) => {
    set({ isLoading: true, error: null });
    try {
      const nextPreferences = {
        ...prefs,
        timeZoneId: prefs.timeZoneId ?? getDeviceTimeZone(),
      };
      await profileService.updateUserPreferences(nextPreferences);
      set({ preferences: nextPreferences, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
