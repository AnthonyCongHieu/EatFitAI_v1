/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { spawn, spawnSync } = require('child_process');
const { redactLogcatText } = require('./lib/device-logcat');
const { buildDeviceFlowAuthPacer } = require('./lib/device-flow-pacing');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const matrixPath = path.join(repoRoot, 'docs', 'qa', 'FULL_APP_E2E_RECORDING_TESTCASE_MATRIX_2026-05-20.md');
const outputRoot = path.join(repoRoot, '_logs', 'apk-e2e-full');
const APP_PACKAGE = 'com.eatfitai.app';

const AUTOMATION_BY_ID = {
  'APK-00': { mode: 'doctor', args: [] },
  'APK-01': { mode: 'probe', args: [] },
  'AUTH-09': { mode: 'register-new-user', args: [] },
  'AUTH-01': { mode: 'login-real', args: [] },
  'HOME-01': { mode: 'home-smoke', args: [] },
  'DIARY-01': { mode: 'food-diary-readback', args: [] },
  'DIARY-02': { mode: 'food-search-ui-readback', args: [] },
  'SCAN-01': { mode: 'scan-save-readback', args: [] },
  'VOICE-01': { mode: 'voice-text-readback', args: [] },
  'STATS-01': { mode: 'stats-profile-smoke', args: [] },
  'PROF-01': { mode: 'stats-profile-smoke', args: [] },
  'MOCHI-02': { mode: 'visual-ui-audit', args: ['--flow', 'core-app'] },
  'NAV-01': { mode: 'full-tab-ui-smoke', args: [] },
  'PERF-02': { mode: 'backend-frontend-live-check', args: [] },
};

function trim(value) {
  return String(value || '').trim();
}

function sleepSync(ms) {
  if (ms > 0) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeName(value) {
  return trim(value)
    .normalize('NFKD')
    .replace(/[^\w\s.-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function readCliOption(name, fallback = '') {
  const directPrefix = `${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(directPrefix));
  if (direct) {
    return trim(direct.slice(directPrefix.length)) || fallback;
  }

  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return trim(process.argv[index + 1]) || fallback;
  }

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function splitMarkdownRow(line) {
  return trim(line)
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => trim(cell.replace(/<br\s*\/?>/gi, '\n')));
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMatrixMarkdown(filePath = matrixPath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const cases = [];
  let section = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1];
      continue;
    }

    if (!line.includes('| ID |') && !line.includes('|ID|')) {
      continue;
    }

    const headers = splitMarkdownRow(line);
    if (!headers.includes('ID') || !headers.includes('Flow')) {
      continue;
    }

    index += 1;
    while (index < lines.length) {
      const row = lines[index];
      if (!row.includes('|')) {
        index -= 1;
        break;
      }

      const cells = splitMarkdownRow(row);
      if (isSeparatorRow(cells)) {
        index += 1;
        continue;
      }

      const record = {};
      headers.forEach((header, cellIndex) => {
        record[header] = cells[cellIndex] || '';
      });

      if (/^[A-Z]+-\d+[A-Z]?$/.test(record.ID || '')) {
        const automation = AUTOMATION_BY_ID[record.ID] || null;
        cases.push({
          id: record.ID,
          priority: record.Priority || '',
          category: section,
          flow: record.Flow || '',
          startState: record['Start State'] || '',
          endState: record['End State'] || '',
          surfaces: record['Buttons/Surfaces To Cover'] || '',
          expected: record['Expected Result'] || '',
          automationMode: automation?.mode || '',
          automationArgs: automation?.args || [],
          executionType: automation ? 'automated-adb' : 'manual-recorded',
          folderName: `${record.ID}-${safeName(record.Flow || record.ID)}`,
        });
      }

      index += 1;
    }
  }

  return cases;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'utf8');
}

function buildCaseNotes(testcase) {
  return `# ${testcase.id} ${testcase.flow}

Result: NOT RUN

Start state:
${testcase.startState}

End state:
${testcase.endState}

Steps actually performed:
1.

Expected:
${testcase.expected}

Production judgment:

MoChi/overlay/toast check:

Data readback check:

Backend log check:

Issues:
- Severity:
- Evidence timestamp:
- Repro step:

Redaction notes:
- Passwords, JWTs, refresh tokens, reset OTPs, and email contents must be redacted in written notes.
`;
}

function buildBackendLogGuide() {
  return `# Backend Log Capture Setup

The APK E2E suite always captures Android logcat per flow.

For backend logs, set one of these optional environment variables before running the suite:

\`\`\`powershell
$env:EATFITAI_E2E_BACKEND_LOG_FILE = "D:\\EatFitAI_v1\\_logs\\backend\\backend.log"
\`\`\`

or:

\`\`\`powershell
$env:EATFITAI_E2E_BACKEND_LOG_COMMAND = "powershell -NoLogo -NoProfile -Command Get-Content -Path D:\\EatFitAI_v1\\_logs\\backend\\backend.log -Wait"
\`\`\`

The runner stores backend output in each flow folder as \`backend-log-redacted.txt\` and writes \`backend-log-status.json\`.
Tokens, bearer headers, common token fields, passwords, API keys, and OTP-like values are redacted from captured text.
`;
}

function testcaseRows(cases) {
  return [
    [
      'ID',
      'Priority',
      'Category',
      'Flow',
      'Execution Type',
      'Automation Mode',
      'Start State',
      'End State',
      'Surfaces',
      'Expected',
      'Folder',
      'Suggested Command',
    ],
    ...cases.map((testcase) => [
      testcase.id,
      testcase.priority,
      testcase.category,
      testcase.flow,
      testcase.executionType,
      testcase.automationMode,
      testcase.startState,
      testcase.endState,
      testcase.surfaces,
      testcase.expected,
      testcase.folderName,
      suggestedCommand(testcase),
    ]),
  ];
}

function suggestedCommand(testcase) {
  if (testcase.automationMode) {
    return [
      'node',
      'scripts/apk-e2e-suite.js',
      'run',
      '--id',
      testcase.id,
      '--record',
    ].join(' ');
  }

  return [
    'node',
    'scripts/apk-e2e-suite.js',
    'record',
    '--id',
    testcase.id,
    '--duration',
    '150',
  ].join(' ');
}

function createSuiteRoot(rootArg = '') {
  const root = rootArg ? path.resolve(rootArg) : path.join(outputRoot, stamp());
  ensureDir(root);
  ensureDir(outputRoot);
  fs.writeFileSync(path.join(outputRoot, 'latest.txt'), root, 'utf8');
  return root;
}

function prepareSuite(rootArg = '') {
  const cases = parseMatrixMarkdown();
  const root = createSuiteRoot(rootArg);

  for (const testcase of cases) {
    const caseDir = path.join(root, testcase.folderName);
    ensureDir(caseDir);
    fs.writeFileSync(path.join(caseDir, 'notes.md'), buildCaseNotes(testcase), 'utf8');
  }

  writeJson(path.join(root, 'testcase-matrix.json'), cases);
  writeCsv(path.join(root, 'testcase-matrix.csv'), testcaseRows(cases));
  fs.writeFileSync(path.join(root, 'BACKEND_LOG_SETUP.md'), buildBackendLogGuide(), 'utf8');
  fs.writeFileSync(path.join(root, 'MANIFEST.md'), buildManifest(cases), 'utf8');

  return { root, cases };
}

function buildManifest(cases) {
  const automated = cases.filter((testcase) => testcase.executionType === 'automated-adb').length;
  const manual = cases.length - automated;
  const p0 = cases.filter((testcase) => testcase.priority === 'P0').length;

  return `# EatFitAI APK Full E2E Evidence Manifest

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|---|---:|
| Total testcase folders | ${cases.length} |
| P0 testcase folders | ${p0} |
| Automated ADB flows | ${automated} |
| Manual recorded flows | ${manual} |

## Execution Rules

- One flow equals one folder and one primary video.
- Keep \`video.mp4\`, screenshots, redacted Android logcat, backend logs, UI dump, and notes inside that flow folder.
- Use \`testcase-matrix.csv\` as the source for the spreadsheet tracker.
- Use \`EXECUTION_REPORT.md\` after running automated or manual flows.

## Quick Commands

\`\`\`powershell
$env:EATFITAI_ANDROID_TARGET = "real-device"
$env:ANDROID_SERIAL = "<device_serial>"
npm --prefix .\\eatfitai-mobile run device:apk-e2e-suite:prepare
npm --prefix .\\eatfitai-mobile run device:apk-e2e-suite:run -- --only P0 --record
\`\`\`
`;
}

function resolveExecutable(name, candidates = []) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const exe = process.platform === 'win32' && name === 'adb' ? 'adb.exe' : name;
  const result = spawnSync(command, [exe], { encoding: 'utf8', shell: false });
  const first = trim(result.stdout).split(/\r?\n/).find(Boolean);
  return result.status === 0 && first ? first : exe;
}

function resolveAdb() {
  return resolveExecutable('adb', [
    path.join(repoRoot, '_tooling', 'android-sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
  ]);
}

function adbArgs(serial, args) {
  return serial ? ['-s', serial, ...args] : args;
}

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || mobileRoot,
    encoding: options.encoding || 'utf8',
    timeout: options.timeoutMs || 30000,
    shell: false,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trim(result.stdout),
    stderr: trim(result.stderr),
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function requireSerial(adb) {
  const serial = trim(process.env.ANDROID_SERIAL);
  const target = trim(process.env.EATFITAI_ANDROID_TARGET || process.env.EATFITAI_ANDROID_TARGET_MODE).toLowerCase();
  if (!serial || !['real', 'real-device', 'device', 'usb'].includes(target)) {
    throw new Error('Set EATFITAI_ANDROID_TARGET=real-device and ANDROID_SERIAL before running APK E2E capture.');
  }

  const devices = runSync(adb, ['devices'], { timeoutMs: 10000 });
  if (!devices.ok || !devices.stdout.includes(`${serial}\tdevice`)) {
    throw new Error(`ANDROID_SERIAL=${serial} is not an online adb device.`);
  }

  return serial;
}

function captureAdbFile(adb, serial, args, localPath, options = {}) {
  const result = runSync(adb, adbArgs(serial, args), { timeoutMs: options.timeoutMs || 30000 });
  fs.writeFileSync(localPath, result.stdout || result.stderr || result.error || '', 'utf8');
  return result;
}

function captureScreenshot(adb, serial, caseDir, name) {
  const remote = `/sdcard/eatfitai-${safeName(name)}.png`;
  const local = path.join(caseDir, `${safeName(name)}.png`);
  runSync(adb, adbArgs(serial, ['shell', 'screencap', '-p', remote]), { timeoutMs: 20000 });
  runSync(adb, adbArgs(serial, ['pull', remote, local]), { timeoutMs: 30000 });
  return fs.existsSync(local) ? local : '';
}

function redactEvidenceText(text) {
  return redactLogcatText(text)
    .replace(/\b(otp|resetCode|verificationCode|code)["'=:\s-]+[A-Za-z0-9-]{4,12}/gi, '$1=[REDACTED]')
    .replace(/\b\d{6}\b/g, '[REDACTED_6_DIGIT_CODE]');
}

function startLogcatCapture(adb, serial, caseDir) {
  const rawPath = path.join(caseDir, 'logcat-raw.txt');
  const out = fs.openSync(rawPath, 'w');
  const child = spawn(adb, adbArgs(serial, ['logcat', '-v', 'threadtime']), {
    cwd: mobileRoot,
    stdio: ['ignore', out, out],
    shell: false,
  });

  return {
    child,
    rawPath,
    out,
    redactedPath: path.join(caseDir, 'logcat-redacted.txt'),
  };
}

function readFileTailFromOffset(filePath, offset) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  const stat = fs.statSync(filePath);
  const start = Math.min(offset || 0, stat.size);
  const fd = fs.openSync(filePath, 'r');
  const length = stat.size - start;
  const buffer = Buffer.alloc(length);
  fs.readSync(fd, buffer, 0, length, start);
  fs.closeSync(fd);
  return buffer.toString('utf8');
}

function startBackendCapture(caseDir) {
  const filePath = trim(process.env.EATFITAI_E2E_BACKEND_LOG_FILE);
  const command = trim(process.env.EATFITAI_E2E_BACKEND_LOG_COMMAND);
  const outputPath = path.join(caseDir, 'backend-log-redacted.txt');
  const statusPath = path.join(caseDir, 'backend-log-status.json');

  if (filePath) {
    const offset = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    return {
      kind: 'file',
      filePath,
      offset,
      outputPath,
      statusPath,
    };
  }

  if (command) {
    const rawPath = path.join(caseDir, 'backend-log-raw.txt');
    const out = fs.openSync(rawPath, 'w');
    const child = spawn(command, {
      cwd: repoRoot,
      stdio: ['ignore', out, out],
      shell: true,
    });
    return {
      kind: 'command',
      command,
      child,
      rawPath,
      out,
      outputPath,
      statusPath,
    };
  }

  writeJson(statusPath, {
    enabled: false,
    reason: 'Set EATFITAI_E2E_BACKEND_LOG_FILE or EATFITAI_E2E_BACKEND_LOG_COMMAND to capture backend logs.',
  });
  fs.writeFileSync(outputPath, '', 'utf8');
  return {
    kind: 'disabled',
    outputPath,
    statusPath,
  };
}

function stopProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function stopDeviceScreenrecord(adb, serial) {
  const stopSignals = [
    ['shell', 'pkill', '-2', 'screenrecord'],
    ['shell', 'killall', '-2', 'screenrecord'],
  ];
  for (const args of stopSignals) {
    const result = runSync(adb, adbArgs(serial, args), { timeoutMs: 5000 });
    if (result.ok) {
      return result;
    }
  }
  return { ok: false, error: 'Unable to signal screenrecord on device.' };
}

function finishLogcatCapture(capture) {
  if (!capture) {
    return;
  }

  stopProcessTree(capture.child);
  try {
    fs.closeSync(capture.out);
  } catch {
    // Best-effort cleanup only.
  }

  const raw = fs.existsSync(capture.rawPath) ? fs.readFileSync(capture.rawPath, 'utf8') : '';
  fs.writeFileSync(capture.redactedPath, redactEvidenceText(raw), 'utf8');
}

function finishBackendCapture(capture) {
  if (!capture || capture.kind === 'disabled') {
    return;
  }

  let raw = '';
  if (capture.kind === 'file') {
    raw = readFileTailFromOffset(capture.filePath, capture.offset);
    writeJson(capture.statusPath, {
      enabled: true,
      source: 'file',
      filePath: capture.filePath,
      bytesCaptured: Buffer.byteLength(raw),
    });
  } else if (capture.kind === 'command') {
    stopProcessTree(capture.child);
    try {
      fs.closeSync(capture.out);
    } catch {
      // Best-effort cleanup only.
    }
    raw = fs.existsSync(capture.rawPath) ? fs.readFileSync(capture.rawPath, 'utf8') : '';
    writeJson(capture.statusPath, {
      enabled: true,
      source: 'command',
      command: capture.command,
      bytesCaptured: Buffer.byteLength(raw),
    });
  }

  fs.writeFileSync(capture.outputPath, redactEvidenceText(raw), 'utf8');
}

function copyRecursive(source, target) {
  if (!source || !fs.existsSync(source)) {
    return;
  }

  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.copyFileSync(source, target);
}

function findChildOutputDir(stdout) {
  const match = String(stdout || '').match(/REAL_DEVICE_ADB_OUTPUT_DIR=(.+)/);
  return match ? trim(match[1]) : '';
}

function runChildFlow(testcase, caseDir, record) {
  const args = ['scripts/real-device-adb-flow.js', testcase.automationMode, ...testcase.automationArgs];
  if (record) {
    args.push('--record');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: mobileRoot,
    encoding: 'utf8',
    shell: false,
    env: process.env,
    timeout: Number(process.env.EATFITAI_E2E_FLOW_TIMEOUT_MS || 360000),
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  fs.writeFileSync(path.join(caseDir, 'runner-child-output.txt'), `${stdout}\n${stderr}`, 'utf8');

  const childOutputDir = findChildOutputDir(stdout);
  if (childOutputDir) {
    copyRecursive(childOutputDir, path.join(caseDir, 'adb-flow-output'));
  }

  const childReportPath = childOutputDir ? path.join(childOutputDir, 'report.json') : '';
  const childReport = childReportPath && fs.existsSync(childReportPath)
    ? JSON.parse(fs.readFileSync(childReportPath, 'utf8'))
    : null;

  return {
    exitCode: result.status,
    error: result.error ? String(result.error.message || result.error) : '',
    stdout,
    stderr,
    childOutputDir,
    childReport,
  };
}

function writeCaseResultNotes(testcase, caseDir, result) {
  const status = result.childReport?.status || (result.exitCode === 0 ? 'pass' : 'fail');
  const passed = result.childReport?.passed === true || result.exitCode === 0;
  const warnings = result.childReport?.warnings || [];
  const failures = result.childReport?.criticalFailures || [];
  const apiReadbacks = result.childReport?.apiReadbacks || [];

  const notes = `# ${testcase.id} ${testcase.flow}

Result: ${passed ? 'PASS' : status.toUpperCase()}

Start state:
${testcase.startState}

End state:
${testcase.endState}

Expected:
${testcase.expected}

Observed:
- Runner exit code: ${result.exitCode}
- ADB flow output: ${result.childOutputDir || 'not available'}
- Backend log: backend-log-redacted.txt
- Android logcat: logcat-redacted.txt

API readback check:
${apiReadbacks.length ? apiReadbacks.map((item) => `- ${item.name}: ${item.status}`).join('\n') : '- No API readback recorded by this flow.'}

Regression risks:
- Async UI state, stale APK/session, backend contract mismatch, UIAutomator marker fragility, and encoding/mojibake in error paths.

Warnings:
${warnings.length ? warnings.map((item) => `- ${item.code}: ${item.message}`).join('\n') : '- None recorded.'}

Issues:
${failures.length ? failures.map((item) => `- ${item.code}: ${item.message}`).join('\n') : '- None recorded.'}

Redaction notes:
- Written logs are redacted by the suite; still review video before sharing externally because UI may naturally show mailbox/account surfaces.
`;

  fs.writeFileSync(path.join(caseDir, 'notes.md'), notes, 'utf8');
}

function selectCases(cases) {
  const id = readCliOption('--id');
  const only = readCliOption('--only');
  const includeManual = hasFlag('--include-manual');

  let selected = cases;
  if (id) {
    selected = selected.filter((testcase) => testcase.id === id);
  }
  if (only) {
    selected = selected.filter((testcase) => testcase.priority === only || testcase.category === only);
  }
  if (!includeManual) {
    selected = selected.filter((testcase) => testcase.executionType === 'automated-adb');
  }

  return selected;
}

function buildSuiteResults(root, cases) {
  const rows = [
    [
      'ID',
      'Priority',
      'Category',
      'Flow',
      'Execution Type',
      'Result',
      'Passed',
      'Folder',
      'Video Count',
      'Screenshot Count',
      'API Readbacks',
      'Warnings',
      'Critical Failures',
      'Backend Log Captured',
    ],
  ];

  const summary = {
    total: cases.length,
    pass: 0,
    fail: 0,
    degraded: 0,
    blocked: 0,
    notRun: 0,
  };

  for (const testcase of cases) {
    const caseDir = path.join(root, testcase.folderName);
    const reportPath = path.join(caseDir, 'adb-flow-output', 'report.json');
    const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
    const files = fs.existsSync(caseDir) ? fs.readdirSync(caseDir, { recursive: true }).map(String) : [];
    const result = report?.status || 'not_run';
    const passed = report?.passed === true;
    const backendStatusPath = path.join(caseDir, 'backend-log-status.json');
    const backendStatus = fs.existsSync(backendStatusPath)
      ? JSON.parse(fs.readFileSync(backendStatusPath, 'utf8'))
      : { enabled: false };

    if (passed) {
      summary.pass += 1;
    } else if (result === 'degraded') {
      summary.degraded += 1;
    } else if (result === 'blocked') {
      summary.blocked += 1;
    } else if (result === 'not_run') {
      summary.notRun += 1;
    } else {
      summary.fail += 1;
    }

    rows.push([
      testcase.id,
      testcase.priority,
      testcase.category,
      testcase.flow,
      testcase.executionType,
      result,
      passed ? 'TRUE' : 'FALSE',
      testcase.folderName,
      files.filter((file) => /\.mp4$/i.test(file)).length,
      files.filter((file) => /\.png$/i.test(file)).length,
      report?.apiReadbacks?.map((item) => `${item.name}:${item.status}`).join('; ') || '',
      report?.warnings?.map((item) => item.code).join('; ') || '',
      report?.criticalFailures?.map((item) => item.code).join('; ') || '',
      backendStatus.enabled ? 'TRUE' : 'FALSE',
    ]);
  }

  writeCsv(path.join(root, 'testcase-results.csv'), rows);
  writeJson(path.join(root, 'suite-summary.json'), summary);
  fs.writeFileSync(path.join(root, 'EXECUTION_REPORT.md'), buildExecutionReport(summary, rows), 'utf8');
  return { summary, rows };
}

function buildExecutionReport(summary, rows) {
  const bodyRows = rows
    .slice(1)
    .map((row) => `| ${row[0]} | ${row[1]} | ${row[5]} | ${row[6]} | ${row[7]} |`)
    .join('\n');

  return `# EatFitAI APK Full E2E Execution Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|---|---:|
| Total | ${summary.total} |
| PASS | ${summary.pass} |
| FAIL | ${summary.fail} |
| DEGRADED | ${summary.degraded} |
| BLOCKED | ${summary.blocked} |
| NOT RUN | ${summary.notRun} |

## Results

| ID | Priority | Result | Passed | Folder |
|---|---|---|---|---|
${bodyRows}
`;
}

function runSuite(rootArg = '') {
  const cases = parseMatrixMarkdown();
  const root = createSuiteRoot(rootArg);
  writeJson(path.join(root, 'testcase-matrix.json'), cases);
  writeCsv(path.join(root, 'testcase-matrix.csv'), testcaseRows(cases));
  fs.writeFileSync(path.join(root, 'BACKEND_LOG_SETUP.md'), buildBackendLogGuide(), 'utf8');

  const selected = selectCases(cases);
  if (selected.length === 0) {
    throw new Error('No runnable testcase selected. Use --id <ID>, --only P0, or --include-manual for folder prep.');
  }

  const adb = resolveAdb();
  const serial = requireSerial(adb);
  const record = hasFlag('--record');
  const authPacer = buildDeviceFlowAuthPacer();

  captureAdbFile(
    adb,
    serial,
    ['shell', 'dumpsys', 'package', APP_PACKAGE],
    path.join(root, 'APK-package-proof.txt'),
    { timeoutMs: 30000 },
  );

  for (const testcase of selected) {
    const caseDir = path.join(root, testcase.folderName);
    ensureDir(caseDir);
    fs.writeFileSync(path.join(caseDir, 'testcase.json'), JSON.stringify(testcase, null, 2), 'utf8');
    captureScreenshot(adb, serial, caseDir, '00-before-flow');
    const logcatCapture = startLogcatCapture(adb, serial, caseDir);
    const backendCapture = startBackendCapture(caseDir);

    let result;
    try {
      const waitMs = authPacer.beforeFlow(testcase.automationMode);
      if (waitMs > 0) {
        console.log(
          `[apk-e2e-suite] Waiting ${waitMs}ms before ${testcase.id} to respect production auth rate limits.`,
        );
        sleepSync(waitMs);
      }
      result = runChildFlow(testcase, caseDir, record);
    } finally {
      finishLogcatCapture(logcatCapture);
      finishBackendCapture(backendCapture);
      captureScreenshot(adb, serial, caseDir, '99-after-flow');
    }

    writeCaseResultNotes(testcase, caseDir, result);
  }

  return { root, ...buildSuiteResults(root, cases) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordManualFlow(rootArg = '') {
  const cases = parseMatrixMarkdown();
  const id = readCliOption('--id');
  if (!id) {
    throw new Error('Manual recording requires --id <TESTCASE_ID>.');
  }

  const testcase = cases.find((item) => item.id === id);
  if (!testcase) {
    throw new Error(`Unknown testcase id: ${id}`);
  }

  const root = createSuiteRoot(rootArg);
  writeJson(path.join(root, 'testcase-matrix.json'), cases);
  writeCsv(path.join(root, 'testcase-matrix.csv'), testcaseRows(cases));

  const adb = resolveAdb();
  const serial = requireSerial(adb);
  const duration = Number(readCliOption('--duration', '150'));
  const caseDir = path.join(root, testcase.folderName);
  ensureDir(caseDir);
  fs.writeFileSync(path.join(caseDir, 'testcase.json'), JSON.stringify(testcase, null, 2), 'utf8');
  fs.writeFileSync(path.join(caseDir, 'notes.md'), buildCaseNotes(testcase), 'utf8');
  captureScreenshot(adb, serial, caseDir, '00-before-flow');

  const logcatCapture = startLogcatCapture(adb, serial, caseDir);
  const backendCapture = startBackendCapture(caseDir);
  const remote = `/sdcard/E2E-${testcase.id}-${safeName(testcase.flow)}.mp4`;
  const local = path.join(caseDir, 'video.mp4');
  runSync(adb, adbArgs(serial, ['shell', 'rm', '-f', remote]), { timeoutMs: 10000 });
  const recorder = spawn(adb, adbArgs(serial, ['shell', 'screenrecord', '--time-limit', String(duration), remote]), {
    cwd: mobileRoot,
    stdio: 'ignore',
    shell: false,
  });

  await sleep(duration * 1000);
  stopDeviceScreenrecord(adb, serial);
  await sleep(1400);
  stopProcessTree(recorder);
  const pull = runSync(adb, adbArgs(serial, ['pull', remote, local]), { timeoutMs: 60000 });
  const videoBytes = fs.existsSync(local) ? fs.statSync(local).size : 0;
  if (!pull.ok || videoBytes <= 0) {
    throw new Error(pull.stderr || pull.error || 'Manual screenrecord video was empty.');
  }
  finishLogcatCapture(logcatCapture);
  finishBackendCapture(backendCapture);
  captureScreenshot(adb, serial, caseDir, '99-after-flow');

  return { root, caseDir, video: local };
}

function reportSuite(rootArg = '') {
  const cases = parseMatrixMarkdown();
  const latestPath = path.join(outputRoot, 'latest.txt');
  const root = rootArg
    ? path.resolve(rootArg)
    : fs.existsSync(latestPath)
      ? trim(fs.readFileSync(latestPath, 'utf8'))
      : '';
  if (!root || !fs.existsSync(root)) {
    throw new Error('No suite root found. Pass --root <path> or run prepare/run first.');
  }
  return { root, ...buildSuiteResults(root, cases) };
}

async function main() {
  const command = trim(process.argv[2]) || 'prepare';
  const rootArg = readCliOption('--root');

  if (command === 'prepare') {
    const { root, cases } = prepareSuite(rootArg);
    console.log(`APK_E2E_SUITE_ROOT=${root}`);
    console.log(`testcases=${cases.length}`);
    return;
  }

  if (command === 'run') {
    const { root, summary } = runSuite(rootArg);
    console.log(`APK_E2E_SUITE_ROOT=${root}`);
    console.log(JSON.stringify(summary));
    return;
  }

  if (command === 'record') {
    const { root, caseDir, video } = await recordManualFlow(rootArg);
    console.log(`APK_E2E_SUITE_ROOT=${root}`);
    console.log(`CASE_DIR=${caseDir}`);
    console.log(`VIDEO=${video}`);
    return;
  }

  if (command === 'report') {
    const { root, summary } = reportSuite(rootArg);
    console.log(`APK_E2E_SUITE_ROOT=${root}`);
    console.log(JSON.stringify(summary));
    return;
  }

  throw new Error('Usage: node scripts/apk-e2e-suite.js <prepare|run|record|report> [--root path] [--id ID] [--only P0] [--record]');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  AUTOMATION_BY_ID,
  parseMatrixMarkdown,
  prepareSuite,
  safeName,
  selectCases,
  suggestedCommand,
  testcaseRows,
};
