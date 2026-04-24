const { spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const projectRoot = path.resolve(__dirname, '..');
const appJsonPath = path.join(projectRoot, 'app.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const repoRoot = path.resolve(projectRoot, '..');
const bundledJdkHome = path.join(repoRoot, '_tooling', 'jdk-17');
const bundledJdkBin = path.join(bundledJdkHome, 'bin');
const bundledAndroidCmdline = path.join(
  repoRoot,
  '_tooling',
  'android-sdk',
  'cmdline-tools',
  'latest',
  'bin',
);
const bundledAndroidPlatformTools = path.join(
  repoRoot,
  '_tooling',
  'android-sdk',
  'platform-tools',
);
const bundledAndroidEmulator = path.join(repoRoot, '_tooling', 'android-sdk', 'emulator');
const APP_ID = 'com.eatfitai.app';

function resolveBundledExecutable(relativeSegments) {
  const candidate = path.join(repoRoot, ...relativeSegments);
  return fs.existsSync(candidate) ? candidate : null;
}

function resolveGlobalCliExecutable(commandName) {
  if (process.platform !== 'win32' || !process.env.APPDATA) {
    return null;
  }

  const candidate = path.join(process.env.APPDATA, 'npm', `${commandName}.cmd`);
  return fs.existsSync(candidate) ? candidate : null;
}

function buildToolingEnv() {
  const hasBundledJdk = fs.existsSync(bundledJdkBin);
  const androidSerial = resolveEnv('ANDROID_SERIAL');
  const pathParts = [
    hasBundledJdk ? bundledJdkBin : null,
    bundledAndroidPlatformTools,
    bundledAndroidEmulator,
    bundledAndroidCmdline,
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

  if (androidSerial) {
    env.ANDROID_SERIAL = androidSerial.trim();
  }

  if (hasBundledJdk) {
    env.JAVA_HOME = bundledJdkHome;
  }

  return env;
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

function buildWindowsCommandInvocation(command, args, env) {
  const hasPathSegment = path.isAbsolute(command) || command.includes(path.sep);
  if (hasPathSegment) {
    return { command, args, env };
  }

  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].map(quoteWindowsShellArg).join(' ')],
    env,
  };
}

function runCommand(command, args, timeoutMs = 10000) {
  const env = buildToolingEnv();
  const ext = path.extname(command).toLowerCase();
  const isBatchFile = ext === '.bat' || ext === '.cmd';
  const invocation =
    process.platform === 'win32' && isBatchFile
      ? buildWindowsBatchInvocation(command, args, env)
      : process.platform === 'win32'
        ? buildWindowsCommandInvocation(command, args, env)
        : { command, args, env };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: invocation.env,
    shell: false,
    timeout: timeoutMs,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function readProjectIdStatus() {
  const raw = fs.readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(raw);
  const configuredProjectId = appJson?.expo?.extra?.eas?.projectId;
  const envProjectId = resolveEnv('EXPO_EAS_PROJECT_ID') || resolveEnv('EAS_PROJECT_ID');

  if (envProjectId) {
    return {
      status: 'OK',
      detail: 'EXPO_EAS_PROJECT_ID is set for EAS builds.',
    };
  }

  if (!configuredProjectId || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(configuredProjectId)) {
    return {
      status: 'WARN',
      detail:
        'EAS projectId is still a placeholder. Set EXPO_EAS_PROJECT_ID before EAS builds.',
    };
  }

  return {
    status: 'OK',
    detail: `Using app.json projectId ${configuredProjectId}.`,
  };
}

function readBuildProfile() {
  return (
    resolveEnv('APP_ENV') ||
    resolveEnv('EAS_BUILD_PROFILE') ||
    resolveEnv('NODE_ENV') ||
    'development'
  ).trim();
}

function isProductionLikeBuild(profile) {
  return ['production', 'preview', 'staging'].includes(profile);
}

function readProductionEnvStatus() {
  const profile = readBuildProfile();
  const requiredVars = [
    'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  ];

  const missing = requiredVars.filter((name) => {
    const value = resolveEnv(name);
    return !value || value.trim().startsWith('YOUR_');
  });

  if (!isProductionLikeBuild(profile)) {
    return {
      status: 'OK',
      detail: `Current profile is ${profile}; production env contract is not required for this run.`,
    };
  }

  if (missing.length > 0) {
    return {
      status: 'FAIL',
      detail: `Missing production-like env: ${missing.join(', ')}`,
    };
  }

  return {
    status: 'OK',
    detail: `Production-like env is complete for profile ${profile}.`,
  };
}

function packageDirectoryExists(rootDir, packageName) {
  const packagePath = path.join(rootDir, 'node_modules', ...packageName.split('/'));
  return fs.existsSync(packagePath);
}

function readDependencyInstallStatus(rootDir, packageJsonFile, packageLockFile) {
  if (!fs.existsSync(packageJsonFile) || !fs.existsSync(packageLockFile)) {
    return {
      status: 'FAIL',
      detail: 'Missing package.json or package-lock.json',
    };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
  const directDependencies = Object.keys(packageJson.dependencies || {});
  const missingPackages = directDependencies.filter(
    (packageName) => !packageDirectoryExists(rootDir, packageName),
  );

  if (missingPackages.length > 0) {
    return {
      status: 'FAIL',
      detail: `Missing installed dependency directories: ${missingPackages.join(', ')}`,
    };
  }

  return {
    status: 'OK',
    detail: `${directDependencies.length} direct dependencies are present in node_modules.`,
  };
}

function printCheck(name, status, detail) {
  console.log(`${status.padEnd(5)} ${name}${detail ? ` - ${detail}` : ''}`);
}

function readRequireReleaseLikeBuild() {
  return String(resolveEnv('EATFITAI_REQUIRE_RELEASE_LIKE_BUILD') || '')
    .trim()
    .toLowerCase() === '1' || String(resolveEnv('EATFITAI_REQUIRE_RELEASE_LIKE_BUILD') || '')
    .trim()
    .toLowerCase() === 'true';
}

function readRequireAndroidEmulator() {
  return String(resolveEnv('EATFITAI_REQUIRE_ANDROID_EMULATOR') || '')
    .trim()
    .toLowerCase() === '1' || String(resolveEnv('EATFITAI_REQUIRE_ANDROID_EMULATOR') || '')
    .trim()
    .toLowerCase() === 'true';
}

function readAndroidTargetMode() {
  const rawMode = String(
    resolveEnv('EATFITAI_ANDROID_TARGET') || resolveEnv('EATFITAI_ANDROID_TARGET_MODE') || '',
  )
    .trim()
    .toLowerCase();

  if (['emulator', 'avd'].includes(rawMode)) {
    return 'emulator';
  }

  if (['real', 'real-device', 'device', 'usb'].includes(rawMode)) {
    return 'real-device';
  }

  return '';
}

function readMetroServerConfig() {
  const rawPort = Number.parseInt(String(resolveEnv('RCT_METRO_PORT') || '8081').trim(), 10);
  return {
    host: '127.0.0.1',
    port: Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 8081,
  };
}

function readInstalledAndroidBuildStatus(adbExecutable) {
  const dumpsys = runCommand(adbExecutable, ['shell', 'dumpsys', 'package', APP_ID]);
  if (!dumpsys.ok) {
    return {
      status: 'WARN',
      mode: 'unknown',
      requiresMetro: false,
      detail: dumpsys.stderr || dumpsys.error || `Unable to inspect installed package ${APP_ID}.`,
    };
  }

  const packageDump = `${dumpsys.stdout}\n${dumpsys.stderr}`;
  const debuggable = /\bDEBUGGABLE\b/.test(packageDump);

  return {
    status: 'OK',
    mode: debuggable ? 'debug' : 'release',
    requiresMetro: debuggable,
    detail: debuggable
      ? `${APP_ID} is installed as a debuggable build. Metro is required on port 8081.`
      : `${APP_ID} is installed as a non-debuggable build. Metro is optional.`,
  };
}

function readAndroidSystemProperty(adbExecutable, propertyName) {
  const result = runCommand(adbExecutable, ['shell', 'getprop', propertyName]);
  if (!result.ok) {
    return '';
  }

  return result.stdout.trim();
}

function readAndroidInstallPolicyHint(adbExecutable) {
  const manufacturer = readAndroidSystemProperty(adbExecutable, 'ro.product.manufacturer');
  const miuiVersion = readAndroidSystemProperty(adbExecutable, 'ro.miui.ui.version.name');
  const devicePolicy = runCommand(adbExecutable, ['shell', 'dumpsys', 'device_policy']);
  const deviceOwnerMatch = `${devicePolicy.stdout}\n${devicePolicy.stderr}`.match(
    /Device Owner:\s*(.+)/i,
  );
  const profileOwnerMatch = `${devicePolicy.stdout}\n${devicePolicy.stderr}`.match(
    /Profile Owner \(User \d+\):\s*(.+)/i,
  );
  const ownerSummary = [deviceOwnerMatch?.[1], profileOwnerMatch?.[1]]
    .filter(Boolean)
    .join('; ');

  if (miuiVersion) {
    return {
      status: 'WARN',
      detail: `Detected ${manufacturer || 'Xiaomi'} ${miuiVersion}. Enable "USB debugging" and "USB debugging (Security settings)" on the unlocked device so ADB input can tap and type reliably.${ownerSummary ? ` Device policy owner: ${ownerSummary}.` : ''}`,
    };
  }

  if (ownerSummary) {
    return {
      status: 'WARN',
      detail: `Device policy owner detected: ${ownerSummary}. Managed devices may block helper APK installs over ADB.`,
    };
  }

  return {
    status: 'OK',
    detail: manufacturer
      ? `${manufacturer} device detected. No OEM install-policy warning was inferred.`
      : 'No Android install-policy warning was inferred.',
  };
}

function resolveScrcpyExecutable() {
  const command = resolveGlobalCliExecutable('scrcpy');
  if (command) {
    return command;
  }

  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const wingetPackages = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetPackages)) {
      const result = spawnSync(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-Command',
          `Get-ChildItem -LiteralPath '${wingetPackages.replace(/'/g, "''")}' -Recurse -Filter scrcpy.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`,
        ],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          shell: false,
        },
      );
      const found = (result.stdout || '').trim();
      if (found) {
        return found;
      }
    }
  }

  return 'scrcpy';
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

async function main() {
  const checks = [];
  const requireReleaseLikeBuild = readRequireReleaseLikeBuild();
  const requireAndroidEmulator = readRequireAndroidEmulator();
  const androidTargetMode = readAndroidTargetMode();

  const scrcpyExecutable = resolveScrcpyExecutable();
  const scrcpy = runCommand(scrcpyExecutable, ['--version'], 30000);
  checks.push({
    name: 'scrcpy',
    status: scrcpy.ok ? 'OK' : 'WARN',
    detail: scrcpy.ok
      ? scrcpy.stdout.split(/\r?\n/)[0]
      : 'scrcpy not found. Install with: winget install --id Genymobile.scrcpy -e',
  });

  const bundledAdb =
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb.exe']) ||
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb']);
  const adb = runCommand(bundledAdb || 'adb', ['devices']);
  let activeDevices = [];
  let installedBuild = null;
  if (adb.ok) {
    const deviceLines = adb.stdout
      .split(/\r?\n/)
      .slice(1)
      .filter((line) => line.trim());
    activeDevices = deviceLines.filter((line) => /\tdevice$/.test(line));
    checks.push({
      name: 'ADB',
      status: 'OK',
      detail:
        activeDevices.length > 0
          ? `${activeDevices.length} device(s) connected.${bundledAdb ? ' Using bundled SDK adb.' : ''}`
          : `adb is available but no device is connected.${bundledAdb ? ' Using bundled SDK adb.' : ''}`,
    });

    if (activeDevices.length > 0) {
      if (requireAndroidEmulator || androidTargetMode === 'emulator') {
        const androidSerial = String(resolveEnv('ANDROID_SERIAL') || '').trim();
        const qemu = androidSerial ? readAndroidSystemProperty(bundledAdb || 'adb', 'ro.kernel.qemu') : '';
        checks.push({
          name: 'Android emulator target',
          status: /^emulator-\d+$/.test(androidSerial) && qemu === '1' ? 'OK' : 'FAIL',
          detail:
            /^emulator-\d+$/.test(androidSerial) && qemu === '1'
              ? `Pinned to emulator target ${androidSerial}.`
              : 'Gate requires ANDROID_SERIAL to point at an online emulator-* device with ro.kernel.qemu=1.',
        });
      }

      if (androidTargetMode === 'real-device') {
        const androidSerial = String(resolveEnv('ANDROID_SERIAL') || '').trim();
        const qemu = androidSerial ? readAndroidSystemProperty(bundledAdb || 'adb', 'ro.kernel.qemu') : '';
        checks.push({
          name: 'Android real-device target',
          status: androidSerial && !/^emulator-\d+$/.test(androidSerial) && qemu !== '1' ? 'OK' : 'FAIL',
          detail:
            androidSerial && !/^emulator-\d+$/.test(androidSerial) && qemu !== '1'
              ? `Pinned to real Android target ${androidSerial}.`
              : 'Real-device gate requires ANDROID_SERIAL to point at a non-emulator adb device.',
        });
      }

      installedBuild = readInstalledAndroidBuildStatus(bundledAdb || 'adb');
      checks.push({
        name: 'Installed Android build',
        status:
          requireReleaseLikeBuild && installedBuild.mode === 'debug'
            ? 'FAIL'
            : installedBuild.status,
        detail:
          requireReleaseLikeBuild && installedBuild.mode === 'debug'
            ? `${installedBuild.detail} Release-like gate requires a non-debuggable Android build.`
            : installedBuild.detail,
      });

      checks.push({
        name: 'Android install policy',
        ...readAndroidInstallPolicyHint(bundledAdb || 'adb'),
      });

      const uiDump = runCommand(bundledAdb || 'adb', [
        'shell',
        'uiautomator',
        'dump',
        '/sdcard/eatfitai-doctor-ui.xml',
      ], 30000);
      checks.push({
        name: 'UIAutomator dump',
        status: uiDump.ok ? 'OK' : 'WARN',
        detail: uiDump.ok
          ? 'UI tree can be captured.'
          : uiDump.stderr || uiDump.stdout || uiDump.error || 'UI tree capture failed; screenshot/logcat lane can still run.',
      });
      runCommand(bundledAdb || 'adb', ['shell', 'rm', '/sdcard/eatfitai-doctor-ui.xml']);

      const screencap = runCommand(bundledAdb || 'adb', [
        'shell',
        'screencap',
        '-p',
        '/sdcard/eatfitai-doctor.png',
      ]);
      checks.push({
        name: 'screencap',
        status: screencap.ok ? 'OK' : 'FAIL',
        detail: screencap.ok
          ? 'Device screenshot command works.'
          : screencap.stderr || screencap.error || 'screencap failed',
      });
      runCommand(bundledAdb || 'adb', ['shell', 'rm', '/sdcard/eatfitai-doctor.png']);

      const screenrecord = runCommand(bundledAdb || 'adb', [
        'shell',
        'screenrecord',
        '--help',
      ]);
      checks.push({
        name: 'screenrecord',
        status: screenrecord.ok || screenrecord.stdout || screenrecord.stderr ? 'OK' : 'WARN',
        detail: 'Use device probe/auth-entry with --record when video evidence is needed.',
      });
    }
  } else {
    checks.push({
      name: 'ADB',
      status: 'FAIL',
      detail: adb.stderr || adb.error || 'adb not found',
    });
  }

  const eas = runCommand('eas', ['--version']);
  checks.push({
    name: 'EAS CLI',
    status: eas.ok ? 'OK' : 'WARN',
    detail: eas.ok ? eas.stdout : eas.stderr || eas.error || 'Unable to execute EAS CLI',
  });

  checks.push({
    name: 'Node modules parity',
    ...readDependencyInstallStatus(projectRoot, packageJsonPath, packageLockPath),
  });

  checks.push({
    name: 'Demo credentials',
    status:
      resolveEnv('EATFITAI_DEMO_EMAIL') && resolveEnv('EATFITAI_DEMO_PASSWORD')
        ? 'OK'
        : 'WARN',
    detail:
      resolveEnv('EATFITAI_DEMO_EMAIL') && resolveEnv('EATFITAI_DEMO_PASSWORD')
        ? 'EATFITAI_DEMO_EMAIL and EATFITAI_DEMO_PASSWORD are available.'
        : 'Authenticated flows need EATFITAI_DEMO_EMAIL and EATFITAI_DEMO_PASSWORD.',
  });

  checks.push({
    name: 'Render API key',
    status: resolveEnv('RENDER_API_KEY') ? 'OK' : 'WARN',
    detail: resolveEnv('RENDER_API_KEY')
      ? 'RENDER_API_KEY is available for cloud release verification.'
      : 'Cloud release verification needs RENDER_API_KEY.',
  });

  checks.push({
    name: 'EAS project',
    ...readProjectIdStatus(),
  });

  checks.push({
    name: 'Production env contract',
    ...readProductionEnvStatus(),
  });

  const metroServer = readMetroServerConfig();
  const metroServerReachable = await isTcpServerReachable(metroServer.host, metroServer.port);
  const metroRequired = installedBuild?.requiresMetro === true;
  checks.push({
    name: 'Metro server',
    status: metroRequired ? (metroServerReachable ? 'OK' : 'FAIL') : metroServerReachable ? 'OK' : 'WARN',
    detail: metroServerReachable
      ? `Listening at http://${metroServer.host}:${metroServer.port}/`
      : metroRequired
        ? `Debug Android build on device requires Metro at http://${metroServer.host}:${metroServer.port}/.`
        : `Not reachable at http://${metroServer.host}:${metroServer.port}/. Release-like Android builds can still run without Metro.`,
  });

  console.log('EatFitAI automation doctor');
  console.log(`Project root: ${projectRoot}`);
  console.log('');

  for (const check of checks) {
    printCheck(check.name, check.status, check.detail);
  }

  const hasFailure = checks.some((check) => check.status === 'FAIL');
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
