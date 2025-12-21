// Store Zustand quan ly ho so nguoi dung
// Chu thich bang tieng Viet khong dau
// ✅ Them persist middleware de luu profile vao AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  profileService,
  type UpdateProfilePayload,
  type UserProfile,
} from '../services/profileService';

type ProfileState = {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  lastFetched: number | null; // Timestamp khi fetch lan cuoi
  fetchProfile: () => Promise<UserProfile | null>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  clear: () => void;
};

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      isSaving: false,
      lastFetched: null,

      // Load ho so tu server va luu lai trong state
      async fetchProfile() {
        const state = get();

        // Neu dang loading, tra ve profile hien tai
        if (state.isLoading) {
          return state.profile;
        }

        // Kiem tra cache - neu van con hieu luc, tra ve profile cached
        const now = Date.now();
        if (
          state.profile &&
          state.lastFetched &&
          now - state.lastFetched < CACHE_DURATION
        ) {
          // Vẫn fetch trong background để cập nhật nếu có thay đổi
          profileService.getProfile().then((data) => {
            set({ profile: data, lastFetched: Date.now() });
          }).catch(() => {
            // Silent fail - sử dụng cached data
          });
          return state.profile;
        }

        set({ isLoading: true });
        try {
          const data = await profileService.getProfile();
          set({ profile: data, lastFetched: Date.now() });
          return data;
        } catch (error) {
          // Nếu có lỗi nhưng có cached profile, vẫn trả về cached
          if (state.profile) {
            return state.profile;
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Goi yeu cau cap nhat ho so va dong bo state
      async updateProfile(payload) {
        set({ isSaving: true });
        try {
          const updated = await profileService.updateProfile(payload);
          set({ profile: updated, lastFetched: Date.now() });
          return updated;
        } finally {
          set({ isSaving: false });
        }
      },

      // Xoa du lieu ho so trong bo nho (vi du khi logout)
      clear() {
        set({ profile: null, lastFetched: null });
      },
    }),
    {
      name: 'eatfitai-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Chỉ persist các field cần thiết (không persist isLoading, isSaving)
      partialize: (state) => ({
        profile: state.profile,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
