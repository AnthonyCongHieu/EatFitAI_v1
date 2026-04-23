const { spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const APP_ID = 'com.eatfitai.app';
const suite = process.argv[2];
const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const appiumToolsRoot = path.resolve(repoRoot, 'tools', 'appium');
const suites = {
  smoke: {
    config: '.maestro/smoke.config.yaml',
    output: '.maestro/artifacts/smoke/junit.xml',
    bootstrapAuthenticatedState: true,
  },
  regression: {
    config: '.maestro/regression.config.yaml',
    output: '.maestro/artifacts/regression/junit.xml',
    bootstrapAuthenticatedState: true,
  },
  hero: {
    config: '.maestro/hero.config.yaml',
    output: '.maestro/artifacts/hero/junit.xml',
    bootstrapAuthenticatedState: true,
  },
  'auth-full': {
    flow: '.maestro/hero/auth-full.yaml',
    output: '.maestro/artifacts/hero/auth-full.junit.xml',
    bootstrapAuthenticatedState: false,
    clearAppData: true,
    loginEmailEnv: 'EATFITAI_DEMO_EMAIL',
    loginPasswordEnv: 'EATFITAI_DEMO_PASSWORD',
  },
  onboarding: {
    flow: '.maestro/hero/onboarding.yaml',
    output: '.maestro/artifacts/hero/onboarding.junit.xml',
    bootstrapAuthenticatedState: false,
    clearAppData: true,
    loginEmailEnv: 'EATFITAI_ONBOARDING_EMAIL',
    loginPasswordEnv: 'EATFITAI_ONBOARDING_PASSWORD',
  },
  'manual-diary': {
    flow: '.maestro/hero/manual-diary.yaml',
    output: '.maestro/artifacts/hero/manual-diary.junit.xml',
    bootstrapAuthenticatedState: true,
  },
  'ai-scan-save': {
    flow: '.maestro/hero/ai-scan-save.yaml',
    output: '.maestro/artifacts/hero/ai-scan-save.junit.xml',
    bootstrapAuthenticatedState: true,
  },
  nutrition: {
    flow: '.maestro/hero/nutrition.yaml',
    output: '.maestro/artifacts/hero/nutrition.junit.xml',
    bootstrapAuthenticatedState: true,
  },
  'voice-text': {
    flow: '.maestro/hero/voice-text.yaml',
    output: '.maestro/artifacts/hero/voice-text.junit.xml',
    bootstrapAuthenticatedState: true,
  },
  'profile-stats': {
    flow: '.maestro/hero/profile-stats.yaml',
    output: '.maestro/artifacts/hero/profile-stats.junit.xml',
    bootstrapAuthenticatedState: true,
  },
};

if (!suite || !suites[suite]) {
  console.error(
    'Usage: node scripts/run-maestro.js <smoke|regression|hero|auth-full|onboarding|manual-diary|ai-scan-save|nutrition|voice-text|profile-stats>',
  );
  process.exit(1);
}

function resolveBundledExecutable(relativeSegments) {
  const candidate = path.join(repoRoot, ...relativeSegments);
  return fs.existsSync(candidate) ? candidate : null;
}

function buildToolingEnv() {
  const bundledJdkHome = path.join(repoRoot, '_tooling', 'jdk-17');
  const bundledJdkBin = path.join(bundledJdkHome, 'bin');
  const hasBundledJdk = fs.existsSync(bundledJdkBin);
  const pathParts = [
    hasBundledJdk ? bundledJdkBin : null,
    path.join(repoRoot, '_tooling', 'android-sdk', 'platform-tools'),
    path.join(repoRoot, '_tooling', 'android-sdk', 'emulator'),
    path.join(repoRoot, '_tooling', 'android-sdk', 'cmdline-tools', 'latest', 'bin'),
    path.join(repoRoot, '_tooling', 'maestro', 'maestro', 'bin'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : null,
    process.env.PATH || '',
  ].filter(Boolean);

  const env = {
    ...process.env,
    ANDROID_SDK_ROOT: path.join(repoRoot, '_tooling', 'android-sdk'),
    ANDROID_AVD_HOME: path.join(repoRoot, '_tooling', 'android-avd'),
    ANDROID_USER_HOME: path.join(repoRoot, '_state', 'android-user-home'),
    PATH: pathParts.join(path.delimiter),
  };

  if (hasBundledJdk) {
    env.JAVA_HOME = bundledJdkHome;
  }

  return env;
}

function resolveGlobalCliExecutable(commandName) {
  if (process.platform !== 'win32' || !process.env.APPDATA) {
    return null;
  }

  const candidate = path.join(process.env.APPDATA, 'npm', `${commandName}.cmd`);
  return fs.existsSync(candidate) ? candidate : null;
}

function quoteWindowsShellArg(value) {
  const text = String(value).replace(/%/g, '%%');
  if (text.length === 0) {
    return '""';
  }

  return /[\s&()^|<>"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildWindowsBatchInvocation(command, args, env) {
  const hasPathSegment = path.isAbsolute(command) || command.includes(path.sep);
  const commandDir = hasPathSegment ? path.dirname(command) : null;
  const executable = hasPathSegment ? path.basename(command) : command;
  const commandLine = [executable, ...args].map(quoteWindowsShellArg).join(' ');
  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
    env: commandDir
      ? {
          ...env,
          PATH: [commandDir, env.PATH || ''].filter(Boolean).join(path.delimiter),
        }
      : env,
  };
}

function buildCommandInvocation(command, args, env) {
  const ext = path.extname(command).toLowerCase();
  const isBatchFile = process.platform === 'win32' && (ext === '.bat' || ext === '.cmd');
  return isBatchFile ? buildWindowsBatchInvocation(command, args, env) : { command, args, env };
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
  const useShell = !(path.isAbsolute(adbExecutable) || adbExecutable.includes(path.sep));
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

  return result;
}

function launchAndroidApp(startupDelayMs = 5000) {
  runAdb(['shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`]);
  if (startupDelayMs > 0) {
    sleep(startupDelayMs);
  }
}

function prepareAndroidApp(selectedSuite) {
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
  if (selectedSuite.clearAppData) {
    runAdb(['shell', 'pm', 'clear', APP_ID], { allowFailure: true });
  }
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], { allowFailure: true });
  runAdb(['shell', 'am', 'force-stop', APP_ID], { allowFailure: true });
  launchAndroidApp();
}

function bootstrapAuthenticatedState() {
  const webdriverioPath = path.join(appiumToolsRoot, 'node_modules', 'webdriverio');
  if (!fs.existsSync(webdriverioPath)) {
    console.warn(
      '[run-maestro] Appium workspace dependencies are missing; skipping optional bootstrap.',
    );
    return;
  }

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
      '[run-maestro] Optional Appium bootstrap errored; continuing because this Maestro lane is legacy/manual only.',
    );
    console.warn(result.error.message || result.error);
    return;
  }

  if (result.status !== 0) {
    console.warn(
      '[run-maestro] Optional Appium bootstrap failed; continuing because this Maestro lane can still run as an auxiliary diagnostic path.',
    );
  }
}

const selectedSuite = suites[suite];
const maestroTarget = selectedSuite.flow || '.maestro';
const args = ['test', maestroTarget];

if (selectedSuite.config) {
  args.push('--config', selectedSuite.config);
}

args.push('--format', 'JUNIT', '--output', selectedSuite.output);

const loginEmail = resolveEnv(selectedSuite.loginEmailEnv || 'EATFITAI_DEMO_EMAIL');
const loginPassword = resolveEnv(
  selectedSuite.loginPasswordEnv || 'EATFITAI_DEMO_PASSWORD',
);

if (loginEmail) {
  args.push('-e', `LOGIN_EMAIL=${loginEmail}`);
}

if (loginPassword) {
  args.push('-e', `LOGIN_PASSWORD=${loginPassword}`);
}

const forwardIfPresent = [
  'EATFITAI_DEMO_EMAIL',
  'EATFITAI_DEMO_PASSWORD',
  'EATFITAI_ONBOARDING_EMAIL',
  'EATFITAI_ONBOARDING_PASSWORD',
];
for (const key of forwardIfPresent) {
  const value = resolveEnv(key);
  if (value) {
    args.push('-e', `${key}=${value}`);
  }
}

function readAppiumServerConfig() {
  const rawPort = Number.parseInt(String(resolveEnv('APPIUM_PORT') || '4723').trim(), 10);
  return {
    host: String(resolveEnv('APPIUM_HOST') || '127.0.0.1').trim(),
    port: Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 4723,
  };
}

function readMetroServerConfig() {
  const rawPort = Number.parseInt(String(resolveEnv('RCT_METRO_PORT') || '8081').trim(), 10);
  return {
    host: '127.0.0.1',
    port: Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 8081,
  };
}

function readInstalledAndroidBuildMode() {
  const result = runAdb(['shell', 'dumpsys', 'package', APP_ID], { allowFailure: true });
  const packageDump = `${result.stdout || ''}\n${result.stderr || ''}`;

  if (!packageDump.trim()) {
    return 'unknown';
  }

  return /\bDEBUGGABLE\b/.test(packageDump) ? 'debug' : 'release';
}

function readAndroidSystemProperty(propertyName) {
  const result = runAdb(['shell', 'getprop', propertyName], { allowFailure: true });
  return String(result.stdout || '').trim();
}

function readAndroidInstallPolicyHint() {
  const manufacturer = readAndroidSystemProperty('ro.product.manufacturer');
  const miuiVersion = readAndroidSystemProperty('ro.miui.ui.version.name');
  const devicePolicy = runAdb(['shell', 'dumpsys', 'device_policy'], { allowFailure: true });
  const combinedPolicy = `${devicePolicy.stdout || ''}\n${devicePolicy.stderr || ''}`;
  const deviceOwnerMatch = combinedPolicy.match(/Device Owner:\s*(.+)/i);
  const profileOwnerMatch = combinedPolicy.match(/Profile Owner \(User \d+\):\s*(.+)/i);
  const ownerSummary = [deviceOwnerMatch?.[1], profileOwnerMatch?.[1]]
    .filter(Boolean)
    .join('; ');

  return {
    manufacturer,
    miuiVersion,
    ownerSummary,
  };
}

function readRequireReleaseLikeBuild() {
  const value = String(resolveEnv('EATFITAI_REQUIRE_RELEASE_LIKE_BUILD') || '')
    .trim()
    .toLowerCase();
  return value === '1' || value === 'true';
}

function readSkipMaestroBootstrap() {
  const value = String(resolveEnv('EATFITAI_SKIP_MAESTRO_BOOTSTRAP') || '')
    .trim()
    .toLowerCase();
  return value === '1' || value === 'true';
}

function isTcpServerReachable(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (reachable) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function printProcessOutput(result) {
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }
}

function explainKnownMaestroFailure(result) {
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;

  if (combinedOutput.includes('INSTALL_FAILED_USER_RESTRICTED')) {
    const installPolicyHint = readAndroidInstallPolicyHint();
    const oemHint = installPolicyHint.miuiVersion
      ? `Detected ${installPolicyHint.manufacturer || 'Xiaomi'} ${installPolicyHint.miuiVersion}. On MIUI, enable "Install via USB" and "USB debugging (Security settings)", keep the device unlocked, and accept any install confirmation prompt before retrying.`
      : installPolicyHint.ownerSummary
        ? `Device policy owner detected: ${installPolicyHint.ownerSummary}. Managed-device policy may be blocking helper APK installs over ADB.`
        : 'The device is likely blocking helper APK installs over ADB until the device is unlocked and USB/ADB install permissions are granted.';
    console.error(
      `[run-maestro] Device is blocking ADB helper APK installs for Maestro/Appium helpers. ${oemHint}`,
    );
  }
}

async function main() {
  fs.mkdirSync(path.resolve(projectRoot, path.dirname(selectedSuite.output)), {
    recursive: true,
  });

  prepareAndroidApp(selectedSuite);
  const installedBuildMode = readInstalledAndroidBuildMode();
  const requireReleaseLikeBuild = readRequireReleaseLikeBuild();
  if (requireReleaseLikeBuild && installedBuildMode !== 'release') {
    console.error(
      `[run-maestro] Release-like lane requires a non-debuggable Android build, but the installed app is '${installedBuildMode}'. Install the preview/release APK first.`,
    );
    process.exit(1);
  }
  const installPolicyHint = readAndroidInstallPolicyHint();
  if (installPolicyHint.miuiVersion) {
    console.warn(
      `[run-maestro] Detected ${installPolicyHint.manufacturer || 'Xiaomi'} ${installPolicyHint.miuiVersion}. If helper APK install fails, verify "Install via USB" and "USB debugging (Security settings)" on the unlocked device.`,
    );
  } else if (installPolicyHint.ownerSummary) {
    console.warn(
      `[run-maestro] Device policy owner detected (${installPolicyHint.ownerSummary}). Managed-device policy may block helper APK installs over ADB.`,
    );
  }
  if (installedBuildMode === 'debug') {
    const metroServer = readMetroServerConfig();
    const metroServerReachable = await isTcpServerReachable(
      metroServer.host,
      metroServer.port,
      1500,
    );

    if (!metroServerReachable) {
      console.error(
        `[run-maestro] Installed Android app is a debug build and requires Metro at http://${metroServer.host}:${metroServer.port}/ before Maestro can proceed.`,
      );
      process.exit(1);
    }
  }

  if (selectedSuite.bootstrapAuthenticatedState !== false) {
    const appiumServer = readAppiumServerConfig();
    const appiumServerReachable = await isTcpServerReachable(
      appiumServer.host,
      appiumServer.port,
    );
    const skipMaestroBootstrap = readSkipMaestroBootstrap();

    if (skipMaestroBootstrap) {
      console.warn(
        '[run-maestro] Skipping optional Appium bootstrap because EATFITAI_SKIP_MAESTRO_BOOTSTRAP is enabled.',
      );
    } else if (appiumServerReachable) {
      bootstrapAuthenticatedState();
    } else {
      console.warn(
        `[run-maestro] Appium server is not reachable at http://${appiumServer.host}:${appiumServer.port}/; skipping optional bootstrap.`,
      );
    }
  }

  const maestroExecutable =
    resolveBundledExecutable(['_tooling', 'maestro', 'maestro', 'bin', 'maestro.bat']) ||
    resolveBundledExecutable(['_tooling', 'maestro', 'maestro', 'bin', 'maestro']) ||
    resolveGlobalCliExecutable('maestro') ||
    'maestro';
  const env = buildToolingEnv();
  const invocation = buildCommandInvocation(maestroExecutable, args, env);
  const useShell =
    process.platform === 'win32' &&
    invocation.command === maestroExecutable &&
    !(path.isAbsolute(maestroExecutable) || maestroExecutable.includes(path.sep));
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    env: invocation.env,
    encoding: 'utf8',
    shell: useShell,
  });

  printProcessOutput(result);
  if ((result.status || 0) !== 0) {
    explainKnownMaestroFailure(result);
  }

  if (result.error) {
    console.error(result.error.message || result.error);
    process.exit(1);
  }

  process.exit(result.status || 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
