const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const APP_ID = 'com.eatfitai.app';
const suite = process.argv[2];
const suites = {
  smoke: {
    config: '.maestro/smoke.config.yaml',
    output: '.maestro/artifacts/smoke/junit.xml',
  },
  regression: {
    config: '.maestro/regression.config.yaml',
    output: '.maestro/artifacts/regression/junit.xml',
  },
};

if (!suite || !suites[suite]) {
  console.error('Usage: node scripts/run-maestro.js <smoke|regression>');
  process.exit(1);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runAdb(args, { allowFailure = false } = {}) {
  const serial = resolveEnv('ANDROID_SERIAL') || process.env.ANDROID_SERIAL;
  const result = spawnSync('adb', serial ? ['-s', serial, ...args] : args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (!allowFailure && result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || `adb ${args.join(' ')} failed`);
  }
}

function prewarmAndroidApp() {
  runAdb(['wait-for-device']);
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], { allowFailure: true });
  runAdb(['shell', 'am', 'force-stop', APP_ID], { allowFailure: true });
  runAdb(['shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`]);
  sleep(5000);
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], { allowFailure: true });
  runAdb(['shell', 'am', 'force-stop', APP_ID], { allowFailure: true });
}

function bootstrapAuthenticatedState() {
  const result = spawnSync(
    'node',
    [path.resolve(__dirname, '..', '..', 'tools', 'appium', 'sanity.android.js')],
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('Appium auth bootstrap failed before Maestro run.');
  }
}

const selectedSuite = suites[suite];
const args = [
  'test',
  '.maestro',
  '--config',
  selectedSuite.config,
  '--format',
  'JUNIT',
  '--output',
  selectedSuite.output,
];

const forwardIfPresent = ['EATFITAI_DEMO_EMAIL', 'EATFITAI_DEMO_PASSWORD'];
for (const key of forwardIfPresent) {
  const value = resolveEnv(key);
  if (value) {
    args.push('-e', `${key}=${value}`);
  }
}

fs.mkdirSync(path.resolve(__dirname, '..', path.dirname(selectedSuite.output)), {
  recursive: true,
});

prewarmAndroidApp();
bootstrapAuthenticatedState();

const result = spawnSync('maestro', args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}

process.exit(result.status || 0);
