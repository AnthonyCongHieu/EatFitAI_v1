const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');
const { logcatContainsAppCrash } = require('./lib/device-logcat');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(repoRoot, '_logs', 'real-device-adb');
const APP_PACKAGE = 'com.eatfitai.app';
const DEFAULT_BACKEND_URL = 'https://eatfitai-backend-dev.onrender.com';
const DEFAULT_EMAIL = 'probe@demo.com';
const DEFAULT_PASSWORD = 'Probe12345';
const MODES = [
  'doctor',
  'probe',
  'auth-entry',
  'login-smoke',
  'post-login-smoke',
  'scan-entry',
  'diary-readback',
  'login-real',
  'home-smoke',
  'full-tab-ui-smoke',
  'food-diary-readback',
  'food-search-ui-readback',
  'scan-save-readback',
  'voice-text-readback',
  'stats-profile-smoke',
  'backend-frontend-live-check',
];

const HOME_MARKERS = [
  'home-screen',
  'navigation-home-tab-button',
  'home-view-diary-button',
  'home-open-diary-button',
];
const AUTH_MARKERS = [
  'auth-intro-screen',
  'auth-welcome-screen',
  'auth-login-screen',
  'auth-login-email-input',
  'auth-login-password-input',
  'auth-onboarding-screen',
];
const SCREEN_MARKERS = {
  home: HOME_MARKERS,
  diary: ['meal-diary-screen'],
  foodSearch: [
    'food-search-screen',
    'food-search-query-input',
    'food-search-first-result-card',
    'food-search-add-first-item-button',
  ],
  foodDetail: ['food-detail-screen', 'food-detail-grams-input', 'food-detail-submit-button'],
  scan: ['ai-scan-screen', 'ai-scan-status-badge'],
  voice: ['voice-screen', 'voice-text-input', 'voice-process-button'],
  stats: ['stats-screen', 'stats-today-tab-button', 'stats-week-tab-button'],
  profile: ['profile-screen', 'profile-logout-button'],
};
const TAB_TARGETS = {
  home: { marker: 'navigation-home-tab-button', xRatio: 0.12, yRatio: 0.94 },
  voice: { marker: 'navigation-voice-tab-button', xRatio: 0.36, yRatio: 0.94 },
  scan: { marker: 'navigation-ai-scan-tab-button', xRatio: 0.5, yRatio: 0.91 },
  stats: { marker: 'navigation-stats-tab-button', xRatio: 0.64, yRatio: 0.94 },
  profile: { marker: 'navigation-profile-tab-button', xRatio: 0.88, yRatio: 0.94 },
};

function trim(value) {
  return String(value || '').trim();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(trim(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanEnv(name) {
  return /^(1|true|yes|on)$/i.test(trim(resolveEnv(name)));
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(trim(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function deviceAdbTimeoutMs(fallback) {
  const timeout = parsePositiveInteger(resolveEnv('EATFITAI_DEVICE_ADB_TIMEOUT_MS'), fallback);
  const cap = parsePositiveInteger(resolveEnv('EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS'), 0);
  return cap > 0 ? Math.min(timeout, cap) : timeout;
}

function deviceUiDumpTimeoutMs() {
  return parsePositiveInteger(
    resolveEnv('EATFITAI_DEVICE_UI_DUMP_TIMEOUT_MS'),
    parseBooleanEnv('EATFITAI_DEVICE_FAST_ADB') ? 3000 : 6000,
  );
}

function deviceWaitMs(ms) {
  const scale = parsePositiveNumber(resolveEnv('EATFITAI_DEVICE_WAIT_SCALE'), 1);
  const cap = parsePositiveInteger(resolveEnv('EATFITAI_DEVICE_WAIT_CAP_MS'), 0);
  const scaled = Math.max(0, Math.round(ms * scale));
  return cap > 0 ? Math.min(scaled, cap) : scaled;
}

function readEnvFileValue(envFilePath, key) {
  if (!fs.existsSync(envFilePath)) {
    return '';
  }

  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const current = line.trim();
    if (!current || current.startsWith('#')) {
      continue;
    }

    const separatorIndex = current.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const currentKey = current.slice(0, separatorIndex).trim();
    if (currentKey !== key) {
      continue;
    }

    return current.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
  }

  return '';
}

function resolveConfigValue(name) {
  const direct = trim(resolveEnv(name));
  if (direct) {
    return { value: direct, source: name };
  }

  const envFiles = ['.env.development.local', '.env.development', '.env'];
  for (const envFile of envFiles) {
    const envPath = path.join(mobileRoot, envFile);
    const value = trim(readEnvFileValue(envPath, name));
    if (value) {
      return { value, source: envFile };
    }
  }

  return { value: '', source: '' };
}

function normalizeBaseUrl(value) {
  return trim(value).replace(/\/+$/, '');
}

function resolveBackendUrl() {
  const sources = ['EATFITAI_DEVICE_BACKEND_URL', 'EATFITAI_SMOKE_BACKEND_URL', 'EXPO_PUBLIC_API_BASE_URL'];
  for (const name of sources) {
    const resolved = resolveConfigValue(name);
    if (resolved.value) {
      return {
        url: normalizeBaseUrl(resolved.value),
        source: resolved.source === name ? name : `${resolved.source}:${name}`,
      };
    }
  }

  return {
    url: DEFAULT_BACKEND_URL,
    source: 'default-backend-url',
  };
}

function maskEmail(email) {
  const value = trim(email);
  const [local, domain] = value.split('@');
  if (!local || !domain) {
    return value ? '<redacted-email>' : '';
  }

  return `${local.slice(0, 1)}***@${domain}`;
}

function resolveLoginCredentials() {
  const candidates = [
    {
      emailName: 'EATFITAI_DEVICE_LOGIN_EMAIL',
      passwordName: 'EATFITAI_DEVICE_LOGIN_PASSWORD',
    },
    {
      emailName: 'EATFITAI_SMOKE_EMAIL',
      passwordName: 'EATFITAI_SMOKE_PASSWORD',
    },
    {
      emailName: 'EATFITAI_DEMO_EMAIL',
      passwordName: 'EATFITAI_DEMO_PASSWORD',
    },
  ];

  for (const candidate of candidates) {
    const email = trim(resolveEnv(candidate.emailName));
    const password = trim(resolveEnv(candidate.passwordName));
    if (email && password) {
      return {
        email,
        password,
        source: `${candidate.emailName}/${candidate.passwordName}`,
        available: true,
      };
    }
  }

  return {
    email: '',
    password: '',
    source: '',
    available: false,
    expectedSources: candidates.map((candidate) => `${candidate.emailName}/${candidate.passwordName}`),
  };
}

function credentialReport(credentials) {
  return {
    available: credentials.available === true,
    source: credentials.source || '',
    emailHint: credentials.email ? maskEmail(credentials.email) : '',
  };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function commandName(name) {
  if (process.platform === 'win32' && ['adb', 'scrcpy'].includes(name)) {
    return `${name}.exe`;
  }
  return name;
}

function resolveExecutable(name, candidates = []) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const result = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [commandName(name)], {
    encoding: 'utf8',
    shell: false,
  });
  const first = trim(result.stdout).split(/\r?\n/).find(Boolean);
  return result.status === 0 && first ? first : commandName(name);
}

function resolveAdb() {
  return resolveExecutable('adb', [
    path.join(repoRoot, '_tooling', 'android-sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
  ]);
}

function resolveScrcpy() {
  const candidates = [];
  if (process.env.LOCALAPPDATA) {
    const wingetRoot = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetRoot)) {
      const search = spawnSync(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-Command',
          `Get-ChildItem -LiteralPath '${wingetRoot.replace(/'/g, "''")}' -Recurse -Filter scrcpy.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`,
        ],
        { encoding: 'utf8' },
      );
      const found = trim(search.stdout);
      if (found) {
        candidates.push(found);
      }
    }
  }
  return resolveExecutable('scrcpy', candidates);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || mobileRoot,
    encoding: options.encoding || 'utf8',
    timeout: deviceAdbTimeoutMs(options.timeoutMs || 30000),
    shell: false,
  });
  return {
    command: `${command} ${args.join(' ')}`.trim(),
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trim(result.stdout),
    stderr: trim(result.stderr),
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

async function requestJson(url, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = Number(
    options.timeoutMs || parsePositiveInteger(resolveEnv('EATFITAI_DEVICE_API_TIMEOUT_MS'), 30000),
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    Accept: 'application/json',
    ...(options.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
      signal: controller.signal,
    });
    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      body,
      rawText: body ? '' : rawText.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: '',
      durationMs: Date.now() - startedAt,
      body: null,
      rawText: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function extractAccessToken(body) {
  if (!body || typeof body !== 'object') {
    return '';
  }

  return trim(body.accessToken || body.AccessToken || body.token || body.Token);
}

function summarizeApiBody(body) {
  if (Array.isArray(body)) {
    return {
      kind: 'array',
      count: body.length,
    };
  }

  if (!body || typeof body !== 'object') {
    return body ?? null;
  }

  const keys = Object.keys(body).filter((key) => !/token|password|authorization/i.test(key));
  return {
    kind: 'object',
    keys: keys.slice(0, 20),
    id:
      body.id ||
      body.Id ||
      body.mealDiaryId ||
      body.MealDiaryId ||
      body.userId ||
      body.UserId ||
      null,
    message: body.message || body.Message || '',
    success:
      typeof body.success === 'boolean'
        ? body.success
        : typeof body.Success === 'boolean'
          ? body.Success
          : null,
  };
}

function summarizeLoginBody(body) {
  if (!body || typeof body !== 'object') {
    return summarizeApiBody(body);
  }

  return {
    hasAccessToken: Boolean(body.accessToken || body.AccessToken || body.token || body.Token),
    hasRefreshToken: Boolean(body.refreshToken || body.RefreshToken),
    needsOnboarding: Boolean(body.needsOnboarding || body.NeedsOnboarding),
    success:
      typeof body.success === 'boolean'
        ? body.success
        : typeof body.Success === 'boolean'
          ? body.Success
          : null,
    message: body.message || body.Message || '',
  };
}

function toLocalDateOnly(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function buildSmokeMarker(flowName) {
  return `adb-${flowName}-${Date.now().toString(36)}`;
}

function getFoodItemId(item) {
  const raw = item?.foodItemId ?? item?.FoodItemId ?? item?.id ?? item?.Id ?? null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getMealDiaryId(item) {
  const raw = item?.mealDiaryId ?? item?.MealDiaryId ?? item?.id ?? item?.Id ?? null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function bodyContainsMarker(value, marker) {
  if (!marker) {
    return false;
  }

  try {
    return JSON.stringify(value || {}).includes(marker);
  } catch {
    return false;
  }
}

function sanitizeReport(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReport(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      if (/password|token|authorization/i.test(key)) {
        return [key, entryValue ? '<redacted>' : entryValue];
      }

      return [key, sanitizeReport(entryValue)];
    }),
  );
}

function adbArgs(serial, args) {
  return serial ? ['-s', serial, ...args] : args;
}

function runAdb(adb, serial, args, options = {}) {
  return run(adb, adbArgs(serial, args), options);
}

function parseDevices(output) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^(\S+)\s+device(?:\s|$)/)?.[1])
    .filter(Boolean);
}

function resolveSerial(adb) {
  const requested = trim(resolveEnv('ANDROID_SERIAL'));
  const targetMode = trim(resolveEnv('EATFITAI_ANDROID_TARGET') || resolveEnv('EATFITAI_ANDROID_TARGET_MODE')).toLowerCase();
  const realDeviceModes = new Set(['real', 'real-device', 'device', 'usb']);
  if (!targetMode || !realDeviceModes.has(targetMode)) {
    throw new Error(
      'Real-device ADB lane requires EATFITAI_ANDROID_TARGET=real-device and explicit ANDROID_SERIAL.',
    );
  }
  if (!requested) {
    throw new Error('Real-device ADB lane requires explicit ANDROID_SERIAL.');
  }

  const devices = run(adb, ['devices', '-l']);
  if (!devices.ok) {
    throw new Error(devices.stderr || devices.error || 'adb devices failed');
  }

  const online = parseDevices(devices.stdout);
  if (!online.includes(requested)) {
    throw new Error(`ANDROID_SERIAL=${requested} is not an online adb device.`);
  }

  const qemu = runAdb(adb, requested, ['shell', 'getprop', 'ro.kernel.qemu'], { timeoutMs: 10000 });
  if (!qemu.ok) {
    throw new Error(qemu.stderr || qemu.error || 'Failed to verify Android target type.');
  }
  if (trim(qemu.stdout) === '1') {
    throw new Error(`ANDROID_SERIAL=${requested} is an emulator. Use a real USB device for this lane.`);
  }

  return { serial: requested, online, devices };
}

function ensureOutputDir(mode) {
  const dir = path.join(outputRoot, `${stamp()}-${mode}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readScreenSize(adb, serial) {
  const wm = runAdb(adb, serial, ['shell', 'wm', 'size']);
  const match = wm.stdout.match(/(\d+)x(\d+)/);
  if (!match) {
    return { width: 1080, height: 2400, source: wm.stdout || wm.stderr || 'fallback' };
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    source: wm.stdout,
  };
}

function point(size, xRatio, yRatio) {
  return {
    x: Math.round(size.width * xRatio),
    y: Math.round(size.height * yRatio),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, deviceWaitMs(ms)));
}

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, deviceWaitMs(ms));
}

function safeName(name) {
  return String(name).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
}

function wakeDevice(adb, serial) {
  if (parseBooleanEnv('EATFITAI_DEVICE_FAST_ADB')) {
    runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'], { timeoutMs: 3000 });
    return;
  }

  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'], { timeoutMs: 10000 });
  runAdb(adb, serial, ['shell', 'wm', 'dismiss-keyguard'], { timeoutMs: 10000 });
  runAdb(adb, serial, ['shell', 'svc', 'power', 'stayon', 'true'], { timeoutMs: 10000 });
  pause(1000);
}

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function addWarning(report, code, message, detail = {}) {
  report.warnings.push({
    code,
    message,
    ...detail,
  });
}

function addCriticalFailure(report, code, message, detail = {}) {
  report.criticalFailures.push({
    code,
    message,
    ...detail,
  });
}

function addFlowAssertion(report, name, status, detail = {}, critical = false) {
  const entry = {
    name,
    status,
    critical: critical === true,
    ...detail,
  };
  report.flowAssertions.push(entry);
  return entry;
}

function addApiReadback(report, name, status, detail = {}, mandatory = false) {
  const entry = {
    name,
    status,
    mandatory: mandatory === true,
    ...detail,
  };
  report.apiReadbacks.push(entry);
  return entry;
}

function addUiDefect(report, code, message, detail = {}, severity = 'warning') {
  const entry = {
    code,
    message,
    severity,
    ...detail,
  };
  report.uiDefects.push(entry);
  return entry;
}

function captureScreenshot(adb, serial, outputDir, name) {
  const fileName = `${safeName(name)}.png`;
  const remotePath = `/sdcard/eatfitai-${fileName}`;
  const localPath = path.join(outputDir, fileName);
  wakeDevice(adb, serial);
  const shot = runAdb(adb, serial, ['shell', 'screencap', '-p', remotePath], { timeoutMs: 20000 });
  if (!shot.ok) {
    return {
      type: 'screenshot',
      critical: true,
      ok: false,
      name,
      path: localPath,
      error: shot.stderr || shot.error,
    };
  }

  const pull = runAdb(adb, serial, ['pull', remotePath, localPath], { timeoutMs: 20000 });
  runAdb(adb, serial, ['shell', 'rm', remotePath], { timeoutMs: 10000 });
  const size = fileSize(localPath);
  return {
    type: 'screenshot',
    critical: true,
    ok: pull.ok && size > 0,
    name,
    path: localPath,
    bytes: size,
    error: pull.ok && size > 0 ? '' : pull.stderr || pull.error || 'screenshot was empty',
  };
}

function captureUiDump(adb, serial, outputDir, name) {
  const remotePath = `/sdcard/eatfitai-${safeName(name)}.xml`;
  const localPath = path.join(outputDir, `${safeName(name)}.xml`);
  const dump = runAdb(adb, serial, ['shell', 'uiautomator', 'dump', remotePath], {
    timeoutMs: deviceUiDumpTimeoutMs(),
  });
  if (!dump.ok) {
    return {
      type: 'ui-dump',
      critical: false,
      ok: false,
      name,
      path: localPath,
      warning: dump.stderr || dump.stdout || dump.error || 'uiautomator dump failed',
    };
  }

  const pull = runAdb(adb, serial, ['pull', remotePath, localPath], { timeoutMs: 10000 });
  runAdb(adb, serial, ['shell', 'rm', remotePath], { timeoutMs: 10000 });
  return {
    type: 'ui-dump',
    critical: false,
    ok: pull.ok,
    name,
    path: localPath,
    warning: pull.ok ? '' : pull.stderr || pull.error,
  };
}

function readTextFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function xmlIncludesAny(xml, markers) {
  return markers.some((marker) => xml.includes(marker));
}

function findBoundsForMarker(xml, marker) {
  const text = String(xml || '');
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const nodeStart = Math.max(0, text.lastIndexOf('<node', markerIndex));
  const nodeEnd = text.indexOf('>', markerIndex);
  const fragment = text.slice(nodeStart, nodeEnd === -1 ? markerIndex + marker.length : nodeEnd + 1);
  const match = fragment.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!match) {
    return null;
  }

  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    left,
    top,
    right,
    bottom,
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
}

function classifyAuthState(uiArtifact) {
  if (!uiArtifact?.ok) {
    return {
      state: 'unknown',
      uiDumpOk: false,
      markers: [],
    };
  }

  const xml = readTextFileIfExists(uiArtifact.path);
  if (xmlIncludesAny(xml, HOME_MARKERS)) {
    return {
      state: 'authenticated',
      uiDumpOk: true,
      markers: HOME_MARKERS.filter((marker) => xml.includes(marker)),
    };
  }

  if (xmlIncludesAny(xml, AUTH_MARKERS)) {
    return {
      state: 'auth',
      uiDumpOk: true,
      markers: AUTH_MARKERS.filter((marker) => xml.includes(marker)),
    };
  }

  return {
    state: 'unknown',
    uiDumpOk: true,
    markers: [],
  };
}

function recordScreenEvidence(report, options) {
  const {
    name,
    markers,
    uiArtifact,
    screenshotArtifact,
    focus,
    critical = false,
    allowScreenshotFallback = true,
  } = options;
  const xml = uiArtifact?.ok ? readTextFileIfExists(uiArtifact.path) : '';
  const matchedMarkers = xml ? markers.filter((marker) => xml.includes(marker)) : [];

  if (matchedMarkers.length > 0) {
    addFlowAssertion(
      report,
      `${name}-ui-marker`,
      'pass',
      {
        evidence: 'ui-dump',
        markers: matchedMarkers,
      },
      critical,
    );
    return true;
  }

  if (uiArtifact?.ok && matchedMarkers.length === 0) {
    addUiDefect(
      report,
      `${name}-marker-missing`,
      `${name} UI dump did not contain expected screen markers.`,
      {
        expectedMarkers: markers,
        uiDumpPath: uiArtifact.path,
      },
      'warning',
    );
    if (allowScreenshotFallback && screenshotArtifact?.ok && focus?.appForeground) {
      addWarning(
        report,
        'uiautomator-marker-degraded',
        `${name} UIAutomator markers were missing; using foreground and screenshot evidence.`,
        {
          screen: name,
          screenshotPath: screenshotArtifact.path,
          focus: focus.line || '',
        },
      );
      addFlowAssertion(
        report,
        `${name}-bounded-screen-evidence`,
        'pass',
        {
          evidence: 'foreground+screenshot',
          expectedMarkers: markers,
          screenshotPath: screenshotArtifact.path,
        },
        critical,
      );
      return true;
    }

    addFlowAssertion(
      report,
      `${name}-ui-marker`,
      'fail',
      {
        evidence: 'ui-dump',
        expectedMarkers: markers,
      },
      critical,
    );
    return false;
  }

  if (allowScreenshotFallback && screenshotArtifact?.ok && focus?.appForeground) {
    addWarning(
      report,
      'uiautomator-screen-evidence-degraded',
      `${name} UIAutomator markers were unavailable; using foreground and screenshot evidence.`,
      {
        screen: name,
        screenshotPath: screenshotArtifact.path,
        focus: focus.line || '',
      },
    );
    addFlowAssertion(
      report,
      `${name}-bounded-screen-evidence`,
      'pass',
      {
        evidence: 'foreground+screenshot',
        screenshotPath: screenshotArtifact.path,
      },
      critical,
    );
    return true;
  }

  addFlowAssertion(
    report,
    `${name}-bounded-screen-evidence`,
    'fail',
    {
      evidence: 'foreground+screenshot',
      screenshotOk: screenshotArtifact?.ok === true,
      focus: focus?.line || '',
      appForeground: focus?.appForeground === true,
    },
    critical,
  );
  return false;
}

function currentFocus(adb, serial) {
  const result = runAdb(adb, serial, ['shell', 'dumpsys', 'window'], { timeoutMs: 15000 });
  const text = `${result.stdout}\n${result.stderr}`;
  const focusLine =
    text.split(/\r?\n/).find((line) => /mCurrentFocus|mFocusedApp/i.test(line)) || '';

  return {
    ok: result.ok,
    line: trim(focusLine),
    appForeground: focusLine.includes(APP_PACKAGE),
  };
}

function addForegroundStep(report, adb, serial, name, critical = false) {
  const focus = currentFocus(adb, serial);
  report.steps.push({
    name,
    critical,
    ok: focus.ok && focus.appForeground,
    focus: focus.line,
  });
  return focus;
}

async function tapStep(report, adb, serial, size, name, xRatio, yRatio, waitMs = 1200) {
  const result = tap(adb, serial, size, xRatio, yRatio);
  await sleep(waitMs);
  report.steps.push({ name, tap: result });
  return result;
}

function captureLogcat(adb, serial, outputDir, name, args) {
  const result = runAdb(adb, serial, ['logcat', '-d', ...args], {
    timeoutMs: 20000,
    encoding: 'utf8',
  });
  const filePath = path.join(outputDir, name);
  fs.writeFileSync(filePath, `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`, 'utf8');
  return {
    type: 'logcat',
    critical: name.includes('crash-logcat'),
    ok: result.ok,
    name,
    path: filePath,
    bytes: fileSize(filePath),
    error: result.stderr || result.error,
  };
}

function skippedUiDump(outputDir, name, reason) {
  return {
    type: 'ui-dump',
    critical: false,
    ok: false,
    name,
    path: path.join(outputDir, `${safeName(name)}.xml`),
    warning: reason,
  };
}

function parseAmStartTiming(output) {
  const text = String(output || '');
  const readNumber = (label) => {
    const match = text.match(new RegExp(`${label}:\\s*(\\d+)`, 'i'));
    return match ? Number(match[1]) : null;
  };

  return {
    status: text.match(/Status:\s*([^\r\n]+)/i)?.[1]?.trim() || '',
    activity: text.match(/Activity:\s*([^\r\n]+)/i)?.[1]?.trim() || '',
    thisTimeMs: readNumber('ThisTime'),
    totalTimeMs: readNumber('TotalTime'),
    waitTimeMs: readNumber('WaitTime'),
  };
}

function resolveLaunchComponent(adb, serial) {
  const result = runAdb(adb, serial, ['shell', 'cmd', 'package', 'resolve-activity', '--brief', APP_PACKAGE], {
    timeoutMs: 10000,
  });
  if (!result.ok) {
    return { ok: false, component: '', detail: result.stderr || result.error };
  }

  const component = String(result.stdout || '')
    .split(/\r?\n/)
    .map(trim)
    .reverse()
    .find((line) => line.includes('/'));
  return {
    ok: Boolean(component),
    component: component || '',
    detail: component ? result.stdout : 'No launchable activity resolved.',
  };
}

function captureCommandOutputArtifact(adb, serial, outputDir, name, args, options = {}) {
  const result = runAdb(adb, serial, args, {
    timeoutMs: options.timeoutMs || 20000,
    encoding: 'utf8',
  });
  const filePath = path.join(outputDir, `${safeName(name)}.txt`);
  fs.writeFileSync(filePath, `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`, 'utf8');
  const artifact = {
    type: options.type || 'adb-text',
    critical: options.critical === true,
    ok: result.ok,
    name,
    path: filePath,
    bytes: fileSize(filePath),
    error: result.stderr || result.error,
  };
  if (options.includeStdout === true) {
    artifact.stdout = result.stdout;
  }
  return artifact;
}

function captureStartupTiming(context) {
  const { adb, serial, outputDir, report } = context;
  const resolved = resolveLaunchComponent(adb, serial);
  if (!resolved.ok) {
    addWarning(report, 'launch-activity-unresolved', 'Could not resolve launch activity for startup timing.', {
      detail: resolved.detail,
    });
    return null;
  }

  runAdb(adb, serial, ['shell', 'am', 'force-stop', APP_PACKAGE], { timeoutMs: 10000 });
  const artifact = captureCommandOutputArtifact(
    adb,
    serial,
    outputDir,
    'startup-am-start-w',
    ['shell', 'am', 'start', '-W', '-n', resolved.component],
    { type: 'startup', critical: false, includeStdout: true, timeoutMs: 30000 },
  );
  const timing = parseAmStartTiming(artifact.stdout);
  report.performance.startup = {
    component: resolved.component,
    ok: artifact.ok,
    ...timing,
  };
  report.artifacts.push(artifact);
  return artifact;
}

function resetGfxInfo(context, name) {
  const result = runAdb(context.adb, context.serial, ['shell', 'dumpsys', 'gfxinfo', APP_PACKAGE, 'reset'], {
    timeoutMs: 10000,
  });
  context.report.performance.gfxReset = {
    name,
    ok: result.ok,
    error: result.stderr || result.error,
  };
}

function capturePerformanceSnapshot(context, name) {
  const { adb, serial, outputDir, report } = context;
  if (
    parseBooleanEnv('EATFITAI_DEVICE_FAST_ADB') ||
    parseBooleanEnv('EATFITAI_DEVICE_SKIP_PERF_SNAPSHOT')
  ) {
    report.performance.snapshots.push({
      name,
      capturedAt: new Date().toISOString(),
      skipped: true,
      reason: parseBooleanEnv('EATFITAI_DEVICE_FAST_ADB')
        ? 'EATFITAI_DEVICE_FAST_ADB'
        : 'EATFITAI_DEVICE_SKIP_PERF_SNAPSHOT',
    });
    return;
  }

  const artifacts = [
    captureCommandOutputArtifact(adb, serial, outputDir, `${name}-gfxinfo`, ['shell', 'dumpsys', 'gfxinfo', APP_PACKAGE], {
      type: 'performance',
      timeoutMs: 20000,
    }),
    captureCommandOutputArtifact(
      adb,
      serial,
      outputDir,
      `${name}-gfxinfo-framestats`,
      ['shell', 'dumpsys', 'gfxinfo', APP_PACKAGE, 'framestats'],
      { type: 'performance', timeoutMs: 20000 },
    ),
    captureCommandOutputArtifact(adb, serial, outputDir, `${name}-meminfo`, ['shell', 'dumpsys', 'meminfo', APP_PACKAGE], {
      type: 'performance',
      timeoutMs: 20000,
    }),
  ];
  report.artifacts.push(...artifacts);
  report.performance.snapshots.push({
    name,
    capturedAt: new Date().toISOString(),
    artifacts: artifacts.map((artifact) => ({
      name: artifact.name,
      ok: artifact.ok,
      path: artifact.path,
      bytes: artifact.bytes,
    })),
  });
}

function startRecording(adb, serial, outputDir, enabled) {
  if (!enabled) {
    return null;
  }

  const remotePath = `/sdcard/eatfitai-screenrecord-${Date.now()}.mp4`;
  const child = spawn(adb, adbArgs(serial, ['shell', 'screenrecord', '--time-limit', '45', remotePath]), {
    cwd: mobileRoot,
    stdio: 'ignore',
    shell: false,
  });
  return { child, remotePath, localPath: path.join(outputDir, 'screenrecord.mp4') };
}

function stopRecording(adb, serial, recording) {
  if (!recording) {
    return null;
  }

  try {
    recording.child.kill();
  } catch {
    // Best effort only.
  }
  const pull = runAdb(adb, serial, ['pull', recording.remotePath, recording.localPath], {
    timeoutMs: 30000,
  });
  runAdb(adb, serial, ['shell', 'rm', recording.remotePath], { timeoutMs: 10000 });
  return {
    type: 'video',
    critical: false,
    ok: pull.ok,
    name: 'screenrecord',
    path: recording.localPath,
    bytes: fileSize(recording.localPath),
    error: pull.stderr || pull.error,
  };
}

function evidenceBucket(type) {
  if (type === 'screenshot') return 'screenshots';
  if (type === 'ui-dump') return 'uiDumps';
  if (type === 'logcat') return 'logcats';
  if (type === 'video') return 'videos';
  return 'otherArtifacts';
}

function addArtifactEvidence(report, artifact) {
  const bucket = evidenceBucket(artifact.type);
  report.evidence[bucket].push({
    name: artifact.name || '',
    ok: artifact.ok !== false,
    critical: artifact.critical === true,
    path: artifact.path || '',
    bytes: artifact.bytes || 0,
    warning: artifact.warning || '',
    error: artifact.error || '',
  });
}

function isStepFailed(step) {
  return step.ok === false || step.tap?.ok === false || step.inputOk === false;
}

function hasCriticalFailure(report, code) {
  return report.criticalFailures.some((failure) => failure.code === code);
}

function detectCrashEvidence(report) {
  for (const artifact of report.artifacts) {
    if (artifact.type !== 'logcat' || !artifact.path) {
      continue;
    }

    const text = readTextFileIfExists(artifact.path);
    if (!text) {
      continue;
    }

    if (logcatContainsAppCrash(text) && !hasCriticalFailure(report, 'app-crash-detected')) {
      addCriticalFailure(report, 'app-crash-detected', 'Android logcat contains an app crash signature.', {
        logcatPath: artifact.path,
      });
    }
  }
}

function finalizeReport(report) {
  detectCrashEvidence(report);

  for (const check of report.checks) {
    if (check.status === 'FAIL') {
      addCriticalFailure(report, 'doctor-check-failed', `${check.name} failed.`, {
        detail: check.detail || '',
      });
    } else if (check.status === 'WARN') {
      addWarning(report, 'doctor-check-warning', `${check.name} warning.`, {
        detail: check.detail || '',
      });
    }
  }

  for (const step of report.steps) {
    if (!isStepFailed(step)) {
      continue;
    }

    if (step.critical || /foreground/i.test(step.name || '')) {
      addCriticalFailure(report, 'critical-step-failed', `${step.name} failed.`, {
        focus: step.focus || '',
        error: step.error || step.tap?.error || '',
      });
    } else {
      addWarning(report, 'step-warning', `${step.name} did not complete cleanly.`, {
        focus: step.focus || '',
        error: step.error || step.tap?.error || '',
      });
    }
  }

  for (const artifact of report.artifacts) {
    addArtifactEvidence(report, artifact);
    if (artifact.ok !== false) {
      continue;
    }

    if (artifact.critical) {
      addCriticalFailure(report, 'critical-artifact-failed', `${artifact.name || artifact.type} capture failed.`, {
        path: artifact.path || '',
        error: artifact.error || artifact.warning || '',
      });
    } else {
      addWarning(
        report,
        artifact.type === 'ui-dump' ? 'uiautomator-dump-warning' : 'artifact-warning',
        `${artifact.name || artifact.type} capture did not complete cleanly.`,
        {
          path: artifact.path || '',
          warning: artifact.warning || artifact.error || '',
        },
      );
    }
  }

  for (const assertion of report.flowAssertions) {
    if (assertion.status === 'pass') {
      continue;
    }

    if (assertion.critical) {
      addCriticalFailure(report, 'critical-flow-assertion-failed', `${assertion.name} failed.`, {
        status: assertion.status,
      });
    } else {
      addWarning(report, 'flow-assertion-warning', `${assertion.name} was ${assertion.status}.`, {
        status: assertion.status,
      });
    }
  }

  for (const readback of report.apiReadbacks) {
    if (readback.status === 'pass') {
      continue;
    }

    if (readback.mandatory) {
      addCriticalFailure(
        report,
        readback.status === 'skipped' ? 'mandatory-readback-unavailable' : 'mandatory-readback-failed',
        `${readback.name} did not pass.`,
        {
          status: readback.status,
          httpStatus: readback.httpStatus ?? null,
          error: readback.error || '',
        },
      );
    } else {
      addWarning(report, 'api-readback-warning', `${readback.name} was ${readback.status}.`, {
        status: readback.status,
        httpStatus: readback.httpStatus ?? null,
      });
    }
  }

  for (const defect of report.uiDefects) {
    if (defect.severity === 'critical') {
      addCriticalFailure(report, 'critical-ui-defect', defect.message, {
        code: defect.code,
      });
    } else {
      addWarning(report, 'ui-defect-warning', defect.message, {
        code: defect.code,
      });
    }
  }

  report.status = report.criticalFailures.length > 0 ? 'fail' : report.warnings.length > 0 ? 'degraded' : 'pass';
  report.passed = report.status !== 'fail';
}

function inputText(adb, serial, text) {
  const value = String(text).replace(/ /g, '%s');
  return runAdb(adb, serial, ['shell', 'input', 'text', value], { timeoutMs: 15000 });
}

function tap(adb, serial, size, xRatio, yRatio) {
  const target = point(size, xRatio, yRatio);
  const result = runAdb(adb, serial, ['shell', 'input', 'tap', String(target.x), String(target.y)], {
    timeoutMs: 10000,
  });
  return { ...target, ok: result.ok, error: result.stderr || result.error };
}

function tapAbsolute(adb, serial, x, y) {
  const result = runAdb(adb, serial, ['shell', 'input', 'tap', String(x), String(y)], {
    timeoutMs: 10000,
  });
  return { x, y, ok: result.ok, error: result.stderr || result.error };
}

function clearFocusedText(adb, serial, attempts = 12) {
  const selectAll = runAdb(
    adb,
    serial,
    ['shell', 'input', 'keycombination', 'KEYCODE_CTRL_LEFT', 'KEYCODE_A'],
    { timeoutMs: 5000 },
  );
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_DEL'], { timeoutMs: 5000 });

  if (!selectAll.ok && attempts > 0) {
    runAdb(
      adb,
      serial,
      ['shell', 'input', 'keyevent', ...Array.from({ length: attempts }, () => 'KEYCODE_DEL')],
      { timeoutMs: 5000 },
    );
  }
}

async function maybeTapKeyboardGlobe(context, name) {
  if (!parseBooleanEnv('EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE')) {
    return;
  }

  const result = tap(context.adb, context.serial, readScreenSize(context.adb, context.serial), 0.3, 0.91);
  await sleep(600);
  context.report.steps.push({ name, tap: result });
}

async function tapMarkerOrCoordinate(context, marker, name, xRatio, yRatio, waitMs = 1200) {
  const { adb, serial, outputDir, report } = context;
  let uiArtifact = null;
  const skipUiDump =
    context.tapUiDumpDisabled ||
    parseBooleanEnv('EATFITAI_DEVICE_SKIP_UI_DUMP') ||
    parseBooleanEnv('EATFITAI_DEVICE_SKIP_TAP_UI_DUMP');

  if (!skipUiDump) {
    uiArtifact = captureUiDump(adb, serial, outputDir, `${safeName(name)}-tap-ui`);
    report.artifacts.push(uiArtifact);
    if (uiArtifact.ok) {
      const bounds = findBoundsForMarker(readTextFileIfExists(uiArtifact.path), marker);
      if (bounds) {
        const result = tapAbsolute(adb, serial, bounds.x, bounds.y);
        await sleep(waitMs);
        report.steps.push({
          name,
          marker,
          tap: result,
          tapSource: 'ui-dump-bounds',
          bounds,
        });
        return result;
      }
    } else {
      context.tapUiDumpDisabled = true;
    }
  } else if (!context.tapUiDumpSkipWarningAdded) {
    addWarning(
      report,
      'tap-uiautomator-skipped',
      'Tap marker UI dumps are skipped for this run; bounded coordinates are used for tap actions.',
      {
        reason: context.tapUiDumpDisabled
          ? 'previous-ui-dump-failed'
          : 'EATFITAI_DEVICE_SKIP_UI_DUMP/EATFITAI_DEVICE_SKIP_TAP_UI_DUMP',
      },
    );
    context.tapUiDumpSkipWarningAdded = true;
  }

  addWarning(
    report,
    'coordinate-navigation-fallback',
    `${name} used bounded coordinate navigation because UIAutomator bounds were unavailable.`,
    {
      marker,
      uiDumpOk: uiArtifact?.ok === true,
      uiDumpPath: uiArtifact?.path || '',
    },
  );
  return tapStep(report, adb, serial, readScreenSize(adb, serial), name, xRatio, yRatio, waitMs);
}

async function runProbe(context) {
  const { adb, serial, outputDir, report, record } = context;
  const recording = startRecording(adb, serial, outputDir, record);
  runAdb(adb, serial, ['logcat', '-b', 'all', '-c']);
  wakeDevice(adb, serial);
  resetGfxInfo(context, 'probe-start');
  const startupArtifact = captureStartupTiming(context);
  const launch = startupArtifact?.ok
    ? {
        ok: true,
        stdout: startupArtifact.stdout,
        stderr: '',
      }
    : runAdb(adb, serial, [
        'shell',
        'monkey',
        '-p',
        APP_PACKAGE,
        '-c',
        'android.intent.category.LAUNCHER',
        '1',
      ]);
  report.steps.push({
    name: 'launch',
    critical: true,
    ok: launch.ok,
    stdout: launch.stdout,
    stderr: launch.stderr,
  });
  await sleep(6000);
  addForegroundStep(report, adb, serial, 'foreground-after-launch', true);
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '01-launch'));
  report.artifacts.push(
    parseBooleanEnv('EATFITAI_DEVICE_SKIP_UI_DUMP')
      ? skippedUiDump(outputDir, 'ui', 'UIAutomator dump skipped by EATFITAI_DEVICE_SKIP_UI_DUMP.')
      : captureUiDump(adb, serial, outputDir, 'ui'),
  );
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'crash-logcat.txt', ['-b', 'crash']));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'tail-logcat.txt', ['-t', '600']));
  capturePerformanceSnapshot(context, 'probe');
  const video = stopRecording(adb, serial, recording);
  if (video) {
    report.artifacts.push(video);
  }
}

async function runLoginSmoke(context) {
  const { report } = context;
  await runProbe(context);
  await ensureLoginScreen(context);
  addWarning(
    report,
    'login-smoke-bounded',
    'login-smoke verifies launch and login entry only; it does not submit credentials or prove post-login state.',
  );
}

async function runPostLoginSmoke(context) {
  const { adb, serial, outputDir, report } = context;
  await runProbe(context);
  addForegroundStep(report, adb, serial, 'post-login-foreground-check');
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '02-post-login-state'));
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'post-login-ui'));
  addWarning(
    report,
    'post-login-state-unproven',
    'post-login-smoke cannot prove authenticated state without device credentials or an existing authenticated session.',
  );
}

async function runScanEntry(context) {
  const { adb, serial, outputDir, report } = context;
  const size = readScreenSize(adb, serial);
  report.screen = size;
  await runProbe(context);
  await tapStep(report, adb, serial, size, 'scan-entry-tab-tap', 0.5, 0.94, 2500);
  addForegroundStep(report, adb, serial, 'scan-entry-foreground-check');
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '02-scan-entry'));
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'scan-entry-ui'));
  addWarning(
    report,
    'scan-entry-bounded',
    'scan-entry uses a bounded coordinate tap and foreground evidence; it cannot fully prove scan screen semantics without a stable UI dump.',
  );
}

async function runDiaryReadback(context) {
  const { adb, serial, outputDir, report } = context;
  const size = readScreenSize(adb, serial);
  report.screen = size;
  await runProbe(context);
  await tapStep(report, adb, serial, size, 'diary-entry-tab-tap', 0.3, 0.94, 2500);
  addForegroundStep(report, adb, serial, 'diary-readback-foreground-check');
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '02-diary-readback'));
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'diary-readback-ui'));
  addWarning(
    report,
    'diary-readback-bounded',
    'diary-readback captures bounded navigation evidence only; it does not create or verify a backend-backed diary entry.',
  );
}

async function runApiLogin(context, mandatory = false) {
  const { report, credentials, backend } = context;
  if (!backend?.url) {
    addApiReadback(
      report,
      'api-login',
      'skipped',
      {
        reason: 'backend-url-missing',
      },
      mandatory,
    );
    return '';
  }

  if (!credentials?.available) {
    addApiReadback(
      report,
      'api-login',
      'skipped',
      {
        reason: 'credentials-missing',
        expectedSources: credentials?.expectedSources || [],
      },
      mandatory,
    );
    return '';
  }

  const response = await requestJson(`${backend.url}/api/auth/login`, {
    method: 'POST',
    json: {
      email: credentials.email,
      password: credentials.password,
    },
  });
  const token = extractAccessToken(response.body);
  addApiReadback(
    report,
    'api-login',
    response.ok && token ? 'pass' : 'fail',
    {
      backendUrl: backend.url,
      backendSource: backend.source,
      credentialSource: credentials.source,
      emailHint: maskEmail(credentials.email),
      httpStatus: response.status,
      durationMs: response.durationMs,
      body: summarizeLoginBody(response.body),
      error: response.error || '',
    },
    mandatory,
  );

  return response.ok ? token : '';
}

async function readDiaryDay(context, token, options = {}) {
  const { report, backend } = context;
  const {
    name = 'diary-day-readback',
    marker = '',
    baselineCount = null,
    baselineIds = null,
    mandatory = false,
  } = options;
  const date = toLocalDateOnly();

  if (!token) {
    addApiReadback(
      report,
      name,
      'skipped',
      {
        reason: 'access-token-missing',
        date,
      },
      mandatory,
    );
    return { ok: false, count: null, markerFound: false };
  }

  const response = await requestJson(
    `${backend.url}/api/meal-diary?date=${encodeURIComponent(date)}`,
    {
      headers: authHeaders(token),
    },
  );
  const rows = Array.isArray(response.body) ? response.body : [];
  const ids = rows.map(getMealDiaryId).filter((id) => id != null);
  const baselineIdSet = Array.isArray(baselineIds) ? new Set(baselineIds) : null;
  const newIds = baselineIdSet ? ids.filter((id) => !baselineIdSet.has(id)) : [];
  const markerFound = marker ? rows.some((entry) => bodyContainsMarker(entry, marker)) : false;
  const countOk = baselineCount == null || rows.length > baselineCount || newIds.length > 0;
  const markerOk = marker ? markerFound : true;
  const passed = response.ok && Array.isArray(response.body) && countOk && markerOk;

  addApiReadback(
    report,
    name,
    passed ? 'pass' : 'fail',
    {
      date,
      httpStatus: response.status,
      durationMs: response.durationMs,
      count: Array.isArray(response.body) ? rows.length : null,
      baselineCount,
      ids,
      baselineIds: Array.isArray(baselineIds) ? baselineIds : null,
      newIds,
      marker,
      markerFound,
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    mandatory,
  );

  return {
    ok: passed,
    count: Array.isArray(response.body) ? rows.length : null,
    ids,
    newIds,
    markerFound,
    rows,
  };
}

async function readSummaryDay(context, token, options = {}) {
  const { report, backend } = context;
  const { name = 'summary-day-readback', mandatory = false } = options;
  const date = toLocalDateOnly();
  if (!token) {
    addApiReadback(
      report,
      name,
      'skipped',
      {
        reason: 'access-token-missing',
        date,
      },
      mandatory,
    );
    return null;
  }

  const response = await requestJson(
    `${backend.url}/api/summary/day?date=${encodeURIComponent(date)}`,
    {
      headers: authHeaders(token),
    },
  );
  addApiReadback(
    report,
    name,
    response.ok ? 'pass' : 'fail',
    {
      date,
      httpStatus: response.status,
      durationMs: response.durationMs,
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    mandatory,
  );
  return response;
}

async function readProfile(context, token, options = {}) {
  const { report, backend } = context;
  const { name = 'profile-readback', mandatory = false } = options;
  if (!token) {
    addApiReadback(
      report,
      name,
      'skipped',
      {
        reason: 'access-token-missing',
      },
      mandatory,
    );
    return null;
  }

  const response = await requestJson(`${backend.url}/api/profile`, {
    headers: authHeaders(token),
  });
  addApiReadback(
    report,
    name,
    response.ok ? 'pass' : 'fail',
    {
      httpStatus: response.status,
      durationMs: response.durationMs,
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    mandatory,
  );
  return response;
}

function recordLiveCheckpoint(context, name) {
  const { adb, serial, outputDir, report } = context;
  const focus = addForegroundStep(report, adb, serial, `${name}-foreground-check`);
  const screenshot = captureScreenshot(adb, serial, outputDir, `${name}-checkpoint`);
  const ui = captureUiDump(adb, serial, outputDir, `${name}-checkpoint-ui`);
  const logcat = captureLogcat(adb, serial, outputDir, `${name}-checkpoint-logcat.txt`, ['-t', '300']);
  report.artifacts.push(screenshot, ui, logcat);
  report.liveChecks.push({
    name,
    capturedAt: new Date().toISOString(),
    appForeground: focus.appForeground === true,
    focus: focus.line || '',
    screenshotPath: screenshot.path,
    screenshotOk: screenshot.ok,
    uiDumpPath: ui.path,
    uiDumpOk: ui.ok,
    logcatPath: logcat.path,
    logcatOk: logcat.ok,
  });
}

async function searchFoodForWrite(context, token, flowName, mandatory = true) {
  const { report, backend } = context;
  if (!token) {
    addApiReadback(
      report,
      `${flowName}-food-search`,
      'skipped',
      {
        reason: 'access-token-missing',
      },
      mandatory,
    );
    return null;
  }

  const query = trim(resolveEnv('EATFITAI_DEVICE_READBACK_FOOD_QUERY')) || 'Banana';
  const response = await requestJson(
    `${backend.url}/api/food/search?q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: authHeaders(token),
    },
  );
  const items = Array.isArray(response.body) ? response.body : [];
  const selected = items.find((item) => getFoodItemId(item)) || null;
  const foodItemId = getFoodItemId(selected);
  addApiReadback(
    report,
    `${flowName}-food-search`,
    response.ok && foodItemId ? 'pass' : 'fail',
    {
      query,
      httpStatus: response.status,
      durationMs: response.durationMs,
      resultCount: items.length,
      selectedFoodItemId: foodItemId,
      selectedFoodName: selected?.foodName || selected?.FoodName || '',
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    mandatory,
  );

  return foodItemId
    ? {
        foodItemId,
        foodName: selected?.foodName || selected?.FoodName || query,
      }
    : null;
}

async function createDiaryEntryWithApi(context, token, flowName) {
  const { report, backend } = context;
  const marker = buildSmokeMarker(flowName);
  const baseline = await readDiaryDay(context, token, {
    name: `${flowName}-baseline-readback`,
    mandatory: true,
  });
  const selectedFood = await searchFoodForWrite(context, token, flowName, true);

  if (!token || !selectedFood) {
    addApiReadback(
      report,
      `${flowName}-write`,
      'skipped',
      {
        reason: !token ? 'access-token-missing' : 'food-item-missing',
        marker,
      },
      true,
    );
    return null;
  }

  const date = toLocalDateOnly();
  const response = await requestJson(`${backend.url}/api/meal-diary`, {
    method: 'POST',
    headers: authHeaders(token),
    json: {
      eatenDate: `${date}T12:15:00.000Z`,
      mealTypeId: 4,
      foodItemId: selectedFood.foodItemId,
      grams: 96,
      calories: 88,
      protein: 1.1,
      carb: 22,
      fat: 0.3,
      note: marker,
      sourceMethod: flowName,
    },
  });
  const mealDiaryId = getMealDiaryId(response.body);
  addApiReadback(
    report,
    `${flowName}-write`,
    response.ok && mealDiaryId ? 'pass' : 'fail',
    {
      marker,
      httpStatus: response.status,
      durationMs: response.durationMs,
      mealDiaryId,
      selectedFoodItemId: selectedFood.foodItemId,
      selectedFoodName: selectedFood.foodName,
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    true,
  );

  await readDiaryDay(context, token, {
    name: `${flowName}-mandatory-readback`,
    marker,
    baselineCount: baseline.count,
    mandatory: true,
  });

  return {
    marker,
    mealDiaryId,
  };
}

async function executeVoiceTextWithApi(context, token) {
  const { report, backend } = context;
  const flowName = 'voice-text-readback';
  const marker = buildSmokeMarker(flowName);
  const baseline = await readDiaryDay(context, token, {
    name: `${flowName}-baseline-readback`,
    mandatory: true,
  });

  if (!token) {
    addApiReadback(
      report,
      `${flowName}-execute`,
      'skipped',
      {
        reason: 'access-token-missing',
        marker,
      },
      true,
    );
    return null;
  }

  const command = {
    intent: 'ADD_FOOD',
    entities: {
      foodName: 'Banana',
      foods: [{ foodName: 'Banana', quantity: 100, unit: 'g', weight: 100 }],
      quantity: 100,
      unit: 'g',
      mealType: 'snack',
      date: toLocalDateOnly(),
    },
    confidence: 0.99,
    rawText: `add 100 grams banana to snack ${marker}`,
    source: 'adb-smoke',
    suggestedAction: 'Add banana to snack',
    reviewRequired: false,
  };
  const response = await requestJson(`${backend.url}/api/voice/execute`, {
    method: 'POST',
    headers: authHeaders(token),
    json: command,
  });
  const bodySuccess =
    response.body?.success === true || response.body?.Success === true || response.status === 200;
  addApiReadback(
    report,
    `${flowName}-execute`,
    response.ok && bodySuccess ? 'pass' : 'fail',
    {
      marker,
      httpStatus: response.status,
      durationMs: response.durationMs,
      body: summarizeApiBody(response.body),
      error: response.error || '',
    },
    true,
  );

  await readDiaryDay(context, token, {
    name: `${flowName}-mandatory-readback`,
    baselineCount: baseline.count,
    mandatory: true,
  });

  return { marker };
}

async function assertScreen(context, name, markers, critical = false, options = {}) {
  const { adb, serial, outputDir, report } = context;
  const focus = addForegroundStep(report, adb, serial, `${name}-foreground-check`, critical);
  const screenshot = captureScreenshot(adb, serial, outputDir, `${name}-screen`);
  report.artifacts.push(screenshot);
  const ui = parseBooleanEnv('EATFITAI_DEVICE_SKIP_UI_DUMP')
    ? skippedUiDump(outputDir, `${name}-ui`, 'UIAutomator dump skipped by EATFITAI_DEVICE_SKIP_UI_DUMP.')
    : captureUiDump(adb, serial, outputDir, `${name}-ui`);
  report.artifacts.push(ui);
  return recordScreenEvidence(report, {
    name,
    markers,
    uiArtifact: ui,
    screenshotArtifact: screenshot,
    focus,
    critical,
    allowScreenshotFallback: options.allowScreenshotFallback !== false,
  });
}

async function navigateToTab(context, tabName, waitMs = 2500) {
  const target = TAB_TARGETS[tabName];
  if (!target) {
    throw new Error(`Unknown tab target: ${tabName}`);
  }

  await tapMarkerOrCoordinate(
    context,
    target.marker,
    `${tabName}-tab-tap`,
    target.xRatio,
    target.yRatio,
    waitMs,
  );
}

async function navigateToDiary(context) {
  await navigateToTab(context, 'home', 1800);
  await tapMarkerOrCoordinate(
    context,
    'home-view-diary-button',
    'home-diary-button-tap',
    0.5,
    0.53,
    2500,
  );
  return assertScreen(context, 'food-diary', SCREEN_MARKERS.diary, true);
}

async function submitRealLoginCredentials(context) {
  const { adb, serial, outputDir, report, credentials } = context;
  const size = readScreenSize(adb, serial);
  report.inputWarning =
    'ADB text input passes through the active Android keyboard. Keep device login credentials ASCII and verify screenshots for IME rewriting.';

  const emailTap = tap(adb, serial, size, 0.5, 0.395);
  await sleep(600);
  await maybeTapKeyboardGlobe(context, 'login-real-email-keyboard-globe-tap');
  clearFocusedText(adb, serial);
  const emailInput = inputText(adb, serial, credentials.email);
  await sleep(800);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await sleep(700);
  report.steps.push({ name: 'login-real-email', tap: emailTap, inputOk: emailInput.ok });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, 'login-real-email'));

  const passwordTap = tap(adb, serial, size, 0.5, 0.485);
  await sleep(600);
  clearFocusedText(adb, serial);
  const passwordInput = inputText(adb, serial, credentials.password);
  await sleep(800);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await sleep(700);
  report.steps.push({ name: 'login-real-password', tap: passwordTap, inputOk: passwordInput.ok });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, 'login-real-password'));

  const loginTap = tap(adb, serial, size, 0.5, 0.615);
  await sleep(7000);
  report.steps.push({ name: 'login-real-submit', tap: loginTap, critical: true });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, 'login-real-after-submit'));
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'login-real-after-submit-ui'));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'login-real-tail-logcat.txt', ['-t', '900']));
}

async function ensureAuthenticatedHome(context, options = {}) {
  const { adb, serial, outputDir, report, credentials } = context;
  const { flowName = 'authenticated-home', requireCredentials = false } = options;
  report.screen = readScreenSize(adb, serial);

  await runProbe(context);

  if (requireCredentials && !credentials.available) {
    addFlowAssertion(
      report,
      `${flowName}-credentials`,
      'fail',
      {
        reason: 'missing-login-credentials',
        expectedSources: credentials.expectedSources || [],
      },
      true,
    );
  }

  const stateUi = parseBooleanEnv('EATFITAI_DEVICE_SKIP_UI_DUMP')
    ? skippedUiDump(
        outputDir,
        `${flowName}-auth-state-ui`,
        'UIAutomator dump skipped by EATFITAI_DEVICE_SKIP_UI_DUMP.',
      )
    : captureUiDump(adb, serial, outputDir, `${flowName}-auth-state-ui`);
  report.artifacts.push(stateUi);
  const state = classifyAuthState(stateUi);
  addFlowAssertion(
    report,
    `${flowName}-auth-state-detected`,
    state.state === 'unknown' && state.uiDumpOk ? 'skipped' : 'pass',
    {
      state: state.state,
      uiDumpOk: state.uiDumpOk,
      markers: state.markers,
    },
  );

  if (state.state === 'authenticated') {
    const homeOk = await assertScreen(context, `${flowName}-home`, SCREEN_MARKERS.home, true, {
      allowScreenshotFallback: false,
    });
    report.authenticated = homeOk;
    if (requireCredentials) {
      addWarning(
        report,
        'login-real-existing-session',
        'login-real found an existing authenticated session and captured Home evidence without re-submitting credentials.',
      );
    }
    return homeOk;
  }

  if (state.state === 'unknown') {
    addWarning(
      report,
      state.uiDumpOk ? 'auth-state-unknown' : 'auth-state-uiautomator-degraded',
      state.uiDumpOk
        ? 'Auth state markers were not on the current screen; checking Home before login navigation.'
        : 'UIAutomator did not return auth state; checking Home with bounded screenshot evidence before login navigation.',
    );
    await navigateToTab(context, 'home', 1800);
    const canUseUnknownStateScreenshotFallback =
      !requireCredentials && !parseBooleanEnv('EATFITAI_DEVICE_FORCE_LOGIN');
    const boundedHomeOk = await assertScreen(
      context,
      `${flowName}-home-bounded-auth-state`,
      SCREEN_MARKERS.home,
      true,
      {
        allowScreenshotFallback: canUseUnknownStateScreenshotFallback,
      },
    );
    if (boundedHomeOk) {
      report.authenticated = true;
      addWarning(
        report,
        state.uiDumpOk ? 'auth-state-home-navigation-fallback' : 'auth-state-screenshot-fallback',
        state.uiDumpOk
          ? 'Authenticated Home was accepted after tab navigation from an unknown authenticated screen.'
          : 'Authenticated Home was accepted from foreground+screenshot evidence because UIAutomator was unavailable.',
      );
      return true;
    }
  }

  if (!credentials.available) {
    addFlowAssertion(
      report,
      `${flowName}-credentials-available`,
      'fail',
      {
        reason: 'credentials-missing-and-device-not-authenticated',
        expectedSources: credentials.expectedSources || [],
      },
      true,
    );
    return false;
  }

  const loginNavigation = await ensureLoginScreen(context);
  if (loginNavigation.state.state === 'authenticated') {
    const homeOk = await assertScreen(
      context,
      `${flowName}-home-after-navigation`,
      SCREEN_MARKERS.home,
      true,
      {
        allowScreenshotFallback: false,
      },
    );
    report.authenticated = homeOk;
    if (requireCredentials) {
      addWarning(
        report,
        'login-real-existing-session-after-navigation',
        'login-real navigation landed on an existing authenticated Home session; captured Home evidence without re-submitting credentials.',
      );
    }
    return homeOk;
  }
  if (!loginNavigation.loginDetected) {
    addFlowAssertion(
      report,
      `${flowName}-login-screen-detected`,
      'fail',
      {
        state: loginNavigation.state.state,
        markers: loginNavigation.state.markers,
        uiDumpOk: loginNavigation.state.uiDumpOk,
        reason: 'auth-navigation-did-not-reach-login-screen',
      },
      true,
    );
    return false;
  }
  await submitRealLoginCredentials(context);
  const focus = addForegroundStep(report, adb, serial, `${flowName}-foreground-after-login`, true);
  const screenshot = captureScreenshot(adb, serial, outputDir, `${flowName}-home-after-login`);
  report.artifacts.push(screenshot);
  const homeUi = captureUiDump(adb, serial, outputDir, `${flowName}-home-after-login-ui`);
  report.artifacts.push(homeUi);
  const homeOk = recordScreenEvidence(report, {
    name: `${flowName}-home-after-login`,
    markers: SCREEN_MARKERS.home,
    uiArtifact: homeUi,
    screenshotArtifact: screenshot,
    focus,
    critical: true,
    allowScreenshotFallback: false,
  });
  report.authenticated = homeOk;
  return homeOk;
}

async function runLoginReal(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'login-real',
    requireCredentials: true,
  });
}

async function runHomeSmoke(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'home-smoke',
  });
}

async function runFullTabUiSmoke(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'full-tab-ui-smoke',
  });

  await navigateToTab(context, 'home', 1800);
  await assertScreen(context, 'full-tab-ui-smoke-home', SCREEN_MARKERS.home, true, {
    allowScreenshotFallback: true,
  });

  const tabChecks = [
    ['voice', SCREEN_MARKERS.voice],
    ['scan', SCREEN_MARKERS.scan],
    ['stats', SCREEN_MARKERS.stats],
    ['profile', SCREEN_MARKERS.profile],
  ];

  for (const [tabName, markers] of tabChecks) {
    await navigateToTab(context, tabName, 2500);
    await assertScreen(context, `full-tab-ui-smoke-${tabName}`, markers, true);
  }
}

async function runFoodDiaryReadback(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'food-diary-readback',
  });
  await navigateToDiary(context);
  const token = await runApiLogin(context, true);
  await readDiaryDay(context, token, {
    name: 'food-diary-mandatory-readback',
    mandatory: true,
  });
}

async function runFoodSearchUiReadback(context) {
  const { adb, serial, outputDir, report } = context;
  await ensureAuthenticatedHome(context, {
    flowName: 'food-search-ui-readback',
    requireCredentials: parseBooleanEnv('EATFITAI_DEVICE_FORCE_LOGIN'),
  });
  const token = await runApiLogin(context, true);
  const baseline = await readDiaryDay(context, token, {
    name: 'food-search-ui-baseline-readback',
    mandatory: true,
  });

  await navigateToDiary(context);
  await tapMarkerOrCoordinate(
    context,
    'meal-diary-add-manual-button',
    'food-search-ui-open-add-manual',
    0.82,
    0.86,
    2500,
  );
  await tapMarkerOrCoordinate(
    context,
    'home-quick-add-search-button',
    'food-search-ui-select-add-meal-action',
    0.74,
    0.43,
    3000,
  );
  await assertScreen(context, 'food-search-ui-readback-search', SCREEN_MARKERS.foodSearch, true);

  const query = trim(resolveEnv('EATFITAI_DEVICE_READBACK_FOOD_QUERY')) || 'rice';
  await tapMarkerOrCoordinate(
    context,
    'food-search-query-input',
    'food-search-ui-query-input-tap',
    0.5,
    0.15,
    700,
  );
  clearFocusedText(adb, serial, 24);
  const input = inputText(adb, serial, query);
  await sleep(500);
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, 'food-search-ui-after-query-input'));
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_ENTER'], { timeoutMs: 10000 });
  await sleep(4500);
  report.steps.push({
    name: 'food-search-ui-query-input',
    inputOk: input.ok,
    textLength: query.length,
  });

  await assertScreen(
    context,
    'food-search-ui-readback-results',
    ['food-search-first-result-card', 'food-search-add-first-item-button'],
    true,
  );
  await tapMarkerOrCoordinate(
    context,
    'food-search-add-first-item-button',
    'food-search-ui-first-add-tap',
    0.88,
    0.405,
    5500,
  );
  report.artifacts.push(
    captureLogcat(adb, serial, outputDir, 'food-search-ui-after-add-logcat.txt', [
      '-t',
      parseBooleanEnv('EATFITAI_DEVICE_FAST_ADB') ? '200' : '800',
    ]),
  );
  await assertScreen(context, 'food-search-ui-readback-after-add', SCREEN_MARKERS.foodSearch, false);
  await readDiaryDay(context, token, {
    name: 'food-search-ui-mandatory-readback',
    baselineCount: baseline.count,
    baselineIds: baseline.ids,
    mandatory: true,
  });
}

async function runScanSaveReadback(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'scan-save-readback',
  });
  await navigateToTab(context, 'scan', 2500);
  await assertScreen(context, 'scan-save-readback-scan', SCREEN_MARKERS.scan, false);
  addWarning(
    context.report,
    'scan-save-ui-bounded',
    'scan-save-readback captures scan screen evidence, then performs deterministic backend save/readback because camera and AI result selection are not stable over raw ADB.',
  );
  const token = await runApiLogin(context, true);
  await createDiaryEntryWithApi(context, token, 'scan-save-readback');
}

async function runVoiceTextReadback(context) {
  const { adb, serial, report } = context;
  await ensureAuthenticatedHome(context, {
    flowName: 'voice-text-readback',
  });
  await navigateToTab(context, 'voice', 2500);
  await assertScreen(context, 'voice-text-readback-voice', SCREEN_MARKERS.voice, false);
  const voiceText = 'add 100 grams banana to snack';
  await tapMarkerOrCoordinate(context, 'voice-text-input', 'voice-text-input-tap', 0.5, 0.82, 800);
  const input = inputText(adb, serial, voiceText);
  await sleep(800);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  report.steps.push({
    name: 'voice-text-input',
    inputOk: input.ok,
    textLength: voiceText.length,
  });
  addWarning(
    report,
    'voice-text-ui-bounded',
    'voice-text-readback records bounded UI text entry, then verifies deterministic backend execute/readback.',
  );
  const token = await runApiLogin(context, true);
  await executeVoiceTextWithApi(context, token);
}

async function runStatsProfileSmoke(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'stats-profile-smoke',
  });
  const token = await runApiLogin(context, true);

  await navigateToTab(context, 'stats', 2500);
  await assertScreen(context, 'stats-profile-smoke-stats', SCREEN_MARKERS.stats, false);
  const date = toLocalDateOnly();
  const summary = token
    ? await requestJson(
        `${context.backend.url}/api/summary/day?date=${encodeURIComponent(date)}`,
        { headers: authHeaders(token) },
      )
    : null;
  addApiReadback(
    context.report,
    'stats-summary-day-readback',
    summary?.ok ? 'pass' : token ? 'fail' : 'skipped',
    {
      date,
      httpStatus: summary?.status ?? null,
      durationMs: summary?.durationMs ?? null,
      body: summarizeApiBody(summary?.body),
      error: summary?.error || '',
    },
    true,
  );

  await navigateToTab(context, 'profile', 2500);
  await assertScreen(context, 'stats-profile-smoke-profile', SCREEN_MARKERS.profile, false);
  const profile = token
    ? await requestJson(`${context.backend.url}/api/profile`, {
        headers: authHeaders(token),
      })
    : null;
  addApiReadback(
    context.report,
    'profile-readback',
    profile?.ok ? 'pass' : token ? 'fail' : 'skipped',
    {
      httpStatus: profile?.status ?? null,
      durationMs: profile?.durationMs ?? null,
      body: summarizeApiBody(profile?.body),
      error: profile?.error || '',
    },
    true,
  );
}

async function runBackendFrontendLiveCheck(context) {
  await ensureAuthenticatedHome(context, {
    flowName: 'backend-frontend-live-check',
  });
  const token = await runApiLogin(context, true);

  recordLiveCheckpoint(context, 'live-check-home');
  await readDiaryDay(context, token, {
    name: 'live-check-diary-readback',
    mandatory: true,
  });

  await navigateToTab(context, 'voice', 2500);
  await assertScreen(context, 'live-check-voice', SCREEN_MARKERS.voice, true);
  recordLiveCheckpoint(context, 'live-check-voice');

  await navigateToTab(context, 'scan', 2500);
  await assertScreen(context, 'live-check-scan', SCREEN_MARKERS.scan, true);
  recordLiveCheckpoint(context, 'live-check-scan');

  await navigateToTab(context, 'stats', 2500);
  await assertScreen(context, 'live-check-stats', SCREEN_MARKERS.stats, true);
  recordLiveCheckpoint(context, 'live-check-stats');
  await readSummaryDay(context, token, {
    name: 'live-check-summary-readback',
    mandatory: true,
  });

  await navigateToTab(context, 'profile', 2500);
  await assertScreen(context, 'live-check-profile', SCREEN_MARKERS.profile, true);
  recordLiveCheckpoint(context, 'live-check-profile');
  await readProfile(context, token, {
    name: 'live-check-profile-readback',
    mandatory: true,
  });

  capturePerformanceSnapshot(context, 'backend-frontend-live-check-final');
}

async function ensureLoginScreen(context) {
  const { adb, serial, outputDir, report } = context;
  const size = readScreenSize(adb, serial);

  addForegroundStep(report, adb, serial, 'auth-entry-foreground-before-navigation');

  // First-run state is often the intro carousel. These taps are no-ops on the
  // login screen, but move intro -> welcome -> email login on a fresh install.
  await tapStep(report, adb, serial, size, 'intro-start-or-noop', 0.5, 0.925, 2500);
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '02-after-intro-start'));

  await tapStep(report, adb, serial, size, 'welcome-email-or-noop', 0.5, 0.692, 2500);
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '03-login-screen'));

  const loginUi = captureUiDump(adb, serial, outputDir, 'login-ui');
  report.artifacts.push(loginUi);
  const loginXml = loginUi.ok ? readTextFileIfExists(loginUi.path) : '';
  const state = classifyAuthState(loginUi);
  const focusAfterNavigation = addForegroundStep(
    report,
    adb,
    serial,
    'auth-entry-foreground-after-navigation',
  );
  const loginDetected =
    focusAfterNavigation.appForeground &&
    (!loginUi.ok ||
      loginXml.includes('auth-login-email-input') ||
      loginXml.includes('Chào mừng trở lại'));
  report.steps.push({
    name: 'login-screen-detected',
    ok: loginDetected,
    uiDumpOk: loginUi.ok,
    state: state.state,
    markers: state.markers,
  });
  return {
    loginDetected,
    state,
    uiArtifact: loginUi,
  };
}

async function runAuthEntry(context) {
  const { adb, serial, outputDir, report, record } = context;
  const size = readScreenSize(adb, serial);
  const email = trim(resolveEnv('EATFITAI_DEVICE_PROBE_EMAIL')) || DEFAULT_EMAIL;
  const password = trim(resolveEnv('EATFITAI_DEVICE_PROBE_PASSWORD')) || DEFAULT_PASSWORD;
  report.screen = size;
  report.inputWarning =
    'ADB text input passes through the active Android keyboard. Keep probe credentials ASCII and verify screenshots for IME rewriting.';

  await runProbe(context);
  const recording = startRecording(adb, serial, outputDir, record);
  await ensureLoginScreen(context);

  const emailTap = tap(adb, serial, size, 0.5, 0.395);
  await sleep(800);
  const emailInput = inputText(adb, serial, email);
  await sleep(800);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await sleep(800);
  report.steps.push({ name: 'email', tap: emailTap, inputOk: emailInput.ok });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '02-email'));

  const passwordTap = tap(adb, serial, size, 0.5, 0.485);
  await sleep(800);
  const passwordInput = inputText(adb, serial, password);
  await sleep(800);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await sleep(800);
  report.steps.push({ name: 'password', tap: passwordTap, inputOk: passwordInput.ok });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '03-password'));

  const loginTap = tap(adb, serial, size, 0.5, 0.615);
  await sleep(5000);
  report.steps.push({ name: 'login-tap', tap: loginTap });
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '04-after-login-tap'));
  addForegroundStep(report, adb, serial, 'foreground-after-login-tap');
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'auth-entry-ui'));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'auth-entry-tail-logcat.txt', ['-t', '800']));
  const video = stopRecording(adb, serial, recording);
  if (video) {
    report.artifacts.push(video);
  }
}

function buildDoctorChecks(adb, serial, online, outputDir, report) {
  const checks = [];
  const scrcpy = resolveScrcpy();
  const scrcpyVersion = run(scrcpy, ['--version'], { timeoutMs: 10000 });
  checks.push({
    name: 'scrcpy',
    status: scrcpyVersion.ok ? 'OK' : 'WARN',
    detail: scrcpyVersion.ok
      ? scrcpyVersion.stdout.split(/\r?\n/)[0]
      : 'scrcpy not found. Install with: winget install --id Genymobile.scrcpy -e',
  });

  checks.push({
    name: 'ADB devices',
    status: online.length > 0 ? 'OK' : 'FAIL',
    detail: online.length > 0 ? `${online.length} online device(s): ${online.join(', ')}` : 'No online device.',
  });

  const pkg = runAdb(adb, serial, ['shell', 'dumpsys', 'package', APP_PACKAGE]);
  checks.push({
    name: 'Installed app',
    status: pkg.ok && pkg.stdout.includes(APP_PACKAGE) ? 'OK' : 'FAIL',
    detail: pkg.ok && pkg.stdout.includes(APP_PACKAGE) ? `${APP_PACKAGE} is installed.` : `Missing ${APP_PACKAGE}.`,
  });

  const size = readScreenSize(adb, serial);
  checks.push({ name: 'Screen size', status: 'OK', detail: `${size.width}x${size.height}` });

  const ui = captureUiDump(adb, serial, outputDir, 'doctor-ui');
  report.artifacts.push(ui);
  checks.push({
    name: 'UIAutomator dump',
    status: ui.ok ? 'OK' : 'WARN',
    detail: ui.ok ? 'UI tree captured.' : ui.warning,
  });

  const screencap = captureScreenshot(adb, serial, outputDir, 'doctor-screen');
  report.artifacts.push(screencap);
  checks.push({
    name: 'screencap',
    status: screencap.ok ? 'OK' : 'FAIL',
    detail: screencap.ok
      ? `Device screenshot command works (${screencap.bytes} bytes).`
      : screencap.error,
  });

  const screenrecord = runAdb(adb, serial, ['shell', 'screenrecord', '--help'], { timeoutMs: 10000 });
  checks.push({
    name: 'screenrecord',
    status: screenrecord.ok || screenrecord.stdout || screenrecord.stderr ? 'OK' : 'WARN',
    detail: 'screenrecord command is available on most Android builds; use --record to capture video evidence.',
  });

  const manufacturer = runAdb(adb, serial, ['shell', 'getprop', 'ro.product.manufacturer']).stdout;
  const miui = runAdb(adb, serial, ['shell', 'getprop', 'ro.miui.ui.version.name']).stdout;
  checks.push({
    name: 'OEM notes',
    status: miui ? 'WARN' : 'OK',
    detail: miui
      ? `${manufacturer || 'Xiaomi'} ${miui}: enable USB debugging and USB debugging (Security settings) for ADB input.`
      : `${manufacturer || 'Android'} device detected.`,
  });

  return checks;
}

async function main() {
  const mode = trim(process.argv[2]) || 'probe';
  if (!MODES.includes(mode)) {
    throw new Error(`Usage: node scripts/real-device-adb-flow.js <${MODES.join('|')}> [--record]`);
  }

  const adb = resolveAdb();
  const { serial, online, devices } = resolveSerial(adb);
  const outputDir = ensureOutputDir(mode);
  const credentials = resolveLoginCredentials();
  const backend = resolveBackendUrl();
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    serial,
    outputDir,
    adb,
    devices: devices.stdout,
    backend: {
      url: backend.url,
      source: backend.source,
    },
    credentials: credentialReport(credentials),
    authenticated: false,
    steps: [],
    artifacts: [],
    checks: [],
    status: 'fail',
    criticalFailures: [],
    warnings: [],
    flowAssertions: [],
    apiReadbacks: [],
    uiDefects: [],
    liveChecks: [],
    performance: {
      startup: null,
      gfxReset: null,
      snapshots: [],
    },
    evidence: {
      screenshots: [],
      uiDumps: [],
      logcats: [],
      videos: [],
      otherArtifacts: [],
    },
    passed: false,
  };
  const record = process.argv.includes('--record');
  const context = { adb, serial, outputDir, report, record, credentials, backend };

  if (mode === 'doctor') {
    report.checks = buildDoctorChecks(adb, serial, online, outputDir, report);
  } else if (mode === 'probe') {
    await runProbe(context);
  } else if (mode === 'auth-entry') {
    await runAuthEntry(context);
  } else if (mode === 'login-smoke') {
    await runLoginSmoke(context);
  } else if (mode === 'post-login-smoke') {
    await runPostLoginSmoke(context);
  } else if (mode === 'scan-entry') {
    await runScanEntry(context);
  } else if (mode === 'diary-readback') {
    await runDiaryReadback(context);
  } else if (mode === 'login-real') {
    await runLoginReal(context);
  } else if (mode === 'home-smoke') {
    await runHomeSmoke(context);
  } else if (mode === 'full-tab-ui-smoke') {
    await runFullTabUiSmoke(context);
  } else if (mode === 'food-diary-readback') {
    await runFoodDiaryReadback(context);
  } else if (mode === 'food-search-ui-readback') {
    await runFoodSearchUiReadback(context);
  } else if (mode === 'scan-save-readback') {
    await runScanSaveReadback(context);
  } else if (mode === 'voice-text-readback') {
    await runVoiceTextReadback(context);
  } else if (mode === 'stats-profile-smoke') {
    await runStatsProfileSmoke(context);
  } else if (mode === 'backend-frontend-live-check') {
    await runBackendFrontendLiveCheck(context);
  }

  finalizeReport(report);
  writeJson(path.join(outputDir, 'report.json'), sanitizeReport(report));

  console.log(`REAL_DEVICE_ADB_OUTPUT_DIR=${outputDir}`);
  if (report.checks.length > 0) {
    for (const check of report.checks) {
      console.log(`${check.status.padEnd(5)} ${check.name} - ${check.detail}`);
    }
  }
  console.log(`status=${report.status}`);
  console.log(`passed=${report.passed}`);
  if (report.criticalFailures.length > 0) {
    for (const failure of report.criticalFailures) {
      console.log(`CRITICAL ${failure.code} - ${failure.message}`);
    }
  }
  if (report.warnings.length > 0) {
    for (const warning of report.warnings) {
      console.log(`WARN ${warning.code} - ${warning.message}`);
    }
  }
  process.exit(report.status === 'fail' ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
