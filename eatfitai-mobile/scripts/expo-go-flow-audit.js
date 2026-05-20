const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { buildAsciiKeyEventArgs } = require('./lib/adb-text');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, '_logs', 'expo-go-flow-audit');
const METRO_PORT = Number(process.env.EXPO_GO_AUDIT_PORT || 8081);
const EXPO_GO_PACKAGE = 'host.exp.exponent';
const DEFAULT_SERIAL = process.env.ANDROID_SERIAL || '';
const DEEP_MODE = /^(1|true|yes|on)$/i.test(String(process.env.EXPO_GO_AUDIT_DEEP || ''));
const FOOD_QUERY = trim(process.env.EXPO_GO_AUDIT_FOOD_QUERY || 'rice');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function trim(value) {
  return String(value || '').trim();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function commandName(name) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

function resolveCommand(name) {
  const finder = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(finder, [commandName(name)], { encoding: 'utf8', shell: false });
  const first = trim(result.stdout).split(/\r?\n/).find(Boolean);
  return result.status === 0 && first ? first : commandName(name);
}

function adbArgs(serial, args) {
  return serial ? ['-s', serial, ...args] : args;
}

function runAdb(serial, args, options = {}) {
  const adb = resolveCommand('adb');
  const result = spawnSync(adb, adbArgs(serial, args), {
    encoding: options.encoding || 'utf8',
    timeout: options.timeoutMs || 30000,
    shell: false,
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trim(result.stdout),
    stderr: trim(result.stderr),
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function parseDevices(output) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^(\S+)\s+device(?:\s|$)/)?.[1])
    .filter(Boolean);
}

function resolveSerial() {
  const devices = runAdb('', ['devices'], { timeoutMs: 10000 });
  if (!devices.ok) {
    throw new Error(devices.stderr || devices.error || 'adb devices failed');
  }

  const online = parseDevices(devices.stdout);
  if (DEFAULT_SERIAL) {
    if (!online.includes(DEFAULT_SERIAL)) {
      throw new Error(`ANDROID_SERIAL=${DEFAULT_SERIAL} is not online. Online devices: ${online.join(', ') || '<none>'}`);
    }
    return DEFAULT_SERIAL;
  }

  if (online.length !== 1) {
    throw new Error(`Expected one adb device or ANDROID_SERIAL. Online devices: ${online.join(', ') || '<none>'}`);
  }

  return online[0];
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(600, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port)) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

function startMetro(outputDir) {
  const out = fs.openSync(path.join(outputDir, 'metro.out.log'), 'a');
  const err = fs.openSync(path.join(outputDir, 'metro.err.log'), 'a');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', 'dev', '--', '--localhost', '--port', String(METRO_PORT)], {
    cwd: mobileRoot,
    stdio: ['ignore', out, err],
    shell: process.platform === 'win32',
  });

  return { child, out, err };
}

function stopMetro(metro) {
  if (!metro) return;
  try {
    metro.child.kill();
  } catch (_) {
    // Best-effort cleanup.
  }
  for (const fd of [metro.out, metro.err]) {
    try {
      fs.closeSync(fd);
    } catch (_) {
      // Best-effort cleanup.
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function screenSize(serial) {
  const result = runAdb(serial, ['shell', 'wm', 'size'], { timeoutMs: 10000 });
  const match = result.stdout.match(/(\d+)x(\d+)/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 1080, height: 2400 };
}

function foregroundPackage(serial) {
  const result = runAdb(serial, ['shell', 'dumpsys', 'window', 'windows'], { timeoutMs: 10000 });
  const source = `${result.stdout}\n${result.stderr}`;
  const match =
    source.match(/mCurrentFocus=Window\{[^}]*\s([a-zA-Z0-9_.]+)\/[^}\s]+/i) ||
    source.match(/mFocusedApp=ActivityRecord\{[^}]*\s([a-zA-Z0-9_.]+)\/[^}\s]+/i);
  return match?.[1] || '';
}

function assertExpoForeground(serial, stepName) {
  const currentPackage = foregroundPackage(serial);
  if (currentPackage && currentPackage !== EXPO_GO_PACKAGE) {
    throw new Error(
      `${stepName} stopped because foreground package is ${currentPackage}, expected ${EXPO_GO_PACKAGE}.`,
    );
  }
  return currentPackage || EXPO_GO_PACKAGE;
}

function tap(serial, size, xRatio, yRatio) {
  return runAdb(serial, [
    'shell',
    'input',
    'tap',
    String(Math.round(size.width * xRatio)),
    String(Math.round(size.height * yRatio)),
  ], { timeoutMs: 10000 });
}

function swipe(serial, size, x1, y1, x2, y2, duration = 550) {
  return runAdb(serial, [
    'shell',
    'input',
    'swipe',
    String(Math.round(size.width * x1)),
    String(Math.round(size.height * y1)),
    String(Math.round(size.width * x2)),
    String(Math.round(size.height * y2)),
    String(duration),
  ], { timeoutMs: 15000 });
}

function inputText(serial, text) {
  const keyEventArgs = buildAsciiKeyEventArgs(text, { lowercase: true });
  if (keyEventArgs) {
    return runAdb(serial, keyEventArgs, { timeoutMs: 10000 });
  }

  const escaped = String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\s/g, '%s')
    .replace(/'/g, "\\'");
  return runAdb(serial, ['shell', 'input', 'text', escaped], { timeoutMs: 10000 });
}

function keyevent(serial, key) {
  return runAdb(serial, ['shell', 'input', 'keyevent', key], { timeoutMs: 10000 });
}

function captureScreenshot(serial, outputDir, name) {
  const remote = `/sdcard/eatfitai-${name}-${Date.now()}.png`;
  const local = path.join(outputDir, `${name}.png`);
  const shot = runAdb(serial, ['shell', 'screencap', '-p', remote], { timeoutMs: 20000 });
  const pull = shot.ok ? runAdb(serial, ['pull', remote, local], { timeoutMs: 20000 }) : { ok: false, stderr: shot.stderr, error: shot.error };
  runAdb(serial, ['shell', 'rm', remote], { timeoutMs: 5000 });

  return {
    type: 'screenshot',
    name,
    path: local,
    ok: pull.ok && fs.existsSync(local) && fs.statSync(local).size > 0,
    bytes: fs.existsSync(local) ? fs.statSync(local).size : 0,
    error: pull.ok ? '' : pull.stderr || pull.error,
  };
}

function captureUi(serial, outputDir, name) {
  const remote = `/sdcard/eatfitai-${name}-${Date.now()}.xml`;
  const local = path.join(outputDir, `${name}.xml`);
  const dump = runAdb(serial, ['shell', 'uiautomator', 'dump', remote], { timeoutMs: 12000 });
  const pull = dump.ok ? runAdb(serial, ['pull', remote, local], { timeoutMs: 12000 }) : { ok: false, stderr: dump.stderr, error: dump.error };
  runAdb(serial, ['shell', 'rm', remote], { timeoutMs: 5000 });

  return {
    type: 'ui',
    name,
    path: local,
    ok: pull.ok && fs.existsSync(local),
    bytes: fs.existsSync(local) ? fs.statSync(local).size : 0,
    error: pull.ok ? '' : pull.stderr || pull.error || dump.stderr || dump.error,
  };
}

function readArtifactText(artifact) {
  if (!artifact?.ok || !artifact.path || !fs.existsSync(artifact.path)) {
    return '';
  }
  return fs.readFileSync(artifact.path, 'utf8');
}

function decodeXmlAttribute(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function findNodeCenterByText(xml, text) {
  const candidates = [];
  const anyNodeRegex = /<node\b[^>]*>/gi;
  let match;
  while ((match = anyNodeRegex.exec(xml))) {
    const node = match[0];
    const bounds = node.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i);
    if (!bounds) {
      continue;
    }

    const textMatch = node.match(/\b(?:text|content-desc|resource-id)="([^"]*)"/gi) || [];
    const values = textMatch.map((item) => decodeXmlAttribute(item.replace(/^[^=]+="/, '').replace(/"$/, '')));
    const exact = values.some((value) => value === text);
    const contains = values.some((value) => value.includes(text));
    if (exact || contains) {
      candidates.push({
        exact,
        clickable: /\bclickable="true"/i.test(node),
        x: Math.round((Number(bounds[1]) + Number(bounds[3])) / 2),
        y: Math.round((Number(bounds[2]) + Number(bounds[4])) / 2),
      });
    }
  }

  return candidates
    .sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.clickable) - Number(a.clickable))[0] || null;
}

async function tapUiTextOrRatio(serial, outputDir, size, text, xRatio, yRatio, name, interactions = []) {
  const ui = captureUi(serial, outputDir, `${name}-tap-probe`);
  const center = findNodeCenterByText(readArtifactText(ui), text);
  if (center) {
    const result = runAdb(serial, ['shell', 'input', 'tap', String(center.x), String(center.y)], { timeoutMs: 10000 });
    interactions.push({ name, target: text, method: 'ui-text', x: center.x, y: center.y, ok: result.ok });
    return result;
  }

  const x = Math.round(size.width * xRatio);
  const y = Math.round(size.height * yRatio);
  const result = tap(serial, size, xRatio, yRatio);
  interactions.push({ name, target: text, method: 'ratio-fallback', x, y, ok: result.ok, ui: ui.path });
  return result;
}

async function waitForUiText(serial, outputDir, name, markers, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastUi = null;
  while (Date.now() < deadline) {
    lastUi = captureUi(serial, outputDir, `${name}-probe`);
    const source = readArtifactText(lastUi);
    if (markers.some((marker) => source.includes(marker))) {
      return { ok: true, ui: lastUi };
    }
    await sleep(2500);
  }

  return { ok: false, ui: lastUi };
}

function startRecording(serial, outputDir) {
  const adb = resolveCommand('adb');
  const remote = `/sdcard/eatfitai-expo-flow-${Date.now()}.mp4`;
  const local = path.join(outputDir, 'expo-go-flow.mp4');
  const child = spawn(adb, adbArgs(serial, ['shell', 'screenrecord', '--time-limit', '180', remote]), {
    stdio: 'ignore',
    shell: false,
  });
  return { child, remote, local };
}

async function stopRecording(serial, recording) {
  if (!recording) return null;
  try {
    recording.child.kill();
  } catch (_) {
    // Best-effort stop.
  }
  await sleep(1800);
  const pull = runAdb(serial, ['pull', recording.remote, recording.local], { timeoutMs: 30000 });
  runAdb(serial, ['shell', 'rm', recording.remote], { timeoutMs: 10000 });
  return {
    type: 'video',
    name: 'expo-go-flow',
    path: recording.local,
    ok: pull.ok && fs.existsSync(recording.local) && fs.statSync(recording.local).size > 0,
    bytes: fs.existsSync(recording.local) ? fs.statSync(recording.local).size : 0,
    error: pull.ok ? '' : pull.stderr || pull.error,
  };
}

function captureLogcat(serial, outputDir) {
  const local = path.join(outputDir, 'logcat-tail.txt');
  const pid = trim(runAdb(serial, ['shell', 'pidof', '-s', EXPO_GO_PACKAGE], { timeoutMs: 10000 }).stdout);
  const logcatArgs = pid
    ? ['logcat', '-d', '--pid', pid, '-t', '1200', '-v', 'threadtime']
    : ['logcat', '-d', '-t', '1200', '-v', 'threadtime'];
  const result = runAdb(serial, logcatArgs, {
    timeoutMs: 20000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const redacted = String(result.stdout || result.stderr || result.error || '')
    .replace(/Bearer [A-Za-z0-9_.-]+/g, 'Bearer <redacted>')
    .replace(/"tokenPrefix"\s*:\s*"[^"]+"/g, '"tokenPrefix":"<redacted>"');
  fs.writeFileSync(local, redacted, 'utf8');
  return {
    type: 'logcat',
    name: 'tail',
    path: local,
    ok: fs.existsSync(local),
    bytes: fs.statSync(local).size,
    pid: pid || '',
  };
}

function writeMarkdownReport(outputDir, report) {
  const lines = [
    '# EatFitAI Expo Go Flow Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Device: ${report.serial}`,
    `Metro URL: ${report.expoUrl}`,
    `Foreground guard: ${EXPO_GO_PACKAGE}`,
    `Deep mode: ${report.deepMode ? 'enabled' : 'disabled'}`,
    '',
    '## Flow Coverage',
    '',
    '| Step | Purpose | Evidence |',
    '| --- | --- | --- |',
  ];

  for (const step of report.steps) {
    const status = step.targetOk === false ? 'FAIL' : step.targetOk === 'visual' ? 'VISUAL' : step.screenshotOk && step.uiOk ? 'PASS' : 'WARN';
    lines.push(`| ${step.name} | ${status}: ${step.purpose} | ${step.screenshot || ''} |`);
  }

  if (report.failures?.length) {
    lines.push('', '## Failures', '');
    for (const failure of report.failures) {
      lines.push(`- ${failure.step}: ${failure.reason}`);
    }
  }

  if (report.interactions?.length) {
    lines.push('', '## Interaction Trace', '', '| Step | Target | Method | Coordinate |', '| --- | --- | --- | --- |');
    for (const item of report.interactions) {
      lines.push(`| ${item.name} | ${item.target} | ${item.method} | ${item.x},${item.y} |`);
    }
  }

  lines.push(
    '',
    '## Strict Review Checklist',
    '',
    '- No fixed Daily Loop card should appear on Home.',
    '- MoChi should not appear twice at the same time across dock, overlay, toast, sheet, or inline notice.',
    '- Bottom navigation must stay usable above Android system navigation.',
    '- Home, Diary, Stats, Profile, MoChi hub, Add Manual, Scan, and Voice paths must remain reachable.',
    '- Animations should be short, non-blocking, and should not push text outside containers.',
    '- Any logcat crash, ANR, red screen, network auth loop, or token leak is production-blocking.',
    '',
    '## Artifacts',
    '',
    `- Video: ${report.video?.path || ''}`,
    `- Logcat: ${report.logcat?.path || ''}`,
  );

  fs.writeFileSync(path.join(outputDir, 'review.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function runFlow() {
  const outputDir = ensureDir(path.join(outputRoot, nowStamp()));
  const serial = resolveSerial();
  const size = screenSize(serial);
  let metro = null;

  if (!(await waitForPort(METRO_PORT, 1200))) {
    metro = startMetro(outputDir);
    if (!(await waitForPort(METRO_PORT, 90000))) {
      stopMetro(metro);
      throw new Error(`Metro did not start on port ${METRO_PORT}`);
    }
  }

  const expoUrl = `exp://127.0.0.1:${METRO_PORT}`;
  runAdb(serial, ['reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`], { timeoutMs: 10000 });
  runAdb(serial, ['logcat', '-c'], { timeoutMs: 10000 });
  runAdb(serial, ['shell', 'am', 'force-stop', EXPO_GO_PACKAGE], { timeoutMs: 10000 });
  runAdb(serial, ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', expoUrl, EXPO_GO_PACKAGE], { timeoutMs: 10000 });
  await sleep(8000);

  const homeReady = await waitForUiText(
    serial,
    outputDir,
    'home-ready',
    ['TRANG CHỦ', 'Trang chủ', 'Nhật ký hôm nay', 'Mục tiêu'],
    100000,
  );
  if (!homeReady.ok) {
    const screenshot = captureScreenshot(serial, outputDir, '00-home-ready-timeout');
    throw new Error(
      `Expo Go did not reach Home before audit started. Screenshot: ${screenshot.path}; UI: ${homeReady.ui?.path || '<none>'}`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    serial,
    screenSize: size,
    expoUrl,
    outputDir,
    startedMetro: Boolean(metro),
    deepMode: DEEP_MODE,
    steps: [],
    artifacts: [],
    failures: [],
    interactions: [],
  };

  const recording = startRecording(serial, outputDir);
  await sleep(800);

  async function checkpoint(name, purpose) {
    assertExpoForeground(serial, name);
    await sleep(700);
    const screenshot = captureScreenshot(serial, outputDir, name);
    const ui = captureUi(serial, outputDir, `${name}-ui`);
    report.artifacts.push(screenshot, ui);
    const step = { name, purpose, screenshot: screenshot.path, ui: ui.path, screenshotOk: screenshot.ok, uiOk: ui.ok };
    report.steps.push(step);
    return step;
  }

  async function assertCurrentUi(step, markers, timeoutMs = 16000) {
    const result = await waitForUiText(serial, outputDir, `${step}-assert`, markers, timeoutMs);
    if (!result.ok) {
      report.failures.push({
        step,
        reason: `Expected one of: ${markers.join(', ')}`,
        ui: result.ui?.path || '',
      });
    }
    return result.ok;
  }

  function scanVisualStatus(step) {
    const source = readArtifactText({ ok: step.uiOk, path: step.ui });
    if (source.includes('ai-scan-screen')) {
      return true;
    }
    if (
      source.includes('meal-diary-screen') ||
      source.includes('food-search-screen') ||
      source.includes('voice-screen') ||
      source.includes('profile-screen') ||
      source.includes('stats-screen') ||
      source.includes('navigation-mochi-hub-sheet')
    ) {
      report.failures.push({
        step: step.name,
        reason: 'Scan action screenshot/UI evidence still points to another app screen.',
        ui: step.ui || '',
      });
      return false;
    }
    return step.screenshotOk ? 'visual' : false;
  }

  try {
    await checkpoint('01-home-initial', 'Home baseline, dashboard, no fixed Daily Loop card, nav visible.');
    swipe(serial, size, 0.5, 0.8, 0.5, 0.34, 650);
    await checkpoint('02-home-scrolled', 'Home scroll, diary cards/water card, bottom dock behavior.');
    swipe(serial, size, 0.5, 0.34, 0.5, 0.8, 500);
    await sleep(700);

    tap(serial, size, 0.3, 0.94);
    await checkpoint('03-diary-tab', 'Diary tab, meal sections, nutrition totals, transition animation.');

    tap(serial, size, 0.82, 0.86);
    await checkpoint('04-diary-add-manual', 'Manual add entry path is reachable.');
    runAdb(serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], { timeoutMs: 10000 });
    await sleep(900);

    tap(serial, size, 0.5, 0.91);
    await checkpoint('05-mochi-hub', 'MoChi hub opens without stacking another MoChi surface.');
    runAdb(serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], { timeoutMs: 10000 });
    await sleep(900);

    tap(serial, size, 0.7, 0.94);
    await checkpoint('06-stats-tab', 'Stats tab loads and tab transition remains responsive.');
    tap(serial, size, 0.9, 0.94);
    await checkpoint('07-profile-tab', 'Profile tab loads without layout overlap.');
    tap(serial, size, 0.5, 0.91);
    await checkpoint('08-profile-mochi-hub', 'MoChi hub from another route keeps single-surface rule.');
    runAdb(serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], { timeoutMs: 10000 });
    await sleep(900);

    tap(serial, size, 0.3, 0.94);
    await sleep(900);
    tap(serial, size, 0.5, 0.91);
    await sleep(900);
    await tapUiTextOrRatio(serial, outputDir, size, 'Thêm bữa', 0.74, 0.62, 'hub-add-meal', report.interactions);
    const addMealOk = await assertCurrentUi('09-hub-add-meal-action', ['food-search-screen', 'Tìm kiếm món ăn']);
    await checkpoint('09-hub-add-meal-action', 'MoChi hub Add Meal route transition is reachable.');
    report.steps[report.steps.length - 1].targetOk = addMealOk;

    if (DEEP_MODE && addMealOk) {
      await tapUiTextOrRatio(serial, outputDir, size, 'food-search-query-input', 0.5, 0.18, 'deep-food-query-input', report.interactions);
      inputText(serial, FOOD_QUERY);
      await sleep(500);
      keyevent(serial, 'KEYCODE_ENTER');
      const resultsOk = await assertCurrentUi('09b-food-search-results', ['food-search-first-result-card', 'food-search-add-first-item-button'], 22000);
      await checkpoint('09b-food-search-results', `Deep mode search results for ${FOOD_QUERY}.`);
      report.steps[report.steps.length - 1].targetOk = resultsOk;
      if (resultsOk) {
        await tapUiTextOrRatio(serial, outputDir, size, 'food-search-add-first-item-button', 0.88, 0.4, 'deep-food-add-first', report.interactions);
        await sleep(4000);
        const diaryAfterAdd = await assertCurrentUi('09c-food-add-readback', ['meal-diary-screen', 'Nhật ký ăn uống'], 22000);
        await checkpoint('09c-food-add-readback', 'Deep mode add-first-result returns to Diary or updates visible diary state.');
        report.steps[report.steps.length - 1].targetOk = diaryAfterAdd;
      }
    }

    runAdb(serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], { timeoutMs: 10000 });
    await sleep(900);

    tap(serial, size, 0.5, 0.91);
    await sleep(900);
    await tapUiTextOrRatio(serial, outputDir, size, 'Quét thức ăn', 0.28, 0.62, 'hub-scan', report.interactions);
    await sleep(4500);
    const scanStep = await checkpoint('10-hub-scan-action', 'MoChi hub Scan route transition is reachable; camera screens may not expose UI XML.');
    scanStep.targetOk = scanVisualStatus(scanStep);
    if (!scanStep.screenshotOk) {
      report.failures.push({
        step: '10-hub-scan-action',
        reason: 'Scan screen did not produce a visual screenshot.',
        ui: scanStep.ui || '',
      });
    }
    runAdb(serial, ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], { timeoutMs: 10000 });
    await sleep(900);

    tap(serial, size, 0.5, 0.91);
    await sleep(900);
    await tapUiTextOrRatio(serial, outputDir, size, 'Giọng nói', 0.74, 0.78, 'hub-voice', report.interactions);
    const voiceOk = await assertCurrentUi('11-hub-voice-action', ['voice-screen', 'voice-mic-button', 'CHẠM ĐỂ NÓI']);
    await checkpoint('11-hub-voice-action', 'MoChi hub Voice route transition is reachable.');
    report.steps[report.steps.length - 1].targetOk = voiceOk;
  } finally {
    const video = await stopRecording(serial, recording);
    if (video) {
      report.video = video;
      report.artifacts.push(video);
    }
    const logcat = captureLogcat(serial, outputDir);
    report.logcat = logcat;
    report.artifacts.push(logcat);
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    writeMarkdownReport(outputDir, report);
    stopMetro(metro);
  }

  process.stdout.write(`${outputDir}\n`);
}

runFlow().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
