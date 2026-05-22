import type { AiHealthStatus } from '../types/ai';

export type AiFeature = 'vision' | 'nutrition' | 'voice' | 'cooking';

export type AiFeatureAvailability = {
  state: 'available' | 'degraded' | 'blocked';
  canUseAi: boolean;
  allowsManualFallback: boolean;
  title: string;
  message: string | null;
};

const MANUAL_FALLBACK_MESSAGE = 'Đừng lo nha, bạn vẫn có thể nhập tay hoặc tìm món thủ công nè.';

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
  title: 'Đang kết nối AI',
  message: 'Bạn chờ một chút để mình kết nối với AI rồi thử lại nha!',
});

const blocked = (): AiFeatureAvailability => ({
  state: 'blocked',
  canUseAi: false,
  allowsManualFallback: true,
  title: 'AI đang tạm nghỉ',
  message: MANUAL_FALLBACK_MESSAGE,
});

const degraded = (
  title: string,
  canUseAi = false,
  message = MANUAL_FALLBACK_MESSAGE,
): AiFeatureAvailability => ({
  state: 'degraded',
  canUseAi,
  allowsManualFallback: true,
  title,
  message,
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
    return degraded(
      'Quét ảnh hơi chậm một xíu',
      true,
      'Bạn cứ thử chụp lại xem sao, hoặc tìm món thủ công giúp mình nha!',
    );
  }

  if (feature !== 'vision' && !status.geminiConfigured) {
    return degraded(
      feature === 'nutrition'
        ? 'AI dinh dưỡng đang bận xíu nè'
        : 'AI giọng nói đang bận xíu nè',
    );
  }

  return available();
}
