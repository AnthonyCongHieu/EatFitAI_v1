import {
  buildQuotaGroup,
  summarizeAiQuota,
  type AiQuotaPresentationFeature,
} from '../src/features/quota/aiQuotaPresentation';

const feature = (
  partial: Partial<AiQuotaPresentationFeature> & Pick<AiQuotaPresentationFeature, 'key'>,
): AiQuotaPresentationFeature => ({
  key: partial.key,
  label: partial.label ?? partial.key,
  isLimited: partial.isLimited ?? true,
  limit: partial.limit ?? 10,
  used: partial.used ?? 0,
  remaining: partial.remaining ?? null,
  resetAtUtc: partial.resetAtUtc ?? '2026-05-22T17:00:00Z',
});

describe('aiQuotaPresentation', () => {
  it('shows free scan as unlimited', () => {
    const group = buildQuotaGroup({
      features: [
        feature({
          key: 'vision_scan',
          isLimited: false,
          limit: null,
          used: 12,
          remaining: null,
        }),
      ],
      mode: 'scan',
    });

    expect(group.label).toBe('Không giới hạn');
    expect(group.tone).toBe('unlimited');
    expect(group.isUnlimited).toBe(true);
  });

  it('shows the shared quota for non-scan AI features', () => {
    const group = buildQuotaGroup({
      features: [
        feature({
          key: 'ai_shared_quota',
          label: 'AI khác',
          limit: 30,
          used: 9,
          remaining: 21,
        }),
      ],
      mode: 'assistant',
    });

    expect(group.title).toBe('AI khác');
    expect(group.label).toBe('Còn 21/30 lượt');
    expect(group.tone).toBe('healthy');
    expect(group.ratio).toBe(0.7);
  });

  it('returns a smart summary status for low remaining quota', () => {
    const summary = summarizeAiQuota({
      features: [
        feature({
          key: 'vision_scan',
          isLimited: false,
          limit: null,
          used: 20,
          remaining: null,
        }),
        feature({ key: 'ai_shared_quota', limit: 30, used: 28, remaining: 2 }),
      ],
      planCode: 'free',
      isPremium: false,
      resetAtUtc: '2026-05-22T17:00:00Z',
    });

    expect(summary.planLabel).toBe('Free');
    expect(summary.scan.isUnlimited).toBe(true);
    expect(summary.assistant.label).toBe('Còn 2/30 lượt');
    expect(summary.tone).toBe('low');
    expect(summary.statusText).toBe('Sắp hết lượt dùng');
  });
});
