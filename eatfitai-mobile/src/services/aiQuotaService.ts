import apiClient from './apiClient';

export type AiUsageQuotaFeature = {
  key: string;
  label: string;
  isLimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAtUtc: string;
};

export type AiUsageQuotaStatus = {
  planCode: string;
  isPremium: boolean;
  timeZoneId: string;
  windowStartUtc: string;
  resetAtUtc: string;
  features: AiUsageQuotaFeature[];
};

export const aiQuotaService = {
  async getStatus(): Promise<AiUsageQuotaStatus> {
    const response = await apiClient.get<AiUsageQuotaStatus>('/api/ai/quota');
    return response.data;
  },
};
