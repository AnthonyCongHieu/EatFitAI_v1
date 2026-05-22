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
  it('marks a limited group as empty when remaining is zero', () => {
    const group = buildQuotaGroup({
      features: [feature({ key: 'vision_scan', limit: 5, used: 5, remaining: 0 })],
      mode: 'scan',
    });

    expect(group.label).toBe('Còn 0/5 lượt');
    expect(group.tone).toBe('empty');
    expect(group.statusText).toBe('Hết lượt');
    expect(group.ratio).toBe(0);
  });

  it('summarizes non-scan limited features into one assistant group', () => {
    const group = buildQuotaGroup({
      features: [
        feature({ key: 'voice_parse', limit: 80, used: 20, remaining: 60 }),
        feature({ key: 'recipe_suggest', limit: 20, used: 10, remaining: 10 }),
      ],
      mode: 'assistant',
    });

    expect(group.label).toBe('Còn 70/100 lượt');
    expect(group.tone).toBe('healthy');
    expect(group.ratio).toBe(0.7);
  });

  it('returns a smart summary status for low remaining quota', () => {
    const summary = summarizeAiQuota({
      features: [
        feature({ key: 'vision_scan', limit: 5, used: 5, remaining: 0 }),
        feature({ key: 'voice_parse', limit: 100, used: 94, remaining: 6 }),
      ],
      planCode: 'free',
      isPremium: false,
      resetAtUtc: '2026-05-22T17:00:00Z',
    });

    expect(summary.planLabel).toBe('Free');
    expect(summary.tone).toBe('empty');
    expect(summary.statusText).toBe('Một nhóm AI đã hết lượt');
  });
});
