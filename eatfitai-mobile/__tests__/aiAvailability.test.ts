import {
  getAiFeatureAvailability,
  type AiFeatureAvailability,
} from '../src/utils/aiAvailability';
import type { AiHealthStatus } from '../src/types/ai';

const makeStatus = (
  overrides: Partial<AiHealthStatus> = {},
): AiHealthStatus => ({
  state: 'HEALTHY',
  providerUrl: 'http://ai-provider.local',
  consecutiveFailures: 0,
  modelLoaded: true,
  geminiConfigured: true,
  ...overrides,
});

describe('getAiFeatureAvailability', () => {
  it('blocks AI while status is still unknown', () => {
    expect(
      getAiFeatureAvailability(undefined, 'voice'),
    ).toEqual<AiFeatureAvailability>({
      state: 'blocked',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI đang kiểm tra',
      message: 'Vui lòng thử lại sau khi trạng thái AI được cập nhật.',
    });
  });

  it('allows vision AI when health and both providers are ready', () => {
    expect(
      getAiFeatureAvailability(makeStatus(), 'vision'),
    ).toEqual<AiFeatureAvailability>({
      state: 'available',
      canUseAi: true,
      allowsManualFallback: true,
      title: 'AI sẵn sàng',
      message: null,
    });
  });

  it('allows healthy vision when the provider will lazy-load the model on first scan', () => {
    expect(
      getAiFeatureAvailability(makeStatus({ modelLoaded: false }), 'vision'),
    ).toEqual<AiFeatureAvailability>({
      state: 'available',
      canUseAi: true,
      allowsManualFallback: true,
      title: 'AI sẵn sàng',
      message: null,
    });
  });

  it('blocks vision AI when provider health is down', () => {
    expect(
      getAiFeatureAvailability(makeStatus({ state: 'DOWN' }), 'vision'),
    ).toEqual<AiFeatureAvailability>({
      state: 'blocked',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI tạm offline',
      message: 'Bạn vẫn có thể nhập hoặc tìm món thủ công.',
    });
  });

  it('degrades nutrition AI when Gemini is not configured', () => {
    expect(
      getAiFeatureAvailability(
        makeStatus({ geminiConfigured: false }),
        'nutrition',
      ),
    ).toEqual<AiFeatureAvailability>({
      state: 'degraded',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI dinh dưỡng chưa sẵn sàng',
      message: 'Bạn vẫn có thể nhập hoặc tìm món thủ công.',
    });
  });
});
