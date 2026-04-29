const {
  evaluateAiPrimaryPathReadiness,
  evaluateCloudPrimaryPathReadiness,
  isFallbackSource,
} = require('../scripts/lib/primary-path-readiness');

describe('primary path readiness', () => {
  const healthyAiReport = {
    backendUrl: 'https://eatfitai-backend-dev.onrender.com',
    credentials: {
      source: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
    },
    aiStatus: {
      ok: true,
      status: 200,
      state: 'HEALTHY',
      providerUrl: 'https://eatfitai-ai-provider-dev.onrender.com',
      modelLoaded: true,
      geminiConfigured: true,
    },
    endpointGroups: {
      'vision/detect': [
        {
          passed: true,
          blocked: false,
          status: 200,
          details: {
            itemCount: 1,
            unmappedCount: 0,
          },
        },
      ],
    },
    readback: {
      detectedLabels: 1,
      recipeSuggestionCount: 2,
      voiceExecuteAddFoodMatched: true,
    },
    aiNutritionRecalculate: {
      status: 200,
      source: 'gemini',
      offlineMode: false,
      calories: 2100,
      protein: 120,
      carbs: 240,
      fat: 70,
    },
    voiceParse: {
      status: 200,
      source: 'ai-provider-proxy',
      intent: 'ASK_CALORIES',
      confidence: 0.91,
    },
  };

  it('passes when AI smoke proves the full primary path', () => {
    expect(evaluateAiPrimaryPathReadiness(healthyAiReport)).toEqual({
      passed: true,
      failures: [],
      degraded: [],
    });
  });

  it('fails when nutrition only used formula fallback', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      aiNutritionRecalculate: {
        ...healthyAiReport.aiNutritionRecalculate,
        source: 'formula',
        offlineMode: true,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('nutrition-primary-path-used-fallback');
  });

  it('fails when voice parse only used backend rule fallback', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      voiceParse: {
        ...healthyAiReport.voiceParse,
        source: 'backend-rule-fallback',
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('voice-primary-path-used-fallback');
  });

  it('allows AI provider regex parsing because it is not backend fallback', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      voiceParse: {
        ...healthyAiReport.voiceParse,
        source: 'regex',
      },
    });

    expect(result.passed).toBe(true);
    expect(isFallbackSource('regex')).toBe(false);
  });

  it('fails AI readiness on local endpoints or default smoke credentials', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      backendUrl: 'http://localhost:5000',
      credentials: {
        source: 'default-demo-account',
      },
      aiStatus: {
        ...healthyAiReport.aiStatus,
        providerUrl: 'http://127.0.0.1:5001',
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        'local-backend-url',
        'local-ai-provider-url',
        'local-default-credentials',
      ]),
    );
  });

  it('fails cloud readiness when any required gate lacks primaryPath pass', () => {
    const result = evaluateCloudPrimaryPathReadiness({
      authApi: { passed: true, primaryPath: { passed: true } },
      userApi: { passed: true, primaryPath: { passed: true } },
      aiApi: { passed: true, primaryPath: { passed: false } },
      regression: { passed: true, primaryPath: { passed: true } },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('ai-api-primary-path-failed');
  });

  it('fails cloud readiness when a required gate has no primaryPath evidence', () => {
    const result = evaluateCloudPrimaryPathReadiness({
      authApi: { passed: true, primaryPath: { passed: true } },
      userApi: { passed: true },
      aiApi: { passed: true, primaryPath: { passed: true } },
      regression: { passed: true, primaryPath: { passed: true } },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('user-api-primary-path-failed');
  });
});
