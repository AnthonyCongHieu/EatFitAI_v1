describe('buildBackendNonUiSummary', () => {
  const {
    buildBackendNonUiSummary,
  } = require('../scripts/lib/backend-non-ui-summary');

  function createGate(overrides = {}) {
    return {
      name: 'gate',
      passed: true,
      failures: [],
      ...overrides,
    };
  }

  it('marks the run as passed when all gates and code health checks pass', () => {
    const summary = buildBackendNonUiSummary({
      outputDir: 'D:/tmp/session',
      preflight: createGate({ name: 'preflight' }),
      authApi: createGate({ name: 'auth-api' }),
      userApi: createGate({ name: 'user-api' }),
      aiApi: createGate({ name: 'ai-api' }),
      cleanup: createGate({ name: 'cleanup' }),
      codeHealth: {
        dotnetTests: { passed: true },
        pythonUnitTests: { passed: true },
      },
    });

    expect(summary.cloudGate.passed).toBe(true);
    expect(summary.cloudFunctionalPass).toBe(true);
    expect(summary.codeHealthPass).toBe(true);
    expect(summary.overallPassed).toBe(true);
    expect(summary.failedGates).toEqual([]);
    expect(summary.failedChecks).toEqual([]);
  });

  it('keeps the cloud gate separate from code health failures', () => {
    const summary = buildBackendNonUiSummary({
      outputDir: 'D:/tmp/session',
      preflight: createGate({ name: 'preflight' }),
      authApi: createGate({ name: 'auth-api' }),
      userApi: createGate({ name: 'user-api' }),
      aiApi: createGate({ name: 'ai-api' }),
      cleanup: createGate({ name: 'cleanup' }),
      codeHealth: {
        dotnetTests: { passed: false, command: 'dotnet test' },
        pythonUnitTests: { passed: true, command: 'python -m unittest' },
      },
    });

    expect(summary.cloudGate.passed).toBe(true);
    expect(summary.cloudFunctionalPass).toBe(true);
    expect(summary.codeHealthPass).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.failedGates).toEqual([]);
    expect(summary.failedChecks).toContain('dotnet-tests');
  });

  it('treats a code health waiver as passing while preserving failure details', () => {
    const summary = buildBackendNonUiSummary({
      outputDir: 'D:/tmp/session',
      preflight: createGate({ name: 'preflight' }),
      authApi: createGate({ name: 'auth-api' }),
      userApi: createGate({ name: 'user-api' }),
      aiApi: createGate({ name: 'ai-api' }),
      cleanup: createGate({ name: 'cleanup' }),
      codeHealth: {
        waived: true,
        waiverReason: 'Known unrelated baseline failures',
        dotnetTests: { passed: false, command: 'dotnet test' },
        pythonUnitTests: { passed: false, command: 'python -m unittest' },
      },
    });

    expect(summary.codeHealthPass).toBe(true);
    expect(summary.overallPassed).toBe(true);
    expect(summary.codeHealth.waived).toBe(true);
    expect(summary.codeHealth.waiverReason).toBe('Known unrelated baseline failures');
    expect(summary.failedChecks).toEqual(['dotnet-tests', 'python-unit-tests']);
  });

  it('fails the cleanup gate when residual state remains', () => {
    const summary = buildBackendNonUiSummary({
      outputDir: 'D:/tmp/session',
      preflight: createGate({ name: 'preflight' }),
      authApi: createGate({ name: 'auth-api' }),
      userApi: createGate({ name: 'user-api' }),
      aiApi: createGate({ name: 'ai-api' }),
      cleanup: createGate({
        name: 'cleanup',
        passed: false,
        failures: ['sandbox-account-still-active'],
      }),
      codeHealth: {
        dotnetTests: { passed: true },
        pythonUnitTests: { passed: true },
      },
    });

    expect(summary.cloudFunctionalPass).toBe(false);
    expect(summary.overallPassed).toBe(false);
    expect(summary.failedGates).toContain('cleanup');
  });
});
