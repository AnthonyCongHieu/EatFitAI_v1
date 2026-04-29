import type { AiHealthStatus } from '../types/ai';

export type AiFeature = 'vision' | 'nutrition' | 'voice' | 'cooking';

export type AiFeatureAvailability = {
  state: 'available' | 'degraded' | 'blocked';
  canUseAi: boolean;
  allowsManualFallback: boolean;
  title: string;
  message: string | null;
};

const MANUAL_FALLBACK_MESSAGE = 'Bạn vẫn có thể nhập hoặc tìm món thủ công.';

const available = (): AiFeatureAvailability => ({
  state: 'available',
  canUseAi: true,
  allowsManualFallback: true,
  title: 'AI sẵn sàng',
  message: null,
});

const checking = (): AiFeatureAvailability => ({
  state: 'blocked',
  canUseAi: false,
  allowsManualFallback: true,
  title: 'AI đang kiểm tra',
  message: 'Vui lòng thử lại sau khi trạng thái AI được cập nhật.',
});

const blocked = (): AiFeatureAvailability => ({
  state: 'blocked',
  canUseAi: false,
  allowsManualFallback: true,
  title: 'AI tạm offline',
  message: MANUAL_FALLBACK_MESSAGE,
});

const degraded = (title: string): AiFeatureAvailability => ({
  state: 'degraded',
  canUseAi: false,
  allowsManualFallback: true,
  title,
  message: MANUAL_FALLBACK_MESSAGE,
});

export function getAiFeatureAvailability(
  status: AiHealthStatus | null | undefined,
  feature: AiFeature,
): AiFeatureAvailability {
  if (!status) {
    return checking();
  }

  if (status.state === 'DOWN') {
    return blocked();
  }

  if (feature === 'vision' && status.state !== 'HEALTHY') {
    return degraded('AI nhận diện chưa sẵn sàng');
  }

  if (feature !== 'vision' && !status.geminiConfigured) {
    return degraded(
      feature === 'nutrition'
        ? 'AI dinh dưỡng chưa sẵn sàng'
        : 'AI ngôn ngữ chưa sẵn sàng',
    );
  }

  return available();
}
