const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const outputRoot = path.join(repoRoot, '_logs', 'device-spy');

function trim(value) {
  return String(value || '').trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeName(name) {
  return String(name || 'capture').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
}

function commandName(name) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

function resolveAdb() {
  const vendored = path.join(
    repoRoot,
    '_tooling',
    'android-sdk',
    'platform-tools',
    commandName('adb'),
  );
  if (fs.existsSync(vendored)) {
    return vendored;
  }

  const finder = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(finder, [commandName('adb')], { encoding: 'utf8', shell: false });
  const first = trim(result.stdout).split(/\r?\n/).find(Boolean);
  return result.status === 0 && first ? first : commandName('adb');
}

function run(adb, serial, args, options = {}) {
  const adbArgs = serial ? ['-s', serial, ...args] : args;
  const result = spawnSync(adb, adbArgs, {
    encoding: options.encoding || 'utf8',
    timeout: options.timeoutMs || 30000,
    shell: false,
    maxBuffer: options.maxBuffer || 16 * 1024 * 1024,
  });

  return {
    command: `${adb} ${adbArgs.join(' ')}`,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trim(result.stdout),
    stderr: trim(result.stderr),
    error: result.error ? String(result.error.message || result.error) : '',
    rawStdout: result.stdout,
  };
}

function parseDevices(output) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^(\S+)\s+device(?:\s|$)/)?.[1])
    .filter(Boolean);
}

function resolveRealDevice(adb) {
  const targetMode = trim(process.env.EATFITAI_ANDROID_TARGET || process.env.EATFITAI_ANDROID_TARGET_MODE).toLowerCase();
  const serial = trim(process.env.ANDROID_SERIAL);
  const allowedModes = new Set(['real', 'real-device', 'device', 'usb']);

  if (!allowedModes.has(targetMode)) {
    throw new Error('Device spy requires EATFITAI_ANDROID_TARGET=real-device.');
  }
  if (!serial) {
    throw new Error('Device spy requires ANDROID_SERIAL for an explicit real-device target.');
  }

  const devices = run(adb, '', ['devices', '-l'], { timeoutMs: 10000 });
  if (!devices.ok) {
    throw new Error(devices.stderr || devices.error || 'adb devices failed');
  }

  const online = parseDevices(devices.stdout);
  if (!online.includes(serial)) {
    throw new Error(`ANDROID_SERIAL=${serial} is not an online adb device.`);
  }

  const qemu = run(adb, serial, ['shell', 'getprop', 'ro.kernel.qemu'], { timeoutMs: 10000 });
  if (!qemu.ok) {
    throw new Error(qemu.stderr || qemu.error || 'Failed to verify target type.');
  }
  if (trim(qemu.stdout) === '1') {
    throw new Error(`ANDROID_SERIAL=${serial} is an emulator. Device spy is configured for real USB devices only.`);
  }

  return { serial, online };
}

function ensureCaptureDir(outputDir) {
  const dir = outputDir || path.join(outputRoot, stamp());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function captureScreenshot(adb, serial, outputDir) {
  const filePath = path.join(outputDir, 'screenshot.png');
  const result = spawnSync(adb, serial ? ['-s', serial, 'exec-out', 'screencap', '-p'] : ['exec-out', 'screencap', '-p'], {
    encoding: 'buffer',
    timeout: 30000,
    shell: false,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status === 0 && result.stdout?.length > 0) {
    fs.writeFileSync(filePath, result.stdout);
  }
  return {
    ok: result.status === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 0,
    path: filePath,
    bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
    error: result.status === 0 ? '' : trim(result.stderr) || String(result.error || ''),
  };
}

function captureUiDump(adb, serial, outputDir) {
  const filePath = path.join(outputDir, 'ui.xml');
  const remotePath = `/sdcard/eatfitai-device-spy-${Date.now()}.xml`;
  const dump = run(adb, serial, ['shell', 'uiautomator', 'dump', remotePath], { timeoutMs: 10000 });
  const pull = dump.ok
    ? run(adb, serial, ['pull', remotePath, filePath], { timeoutMs: 10000 })
    : { ok: false, stderr: dump.stderr, error: dump.error };
  run(adb, serial, ['shell', 'rm', remotePath], { timeoutMs: 5000 });

  return {
    ok: pull.ok && fs.existsSync(filePath),
    path: filePath,
    bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
    error: pull.ok ? '' : pull.stderr || pull.error || dump.stderr || dump.error,
  };
}

function captureLogcat(adb, serial, outputDir, tail = 300) {
  const filePath = path.join(outputDir, 'logcat.txt');
  const result = run(adb, serial, ['logcat', '-d', '-t', String(tail), '-v', 'threadtime'], {
    timeoutMs: 20000,
    maxBuffer: 8 * 1024 * 1024,
  });
  fs.writeFileSync(filePath, result.stdout || result.stderr || result.error || '', 'utf8');
  return {
    ok: result.ok || fs.existsSync(filePath),
    path: filePath,
    bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
    error: result.ok ? '' : result.stderr || result.error,
  };
}

function readScreenSize(adb, serial) {
  const result = run(adb, serial, ['shell', 'wm', 'size'], { timeoutMs: 10000 });
  const match = result.stdout.match(/(\d+)x(\d+)/);
  return match
    ? { width: Number(match[1]), height: Number(match[2]) }
    : { width: 1080, height: 2400 };
}

function captureOnce(options = {}) {
  const adb = resolveAdb();
  const target = resolveRealDevice(adb);
  const outputDir = ensureCaptureDir(options.outputDir);
  const screenSize = readScreenSize(adb, target.serial);
  const screenshot = captureScreenshot(adb, target.serial, outputDir);
  const ui = captureUiDump(adb, target.serial, outputDir);
  const logcat = captureLogcat(adb, target.serial, outputDir, options.logTail || 300);
  const state = {
    capturedAt: new Date().toISOString(),
    adb,
    serial: target.serial,
    screenSize,
    outputDir,
    screenshot,
    ui,
    logcat,
  };

  writeJson(path.join(outputDir, 'state.json'), state);
  return state;
}

function tap(adb, serial, x, y) {
  return run(adb, serial, ['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))], {
    timeoutMs: 10000,
  });
}

function keyevent(adb, serial, key) {
  return run(adb, serial, ['shell', 'input', 'keyevent', String(key)], { timeoutMs: 10000 });
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value, null, 2));
}

function sendFile(response, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(response);
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EatFitAI Device Spy</title>
  <style>
    body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #0e1322; color: #dee1f7; }
    header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; gap: 12px; align-items: center; justify-content: space-between; }
    main { display: grid; grid-template-columns: minmax(280px, 420px) 1fr; gap: 16px; padding: 16px; }
    img { width: 100%; border-radius: 12px; background: #111827; border: 1px solid rgba(255,255,255,.08); }
    button { background: #4be277; color: #003915; border: 0; border-radius: 8px; padding: 10px 12px; font-weight: 800; cursor: pointer; }
    input { background: #161b2b; color: #dee1f7; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 10px; width: 76px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #111827; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 12px; max-height: 42vh; overflow: auto; }
    .panel { display: grid; gap: 12px; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .muted { color: #94a3b8; font-size: 13px; }
    @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div>
      <strong>EatFitAI Device Spy</strong>
      <div class="muted" id="meta">Loading...</div>
    </div>
    <button onclick="refreshAll()">Refresh</button>
  </header>
  <main>
    <section class="panel">
      <img id="shot" alt="Android screenshot" />
      <div class="controls">
        <input id="tapX" placeholder="x" />
        <input id="tapY" placeholder="y" />
        <button onclick="tapPoint()">Tap</button>
        <input id="key" placeholder="KEYCODE_BACK" style="width: 150px" />
        <button onclick="sendKey()">Key</button>
      </div>
    </section>
    <section class="panel">
      <div>
        <h3>UI XML</h3>
        <pre id="xml"></pre>
      </div>
      <div>
        <h3>Logcat Tail</h3>
        <pre id="log"></pre>
      </div>
    </section>
  </main>
  <script>
    async function api(path, options) {
      const res = await fetch(path, options);
      if (!res.ok) throw new Error(await res.text());
      return res.headers.get('content-type')?.includes('json') ? res.json() : res.text();
    }
    async function refreshAll() {
      await api('/api/refresh', { method: 'POST' });
      const state = await api('/api/state');
      document.getElementById('meta').textContent = state.serial + ' · ' + state.capturedAt + ' · ' + state.screenSize.width + 'x' + state.screenSize.height;
      document.getElementById('shot').src = '/screenshot.png?t=' + Date.now();
      document.getElementById('xml').textContent = await api('/ui.xml?t=' + Date.now());
      document.getElementById('log').textContent = await api('/logcat.txt?t=' + Date.now());
    }
    async function tapPoint() {
      await api('/api/tap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: Number(tapX.value), y: Number(tapY.value) }) });
      await refreshAll();
    }
    async function sendKey() {
      await api('/api/keyevent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key.value || 'KEYCODE_BACK' }) });
      await refreshAll();
    }
    refreshAll().catch((error) => document.getElementById('meta').textContent = error.message);
  </script>
</body>
</html>`;
}

function startServer(options = {}) {
  const adb = resolveAdb();
  const target = resolveRealDevice(adb);
  const outputDir = ensureCaptureDir(options.outputDir);
  let state = captureOnce({ ...options, outputDir });
  const port = Number(options.port || 49152);

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://localhost:${port}`);
      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(dashboardHtml());
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        sendJson(response, 200, state);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/screenshot.png') {
        sendFile(response, path.join(outputDir, 'screenshot.png'), 'image/png');
        return;
      }
      if (request.method === 'GET' && url.pathname === '/ui.xml') {
        sendFile(response, path.join(outputDir, 'ui.xml'), 'application/xml; charset=utf-8');
        return;
      }
      if (request.method === 'GET' && url.pathname === '/logcat.txt') {
        sendFile(response, path.join(outputDir, 'logcat.txt'), 'text/plain; charset=utf-8');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/refresh') {
        state = captureOnce({ ...options, outputDir });
        sendJson(response, 200, state);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/tap') {
        const body = await readRequestJson(request);
        const result = tap(adb, target.serial, body.x, body.y);
        sendJson(response, result.ok ? 200 : 500, result);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/keyevent') {
        const body = await readRequestJson(request);
        const result = keyevent(adb, target.serial, body.key || 'KEYCODE_BACK');
        sendJson(response, result.ok ? 200 : 500, result);
        return;
      }
      response.writeHead(404);
      response.end('Not found');
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(JSON.stringify({ url: `http://127.0.0.1:${port}`, outputDir, serial: target.serial }, null, 2));
  });
  return server;
}

module.exports = {
  captureOnce,
  outputRoot,
  resolveAdb,
  resolveRealDevice,
  safeName,
  startServer,
};
