// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';

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

const normalizeProfile = (data: any): UserProfile => ({
  id: String(data?.id ?? data?.userId ?? ''),
  fullName: data?.fullName ?? data?.name ?? undefined,
  email: data?.email ?? undefined,
  heightCm: typeof data?.heightCm === 'number' ? data.heightCm : undefined,
  dateOfBirth: data?.dateOfBirth ?? undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/profile/me');
    return normalizeProfile(response.data);
  },

  // Cap nhat ho so (PUT /api/profile/me)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    // Pick only fields supported by backend SP
    const req: any = {
      fullName: payload.fullName ?? null,
      heightCm: payload.heightCm ?? null,
      dateOfBirth: payload.dateOfBirth ?? null,
    };
    const response = await apiClient.put('/api/profile/me', req);
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
