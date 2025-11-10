// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';
import type { UserDto } from '../types';

export type UserProfile = {
  id: string;
  fullName?: string;
  email?: string;
  heightCm?: number;
  weightKg?: number;
  createdAt?: string;
};

export type UpdateProfilePayload = {
  fullName?: string | null;
};

export type BodyMetricsPayload = {
  heightCm?: number | null;
  weightKg?: number | null;
  measuredDate?: string | null;
  note?: string | null;
};

const normalizeProfile = (data: UserDto): UserProfile => ({
  id: String(data?.userId ?? ''),
  fullName: data?.displayName ?? undefined,
  email: data?.email ?? undefined,
  heightCm: undefined,
  weightKg: undefined,
  createdAt: data?.createdAt ?? undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/profile');
    return normalizeProfile(response.data);
  },

  // Cap nhat ho so (PUT /api/profile)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    // Pick only fields supported by backend SP
    const req: UserDto = {
      displayName: payload.fullName ?? null,
    };
    const response = await apiClient.put('/api/profile', req);
    return normalizeProfile(response.data);
  },

  // Goi so do co the (POST /api/body-metrics)
  async createBodyMetrics(payload: BodyMetricsPayload): Promise<void> {
    // Backend expects: heightCm?, weightKg?, measuredDate, note?
    const req: any = {
      heightCm: payload.heightCm ?? null,
      weightKg: payload.weightKg ?? null,
      measuredDate: payload.measuredDate ?? new Date().toISOString(),
      note: payload.note ?? null,
    };
    await apiClient.post('/api/body-metrics', req);
  },
}; 
