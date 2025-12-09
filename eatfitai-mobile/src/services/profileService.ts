// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';

export type UserProfile = {
  id: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string; // URL của avatar (từ Supabase Storage hoặc backend)
  heightCm?: number;
  weightKg?: number;
  lastMeasuredDate?: string;
  createdAt?: string;
  // Profile fields for AI nutrition
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  activityLevelId?: number;
  activityFactor?: number;
  goal?: string;
};

export type UpdateProfilePayload = {
  fullName?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  avatarUrl?: string | null; // URL của avatar sau khi upload
  // Profile fields for AI nutrition
  gender?: string | null;
  dateOfBirth?: string | null;
  activityLevelId?: number | null;
  goal?: string | null;
};

export type BodyMetricsPayload = {
  heightCm?: number | null;
  weightKg?: number | null;
  measuredDate?: string | null;
  note?: string | null;
};

const normalizeProfile = (data: any): UserProfile => ({
  id: String(data?.userId ?? ''),
  fullName: data?.displayName ?? undefined,
  email: data?.email ?? undefined,
  avatarUrl: data?.avatarUrl ?? undefined,
  heightCm: data?.currentHeightCm ?? undefined,
  weightKg: data?.currentWeightKg ?? undefined,
  lastMeasuredDate: data?.lastMeasuredDate ?? undefined,
  createdAt: data?.createdAt ?? undefined,
  // Profile fields for AI nutrition
  gender: data?.gender ?? undefined,
  dateOfBirth: data?.dateOfBirth ?? undefined,
  age: data?.age ?? undefined,
  activityLevelId: data?.activityLevelId ?? undefined,
  activityFactor: data?.activityFactor ?? undefined,
  goal: data?.goal ?? undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/profile');
    return normalizeProfile(response.data);
  },

  // Cap nhat ho so (PUT /api/profile)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const req: any = {
      displayName: payload.fullName ?? null,
      currentHeightCm: payload.heightCm ?? null,
      currentWeightKg: payload.weightKg ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      // Profile fields for AI nutrition
      gender: payload.gender ?? null,
      dateOfBirth: payload.dateOfBirth ?? null,
      activityLevelId: payload.activityLevelId ?? null,
      goal: payload.goal ?? null,
    };
    const response = await apiClient.put('/api/profile', req);
    return normalizeProfile(response.data);
  },

  // Upload avatar image (multipart/form-data)
  // Trả về URL của avatar sau khi upload
  async uploadAvatar(imageUri: string): Promise<string> {
    const formData = new FormData();

    // Tạo file object từ URI
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post('/api/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Backend trả về URL của avatar đã upload
    return response.data?.avatarUrl ?? response.data?.url ?? '';
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
