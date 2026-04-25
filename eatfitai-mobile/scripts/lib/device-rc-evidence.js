const fs = require('fs');
const path = require('path');

const REQUIRED_RC_DEVICE_MODES = [
  'login-real',
  'home-smoke',
  'food-diary-readback',
  'scan-save-readback',
  'voice-text-readback',
  'stats-profile-smoke',
];

const MODES_REQUIRING_API_READBACK = new Set([
  'food-diary-readback',
  'scan-save-readback',
  'voice-text-readback',
  'stats-profile-smoke',
]);

function trim(value) {
  return String(value || '').trim();
}

function reportSortTime(report) {
  const parsed = Date.parse(report?.generatedAt || report?.finishedAt || 0);
  return Number.isFinite(parsed) ? parsed : Number(report?.mtimeMs || 0);
}

function pickLatestReportsByMode(reports) {
  const byMode = new Map();
  for (const report of Array.isArray(reports) ? reports : []) {
    const mode = trim(report?.mode);
    if (!REQUIRED_RC_DEVICE_MODES.includes(mode)) {
      continue;
    }

    const current = byMode.get(mode);
    if (!current || reportSortTime(report) >= reportSortTime(current)) {
      byMode.set(mode, report);
    }
  }

  return byMode;
}

function hasCriticalFailures(report) {
  return Array.isArray(report?.criticalFailures) && report.criticalFailures.length > 0;
}

function hasHomeMarkerEvidence(report) {
  const assertions = Array.isArray(report?.flowAssertions) ? report.flowAssertions : [];
  return assertions.some((assertion) => {
    const name = trim(assertion?.name).toLowerCase();
    return assertion?.status === 'pass' && name.includes('home') && name.includes('ui-marker');
  });
}

function mandatoryApiReadbacksPass(report) {
  if (!MODES_REQUIRING_API_READBACK.has(trim(report?.mode))) {
    return true;
  }

  const mandatoryReadbacks = (Array.isArray(report?.apiReadbacks) ? report.apiReadbacks : []).filter(
    (readback) => readback?.mandatory === true,
  );
  return (
    mandatoryReadbacks.length > 0 &&
    mandatoryReadbacks.every((readback) => readback.status === 'pass')
  );
}

function evaluateSingleReport(report) {
  const mode = trim(report?.mode);
  const failures = [];

  if (!report) {
    return {
      mode,
      passed: false,
      failures: ['missing-report'],
    };
  }

  if (trim(report.status).toLowerCase() === 'fail' || report.passed === false) {
    failures.push('status-failed');
  }
  if (hasCriticalFailures(report)) {
    failures.push('critical-failures');
  }
  if (report.authenticated !== true) {
    failures.push('authenticated-not-proven');
  }
  if (!hasHomeMarkerEvidence(report)) {
    failures.push('home-ui-marker-missing');
  }
  if (!mandatoryApiReadbacksPass(report)) {
    failures.push('mandatory-api-readback-missing-or-failed');
  }

  return {
    mode,
    path: trim(report.path || report.reportPath),
    status: trim(report.status),
    authenticated: report.authenticated === true,
    passed: failures.length === 0,
    failures,
  };
}

function evaluateRcDeviceReports(reports) {
  const byMode = pickLatestReportsByMode(reports);
  const missingModes = REQUIRED_RC_DEVICE_MODES.filter((mode) => !byMode.has(mode));
  const modeResults = {};
  const failedModes = [];

  for (const mode of REQUIRED_RC_DEVICE_MODES) {
    if (!byMode.has(mode)) {
      continue;
    }

    const result = evaluateSingleReport(byMode.get(mode));
    modeResults[mode] = result;
    if (!result.passed) {
      failedModes.push(mode);
    }
  }

  return {
    requiredModes: REQUIRED_RC_DEVICE_MODES,
    passed: missingModes.length === 0 && failedModes.length === 0,
    missingModes,
    failedModes,
    modeResults,
  };
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRcDeviceReportsFromRoot(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name, 'report.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      const report = readJsonIfExists(filePath) || {};
      return {
        ...report,
        path: filePath,
        reportPath: filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    });
}

module.exports = {
  REQUIRED_RC_DEVICE_MODES,
  evaluateRcDeviceReports,
  evaluateSingleReport,
  hasHomeMarkerEvidence,
  mandatoryApiReadbacksPass,
  readRcDeviceReportsFromRoot,
};
