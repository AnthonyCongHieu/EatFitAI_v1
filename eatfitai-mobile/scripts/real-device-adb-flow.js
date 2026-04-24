const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(repoRoot, '_logs', 'real-device-adb');
const APP_PACKAGE = 'com.eatfitai.app';
const DEFAULT_EMAIL = 'probe@demo.com';
const DEFAULT_PASSWORD = 'Probe12345';

function trim(value) {
  return String(value || '').trim();
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
    timeout: options.timeoutMs || 30000,
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
  const devices = run(adb, ['devices', '-l']);
  if (!devices.ok) {
    throw new Error(devices.stderr || devices.error || 'adb devices failed');
  }

  const online = parseDevices(devices.stdout);
  if (requested) {
    if (!online.includes(requested)) {
      throw new Error(`ANDROID_SERIAL=${requested} is not an online adb device.`);
    }
    return { serial: requested, online, devices };
  }

  if (online.length !== 1) {
    throw new Error(
      online.length === 0
        ? 'No online Android device was found over ADB.'
        : `Multiple Android devices are online (${online.join(', ')}). Set ANDROID_SERIAL.`,
    );
  }

  return { serial: online[0], online, devices };
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(name) {
  return String(name).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
}

function captureScreenshot(adb, serial, outputDir, name) {
  const fileName = `${safeName(name)}.png`;
  const remotePath = `/sdcard/eatfitai-${fileName}`;
  const localPath = path.join(outputDir, fileName);
  const shot = runAdb(adb, serial, ['shell', 'screencap', '-p', remotePath], { timeoutMs: 20000 });
  if (!shot.ok) {
    return { ok: false, name, path: localPath, error: shot.stderr || shot.error };
  }

  const pull = runAdb(adb, serial, ['pull', remotePath, localPath], { timeoutMs: 20000 });
  runAdb(adb, serial, ['shell', 'rm', remotePath], { timeoutMs: 10000 });
  return { ok: pull.ok, name, path: localPath, error: pull.stderr || pull.error };
}

function captureUiDump(adb, serial, outputDir, name) {
  const remotePath = `/sdcard/eatfitai-${safeName(name)}.xml`;
  const localPath = path.join(outputDir, `${safeName(name)}.xml`);
  const dump = runAdb(adb, serial, ['shell', 'uiautomator', 'dump', remotePath], {
    timeoutMs: 20000,
  });
  if (!dump.ok) {
    return {
      ok: false,
      path: localPath,
      warning: dump.stderr || dump.stdout || dump.error || 'uiautomator dump failed',
    };
  }

  const pull = runAdb(adb, serial, ['pull', remotePath, localPath], { timeoutMs: 20000 });
  runAdb(adb, serial, ['shell', 'rm', remotePath], { timeoutMs: 10000 });
  return {
    ok: pull.ok,
    path: localPath,
    warning: pull.ok ? '' : pull.stderr || pull.error,
  };
}

function captureLogcat(adb, serial, outputDir, name, args) {
  const result = runAdb(adb, serial, ['logcat', '-d', ...args], {
    timeoutMs: 20000,
    encoding: 'utf8',
  });
  const filePath = path.join(outputDir, name);
  fs.writeFileSync(filePath, `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`, 'utf8');
  return { ok: result.ok, path: filePath, error: result.error };
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
  return { ok: pull.ok, path: recording.localPath, error: pull.stderr || pull.error };
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

async function runProbe(context) {
  const { adb, serial, outputDir, report, record } = context;
  const recording = startRecording(adb, serial, outputDir, record);
  runAdb(adb, serial, ['logcat', '-c']);
  runAdb(adb, serial, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  runAdb(adb, serial, ['shell', 'wm', 'dismiss-keyguard']);
  runAdb(adb, serial, ['shell', 'am', 'force-stop', APP_PACKAGE]);
  const launch = runAdb(adb, serial, [
    'shell',
    'monkey',
    '-p',
    APP_PACKAGE,
    '-c',
    'android.intent.category.LAUNCHER',
    '1',
  ]);
  report.steps.push({ name: 'launch', ok: launch.ok, stdout: launch.stdout, stderr: launch.stderr });
  await sleep(6000);
  report.artifacts.push(captureScreenshot(adb, serial, outputDir, '01-launch'));
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'ui'));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'crash-logcat.txt', ['-b', 'crash']));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'tail-logcat.txt', ['-t', '600']));
  const video = stopRecording(adb, serial, recording);
  if (video) {
    report.artifacts.push(video);
  }
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

  const emailTap = tap(adb, serial, size, 0.5, 0.395);
  await sleep(800);
  const emailInput = inputText(adb, serial, email);
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
  report.artifacts.push(captureUiDump(adb, serial, outputDir, 'auth-entry-ui'));
  report.artifacts.push(captureLogcat(adb, serial, outputDir, 'auth-entry-tail-logcat.txt', ['-t', '800']));
  const video = stopRecording(adb, serial, recording);
  if (video) {
    report.artifacts.push(video);
  }
}

function buildDoctorChecks(adb, serial, online) {
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

  const ui = captureUiDump(adb, serial, fs.mkdtempSync(path.join(outputRoot, 'doctor-ui-')), 'ui');
  checks.push({
    name: 'UIAutomator dump',
    status: ui.ok ? 'OK' : 'WARN',
    detail: ui.ok ? 'UI tree captured.' : ui.warning,
  });

  const screencap = runAdb(adb, serial, ['shell', 'screencap', '-p', '/sdcard/eatfitai-doctor.png']);
  runAdb(adb, serial, ['shell', 'rm', '/sdcard/eatfitai-doctor.png']);
  checks.push({
    name: 'screencap',
    status: screencap.ok ? 'OK' : 'FAIL',
    detail: screencap.ok ? 'Device screenshot command works.' : screencap.stderr || screencap.error,
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
  if (!['doctor', 'probe', 'auth-entry'].includes(mode)) {
    throw new Error('Usage: node scripts/real-device-adb-flow.js <doctor|probe|auth-entry> [--record]');
  }

  const adb = resolveAdb();
  const { serial, online, devices } = resolveSerial(adb);
  const outputDir = ensureOutputDir(mode);
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    serial,
    outputDir,
    adb,
    devices: devices.stdout,
    steps: [],
    artifacts: [],
    checks: [],
    passed: false,
  };
  const record = process.argv.includes('--record');

  if (mode === 'doctor') {
    report.checks = buildDoctorChecks(adb, serial, online);
  } else if (mode === 'probe') {
    await runProbe({ adb, serial, outputDir, report, record });
  } else {
    await runAuthEntry({ adb, serial, outputDir, report, record });
  }

  report.passed =
    !report.steps.some((step) => step.ok === false || step.tap?.ok === false || step.inputOk === false) &&
    !report.checks.some((check) => check.status === 'FAIL');
  writeJson(path.join(outputDir, 'report.json'), report);

  console.log(`REAL_DEVICE_ADB_OUTPUT_DIR=${outputDir}`);
  if (report.checks.length > 0) {
    for (const check of report.checks) {
      console.log(`${check.status.padEnd(5)} ${check.name} - ${check.detail}`);
    }
  }
  console.log(`passed=${report.passed}`);
  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
