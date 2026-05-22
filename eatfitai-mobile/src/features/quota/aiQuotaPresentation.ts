export type AiQuotaTone = 'healthy' | 'low' | 'empty' | 'unlimited';

export type AiQuotaPresentationFeature = {
  key: string;
  label: string;
  isLimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAtUtc: string;
};

export type AiQuotaGroupMode = 'scan' | 'assistant';

export type AiQuotaGroup = {
  title: string;
  subtitle: string;
  label: string;
  statusText: string;
  remaining: number;
  limit: number;
  ratio: number;
  tone: AiQuotaTone;
  isUnlimited: boolean;
};

export type AiQuotaSummary = {
  planLabel: string;
  statusText: string;
  resetText: string;
  tone: Exclude<AiQuotaTone, 'unlimited'>;
  scan: AiQuotaGroup;
  assistant: AiQuotaGroup;
};

const clampRatio = (value: number): number => Math.max(0, Math.min(1, value));

const getRemaining = (feature: AiQuotaPresentationFeature): number => {
  if (!feature.isLimited) {
    return Number.POSITIVE_INFINITY;
  }

  const limit = feature.limit ?? 0;
  return Math.max(0, feature.remaining ?? limit - feature.used);
};

const resolveTone = (remaining: number, limit: number): AiQuotaTone => {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit)) {
    return 'unlimited';
  }

  if (remaining <= 0) {
    return 'empty';
  }

  if (limit > 0 && remaining / limit <= 0.1) {
    return 'low';
  }

  return 'healthy';
};

const statusTextByTone: Record<AiQuotaTone, string> = {
  healthy: 'Còn nhiều',
  low: 'Sắp hết',
  empty: 'Hết lượt',
  unlimited: 'Không giới hạn',
};

const getPlanLabel = (planCode: string | undefined, isPremium: boolean): string => {
  if (isPremium) {
    return 'Premium';
  }

  if (!planCode || planCode.toLowerCase() === 'free') {
    return 'Free';
  }

  return planCode.charAt(0).toUpperCase() + planCode.slice(1);
};

export const formatQuotaResetText = (resetAtUtc?: string): string => {
  if (!resetAtUtc) {
    return 'Làm mới theo chu kỳ ngày';
  }

  const resetDate = new Date(resetAtUtc);
  if (Number.isNaN(resetDate.getTime())) {
    return 'Làm mới theo chu kỳ ngày';
  }

  return `Làm mới lúc ${resetDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const buildQuotaGroup = ({
  features,
  mode,
}: {
  features: AiQuotaPresentationFeature[];
  mode: AiQuotaGroupMode;
}): AiQuotaGroup => {
  const title = mode === 'scan' ? 'Quét món' : 'Ghi chú & truy vấn';
  const subtitle =
    mode === 'scan'
      ? 'Camera, ảnh món ăn và nhận diện AI.'
      : 'Voice, công thức, phân tích và mục tiêu AI.';

  const selected =
    mode === 'scan'
      ? features.filter((feature) => feature.key === 'vision_scan')
      : features.filter(
          (feature) =>
            feature.key !== 'vision_scan' && feature.isLimited && feature.limit != null,
        );

  if (
    selected.length === 0 ||
    selected.every((feature) => !feature.isLimited || feature.limit == null)
  ) {
    return {
      title,
      subtitle,
      label: 'Không giới hạn',
      statusText: statusTextByTone.unlimited,
      remaining: Number.POSITIVE_INFINITY,
      limit: Number.POSITIVE_INFINITY,
      ratio: 1,
      tone: 'unlimited',
      isUnlimited: true,
    };
  }

  const limit = selected.reduce((sum, feature) => sum + (feature.limit ?? 0), 0);
  const remaining = selected.reduce((sum, feature) => sum + getRemaining(feature), 0);
  const ratio = limit > 0 ? clampRatio(remaining / limit) : 0;
  const tone = resolveTone(remaining, limit);

  return {
    title,
    subtitle,
    label: `Còn ${remaining}/${limit} lượt`,
    statusText: statusTextByTone[tone],
    remaining,
    limit,
    ratio,
    tone,
    isUnlimited: false,
  };
};

export const summarizeAiQuota = ({
  features,
  planCode,
  isPremium,
  resetAtUtc,
}: {
  features: AiQuotaPresentationFeature[];
  planCode?: string;
  isPremium: boolean;
  resetAtUtc?: string;
}): AiQuotaSummary => {
  const scan = buildQuotaGroup({ features, mode: 'scan' });
  const assistant = buildQuotaGroup({ features, mode: 'assistant' });
  const groups = [scan, assistant];
  const tone = groups.some((group) => group.tone === 'empty')
    ? 'empty'
    : groups.some((group) => group.tone === 'low')
      ? 'low'
      : 'healthy';

  const statusText =
    tone === 'empty'
      ? 'Một nhóm AI đã hết lượt'
      : tone === 'low'
        ? 'Một nhóm AI sắp hết'
        : 'AI sẵn sàng hỗ trợ';

  return {
    planLabel: getPlanLabel(planCode, isPremium),
    statusText,
    resetText: formatQuotaResetText(resetAtUtc),
    tone,
    scan,
    assistant,
  };
};
