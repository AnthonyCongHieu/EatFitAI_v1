const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');
const {
  REQUIRED_RC_DEVICE_MODES,
  evaluateRcDeviceReports,
  evaluateSingleReport,
} = require('./lib/device-rc-evidence');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(repoRoot, '_logs', 'real-device-adb');
const DEFAULT_BACKEND_URL = 'https://eatfitai-backend-dev.onrender.com';

function trim(value) {
  return String(value || '').trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function redact(value) {
  return String(value || '').replace(
    /(password|token|authorization)(["'=:\s]+)([^"',\s]+)/gi,
    '$1$2<redacted>',
  );
}

function buildEnv() {
  const env = { ...process.env };
  const demoEmail = trim(resolveEnv('EATFITAI_DEMO_EMAIL'));
  const demoPassword = trim(resolveEnv('EATFITAI_DEMO_PASSWORD'));
  const deviceEmail = trim(resolveEnv('EATFITAI_DEVICE_LOGIN_EMAIL')) || demoEmail;
  const devicePassword = trim(resolveEnv('EATFITAI_DEVICE_LOGIN_PASSWORD')) || demoPassword;
  const deviceBackendUrl =
    trim(resolveEnv('EATFITAI_DEVICE_BACKEND_URL')) ||
    trim(resolveEnv('EATFITAI_SMOKE_BACKEND_URL')) ||
    DEFAULT_BACKEND_URL;

  if (demoEmail) {
    env.EATFITAI_DEMO_EMAIL = demoEmail;
  }
  if (demoPassword) {
    env.EATFITAI_DEMO_PASSWORD = demoPassword;
  }
  if (deviceEmail) {
    env.EATFITAI_DEVICE_LOGIN_EMAIL = deviceEmail;
  }
  if (devicePassword) {
    env.EATFITAI_DEVICE_LOGIN_PASSWORD = devicePassword;
  }
  env.EATFITAI_ANDROID_TARGET =
    trim(resolveEnv('EATFITAI_ANDROID_TARGET')) || env.EATFITAI_ANDROID_TARGET || 'real-device';
  env.EATFITAI_DEVICE_BACKEND_URL = deviceBackendUrl;

  return env;
}

function parseOutputDir(stdout) {
  return (
    String(stdout || '')
      .split(/\r?\n/)
      .map(trim)
      .find((line) => line.startsWith('REAL_DEVICE_ADB_OUTPUT_DIR='))
      ?.slice('REAL_DEVICE_ADB_OUTPUT_DIR='.length) || ''
  );
}

function readReportForOutput(outputDir) {
  const reportPath = outputDir ? path.join(outputDir, 'report.json') : '';
  if (!reportPath || !fs.existsSync(reportPath)) {
    return null;
  }

  return {
    ...JSON.parse(fs.readFileSync(reportPath, 'utf8')),
    path: reportPath,
    reportPath,
    mtimeMs: fs.statSync(reportPath).mtimeMs,
  };
}

function runMode(mode, env) {
  const result = spawnSync(process.execPath, [path.join('scripts', 'real-device-adb-flow.js'), mode], {
    cwd: mobileRoot,
    env,
    encoding: 'utf8',
    shell: false,
    timeout: 30 * 60 * 1000,
  });
  const stdout = trim(result.stdout);
  const stderr = trim(result.stderr);
  const outputDir = parseOutputDir(stdout);
  const report = readReportForOutput(outputDir);
  const evaluation = report
    ? evaluateSingleReport(report)
    : {
        mode,
        passed: false,
        failures: ['missing-report'],
      };

  return {
    mode,
    command: `node scripts/real-device-adb-flow.js ${mode}`,
    ok: result.status === 0,
    exitCode: result.status,
    outputDir,
    reportPath: report?.reportPath || '',
    evaluation,
    stdout: redact(stdout),
    stderr: redact(stderr),
    error: result.error ? redact(result.error.message || String(result.error)) : '',
    report,
  };
}

function main() {
  const env = buildEnv();
  const outputDir = path.join(outputRoot, `${stamp()}-rc-proof`);
  fs.mkdirSync(outputDir, { recursive: true });
  const commands = [];
  const childReports = [];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'rc-proof',
    outputDir,
    requiredModes: REQUIRED_RC_DEVICE_MODES,
    credentials: {
      deviceLoginEmailPresent: Boolean(trim(env.EATFITAI_DEVICE_LOGIN_EMAIL)),
      deviceLoginPasswordPresent: Boolean(trim(env.EATFITAI_DEVICE_LOGIN_PASSWORD)),
      source: trim(env.EATFITAI_DEVICE_LOGIN_EMAIL)
        ? 'EATFITAI_DEVICE_LOGIN_EMAIL/EATFITAI_DEVICE_LOGIN_PASSWORD'
        : '',
    },
    commands,
    childReportPaths: [],
    summary: {},
    authenticated: false,
    status: 'fail',
    passed: false,
  };
  const reportPath = path.join(outputDir, 'report.json');

  try {
    if (!trim(env.EATFITAI_DEVICE_LOGIN_EMAIL) || !trim(env.EATFITAI_DEVICE_LOGIN_PASSWORD)) {
      throw new Error(
        'Missing EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD or EATFITAI_DEVICE_LOGIN_EMAIL/EATFITAI_DEVICE_LOGIN_PASSWORD.',
      );
    }

    for (const mode of REQUIRED_RC_DEVICE_MODES) {
      const command = runMode(mode, env);
      commands.push({
        mode: command.mode,
        command: command.command,
        ok: command.ok,
        exitCode: command.exitCode,
        outputDir: command.outputDir,
        reportPath: command.reportPath,
        evaluation: command.evaluation,
        stdout: command.stdout,
        stderr: command.stderr,
        error: command.error,
      });

      if (command.report) {
        childReports.push(command.report);
        report.childReportPaths.push(command.reportPath);
      }

      if (mode === 'login-real' && !command.evaluation.passed) {
        throw new Error(
          `login-real did not prove authenticated Home. Failures=${command.evaluation.failures.join(', ')}`,
        );
      }

      if (!command.evaluation.passed) {
        throw new Error(`${mode} failed RC proof. Failures=${command.evaluation.failures.join(', ')}`);
      }
    }

    const summary = evaluateRcDeviceReports(childReports);
    report.summary = summary;
    report.authenticated = summary.modeResults['login-real']?.authenticated === true;
    report.status = summary.passed ? 'pass' : 'fail';
    report.passed = summary.passed;
    writeJson(reportPath, report);

    if (!summary.passed) {
      throw new Error(
        `Android RC proof failed. Missing=${summary.missingModes.join(', ')} Failed=${summary.failedModes.join(', ')}`,
      );
    }

    console.log(`Android RC proof passed. Evidence: ${reportPath}`);
  } catch (error) {
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
    };
    writeJson(reportPath, report);
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`Android RC proof evidence: ${reportPath}`);
    process.exit(1);
  }
}

main();
