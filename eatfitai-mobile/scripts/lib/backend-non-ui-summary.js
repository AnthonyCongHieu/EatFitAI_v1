function cloneFailures(value) {
  return Array.isArray(value) ? [...value] : [];
}

function trim(value) {
  return String(value || '').trim();
}

function makeFailure(code, message, details = {}) {
  return {
    code,
    message,
    details,
  };
}

function makeWarning(code, message, details = {}) {
  return {
    code,
    message,
    details,
  };
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function statusOk(value) {
  const status = toNumber(value);
  return status >= 200 && status < 300;
}

function getUrlHost(value) {
  const text = trim(value);
  if (!text) {
    return '';
  }

  try {
    return new URL(text).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch (_error) {
    const match = text.match(/^(?:https?:\/\/)?([^/:?#\]]+|\[[^\]]+\])/i);
    return match ? match[1].toLowerCase().replace(/^\[|\]$/g, '') : '';
  }
}

function looksLocalUrl(value) {
  const host = getUrlHost(value);
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '10.0.2.2'].includes(host);
}

function sourceLooksFallback(source) {
  const text = trim(source).toLowerCase();
  if (!text) {
    return true;
  }

  return /\b(backend-rule-fallback|fallback|offline|local|mock|fixture|stub|heuristic)\b/.test(text);
}

function sourceLooksPrimaryAi(source) {
  return /\b(gemini|provider|llm|ai-provider)\b/i.test(trim(source));
}

function isBlockedState(value) {
  return /\b(down|degraded|unhealthy|error|unavailable|offline)\b/i.test(trim(value));
}

function getVisionEntries(aiApi) {
  const entries = aiApi?.endpointGroups?.['vision/detect'];
  return Array.isArray(entries) ? entries : [];
}

function detectionCount(entry) {
  return toNumber(entry?.details?.itemCount) + toNumber(entry?.details?.unmappedCount);
}

function isUsableVisionEntry(entry) {
  return (
    Boolean(entry?.passed) &&
    !entry?.blocked &&
    statusOk(entry?.status) &&
    detectionCount(entry) > 0
  );
}

function isRegressionPrimaryScanReady(entry) {
  const expectedLabelRequired = Boolean(entry?.requiresExpectedLabel);
  return (
    entry?.bucket === 'primary' &&
    entry?.exists !== false &&
    statusOk(entry?.status) &&
    Boolean(entry?.passed) &&
    Boolean(entry?.usableResult) &&
    (!expectedLabelRequired || Boolean(entry?.expectedLabelMatched))
  );
}

function normalizeGate(name, gate) {
  return {
    name,
    passed: Boolean(gate?.passed),
    failures: cloneFailures(gate?.failures),
    primaryPath: gate?.primaryPath
      ? {
          ...gate.primaryPath,
          failures: cloneFailures(gate.primaryPath.failures),
        }
      : null,
  };
}

function summarizeCodeHealth(codeHealth) {
  const dotnetTests = {
    passed: Boolean(codeHealth?.dotnetTests?.passed),
    command: codeHealth?.dotnetTests?.command || 'dotnet test EatFitAI_v1.sln',
    details: cloneFailures(codeHealth?.dotnetTests?.details),
  };
  const pythonUnitTests = {
    passed: Boolean(codeHealth?.pythonUnitTests?.passed),
    command:
      codeHealth?.pythonUnitTests?.command ||
      'python -m unittest discover -s ai-provider/tests -v',
    details: cloneFailures(codeHealth?.pythonUnitTests?.details),
  };
  const waived = Boolean(codeHealth?.waived);
  const waiverReason = codeHealth?.waiverReason || '';
  const failedChecks = [];

  if (!dotnetTests.passed) {
    failedChecks.push('dotnet-tests');
  }
  if (!pythonUnitTests.passed) {
    failedChecks.push('python-unit-tests');
  }

  return {
    waived,
    waiverReason,
    passed: waived || failedChecks.length === 0,
    failedChecks,
    dotnetTests,
    pythonUnitTests,
  };
}

function evaluatePrimaryPathReadiness(input = {}) {
  const failures = [];
  const warnings = [];
  const aiApi = input.aiApi || {};
  const regression = input.regression || null;
  const backendUrl =
    trim(input.backendUrl) ||
    trim(aiApi.backendUrl) ||
    trim(input.userApi?.backendUrl) ||
    trim(input.authApi?.backendUrl) ||
    trim(regression?.backendUrl);
  const aiProviderUrl =
    trim(input.aiProviderUrl) ||
    trim(aiApi.aiStatus?.providerUrl) ||
    trim(aiApi.aiProviderUrl) ||
    trim(regression?.aiProviderUrl);

  [
    ['auth-api', input.authApi],
    ['user-api', input.userApi],
    ['ai-api', input.aiApi],
  ].forEach(([name, gate]) => {
    if (!gate?.passed) {
      failures.push(
        makeFailure('required-gate-failed', `${name} must pass before primary readiness can pass`, {
          gate: name,
        }),
      );
      return;
    }
    if (!gate.primaryPath) {
      failures.push(
        makeFailure('missing-primary-path-evidence', `${name} must include primaryPath evidence`, {
          gate: name,
        }),
      );
      return;
    }
    if (gate.primaryPath.passed !== true) {
      failures.push(
        makeFailure('required-primary-path-failed', `${name} primary path must pass`, {
          gate: name,
          failures: cloneFailures(gate.primaryPath.failures),
        }),
      );
    }
  });

  if (!regression) {
    failures.push(
      makeFailure('regression-report-missing', 'Regression smoke evidence is required for release readiness'),
    );
  } else if (regression.passed !== true) {
    failures.push(
      makeFailure('regression-report-failed', 'Regression smoke report must pass for release readiness', {
        failures: cloneFailures(regression.failures),
      }),
    );
  } else if (!regression.primaryPath) {
    failures.push(
      makeFailure('missing-primary-path-evidence', 'regression must include primaryPath evidence', {
        gate: 'regression',
      }),
    );
  } else if (regression.primaryPath.passed !== true) {
    failures.push(
      makeFailure('required-primary-path-failed', 'regression primary path must pass', {
        gate: 'regression',
        failures: cloneFailures(regression.primaryPath.failures),
      }),
    );
  }

  if (looksLocalUrl(backendUrl)) {
    failures.push(
      makeFailure('local-backend-url', 'Backend smoke target must not be a local URL', {
        backendUrl,
      }),
    );
  }

  if (looksLocalUrl(aiProviderUrl)) {
    failures.push(
      makeFailure('local-ai-provider-url', 'AI provider smoke target must not be a local URL', {
        aiProviderUrl,
      }),
    );
  }

  const credentialsSource =
    trim(regression?.credentialsSource) ||
    trim(aiApi.credentials?.source) ||
    trim(input.authApi?.credentialsSource);
  if (credentialsSource === 'local-default-demo-account') {
    failures.push(
      makeFailure('local-default-credentials', 'Smoke run must use explicit cloud smoke credentials', {
        credentialsSource,
      }),
    );
  }

  const aiStatus = aiApi.aiStatus;
  if (!aiStatus || aiStatus.ok !== true || isBlockedState(aiStatus.state)) {
    failures.push(
      makeFailure('ai-status-primary-path', 'AI status must report a healthy primary provider', {
        ok: aiStatus?.ok,
        state: aiStatus?.state || '',
        status: aiStatus?.status,
      }),
    );
  }
  if (aiStatus?.geminiConfigured === false) {
    failures.push(
      makeFailure('gemini-not-configured', 'Gemini configuration must be present for primary AI checks', {
        geminiConfigured: aiStatus.geminiConfigured,
      }),
    );
  }

  const visionEntries = getVisionEntries(aiApi);
  const invalidVisionEntries = visionEntries.filter((entry) => !isUsableVisionEntry(entry));
  if (visionEntries.length === 0 || invalidVisionEntries.length > 0) {
    failures.push(
      makeFailure('vision-primary-path', 'Vision smoke checks must return usable detections from the primary path', {
        total: visionEntries.length,
        invalid: invalidVisionEntries.map((entry) => ({
          name: entry?.name || '',
          status: entry?.status,
          passed: Boolean(entry?.passed),
          blocked: Boolean(entry?.blocked),
          itemCount: toNumber(entry?.details?.itemCount),
          unmappedCount: toNumber(entry?.details?.unmappedCount),
        })),
      }),
    );
  }

  const nutrition = aiApi.aiNutritionRecalculate;
  if (
    !nutrition ||
    !statusOk(nutrition.status) ||
    nutrition.offlineMode === true ||
    sourceLooksFallback(nutrition.source) ||
    !sourceLooksPrimaryAi(nutrition.source)
  ) {
    failures.push(
      makeFailure('ai-nutrition-primary-path', 'Nutrition recalculation must use the primary AI provider', {
        status: nutrition?.status,
        offlineMode: nutrition?.offlineMode,
        source: nutrition?.source || '',
      }),
    );
  }

  const voiceParse = aiApi.voiceParse;
  if (!voiceParse || !statusOk(voiceParse.status) || sourceLooksFallback(voiceParse.source)) {
    failures.push(
      makeFailure('voice-primary-path', 'Voice parsing must not use backend fallback logic', {
        status: voiceParse?.status,
        source: voiceParse?.source || '',
        intent: voiceParse?.intent || '',
      }),
    );
  }

  const voiceReadbackMatched =
    aiApi.voiceExecuteAddFoodReadback?.matched === true ||
    aiApi.readback?.voiceExecuteAddFoodMatched === true;
  if (!voiceReadbackMatched) {
    failures.push(
      makeFailure('voice-readback', 'Voice add-food execution must be visible in readback data', {
        commandMatched: aiApi.voiceExecuteAddFoodReadback?.matched,
        readbackMatched: aiApi.readback?.voiceExecuteAddFoodMatched,
      }),
    );
  }

  const recipeSuggestionCount = toNumber(
    aiApi.readback?.recipeSuggestionCount ?? aiApi.recipeSuggestions?.count,
  );
  if (recipeSuggestionCount < 1) {
    failures.push(
      makeFailure('recipe-primary-path', 'Recipe suggestions must return at least one item', {
        recipeSuggestionCount,
      }),
    );
  }

  if (Array.isArray(aiApi.blockedCoverageItems) && aiApi.blockedCoverageItems.length > 0) {
    warnings.push(
      makeWarning('blocked-coverage-items', 'Some smoke coverage items were blocked by missing fixtures or prerequisites', {
        blockedCoverageItems: aiApi.blockedCoverageItems,
      }),
    );
  }

  if (regression) {
    const primaryScans = Array.isArray(regression.scan)
      ? regression.scan.filter((entry) => entry?.bucket === 'primary')
      : [];
    const invalidPrimaryScans = primaryScans.filter((entry) => !isRegressionPrimaryScanReady(entry));
    if (primaryScans.length === 0) {
      warnings.push(
        makeWarning('regression-primary-scan-missing', 'Regression smoke report did not include primary scan fixtures'),
      );
    } else if (invalidPrimaryScans.length > 0) {
      failures.push(
        makeFailure('regression-primary-scan', 'Regression primary scan fixtures must produce expected labels', {
          invalid: invalidPrimaryScans.map((entry) => ({
            key: entry?.key || '',
            status: entry?.status,
            passed: Boolean(entry?.passed),
            usableResult: Boolean(entry?.usableResult),
            requiresExpectedLabel: Boolean(entry?.requiresExpectedLabel),
            expectedLabelMatched: Boolean(entry?.expectedLabelMatched),
          })),
        }),
      );
    }

    const regressionVoice = Array.isArray(regression.voice) ? regression.voice : [];
    const fallbackVoiceEntries = regressionVoice.filter((entry) =>
      sourceLooksFallback(entry?.parse?.source),
    );
    if (fallbackVoiceEntries.length > 0) {
      failures.push(
        makeFailure('regression-voice-primary-path', 'Regression voice checks must not use fallback parsing', {
          invalid: fallbackVoiceEntries.map((entry) => ({
            key: entry?.key || '',
            source: entry?.parse?.source || '',
          })),
        }),
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    evidence: {
      backendUrl,
      aiProviderUrl,
      credentialsSource,
      visionChecks: visionEntries.length,
      recipeSuggestionCount,
      voiceReadbackMatched,
      regressionIncluded: Boolean(regression),
    },
  };
}

function buildBackendNonUiSummary(input) {
  const primaryPathGate = evaluatePrimaryPathReadiness(input);
  const gates = {
    preflight: normalizeGate('preflight', input?.preflight),
    authApi: normalizeGate('auth-api', input?.authApi),
    userApi: normalizeGate('user-api', input?.userApi),
    aiApi: normalizeGate('ai-api', input?.aiApi),
    regression: normalizeGate('regression', input?.regression),
    primaryPath: normalizeGate('primary-path', primaryPathGate),
    cleanup: normalizeGate('cleanup', input?.cleanup),
  };
  const codeHealth = summarizeCodeHealth(input?.codeHealth);
  const failedCloudGates = Object.values(gates)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.name);
  const cloudGatePass = Object.values(gates).every((gate) => gate.passed);
  const failedChecks = [...codeHealth.failedChecks];

  return {
    generatedAt: new Date().toISOString(),
    outputDir: input?.outputDir || '',
    backendUrl: input?.backendUrl || '',
    aiProviderUrl: input?.aiProviderUrl || '',
    gates,
    primaryPath: primaryPathGate,
    primaryPathGate,
    codeHealth,
    cloudGate: {
      passed: cloudGatePass,
      failedGates: failedCloudGates,
    },
    cloudGatePass,
    cloudFunctionalPass: cloudGatePass,
    codeHealthPass: codeHealth.passed,
    overallPassed: cloudGatePass && codeHealth.passed,
    failedGates: failedCloudGates,
    failedChecks,
  };
}

module.exports = {
  buildBackendNonUiSummary,
  evaluatePrimaryPathReadiness,
  summarizeCodeHealth,
};
