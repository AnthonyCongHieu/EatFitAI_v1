import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  profileService,
  type UpdateProfilePayload,
  type UserProfile,
} from '../services/profileService';

type FetchProfileOptions = {
  force?: boolean;
};

type ProfileState = {
  profile: UserProfile | null;
  ownerUserId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  lastFetched: number | null;
  fetchProfile: (options?: FetchProfileOptions) => Promise<UserProfile | null>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  invalidateProfile: () => void;
  syncForUser: (userId: string | null) => void;
  clear: () => void;
};

const CACHE_DURATION_MS = 5 * 60 * 1000;

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      ownerUserId: null,
      isLoading: false,
      isSaving: false,
      lastFetched: null,

      async fetchProfile(options) {
        const state = get();
        const force = options?.force === true;
        const ownerUserId = state.ownerUserId;

        if (state.isLoading) {
          return state.profile;
        }

        if (
          !force &&
          state.profile &&
          state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_DURATION_MS
        ) {
          return state.profile;
        }

        set({ isLoading: true });
        try {
          const data = await profileService.getProfile();
          if (get().ownerUserId !== ownerUserId) {
            return null;
          }

          set({ profile: data, lastFetched: Date.now() });
          return data;
        } catch (error) {
          if (get().ownerUserId !== ownerUserId) {
            return null;
          }

          if (!force && state.profile) {
            return state.profile;
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      async updateProfile(payload) {
        const ownerUserId = get().ownerUserId;
        set({ isSaving: true });
        try {
          const updated = await profileService.updateProfile(payload);
          if (get().ownerUserId !== ownerUserId) {
            return updated;
          }

          set({ profile: updated, lastFetched: null });

          try {
            const freshProfile = await profileService.getProfile();
            if (get().ownerUserId !== ownerUserId) {
              return freshProfile;
            }

            set({ profile: freshProfile, lastFetched: Date.now() });
            return freshProfile;
          } catch {
            if (get().ownerUserId !== ownerUserId) {
              return updated;
            }

            set({ profile: updated, lastFetched: Date.now() });
            return updated;
          }
        } finally {
          set({ isSaving: false });
        }
      },

      syncForUser(userId) {
        const state = get();
        if (state.ownerUserId === userId) {
          return;
        }

        set({
          profile: null,
          isLoading: false,
          isSaving: false,
          lastFetched: null,
          ownerUserId: userId,
        });
      },

      invalidateProfile() {
        set({ lastFetched: null });
      },

      clear() {
        set({
          profile: null,
          isLoading: false,
          isSaving: false,
          lastFetched: null,
          ownerUserId: null,
        });
      },
    }),
    {
      name: 'eatfitai-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        lastFetched: state.lastFetched,
        ownerUserId: state.ownerUserId,
      }),
    },
  ),
);
