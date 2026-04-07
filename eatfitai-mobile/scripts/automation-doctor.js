const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const projectRoot = path.resolve(__dirname, '..');
const appJsonPath = path.join(projectRoot, 'app.json');
const configPath = path.join(projectRoot, '.maestro', 'config.yaml');

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
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
      detail: 'EAS projectId is still a placeholder. Set EXPO_EAS_PROJECT_ID before EAS builds.',
    };
  }

  return {
    status: 'OK',
    detail: `Using app.json projectId ${configuredProjectId}.`,
  };
}

function printCheck(name, status, detail) {
  console.log(`${status.padEnd(5)} ${name}${detail ? ` - ${detail}` : ''}`);
}

function main() {
  const checks = [];
  const maestro = runCommand('maestro', ['--version']);
  checks.push({
    name: 'Maestro CLI',
    status: maestro.ok ? 'OK' : 'FAIL',
    detail: maestro.ok ? maestro.stdout : maestro.stderr || maestro.error || 'maestro not found',
  });

  const appium = runCommand('appium', ['--version']);
  checks.push({
    name: 'Appium CLI',
    status: appium.ok ? 'OK' : 'FAIL',
    detail: appium.ok ? appium.stdout : appium.stderr || appium.error || 'appium not found',
  });

  const adb = runCommand('adb', ['devices']);
  if (adb.ok) {
    const deviceLines = adb.stdout
      .split(/\r?\n/)
      .slice(1)
      .filter((line) => line.trim());
    const activeDevices = deviceLines.filter((line) => /\tdevice$/.test(line));
    checks.push({
      name: 'ADB',
      status: 'OK',
      detail: activeDevices.length > 0 ? `${activeDevices.length} device(s) connected.` : 'adb is available but no device is connected.',
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
    detail: fs.existsSync(configPath) ? '.maestro/config.yaml found.' : 'Missing .maestro/config.yaml',
  });

  checks.push({
    name: 'Demo credentials',
    status: resolveEnv('EATFITAI_DEMO_EMAIL') && resolveEnv('EATFITAI_DEMO_PASSWORD') ? 'OK' : 'WARN',
    detail:
      resolveEnv('EATFITAI_DEMO_EMAIL') && resolveEnv('EATFITAI_DEMO_PASSWORD')
        ? 'EATFITAI_DEMO_EMAIL and EATFITAI_DEMO_PASSWORD are available.'
        : 'Authenticated flows need EATFITAI_DEMO_EMAIL and EATFITAI_DEMO_PASSWORD.',
  });

  checks.push({
    name: 'EAS project',
    ...readProjectIdStatus(),
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
