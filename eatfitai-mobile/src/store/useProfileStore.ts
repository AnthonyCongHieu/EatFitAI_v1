// Store Zustand quan ly ho so nguoi dung
// Chu thich bang tieng Viet khong dau

import { create } from 'zustand';

import { profileService, type UpdateProfilePayload, type UserProfile } from '../services/profileService';

type ProfileState = {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  clear: () => void;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  isSaving: false,

  // Load ho so tu server va luu lai trong state
  async fetchProfile() {
    if (get().isLoading) {
      return get().profile;
    }
    set({ isLoading: true });
    try {
      const data = await profileService.getProfile();
      set({ profile: data });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  // Goi yeu cau cap nhat ho so va dong bo state
  async updateProfile(payload) {
    set({ isSaving: true });
    try {
      const updated = await profileService.updateProfile(payload);
      set({ profile: updated });
      return updated;
    } finally {
      set({ isSaving: false });
    }
  },

  // Xoa du lieu ho so trong bo nho (vi du khi logout)
  clear() {
    set({ profile: null });
  },
}));
