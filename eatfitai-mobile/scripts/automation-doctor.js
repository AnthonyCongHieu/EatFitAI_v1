const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const projectRoot = path.resolve(__dirname, '..');
const appJsonPath = path.join(projectRoot, 'app.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const configPath = path.join(projectRoot, '.maestro', 'config.yaml');
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
const bundledMaestroBin = path.join(repoRoot, '_tooling', 'maestro', 'maestro', 'bin');

function resolveBundledExecutable(relativeSegments) {
  const candidate = path.join(repoRoot, ...relativeSegments);
  return fs.existsSync(candidate) ? candidate : null;
}

function buildToolingEnv() {
  const hasBundledJdk = fs.existsSync(bundledJdkBin);
  const pathParts = [
    hasBundledJdk ? bundledJdkBin : null,
    bundledAndroidPlatformTools,
    bundledAndroidEmulator,
    bundledAndroidCmdline,
    bundledMaestroBin,
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

function runCommand(command, args) {
  const ext = path.extname(command).toLowerCase();
  const isBatchFile = ext === '.bat' || ext === '.cmd';
  const useShell =
    !isBatchFile && !(path.isAbsolute(command) || command.includes(path.sep));
  const invocation =
    isBatchFile && process.platform === 'win32'
      ? {
          command: 'cmd.exe',
          args: ['/d', '/s', '/c', `"${command}" ${args.join(' ')}`],
        }
      : {
          command,
          args,
        };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: buildToolingEnv(),
    shell: process.platform === 'win32' ? useShell : false,
    timeout: 10000,
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

function packageDirectoryExists(packageName) {
  const packagePath = path.join(projectRoot, 'node_modules', ...packageName.split('/'));
  return fs.existsSync(packagePath);
}

function readDependencyInstallStatus() {
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(packageLockPath)) {
    return {
      status: 'FAIL',
      detail: 'Missing package.json or package-lock.json',
    };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const directDependencies = Object.keys(packageJson.dependencies || {});
  const missingPackages = directDependencies.filter(
    (packageName) => !packageDirectoryExists(packageName),
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

function main() {
  const checks = [];
  const bundledMaestro =
    resolveBundledExecutable(['_tooling', 'maestro', 'maestro', 'bin', 'maestro.bat']) ||
    resolveBundledExecutable(['_tooling', 'maestro', 'maestro', 'bin', 'maestro']);
  const maestro = runCommand('maestro', ['--version']);
  checks.push({
    name: 'Maestro CLI',
    status: maestro.ok ? 'OK' : 'FAIL',
    detail: maestro.ok
      ? `${maestro.stdout}${bundledMaestro ? ' (bundled)' : ''}`
      : maestro.stderr || maestro.error || 'maestro not found',
  });

  const appium = runCommand('appium', ['--version']);
  checks.push({
    name: 'Appium CLI',
    status: appium.ok ? 'OK' : 'FAIL',
    detail: appium.ok
      ? appium.stdout
      : appium.stderr || appium.error || 'appium not found',
  });

  const bundledAdb =
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb.exe']) ||
    resolveBundledExecutable(['_tooling', 'android-sdk', 'platform-tools', 'adb']);
  const adb = runCommand(bundledAdb || 'adb', ['devices']);
  if (adb.ok) {
    const deviceLines = adb.stdout
      .split(/\r?\n/)
      .slice(1)
      .filter((line) => line.trim());
    const activeDevices = deviceLines.filter((line) => /\tdevice$/.test(line));
    checks.push({
      name: 'ADB',
      status: 'OK',
      detail:
        activeDevices.length > 0
          ? `${activeDevices.length} device(s) connected.${bundledAdb ? ' Using bundled SDK adb.' : ''}`
          : `adb is available but no device is connected.${bundledAdb ? ' Using bundled SDK adb.' : ''}`,
    });
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
    name: 'Maestro workspace',
    status: fs.existsSync(configPath) ? 'OK' : 'FAIL',
    detail: fs.existsSync(configPath)
      ? '.maestro/config.yaml found.'
      : 'Missing .maestro/config.yaml',
  });

  checks.push({
    name: 'Node modules parity',
    ...readDependencyInstallStatus(),
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
    name: 'EAS project',
    ...readProjectIdStatus(),
  });

  checks.push({
    name: 'Production env contract',
    ...readProductionEnvStatus(),
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

main();
