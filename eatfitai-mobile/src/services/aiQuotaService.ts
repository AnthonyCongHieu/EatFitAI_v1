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

export const AI_SHARED_QUOTA_FEATURE_KEY = 'ai_shared_quota';

const VISION_SCAN_FEATURE_KEY = 'vision_scan';
const FREE_SHARED_AI_DAILY_LIMIT = 30;

const getDefaultDailyResetAtUtc = (): string => {
  const resetAt = new Date();
  resetAt.setDate(resetAt.getDate() + 1);
  resetAt.setHours(0, 0, 0, 0);
  return resetAt.toISOString();
};

const getFeatureUsed = (feature: AiUsageQuotaFeature): number =>
  Math.max(0, feature.used ?? 0);

const buildFreeScanFeature = (
  resetAtUtc: string,
  existing?: AiUsageQuotaFeature,
): AiUsageQuotaFeature => ({
  key: VISION_SCAN_FEATURE_KEY,
  label: existing?.label || 'Quét món',
  isLimited: false,
  limit: null,
  used: existing ? getFeatureUsed(existing) : 0,
  remaining: null,
  resetAtUtc: existing?.resetAtUtc || resetAtUtc,
});

const looksLikeDuplicatedSharedQuota = (features: AiUsageQuotaFeature[]): boolean => {
  if (features.length <= 1) {
    return false;
  }

  const first = features[0];
  if (!first) {
    return false;
  }

  return (
    first.limit === FREE_SHARED_AI_DAILY_LIMIT &&
    features.every(
      (feature) =>
        feature.isLimited &&
        feature.limit === first.limit &&
        feature.used === first.used &&
        feature.remaining === first.remaining,
    )
  );
};

const getSharedAiUsed = (features: AiUsageQuotaFeature[]): number => {
  const explicitShared = features.find(
    (feature) => feature.key === AI_SHARED_QUOTA_FEATURE_KEY,
  );
  if (explicitShared) {
    return getFeatureUsed(explicitShared);
  }

  const assistantFeatures = features.filter(
    (feature) => feature.key !== VISION_SCAN_FEATURE_KEY,
  );
  if (looksLikeDuplicatedSharedQuota(assistantFeatures)) {
    const firstAssistantFeature = assistantFeatures[0];
    return firstAssistantFeature ? getFeatureUsed(firstAssistantFeature) : 0;
  }

  return assistantFeatures.reduce((sum, feature) => sum + getFeatureUsed(feature), 0);
};

const buildFreeSharedAiFeature = (
  resetAtUtc: string,
  features: AiUsageQuotaFeature[],
): AiUsageQuotaFeature => {
  const explicitShared = features.find(
    (feature) => feature.key === AI_SHARED_QUOTA_FEATURE_KEY,
  );
  const used = getSharedAiUsed(features);
  const remaining = Math.max(0, FREE_SHARED_AI_DAILY_LIMIT - used);

  return {
    key: AI_SHARED_QUOTA_FEATURE_KEY,
    label: explicitShared?.label || 'AI khác',
    isLimited: true,
    limit: FREE_SHARED_AI_DAILY_LIMIT,
    used,
    remaining,
    resetAtUtc: explicitShared?.resetAtUtc || resetAtUtc,
  };
};

const buildFreeQuotaFeatures = (
  resetAtUtc: string,
  features: AiUsageQuotaFeature[] = [],
): AiUsageQuotaFeature[] => [
  buildFreeScanFeature(
    resetAtUtc,
    features.find((feature) => feature.key === VISION_SCAN_FEATURE_KEY),
  ),
  buildFreeSharedAiFeature(resetAtUtc, features),
];

const buildUnavailableQuotaStatus = (): AiUsageQuotaStatus => {
  const resetAtUtc = getDefaultDailyResetAtUtc();

  return {
    planCode: 'free',
    isPremium: false,
    timeZoneId: 'Asia/Ho_Chi_Minh',
    windowStartUtc: '',
    resetAtUtc,
    features: buildFreeQuotaFeatures(resetAtUtc),
  };
};

const withFreeQuotaDefaults = (status: AiUsageQuotaStatus): AiUsageQuotaStatus => {
  if (status.isPremium) {
    return status;
  }

  const resetAtUtc = status.resetAtUtc || getDefaultDailyResetAtUtc();

  return {
    ...status,
    resetAtUtc,
    features: buildFreeQuotaFeatures(resetAtUtc, status.features),
  };
};

export const aiQuotaService = {
  async getStatus(): Promise<AiUsageQuotaStatus> {
    const response = await apiClient.get<AiUsageQuotaStatus>('/api/ai/quota', {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });
    if (response.status === 404) {
      return buildUnavailableQuotaStatus();
    }

    return withFreeQuotaDefaults(response.data);
  },
};
