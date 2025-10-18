// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  heightCm?: number;
  weightKg?: number;
  dateOfBirth?: string;
};

export type UpdateProfilePayload = {
  fullName: string;
  phone?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: string | null;
};

export type BodyMetricsPayload = {
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number | null;
  recordedAt?: string | null;
};

const normalizeProfile = (data: any): UserProfile => ({
  id: String(data?.id ?? ''),
  fullName: data?.fullName ?? data?.name ?? '',
  email: data?.email ?? '',
  phone: data?.phone ?? data?.phoneNumber ?? undefined,
  heightCm: typeof data?.heightCm === 'number' ? data.heightCm : data?.height ?? undefined,
  weightKg: typeof data?.weightKg === 'number' ? data.weightKg : data?.weight ?? undefined,
  dateOfBirth: data?.dateOfBirth ?? data?.birthDate ?? undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/profile/me');
    return normalizeProfile(response.data);
  },

  // Cap nhat ho so (PUT /api/profile/me)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const response = await apiClient.put('/api/profile/me', payload);
    return normalizeProfile(response.data);
  },

  // Goi so do co the (POST /api/body-metrics)
  async createBodyMetrics(payload: BodyMetricsPayload): Promise<void> {
    await apiClient.post('/api/body-metrics', payload);
  },
};
