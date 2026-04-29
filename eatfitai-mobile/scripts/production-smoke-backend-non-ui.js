const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  buildBackendNonUiSummary,
} = require('./lib/backend-non-ui-summary');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_ROOT = path.resolve(repoRoot, '_logs', 'production-smoke');

function trim(value) {
  return String(value || '').trim();
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUTPUT_ROOT, stamp);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function commandName(name) {
  if (process.platform === 'win32' && ['npm', 'npx'].includes(name)) {
    return `${name}.cmd`;
  }

  return name;
}

function runCommand(label, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(commandName(command), args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeoutMs || 60 * 60 * 1000,
  });

  return {
    label,
    command: `${command} ${args.join(' ')}`.trim(),
    cwd: options.cwd || repoRoot,
    durationMs: Date.now() - startedAt,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trim(result.stdout),
    stderr: trim(result.stderr),
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function buildBaseEnv(outputDir) {
  return {
    ...process.env,
    EATFITAI_SMOKE_OUTPUT_DIR: outputDir,
  };
}

function gateFromReport(name, report) {
  return {
    name,
    passed: Boolean(report?.passed),
    failures: Array.isArray(report?.failures) ? report.failures : [],
  };
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  fs.mkdirSync(outputDir, { recursive: true });
  const env = buildBaseEnv(outputDir);
  const commandResults = [];

  const preflightStep = {
    label: 'preflight',
    command: 'node',
    args: [path.join(mobileRoot, 'scripts', 'production-smoke-preflight.js'), outputDir],
    cwd: mobileRoot,
    reportPath: path.join(outputDir, 'preflight-results.json'),
  };
  const writeSteps = [
    {
      label: 'auth-api',
      command: 'node',
      args: [path.join(mobileRoot, 'scripts', 'production-smoke-auth-api.js'), outputDir],
      cwd: mobileRoot,
      reportPath: path.join(outputDir, 'auth-api-report.json'),
    },
    {
      label: 'user-api',
      command: 'node',
      args: [path.join(mobileRoot, 'scripts', 'production-smoke-user-api.js'), outputDir],
      cwd: mobileRoot,
      reportPath: path.join(outputDir, 'user-api-report.json'),
    },
    {
      label: 'ai-api',
      command: 'node',
      args: [path.join(mobileRoot, 'scripts', 'production-smoke-ai-api.js'), outputDir],
      cwd: mobileRoot,
      reportPath: path.join(outputDir, 'ai-api-report.json'),
    },
    {
      label: 'regression',
      command: 'node',
      args: [path.join(mobileRoot, 'scripts', 'production-smoke-regression.js'), outputDir],
      cwd: mobileRoot,
      reportPath: path.join(outputDir, 'regression-run.json'),
    },
  ];
  const cleanupStep = {
    label: 'cleanup',
    command: 'node',
    args: [path.join(mobileRoot, 'scripts', 'production-smoke-cleanup.js'), outputDir],
    cwd: mobileRoot,
    reportPath: path.join(outputDir, 'cleanup-report.json'),
  };

  const preflightResult = runCommand(preflightStep.label, preflightStep.command, preflightStep.args, {
    cwd: preflightStep.cwd,
    env,
    timeoutMs: 45 * 60 * 1000,
  });
  commandResults.push(preflightResult);

  if (preflightResult.ok) {
    for (const step of writeSteps) {
      const result = runCommand(step.label, step.command, step.args, {
        cwd: step.cwd,
        env,
        timeoutMs: 45 * 60 * 1000,
      });
      commandResults.push(result);
    }

    const cleanupResult = runCommand(
      cleanupStep.label,
      cleanupStep.command,
      cleanupStep.args,
      {
        cwd: cleanupStep.cwd,
        env,
        timeoutMs: 45 * 60 * 1000,
      },
    );
    commandResults.push(cleanupResult);
  }

  const dotnetResult = runCommand(
    'baseline-dotnet-test',
    'dotnet',
    ['test', path.join(repoRoot, 'EatFitAI_v1.sln')],
    {
      cwd: repoRoot,
      env,
      timeoutMs: 45 * 60 * 1000,
    },
  );
  const pythonResult = runCommand(
    'baseline-python-unit',
    'python',
    ['-m', 'unittest', 'discover', '-s', path.join(repoRoot, 'ai-provider', 'tests'), '-v'],
    {
      cwd: repoRoot,
      env,
      timeoutMs: 15 * 60 * 1000,
    },
  );
  commandResults.push(dotnetResult, pythonResult);

  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json'));
  const authApi = readJsonIfExists(path.join(outputDir, 'auth-api-report.json'));
  const userApi = readJsonIfExists(path.join(outputDir, 'user-api-report.json'));
  const aiApi = readJsonIfExists(path.join(outputDir, 'ai-api-report.json'));
  const cleanup = readJsonIfExists(path.join(outputDir, 'cleanup-report.json'));
  const regression = readJsonIfExists(path.join(outputDir, 'regression-run.json'));

  const summary = buildBackendNonUiSummary({
    outputDir,
    backendUrl: preflight?.backendUrl || authApi?.backendUrl || userApi?.backendUrl || '',
    aiProviderUrl: preflight?.aiProviderUrl || aiApi?.aiStatus?.providerUrl || aiApi?.aiProviderUrl || '',
    preflight: gateFromReport('preflight', {
      passed:
        preflight?.checks?.health?.backendReady?.ok &&
        preflight?.checks?.health?.backendLive?.ok &&
        preflight?.checks?.health?.aiProviderHealthz?.ok &&
        (preflight?.checks?.auth?.skipped === false
          ? preflight?.checks?.auth?.login?.ok &&
            preflight?.checks?.auth?.refresh?.ok &&
            preflight?.checks?.auth?.aiStatus?.ok
          : false),
      failures: [],
    }),
    authApi: authApi || gateFromReport('auth-api', authApi),
    userApi: userApi || gateFromReport('user-api', userApi),
    aiApi: aiApi || gateFromReport('ai-api', aiApi),
    cleanup: cleanup || gateFromReport('cleanup', cleanup),
    regression,
    codeHealth: {
      dotnetTests: {
        passed: dotnetResult.ok,
        command: dotnetResult.command,
        details: dotnetResult.ok ? [] : [dotnetResult.stderr || dotnetResult.stdout || 'dotnet test failed'],
      },
      pythonUnitTests: {
        passed: pythonResult.ok,
        command: pythonResult.command,
        details: pythonResult.ok ? [] : [pythonResult.stderr || pythonResult.stdout || 'python unit tests failed'],
      },
    },
  });

  const finalReport = {
    ...summary,
    commandResults,
    reportPaths: {
      preflight: path.join(outputDir, 'preflight-results.json'),
      authApi: path.join(outputDir, 'auth-api-report.json'),
      userApi: path.join(outputDir, 'user-api-report.json'),
      aiApi: path.join(outputDir, 'ai-api-report.json'),
      regression: path.join(outputDir, 'regression-run.json'),
      cleanup: path.join(outputDir, 'cleanup-report.json'),
    },
  };

  const outputPath = path.join(outputDir, 'backend-non-ui-summary.json');
  writeJson(outputPath, finalReport);

  console.log(`[production-smoke-backend-non-ui] Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        cloudGatePass: finalReport.cloudGatePass,
        primaryPathPass: finalReport.primaryPathGate?.passed,
        codeHealthPass: finalReport.codeHealthPass,
        overallPassed: finalReport.overallPassed,
        failedGates: finalReport.failedGates,
        failedChecks: finalReport.failedChecks,
      },
      null,
      2,
    ),
  );

  if (!finalReport.overallPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[production-smoke-backend-non-ui] Failed:', error);
  process.exit(1);
});
