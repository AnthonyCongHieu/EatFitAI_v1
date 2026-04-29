function trim(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return trim(value).toLowerCase();
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function statusOk(value) {
  if (value === undefined || value === null) {
    return true;
  }

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

function isBlockedState(value) {
  return /\b(down|degraded|unhealthy|error|unavailable|offline)\b/i.test(trim(value));
}

function isFallbackSource(value) {
  const source = normalize(value);
  if (!source) {
    return true;
  }

  return /\b(backend-rule-fallback|backend-rule-parser|fallback|offline|local|mock|fixture|stub|heuristic|formula)\b/.test(
    source,
  );
}

function isPrimaryAiSource(value) {
  return /\b(gemini|provider|llm|ai-provider)\b/i.test(trim(value));
}

function getVisionEntries(report) {
  const entries = report?.endpointGroups?.['vision/detect'];
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

function pushUnique(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function evaluateAiPrimaryPathReadiness(report = {}) {
  const failures = [];
  const degraded = [];
  const aiStatus = report.aiStatus || {};
  const nutrition = report.aiNutritionRecalculate || {};
  const voiceParse = report.voiceParse || {};
  const readback = report.readback || {};
  const visionEntries = getVisionEntries(report);
  const backendUrl = trim(report.backendUrl);
  const aiProviderUrl = trim(report.aiProviderUrl) || trim(aiStatus.providerUrl);
  const credentialsSource = trim(report.credentials?.source || report.credentialsSource);

  if (looksLocalUrl(backendUrl)) {
    failures.push('local-backend-url');
  }

  if (looksLocalUrl(aiProviderUrl)) {
    failures.push('local-ai-provider-url');
  }

  if (['default-demo-account', 'local-default-demo-account'].includes(credentialsSource)) {
    failures.push('local-default-credentials');
  }

  if (aiStatus.ok !== true || isBlockedState(aiStatus.state) || !statusOk(aiStatus.status)) {
    failures.push('ai-status-primary-path-failed');
  }

  if (aiStatus.geminiConfigured === false) {
    failures.push('gemini-not-configured');
  }

  const invalidVisionEntries = visionEntries.filter((entry) => !isUsableVisionEntry(entry));
  if (visionEntries.length > 0 && invalidVisionEntries.length > 0) {
    failures.push('vision-primary-path-no-usable-detection');
  }
  if (visionEntries.length === 0 && toNumber(readback.detectedLabels) <= 0) {
    failures.push(
      aiStatus.modelLoaded === false ? 'vision-model-not-loaded' : 'vision-primary-path-no-detections',
    );
  }

  if (
    !statusOk(nutrition.status) ||
    nutrition.offlineMode === true ||
    isFallbackSource(nutrition.source) ||
    !isPrimaryAiSource(nutrition.source)
  ) {
    failures.push('nutrition-primary-path-used-fallback');
  }

  if (!statusOk(voiceParse.status) || isFallbackSource(voiceParse.source)) {
    failures.push('voice-primary-path-used-fallback');
  }

  const voiceAddFoodMatched =
    report.voiceExecuteAddFoodReadback?.matched === true ||
    readback.voiceExecuteAddFoodMatched === true;
  if (!voiceAddFoodMatched) {
    failures.push('voice-add-food-readback-missing');
  }

  if (toNumber(readback.recipeSuggestionCount ?? report.recipeSuggestions?.count) <= 0) {
    failures.push('recipe-primary-path-empty');
  }

  if (Array.isArray(report.blockedCoverageItems)) {
    for (const item of report.blockedCoverageItems) {
      pushUnique(degraded, item?.key || 'blocked-coverage-item');
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    degraded,
  };
}

function gatePrimaryPathPassed(gate) {
  return Boolean(gate?.passed === true && gate?.primaryPath?.passed === true);
}

function evaluateCloudPrimaryPathReadiness(gates = {}) {
  const required = [
    ['auth-api', gates.authApi],
    ['user-api', gates.userApi],
    ['ai-api', gates.aiApi],
    ['regression', gates.regression],
  ];
  const failures = [];

  for (const [name, gate] of required) {
    if (!gatePrimaryPathPassed(gate)) {
      failures.push(`${name}-primary-path-failed`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

module.exports = {
  evaluateAiPrimaryPathReadiness,
  evaluateCloudPrimaryPathReadiness,
  isFallbackSource,
};
