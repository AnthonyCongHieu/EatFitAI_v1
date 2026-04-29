describe('buildBackendNonUiSummary', () => {
  const {
    buildBackendNonUiSummary,
    evaluatePrimaryPathReadiness,
  } = require('../scripts/lib/backend-non-ui-summary');

  function createGate(overrides = {}) {
    return {
      name: 'gate',
      passed: true,
      failures: [],
      primaryPath: {
        passed: true,
        failures: [],
      },
      ...overrides,
    };
  }

  function createAiApiReport(overrides = {}) {
    return {
      name: 'ai-api',
      passed: true,
      failures: [],
      primaryPath: {
        passed: true,
        failures: [],
      },
      backendUrl: 'https://eatfitai-backend-dev.onrender.com',
      credentials: {
        source: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
      },
      aiStatus: {
        ok: true,
        status: 200,
        state: 'healthy',
        providerUrl: 'https://eatfitai-ai-provider-dev.onrender.com',
        modelLoaded: true,
        geminiConfigured: true,
      },
      endpointGroups: {
        'vision/detect': [
          {
            name: 'banana-small',
            passed: true,
            blocked: false,
            status: 200,
            details: {
              itemCount: 1,
              unmappedCount: 0,
              firstItem: {
                label: 'banana',
                matched: true,
              },
            },
          },
        ],
      },
      aiNutritionRecalculate: {
        status: 200,
        offlineMode: false,
        source: 'gemini',
      },
      voiceParse: {
        status: 200,
        source: 'gemini',
        intent: 'ASK_CALORIES',
      },
      voiceExecuteAddFoodReadback: {
        matched: true,
      },
      readback: {
        detectedLabels: 1,
        recipeSuggestionCount: 1,
        voiceExecuteAddFoodMatched: true,
      },
      ...overrides,
    };
  }

  function createRegressionReport(overrides = {}) {
    return {
      passed: true,
      primaryPath: {
        passed: true,
        failures: [],
      },
      credentialsSource: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
      scan: [
        {
          bucket: 'primary',
          key: 'banana-small',
          exists: true,
          status: 200,
          passed: true,
          usableResult: true,
          requiresExpectedLabel: true,
          expectedLabelMatched: true,
        },
      ],
      voice: [
        {
          key: 'ask-calories',
          parse: {
            passed: true,
            source: 'gemini',
          },
        },
      ],
      ...overrides,
    };
  }

  function createPassingInput(overrides = {}) {
    return {
      outputDir: 'D:/tmp/session',
      backendUrl: 'https://eatfitai-backend-dev.onrender.com',
      preflight: createGate({ name: 'preflight' }),
      authApi: createGate({ name: 'auth-api' }),
      userApi: createGate({ name: 'user-api' }),
      aiApi: createAiApiReport(),
      cleanup: createGate({ name: 'cleanup' }),
      regression: createRegressionReport(),
      codeHealth: {
        dotnetTests: { passed: true },
        pythonUnitTests: { passed: true },
      },
      ...overrides,
    };
  }

  it('marks the run as passed when all gates and code health checks pass', () => {
    const summary = buildBackendNonUiSummary(createPassingInput());

    expect(summary.cloudGate.passed).toBe(true);
    expect(summary.primaryPath.passed).toBe(true);
    expect(summary.primaryPathGate.passed).toBe(true);
    expect(summary.cloudFunctionalPass).toBe(true);
    expect(summary.codeHealthPass).toBe(true);
    expect(summary.overallPassed).toBe(true);
    expect(summary.failedGates).toEqual([]);
    expect(summary.failedChecks).toEqual([]);
  });

  it('keeps the cloud gate separate from code health failures', () => {
    const summary = buildBackendNonUiSummary(createPassingInput({
      codeHealth: {
        dotnetTests: { passed: false, command: 'dotnet test' },
        pythonUnitTests: { passed: true, command: 'python -m unittest' },
      },
    }));

    expect(summary.cloudGate.passed).toBe(true);
    expect(summary.cloudFunctionalPass).toBe(true);
    expect(summary.codeHealthPass).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.failedGates).toEqual([]);
    expect(summary.failedChecks).toContain('dotnet-tests');
  });

  it('treats a code health waiver as passing while preserving failure details', () => {
    const summary = buildBackendNonUiSummary(createPassingInput({
      codeHealth: {
        waived: true,
        waiverReason: 'Known unrelated baseline failures',
        dotnetTests: { passed: false, command: 'dotnet test' },
        pythonUnitTests: { passed: false, command: 'python -m unittest' },
      },
    }));

    expect(summary.codeHealthPass).toBe(true);
    expect(summary.overallPassed).toBe(true);
    expect(summary.codeHealth.waived).toBe(true);
    expect(summary.codeHealth.waiverReason).toBe('Known unrelated baseline failures');
    expect(summary.failedChecks).toEqual(['dotnet-tests', 'python-unit-tests']);
  });

  it('fails the cleanup gate when residual state remains', () => {
    const summary = buildBackendNonUiSummary(createPassingInput({
      cleanup: createGate({
        name: 'cleanup',
        passed: false,
        failures: ['sandbox-account-still-active'],
      }),
      codeHealth: {
        dotnetTests: { passed: true },
        pythonUnitTests: { passed: true },
      },
    }));

    expect(summary.cloudFunctionalPass).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.failedGates).toContain('cleanup');
  });

  it('fails primary readiness on local endpoints or local default credentials', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      backendUrl: 'http://localhost:5000',
      aiApi: createAiApiReport({
        aiStatus: {
          ...createAiApiReport().aiStatus,
          providerUrl: 'http://127.0.0.1:5001',
        },
      }),
      regression: createRegressionReport({
        credentialsSource: 'local-default-demo-account',
      }),
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining([
        'local-backend-url',
        'local-ai-provider-url',
        'local-default-credentials',
      ]),
    );
  });

  it('fails primary readiness when nutrition falls back to formula/offline mode', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      aiApi: createAiApiReport({
        aiNutritionRecalculate: {
          status: 200,
          offlineMode: true,
          source: 'formula',
        },
      }),
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toContain(
      'ai-nutrition-primary-path',
    );
  });

  it('fails primary readiness when voice parsing used backend rule fallback', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      aiApi: createAiApiReport({
        voiceParse: {
          status: 200,
          source: 'backend-rule-fallback',
          intent: 'ADD_FOOD',
        },
      }),
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toContain('voice-primary-path');
  });

  it('allows AI provider regex parsing because it is not the backend fallback path', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      aiApi: createAiApiReport({
        voiceParse: {
          status: 200,
          source: 'regex',
          intent: 'ADD_FOOD',
        },
      }),
    });

    expect(gate.passed).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  it('fails primary readiness when vision does not produce usable detections', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      aiApi: createAiApiReport({
        endpointGroups: {
          'vision/detect': [
            {
              name: 'banana-small',
              passed: true,
              blocked: false,
              status: 200,
              details: {
                itemCount: 0,
                unmappedCount: 0,
              },
            },
          ],
        },
      }),
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toContain('vision-primary-path');
  });

  it('fails primary readiness when regression primary scan misses expected labels', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      regression: createRegressionReport({
        scan: [
          {
            bucket: 'primary',
            key: 'banana-small',
            exists: true,
            status: 200,
            passed: true,
            usableResult: true,
            requiresExpectedLabel: true,
            expectedLabelMatched: false,
          },
        ],
      }),
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toContain(
      'regression-primary-scan',
    );
  });

  it('fails overall readiness when a report declares primaryPath failure', () => {
    const summary = buildBackendNonUiSummary(createPassingInput({
      aiApi: createAiApiReport({
        primaryPath: {
          passed: false,
          failures: ['nutrition-primary-path-used-fallback'],
        },
      }),
    }));

    expect(summary.primaryPath.passed).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.failedGates).toContain('primary-path');
    expect(summary.primaryPath.failures.map((failure) => failure.code)).toContain(
      'required-primary-path-failed',
    );
  });

  it('fails when regression smoke evidence is not available', () => {
    const gate = evaluatePrimaryPathReadiness({
      ...createPassingInput(),
      regression: null,
    });

    expect(gate.passed).toBe(false);
    expect(gate.failures.map((failure) => failure.code)).toContain(
      'regression-report-missing',
    );
  });

  it('fails when a required gate does not include primaryPath evidence', () => {
    const summary = buildBackendNonUiSummary(createPassingInput({
      userApi: createGate({
        name: 'user-api',
        primaryPath: null,
      }),
    }));

    expect(summary.primaryPath.passed).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.primaryPath.failures.map((failure) => failure.code)).toContain(
      'missing-primary-path-evidence',
    );
  });
});
