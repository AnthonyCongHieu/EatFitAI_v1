// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';
import type { UserDto } from '../types';

export type UserProfile = {
  id: string;
  fullName?: string;
  email?: string;
  heightCm?: number;
  dateOfBirth?: string;
  // legacy fields for UI convenience (not provided by backend profile)
  phone?: string;
  weightKg?: number;
};

export type UpdateProfilePayload = {
  fullName?: string | null;
  heightCm?: number | null;
  dateOfBirth?: string | null; // YYYY-MM-DD
};

export type BodyMetricsPayload = {
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number | null;
  recordedAt?: string | null;
};

const normalizeProfile = (data: UserDto): UserProfile => ({
  id: String(data?.userId ?? ''),
  fullName: data?.displayName ?? undefined,
  email: data?.email ?? undefined,
  heightCm: undefined,
  dateOfBirth: undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/users/profile');
    return normalizeProfile(response.data);
  },

  // Cap nhat ho so (PUT /api/profile/me)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    // Pick only fields supported by backend SP
    const req: UserDto = {
      displayName: payload.fullName ?? null,
    };
    const response = await apiClient.put('/api/users/profile', req);
    return normalizeProfile(response.data);
  },

  // Goi so do co the (POST /api/body-metrics)
  async createBodyMetrics(payload: BodyMetricsPayload): Promise<void> {
    // Backend expects: weightKg, bodyFatPercent?, recordedAt?
    const req: any = {
      weightKg: payload.weightKg,
      bodyFatPercent: payload.bodyFatPercent ?? null,
      recordedAt: payload.recordedAt ?? null,
    };
    await apiClient.post('/api/body-metrics', req);
  },
}; 
