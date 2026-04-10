const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const APP_ID = 'com.eatfitai.app';
const suite = process.argv[2];
const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
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

function resolveBundledExecutable(relativeSegments) {
  const candidate = path.join(repoRoot, ...relativeSegments);
  return fs.existsSync(candidate) ? candidate : null;
}

function buildToolingEnv() {
  const pathParts = [
    path.join(repoRoot, '_tooling', 'jdk-17', 'bin'),
    path.join(repoRoot, '_tooling', 'android-sdk', 'platform-tools'),
    path.join(repoRoot, '_tooling', 'android-sdk', 'emulator'),
    path.join(repoRoot, '_tooling', 'android-sdk', 'cmdline-tools', 'latest', 'bin'),
    path.join(repoRoot, '_tooling', 'maestro', 'maestro', 'bin'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : null,
    process.env.PATH || '',
  ].filter(Boolean);

  return {
    ...process.env,
    JAVA_HOME: path.join(repoRoot, '_tooling', 'jdk-17'),
    ANDROID_SDK_ROOT: path.join(repoRoot, '_tooling', 'android-sdk'),
    ANDROID_AVD_HOME: path.join(repoRoot, '_tooling', 'android-avd'),
    ANDROID_USER_HOME: path.join(repoRoot, '_state', 'android-user-home'),
    PATH: pathParts.join(path.delimiter),
  };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runAdb(args, { allowFailure = false } = {}) {
  const serial = resolveEnv('ANDROID_SERIAL') || process.env.ANDROID_SERIAL;
  const adbExecutable =
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb.exe']) ||
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb']) ||
    'adb';
  const useShell =
    !(path.isAbsolute(adbExecutable) || adbExecutable.includes(path.sep));
  const result = spawnSync(adbExecutable, serial ? ['-s', serial, ...args] : args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: buildToolingEnv(),
    shell: process.platform === 'win32' ? useShell : false,
  });

  if (!allowFailure && result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || `adb ${args.join(' ')} failed`);
  }
}

function prewarmAndroidApp() {
  runAdb(['wait-for-device']);
  runAdb(['reverse', 'tcp:8081', 'tcp:8081'], { allowFailure: true });
  const permissions = [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ];
  for (const permission of permissions) {
    runAdb(['shell', 'pm', 'grant', APP_ID, permission], { allowFailure: true });
  }
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], { allowFailure: true });
  runAdb(['shell', 'am', 'force-stop', APP_ID], { allowFailure: true });
  runAdb(['shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`]);
  sleep(5000);
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], { allowFailure: true });
  runAdb(['shell', 'am', 'force-stop', APP_ID], { allowFailure: true });
}

function bootstrapAuthenticatedState() {
  const result = spawnSync(
    process.execPath,
    [path.resolve(__dirname, '..', '..', 'tools', 'appium', 'sanity.android.js')],
    {
      cwd: projectRoot,
      env: buildToolingEnv(),
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.error) {
    console.warn(
      '[run-maestro] Appium bootstrap errored; continuing because Maestro is the primary smoke gate.',
    );
    console.warn(result.error.message || result.error);
    return;
  }

  if (result.status !== 0) {
    console.warn(
      '[run-maestro] Appium bootstrap failed; continuing because Maestro handles the authenticated flow directly.',
    );
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

fs.mkdirSync(path.resolve(projectRoot, path.dirname(selectedSuite.output)), {
  recursive: true,
});

prewarmAndroidApp();
bootstrapAuthenticatedState();

const result = spawnSync('maestro', args, {
  cwd: projectRoot,
  env: buildToolingEnv(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}

process.exit(result.status || 0);
