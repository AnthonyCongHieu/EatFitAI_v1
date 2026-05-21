// Service lam viec voi API ho so va body metrics
// Chu thich tieng Viet toan bo

import apiClient from './apiClient';
import { loadWithOfflineFallback, offlineCache } from './offlineCache';
import { formatBusinessDate, getDeviceTimeZone, setBusinessTimeZoneId } from '../utils/businessDate';

const PROFILE_CACHE_KEY = '@eatfit_cache:profile';
const BODY_METRICS_HISTORY_CACHE_PREFIX = '@eatfit_cache:body-metrics:';

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
  // Profile 2026 - Gamification & Goal Tracking
  targetWeightKg?: number;
  currentStreak?: number;
  longestStreak?: number;
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
  // Profile 2026 - Target weight
  targetWeightKg?: number | null;
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
  // Profile 2026 - Gamification & Goal Tracking
  targetWeightKg: data?.targetWeightKg ?? undefined,
  currentStreak: data?.currentStreak ?? undefined,
  longestStreak: data?.longestStreak ?? undefined,
});

export const profileService = {
  // Lay thong tin ho so cua chinh nguoi dung
  async getProfile(): Promise<UserProfile> {
    return loadWithOfflineFallback(PROFILE_CACHE_KEY, async () => {
      const response = await apiClient.get('/api/profile');
      return normalizeProfile(response.data);
    });
  },

  // Cap nhat ho so (PUT /api/profile)
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    // Lấy thông tin hồ sơ hiện tại để tránh việc làm mất các trường không truyền lên trong payload
    let currentProfile: UserProfile | null = null;
    try {
      currentProfile = await profileService.getProfile();
    } catch (e) {
      // Bỏ qua nếu có lỗi
    }

    const req: any = {
      displayName: payload.fullName !== undefined ? payload.fullName : (currentProfile?.fullName ?? null),
      currentHeightCm: payload.heightCm !== undefined ? payload.heightCm : (currentProfile?.heightCm ?? null),
      currentWeightKg: payload.weightKg !== undefined ? payload.weightKg : (currentProfile?.weightKg ?? null),
      avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : (currentProfile?.avatarUrl ?? null),
      // Profile fields for AI nutrition
      gender: payload.gender !== undefined ? payload.gender : (currentProfile?.gender ?? null),
      dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : (currentProfile?.dateOfBirth ?? null),
      activityLevelId: payload.activityLevelId !== undefined ? payload.activityLevelId : (currentProfile?.activityLevelId ?? null),
      goal: payload.goal !== undefined ? payload.goal : (currentProfile?.goal ?? null),
      // Profile 2026 - Target weight
      targetWeightKg: payload.targetWeightKg !== undefined ? payload.targetWeightKg : (currentProfile?.targetWeightKg ?? null),
    };
    const response = await apiClient.put('/api/profile', req);
    const profile = normalizeProfile(response.data);
    await offlineCache.set(PROFILE_CACHE_KEY, profile);
    return profile;
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
    // Nếu payload không truyền lên heightCm, lấy chiều cao hiện tại từ profile để tránh bị ghi đè null/0 ở backend
    let currentHeight: number | null = null;
    if (payload.heightCm === undefined) {
      try {
        const profile = await profileService.getProfile();
        currentHeight = profile.heightCm ?? null;
      } catch (e) {
        // Bỏ qua nếu có lỗi
      }
    }

    // Backend expects: heightCm?, weightKg?, measuredDate, note?
    const req: any = {
      heightCm: payload.heightCm !== undefined ? payload.heightCm : currentHeight,
      weightKg: payload.weightKg ?? null,
      measuredDate: payload.measuredDate ?? formatBusinessDate(),
      note: payload.note ?? null,
    };
    await apiClient.post('/api/body-metrics', req);
  },

  // Lay lich su can do (GET /api/body-metrics/history)
  async getBodyMetricsHistory(limit: number = 30): Promise<BodyMetricsPayload[]> {
    return loadWithOfflineFallback(`${BODY_METRICS_HISTORY_CACHE_PREFIX}${limit}`, async () => {
      const response = await apiClient.get(`/api/body-metrics/history?limit=${limit}`);
      // Backend tra ve array cua BodyMetricDto
      return (response.data || []).map((item: any) => ({
        heightCm: item.heightCm,
        weightKg: item.weightKg,
        measuredDate: item.measuredDate,
        note: item.note,
      }));
    });
  },

  // --- User Preferences (Dietary Restrictions) ---

  async getUserPreferences(): Promise<any> {
    const response = await apiClient.get('/api/user/preferences');
    const timeZoneId = setBusinessTimeZoneId(response.data?.timeZoneId ?? getDeviceTimeZone());
    return {
      ...response.data,
      timeZoneId,
    };
  },

  async updateUserPreferences(prefs: any): Promise<void> {
    const timeZoneId = setBusinessTimeZoneId(prefs?.timeZoneId ?? getDeviceTimeZone());
    await apiClient.post('/api/user/preferences', {
      ...prefs,
      timeZoneId,
    });
  },
};
