const fs = require('fs');
const path = require('path');

const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);

function trim(value) {
  const normalized = String(value || '').trim();
  const quotedMatch = normalized.match(/^"(.*)"$/);
  return quotedMatch ? quotedMatch[1] : normalized;
}

function normalizePathArg(value) {
  return trim(value).replace(/\\"/g, '"').replace(/"/g, '');
}

function resolveRootDir(cliValue) {
  const explicit =
    normalizePathArg(cliValue) || normalizePathArg(process.env.EATFITAI_SMOKE_REHEARSAL_ROOT);
  const resolved = explicit ? path.resolve(explicit) : DEFAULT_OUTPUT_ROOT;

  if (!fs.existsSync(resolved)) {
    throw new Error(`Production smoke root not found: ${resolved}`);
  }

  if (fs.existsSync(path.join(resolved, 'preflight-results.json'))) {
    return path.dirname(resolved);
  }

  return resolved;
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

function listSessionDirs(rootDir) {
  const sessionNamePattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => sessionNamePattern.test(entry.name))
    .map((entry) => path.join(rootDir, entry.name))
    .filter(
      (sessionDir) =>
        fs.existsSync(path.join(sessionDir, 'preflight-results.json')) &&
        fs.existsSync(path.join(sessionDir, 'metrics-baseline.json')),
    )
    .sort();
}

function evaluateSession(sessionDir) {
  const metrics = readJsonIfExists(path.join(sessionDir, 'metrics-baseline.json'));
  const observations =
    readJsonIfExists(path.join(sessionDir, 'session-observations.json')) || {};
  const summary = metrics?.productMetrics || {};
  const gates = metrics?.gates || {};
  const failures = [];

  if (!metrics) {
    failures.push('missing-metrics-baseline');
  } else {
    if (!gates.preflightPass) failures.push('preflightPass');
    if (!gates.searchPass) failures.push('searchPass');
    if (!gates.voiceGatePass) failures.push('voiceGatePass');
    if (!gates.scanGatePass) failures.push('scanGatePass');
    if (!gates.nutritionGatePass) failures.push('nutritionGatePass');
    if (!gates.riskScenariosPass) failures.push('riskScenariosPass');
    if (!gates.evidenceComplete) failures.push('evidenceComplete');
    if (!gates.stabilityPass) failures.push('stabilityPass');
    if (!gates.budgetWithinLimits) failures.push('budgetWithinLimits');
  }

  const riskEntries = metrics?.risks?.entries || [];
  const riskSnapshot = Object.fromEntries(
    riskEntries.map((entry) => [
      entry.key,
      { attempted: entry.attempted, passed: entry.passed },
    ]),
  );

  return {
    sessionDir,
    sessionName: path.basename(sessionDir),
    pass: failures.length === 0,
    failures,
    summary: {
      searchPositivePassRate: summary.search?.positivePassRate ?? null,
      scanPrimaryPassRate: summary.scan?.primaryPassRate ?? null,
      scanToSaveCompletionPassed: summary.scan?.scanToSaveCompletionPassed ?? false,
      voiceParseSuccessRate: summary.voice?.parseSuccessRate ?? null,
      voiceExecuteSuccessRate: summary.voice?.executeSuccessRate ?? null,
      nutritionApplySuccessRate: summary.nutrition?.applySuccessRate ?? null,
      evidenceMissing: metrics?.evidence?.missing || [],
      riskSnapshot,
      crashObserved: Boolean(observations?.stability?.crashObserved),
      freezeObserved: Boolean(observations?.stability?.freezeObserved),
    },
  };
}

function buildMarkdown(report) {
  const lines = [
    '# Scan Demo Rehearsal Summary',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Root: ${report.rootDir}`,
    `- Sessions considered: ${report.sessions.length}`,
    `- Latest three available: ${report.latestThree.length}`,
    `- Consecutive pass gate: ${report.consecutivePass ? 'yes' : 'no'}`,
    '',
    '## Latest Three',
  ];

  for (const session of report.latestThree) {
    lines.push(
      `- ${session.sessionName}: ${session.pass ? 'pass' : 'fail'}${
        session.failures.length > 0 ? ` (${session.failures.join(', ')})` : ''
      }`,
    );
  }

  if (report.failures.length > 0) {
    lines.push('');
    lines.push('## Global Failures');
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return lines.join('\n');
}

function main() {
  const rootDir = resolveRootDir(process.argv[2]);
  const sessions = listSessionDirs(rootDir).map(evaluateSession);
  const latestThree = sessions.slice(-3);
  const failures = [];

  if (latestThree.length < 3) {
    failures.push('less-than-three-sessions');
  }

  if (latestThree.length === 3 && !latestThree.every((session) => session.pass)) {
    failures.push('latest-three-not-all-pass');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    rootDir,
    sessions,
    latestThree,
    consecutivePass:
      latestThree.length === 3 && latestThree.every((session) => session.pass),
    failures,
  };

  const jsonPath = path.join(rootDir, 'rehearsal-summary.json');
  const markdownPath = path.join(rootDir, 'rehearsal-summary.md');
  writeJson(jsonPath, report);
  writeText(markdownPath, buildMarkdown(report));

  console.log(`[production-smoke-rehearsal] Wrote ${jsonPath}`);
  console.log(
    JSON.stringify(
      {
        rootDir,
        sessions: sessions.length,
        latestThree: latestThree.map((session) => ({
          sessionName: session.sessionName,
          pass: session.pass,
          failures: session.failures,
        })),
        consecutivePass: report.consecutivePass,
        failures: report.failures,
      },
      null,
      2,
    ),
  );

  if (!report.consecutivePass) {
    process.exitCode = 1;
  }
}

main();
