const fs = require('fs');
const path = require('path');

const DEFAULT_OUTPUT_ROOT = path.resolve(__dirname, '..', '..', '_logs', 'production-smoke');

function trim(value) {
  return String(value || '').trim();
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  if (!fs.existsSync(DEFAULT_OUTPUT_ROOT)) {
    throw new Error(
      'Missing production smoke output root. Run production-smoke-preflight.js first or set EATFITAI_SMOKE_OUTPUT_DIR.',
    );
  }

  const candidates = fs
    .readdirSync(DEFAULT_OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (candidates.length === 0) {
    throw new Error('No production smoke sessions found.');
  }

  return path.join(DEFAULT_OUTPUT_ROOT, candidates[0]);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value, 'utf8');
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function rate(passed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  return Number(((passed / total) * 100).toFixed(1));
}

function countMissingEvidence(observations) {
  const evidence = observations?.evidence || {};
  const requiredKeys = [
    'mailboxScreenshot',
    'verificationScreenshot',
    'onboardingScreenshot',
    'homeScreenshot',
    'aiResultScreenshot',
    'diaryScreenshot',
    'logcatPath',
  ];

  const missing = requiredKeys.filter((key) => !trim(evidence[key]));
  return {
    requiredKeys,
    missing,
    presentCount: requiredKeys.length - missing.length,
  };
}

function summarizeBudget(budget) {
  const limits = budget?.limits || {};
  const used = budget?.used || {};
  const keys = Object.keys(limits);
  const entries = keys.map((key) => {
    const limit = Number(limits[key] || 0);
    const spent = Number(used[key] || 0);
    return {
      key,
      used: spent,
      limit,
      remaining: Math.max(0, limit - spent),
      withinLimit: spent <= limit,
    };
  });

  return {
    entries,
    withinLimits: entries.every((entry) => entry.withinLimit),
    overspent: entries.filter((entry) => !entry.withinLimit).map((entry) => entry.key),
  };
}

function summarizePreflight(preflight) {
  const health = preflight?.checks?.health || {};
  const auth = preflight?.checks?.auth || {};
  const healthChecks = [health.backendReady, health.backendLive, health.aiProviderHealthz].filter(Boolean);
  const authChecks = auth.skipped ? [] : [auth.login, auth.aiStatus, auth.refresh].filter(Boolean);

  return {
    healthPass: healthChecks.length > 0 && healthChecks.every((entry) => Boolean(entry.ok)),
    authPass: authChecks.length === 3 && authChecks.every((entry) => Boolean(entry.ok)),
    authSkipped: Boolean(auth.skipped),
    statuses: {
      backendReady: health.backendReady?.status ?? null,
      backendLive: health.backendLive?.status ?? null,
      aiProviderHealthz: health.aiProviderHealthz?.status ?? null,
      login: auth.login?.status ?? null,
      aiStatus: auth.aiStatus?.status ?? null,
      refresh: auth.refresh?.status ?? null,
    },
  };
}

function summarizeSearch(regression) {
  const entries = Array.isArray(regression?.search) ? regression.search : [];
  const positive = entries.filter((entry) => !entry.expectEmpty);
  const empty = entries.filter((entry) => entry.expectEmpty);
  const latencies = entries
    .map((entry) => entry.latencyMs)
    .filter((value) => Number.isFinite(value));

  return {
    attempted: entries.length,
    passed: entries.filter((entry) => entry.passed).length,
    positiveCases: positive.length,
    positivePassed: positive.filter((entry) => entry.passed).length,
    positivePassRate: rate(positive.filter((entry) => entry.passed).length, positive.length),
    emptyCases: empty.length,
    emptyPassed: empty.filter((entry) => entry.passed).length,
    emptyPassRate: rate(empty.filter((entry) => entry.passed).length, empty.length),
    actualEmptyResponses: entries.filter((entry) => Number(entry.resultCount || 0) === 0).length,
    latencyAvgMs: average(latencies),
    latencyP95Ms: percentile(latencies, 95),
    gatePass: entries.length > 0 && entries.every((entry) => entry.passed),
  };
}

function summarizeVoice(regression) {
  const entries = Array.isArray(regression?.voice) ? regression.voice : [];
  const parseLatencies = entries
    .map((entry) => entry.parse?.latencyMs)
    .filter((value) => Number.isFinite(value));
  const executeAttempted = entries.filter((entry) => entry.execute?.attempted);
  const addFoodExecutions = executeAttempted.filter(
    (entry) => entry.parse?.parsedIntent === 'ADD_FOOD',
  );
  const executeLatencies = executeAttempted
    .map((entry) => entry.execute?.latencyMs)
    .filter((value) => Number.isFinite(value));
  const skippedMutations = entries.filter(
    (entry) => entry.execute?.skipped && entry.execute?.skipReason === 'mutations-disabled',
  );
  const failedParse = entries.filter((entry) => !entry.parse?.passed);
  const failedExecute = executeAttempted.filter((entry) => !entry.execute?.passed);
  const diaryReadbackAttempted = entries.filter((entry) => entry.diaryReadback?.attempted);
  const diaryReadbackFailed = diaryReadbackAttempted.filter(
    (entry) => !entry.diaryReadback?.passed,
  );
  const missingDiaryReadback = addFoodExecutions.filter(
    (entry) => !entry.diaryReadback?.attempted || entry.diaryReadback?.skipped,
  );
  const lowConfidenceEntries = entries.filter(
    (entry) =>
      Number.isFinite(Number(entry.parse?.confidence)) &&
      Number(entry.parse?.confidence) > 0 &&
      Number(entry.parse?.confidence) < 0.75,
  );
  const sourceBreakdown = entries.reduce((acc, entry) => {
    const source = trim(entry.parse?.source || 'unknown') || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  return {
    attempted: entries.length,
    parsePassed: entries.filter((entry) => entry.parse?.passed).length,
    parseSuccessRate: rate(entries.filter((entry) => entry.parse?.passed).length, entries.length),
    previewPassed: entries.filter((entry) => entry.preview?.passed).length,
    reviewRequired: entries.filter((entry) => entry.parse?.reviewRequired).length,
    executeAttempted: executeAttempted.length,
    executePassed: executeAttempted.filter((entry) => entry.execute?.passed).length,
    executeSuccessRate: rate(
      executeAttempted.filter((entry) => entry.execute?.passed).length,
      executeAttempted.length,
    ),
    diaryReadbackAttempted: diaryReadbackAttempted.length,
    diaryReadbackPassed: diaryReadbackAttempted.filter((entry) => entry.diaryReadback?.passed)
      .length,
    skippedMutations: skippedMutations.map((entry) => entry.key),
    lowConfidenceKeys: lowConfidenceEntries.map((entry) => entry.key),
    missingDiaryReadback: missingDiaryReadback.map((entry) => entry.key),
    sourceBreakdown,
    parseLatencyAvgMs: average(parseLatencies),
    parseLatencyP95Ms: percentile(parseLatencies, 95),
    executeLatencyAvgMs: average(executeLatencies),
    executeLatencyP95Ms: percentile(executeLatencies, 95),
    validationMode: 'backend-proxy-text',
    audioSttReleaseGate: false,
    gatePass:
      entries.length > 0 &&
      failedParse.length === 0 &&
      failedExecute.length === 0 &&
      skippedMutations.length === 0 &&
      diaryReadbackFailed.length === 0 &&
      missingDiaryReadback.length === 0,
  };
}

function summarizeNutrition(regression, observations) {
  const entries = Array.isArray(regression?.nutrition) ? regression.nutrition : [];
  const suggested = entries.filter((entry) => entry.suggest?.passed);
  const applyAttempted = entries.filter((entry) => entry.apply?.attempted);
  const applyPassed = applyAttempted.filter((entry) => entry.apply?.passed);
  const manualPassed = Boolean(observations?.nutritionApply?.attempted && observations?.nutritionApply?.passed);
  const skippedMutations = entries.filter(
    (entry) => entry.apply?.skipped && entry.apply?.skipReason === 'mutations-disabled',
  );

  return {
    attempted: entries.length,
    suggestPassed: suggested.length,
    suggestSuccessRate: rate(suggested.length, entries.length),
    applyAttempted: applyAttempted.length,
    applyPassed: applyPassed.length,
    applySuccessRate: rate(applyPassed.length, applyAttempted.length),
    manualNutritionApplyPassed: manualPassed,
    skippedMutations: skippedMutations.map((entry) => entry.key),
    gatePass:
      (entries.length > 0 &&
        suggested.length === entries.length &&
        applyAttempted.length > 0 &&
        applyPassed.length === applyAttempted.length)
      || manualPassed,
  };
}

function summarizeScan(regression, observations) {
  const entries = Array.isArray(regression?.scan) ? regression.scan : [];
  const primary = entries.filter((entry) => entry.bucket === 'primary');
  const benchmark = entries.filter((entry) => entry.bucket === 'benchmark');
  const latencies = primary
    .map((entry) => entry.latencyMs)
    .filter((value) => Number.isFinite(value));
  const manual = observations?.scanToSave || {};
  const completionPassed = Boolean(manual.attempted && manual.passed && manual.diaryReadbackPassed);

  return {
    attempted: entries.length,
    primaryAttempted: primary.length,
    primaryPassed: primary.filter((entry) => entry.passed).length,
    primaryPassRate: rate(primary.filter((entry) => entry.passed).length, primary.length),
    benchmarkAttempted: benchmark.length,
    benchmarkPassed: benchmark.filter((entry) => entry.passed).length,
    usablePrimaryResults: primary.filter((entry) => entry.usableResult).length,
    latencyAvgMs: average(latencies),
    latencyP95Ms: percentile(latencies, 95),
    manualScanAttempted: Boolean(manual.attempted),
    manualScanPassed: Boolean(manual.passed),
    diaryReadbackPassed: Boolean(manual.diaryReadbackPassed),
    manualFixtureKey: trim(manual.fixtureKey),
    scanToSaveCompletionPassed: completionPassed,
    gatePass: primary.filter((entry) => entry.passed).length >= 1 && completionPassed,
  };
}

function summarizeRiskScenarios(observations) {
  const risk = observations?.riskScenarios || {};
  const entries = ['aiDownFallback', 'networkLag', 'dataCorrupt'].map((key) => ({
    key,
    attempted: Boolean(risk[key]?.attempted),
    passed: Boolean(risk[key]?.passed),
    notes: trim(risk[key]?.notes),
  }));

  return {
    entries,
    gatePass: entries.length === 3 && entries.every((entry) => entry.attempted && entry.passed),
  };
}

function summarizeStability(observations) {
  const stability = observations?.stability || {};
  return {
    crashObserved: Boolean(stability.crashObserved),
    freezeObserved: Boolean(stability.freezeObserved),
    notes: trim(stability.notes),
    gatePass: !stability.crashObserved && !stability.freezeObserved,
  };
}

function buildMarkdown(report) {
  const lines = [
    '# Scan Demo Metrics Baseline',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Session: ${report.outputDir}`,
    `- Backend: ${report.backendUrl || 'unknown'}`,
    '',
    '## Gates',
    `- Preflight pass: ${report.gates.preflightPass ? 'yes' : 'no'}`,
    `- Search gate: ${report.gates.searchPass ? 'yes' : 'no'}`,
    `- Voice gate: ${report.gates.voiceGatePass ? 'yes' : 'no'}`,
    `- Voice validation mode: ${report.productMetrics.voice.validationMode}`,
    `- Scan-to-save gate: ${report.gates.scanGatePass ? 'yes' : 'no'}`,
    `- Nutrition apply gate: ${report.gates.nutritionGatePass ? 'yes' : 'no'}`,
    `- Risk scenarios pass: ${report.gates.riskScenariosPass ? 'yes' : 'no'}`,
    `- Evidence complete: ${report.gates.evidenceComplete ? 'yes' : 'no'}`,
    `- Stability pass: ${report.gates.stabilityPass ? 'yes' : 'no'}`,
    `- Budget within limits: ${report.gates.budgetWithinLimits ? 'yes' : 'no'}`,
    `- Rehearsal ready: ${report.gates.rehearsalReady ? 'yes' : 'no'}`,
    '',
    '## Product Metrics',
    `- Search positive pass rate: ${report.productMetrics.search.positivePassRate ?? 'n/a'}%`,
    `- Search empty pass rate: ${report.productMetrics.search.emptyPassRate ?? 'n/a'}%`,
    `- Scan primary pass rate: ${report.productMetrics.scan.primaryPassRate ?? 'n/a'}%`,
    `- Scan-to-save completion: ${report.productMetrics.scan.scanToSaveCompletionPassed ? 'yes' : 'no'}`,
    `- Voice parse success rate: ${report.productMetrics.voice.parseSuccessRate ?? 'n/a'}%`,
    `- Voice execute success rate: ${report.productMetrics.voice.executeSuccessRate ?? 'n/a'}%`,
    `- Voice preview passed: ${report.productMetrics.voice.previewPassed ?? 'n/a'}`,
    `- Voice review-required count: ${report.productMetrics.voice.reviewRequired ?? 'n/a'}`,
    `- Voice diary readback: ${report.productMetrics.voice.diaryReadbackPassed ?? 'n/a'} / ${report.productMetrics.voice.diaryReadbackAttempted ?? 'n/a'}`,
    `- Voice parse latency avg/p95: ${report.productMetrics.voice.parseLatencyAvgMs ?? 'n/a'} / ${report.productMetrics.voice.parseLatencyP95Ms ?? 'n/a'} ms`,
    `- Voice execute latency avg/p95: ${report.productMetrics.voice.executeLatencyAvgMs ?? 'n/a'} / ${report.productMetrics.voice.executeLatencyP95Ms ?? 'n/a'} ms`,
    '- Voice gate on VM uses backend proxy parse/execute/confirm-weight instead of live microphone capture.',
    `- Nutrition suggest success rate: ${report.productMetrics.nutrition.suggestSuccessRate ?? 'n/a'}%`,
    `- Nutrition apply success rate: ${report.productMetrics.nutrition.applySuccessRate ?? 'n/a'}%`,
    '',
    '## Evidence',
    `- Present: ${report.evidence.presentCount}/${report.evidence.requiredKeys.length}`,
    `- Missing: ${report.evidence.missing.length > 0 ? report.evidence.missing.join(', ') : 'none'}`,
    '',
  ];

  if (report.gateFailures.length > 0) {
    lines.push('## Gate Failures');
    for (const failure of report.gateFailures) {
      lines.push(`- ${failure}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json')) || {};
  const regression = readJsonIfExists(path.join(outputDir, 'regression-run.json')) || {};
  const observations = readJsonIfExists(path.join(outputDir, 'session-observations.json')) || {};
  const budget = readJsonIfExists(path.join(outputDir, 'request-budget.json')) || {};
  const preflightSummary = summarizePreflight(preflight);
  const searchSummary = summarizeSearch(regression);
  const voiceSummary = summarizeVoice(regression);
  const nutritionSummary = summarizeNutrition(regression, observations);
  const scanSummary = summarizeScan(regression, observations);
  const riskSummary = summarizeRiskScenarios(observations);
  const stabilitySummary = summarizeStability(observations);
  const evidenceSummary = countMissingEvidence(observations);
  const budgetSummary = summarizeBudget(budget);

  const gates = {
    preflightPass: preflightSummary.healthPass && preflightSummary.authPass,
    searchPass: searchSummary.gatePass,
    voiceGatePass: voiceSummary.gatePass,
    scanGatePass: scanSummary.gatePass,
    nutritionGatePass: nutritionSummary.gatePass,
    riskScenariosPass: riskSummary.gatePass,
    evidenceComplete: evidenceSummary.missing.length === 0,
    stabilityPass: stabilitySummary.gatePass,
    budgetWithinLimits: budgetSummary.withinLimits,
  };
  gates.rehearsalReady = Object.values(gates).every(Boolean);

  const gateFailures = Object.entries(gates)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl: preflight.backendUrl || regression.backendUrl || '',
    cloudPath: preflight.cloudPath || '',
    productMetrics: {
      search: searchSummary,
      scan: scanSummary,
      voice: voiceSummary,
      nutrition: nutritionSummary,
      requestBudget: budgetSummary,
    },
    preflight: preflightSummary,
    evidence: evidenceSummary,
    stability: stabilitySummary,
    risks: riskSummary,
    gates,
    gateFailures,
  };

  const jsonPath = path.join(outputDir, 'metrics-baseline.json');
  const markdownPath = path.join(outputDir, 'metrics-baseline.md');
  writeJson(jsonPath, report);
  writeText(markdownPath, buildMarkdown(report));

  console.log(`[production-smoke-metrics] Wrote ${jsonPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        rehearsalReady: report.gates.rehearsalReady,
        gateFailures: report.gateFailures,
        search: {
          positivePassRate: report.productMetrics.search.positivePassRate,
          emptyPassRate: report.productMetrics.search.emptyPassRate,
        },
        scan: {
          primaryPassRate: report.productMetrics.scan.primaryPassRate,
          scanToSaveCompletionPassed: report.productMetrics.scan.scanToSaveCompletionPassed,
        },
        voice: {
          parseSuccessRate: report.productMetrics.voice.parseSuccessRate,
          executeSuccessRate: report.productMetrics.voice.executeSuccessRate,
          parseLatencyAvgMs: report.productMetrics.voice.parseLatencyAvgMs,
          executeLatencyAvgMs: report.productMetrics.voice.executeLatencyAvgMs,
        },
        nutrition: {
          suggestSuccessRate: report.productMetrics.nutrition.suggestSuccessRate,
          applySuccessRate: report.productMetrics.nutrition.applySuccessRate,
          manualNutritionApplyPassed: report.productMetrics.nutrition.manualNutritionApplyPassed,
        },
      },
      null,
      2,
    ),
  );

  if (!report.gates.rehearsalReady) {
    process.exitCode = 1;
  }
}

main();
