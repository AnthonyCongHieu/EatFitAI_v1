import type { AiHealthStatus } from '../types/ai';
import { getAiFeatureAvailability } from './aiAvailability';

const makeStatus = (
  overrides: Partial<AiHealthStatus> = {},
): AiHealthStatus => ({
  state: 'HEALTHY',
  providerUrl: 'https://example.test',
  consecutiveFailures: 0,
  modelLoaded: true,
  geminiConfigured: true,
  ...overrides,
});

describe('getAiFeatureAvailability', () => {
  it('allows vision attempts when AI status is degraded', () => {
    const availability = getAiFeatureAvailability(
      makeStatus({ state: 'DEGRADED' }),
      'vision',
    );

    expect(availability.state).toBe('degraded');
    expect(availability.canUseAi).toBe(true);
    expect(availability.allowsManualFallback).toBe(true);
  });

  it('still blocks vision while status is unknown or down', () => {
    expect(getAiFeatureAvailability(null, 'vision').canUseAi).toBe(false);
    expect(
      getAiFeatureAvailability(makeStatus({ state: 'DOWN' }), 'vision').canUseAi,
    ).toBe(false);
  });
});
