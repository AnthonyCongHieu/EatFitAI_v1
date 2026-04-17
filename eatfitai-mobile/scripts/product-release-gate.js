const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const appiumToolsRoot = path.resolve(repoRoot, 'tools', 'appium');
const buildAndroidPreviewScript = path.resolve(mobileRoot, 'scripts', 'build-android-preview.ps1');
const installAndroidPreviewScript = path.resolve(
  mobileRoot,
  'scripts',
  'install-android-preview.ps1',
);
const outputRoot = path.resolve(repoRoot, '_logs', 'production-smoke');
const gateArg = String(process.argv[2] || 'all').trim().toLowerCase();
const stageOrder = ['environment', 'code', 'android', 'device', 'cloud'];
const MAESTRO_INSTALL_BLOCK_PATTERNS = [
  'INSTALL_FAILED_USER_RESTRICTED',
  'Device is blocking ADB helper APK installs',
];

function trim(value) {
  return String(value || '').trim();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function commandName(name) {
  if (process.platform === 'win32' && ['npm', 'npx'].includes(name)) {
    return `${name}.cmd`;
  }

  return name;
}

function buildBaseEnv(outputDir) {
  const env = {
    ...process.env,
    EATFITAI_SMOKE_OUTPUT_DIR: outputDir,
  };
  const forwardKeys = [
    'RENDER_API_KEY',
    'EATFITAI_DEMO_EMAIL',
    'EATFITAI_DEMO_PASSWORD',
    'EATFITAI_ONBOARDING_EMAIL',
    'EATFITAI_ONBOARDING_PASSWORD',
    'EATFITAI_SMOKE_EMAIL',
    'EATFITAI_SMOKE_PASSWORD',
  ];

  for (const key of forwardKeys) {
    const value = trim(resolveEnv(key));
    if (value) {
      env[key] = value;
    }
  }

  return env;
}

function withExtraEnv(baseEnv, extraEnv = {}) {
  return {
    ...baseEnv,
    ...extraEnv,
  };
}

function runCommand(label, command, args, options = {}) {
  const startedAt = Date.now();
  const executable = commandName(command);
  const isBatchCommand = /\.cmd$/i.test(executable) || /\.bat$/i.test(executable);
  const invocation = isBatchCommand
    ? {
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', [executable, ...args].join(' ')],
      }
    : {
        command: executable,
        args,
      };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeoutMs || 60 * 60 * 1000,
  });

  const durationMs = Date.now() - startedAt;
  const stdout = trim(result.stdout);
  const stderr = trim(result.stderr);

  return {
    label,
    command: `${command} ${args.join(' ')}`.trim(),
    cwd: options.cwd || repoRoot,
    durationMs,
    ok: result.status === 0,
    exitCode: result.status,
    stdout,
    stderr,
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function powershellExecutable() {
  return process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
}

function runPowerShellScript(label, scriptPath, args = [], options = {}) {
  return runCommand(
    label,
    powershellExecutable(),
    ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
    options,
  );
}

function resolveInstalledApkPath(commandResult) {
  const lines = [commandResult.stdout, commandResult.stderr]
    .join('\n')
    .split(/\r?\n/)
    .map(trim)
    .filter(Boolean)
    .reverse();

  for (const line of lines) {
    if (looksLikePath(line) && line.toLowerCase().endsWith('.apk')) {
      return path.resolve(line);
    }
  }

  return '';
}

function readAppiumServerConfig(env) {
  const rawPort = Number.parseInt(trim(env.APPIUM_PORT) || '4723', 10);
  return {
    host: trim(env.APPIUM_HOST) || '127.0.0.1',
    port: Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 4723,
  };
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

function resolveOutputDir() {
  const explicit = trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(outputRoot, stamp);
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function looksLikePath(value) {
  return /[\\/]/.test(value) || /\.[A-Za-z0-9]+$/.test(value);
}

function evidenceExists(outputDir, value) {
  const raw = trim(value);
  if (!raw) {
    return false;
  }

  if (!looksLikePath(raw)) {
    return true;
  }

  const candidates = [path.resolve(raw), path.resolve(outputDir, raw), path.resolve(repoRoot, raw)];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function evaluateDeviceEvidence(outputDir) {
  const requiredFiles = [
    'preflight-results.json',
    'request-budget.json',
    'session-observations.json',
    'regression-run.json',
    'metrics-baseline.json',
  ];
  const missingFiles = requiredFiles.filter(
    (fileName) => !fs.existsSync(path.join(outputDir, fileName)),
  );
  const observations =
    readJsonIfExists(path.join(outputDir, 'session-observations.json')) || {};
  const metrics = readJsonIfExists(path.join(outputDir, 'metrics-baseline.json')) || {};
  const evidence = observations.evidence || {};
  const requiredEvidenceKeys = [
    'mailboxScreenshot',
    'verificationScreenshot',
    'onboardingScreenshot',
    'homeScreenshot',
    'aiResultScreenshot',
    'diaryScreenshot',
    'logcatPath',
  ];
  const missingEvidence = requiredEvidenceKeys.filter(
    (key) => !evidenceExists(outputDir, evidence[key]),
  );
  const gates = metrics.gates || {};

  const passed =
    missingFiles.length === 0 &&
    missingEvidence.length === 0 &&
    Boolean(observations.reopenHome?.passed) &&
    Boolean(observations.scanToSave?.passed) &&
    Boolean(observations.scanToSave?.diaryReadbackPassed) &&
    Boolean(observations.nutritionApply?.passed) &&
    !Boolean(observations.stability?.crashObserved) &&
    !Boolean(observations.stability?.freezeObserved) &&
    gates.evidenceComplete === true &&
    gates.stabilityPass === true &&
    gates.voiceGatePass === true &&
    gates.scanGatePass === true &&
    gates.nutritionGatePass === true;

  return {
    outputDir,
    passed,
    missingFiles,
    missingEvidence,
    observations: {
      reopenHomePassed: Boolean(observations.reopenHome?.passed),
      scanToSavePassed: Boolean(observations.scanToSave?.passed),
      diaryReadbackPassed: Boolean(observations.scanToSave?.diaryReadbackPassed),
      nutritionApplyPassed: Boolean(observations.nutritionApply?.passed),
      crashObserved: Boolean(observations.stability?.crashObserved),
      freezeObserved: Boolean(observations.stability?.freezeObserved),
    },
    gates,
  };
}

function shouldRunGate(name) {
  if (gateArg === 'all') {
    return true;
  }

  if (gateArg === 'gate0' && name === 'environment') return true;
  if (gateArg === 'gate1' && name === 'code') return true;
  if (gateArg === 'gate2' && name === 'android') return true;
  if (gateArg === 'gate3' && name === 'device') return true;
  if (gateArg === 'gate4' && name === 'cloud') return true;

  return gateArg === name;
}

function isKnownMaestroInstallBlock(commandResult) {
  const combinedOutput = [commandResult.stdout, commandResult.stderr, commandResult.error]
    .map((value) => trim(value))
    .filter(Boolean)
    .join('\n');

  return MAESTRO_INSTALL_BLOCK_PATTERNS.some((pattern) => combinedOutput.includes(pattern));
}

function markKnownMaestroInstallBlock(gateResult, commandResult) {
  if (!isKnownMaestroInstallBlock(commandResult)) {
    return false;
  }

  gateResult.status = 'blocked';
  gateResult.blockedReason =
    'Maestro could not install its helper APK on the connected Android device. This is an environment/device-policy blocker, not an app regression.';
  return true;
}

function buildGateResult(name) {
  return {
    name,
    startedAt: new Date().toISOString(),
    status: 'pending',
    commands: [],
  };
}

async function main() {
  const outputDir = resolveOutputDir();
  fs.mkdirSync(outputDir, { recursive: true });
  const env = buildBaseEnv(outputDir);

  const report = {
    generatedAt: new Date().toISOString(),
    requestedGate: gateArg,
    outputDir,
    gates: [],
    summary: {
      passed: false,
      failedGates: [],
      blockedGates: [],
      skippedGates: [],
    },
  };

  let blockedByFailure = false;

  for (const gateName of stageOrder) {
    if (!shouldRunGate(gateName)) {
      continue;
    }

    const gateResult = buildGateResult(gateName);
    report.gates.push(gateResult);

    if (blockedByFailure) {
      gateResult.status = 'skipped';
      gateResult.reason = 'Skipped because an earlier gate failed.';
      report.summary.skippedGates.push(gateName);
      continue;
    }

    if (gateName === 'environment') {
      gateResult.commands.push(
        runCommand('npm install', 'npm', ['install'], {
          cwd: mobileRoot,
          env,
          timeoutMs: 30 * 60 * 1000,
        }),
      );
      if (gateResult.commands.at(-1).ok) {
        gateResult.commands.push(
          runCommand('Appium workspace install', 'npm', ['install'], {
            cwd: appiumToolsRoot,
            env,
            timeoutMs: 15 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('automation doctor', 'npm', ['run', 'automation:doctor'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
    }

    if (gateName === 'code') {
      gateResult.commands.push(
        runCommand('dotnet test', 'dotnet', ['test', path.join(repoRoot, 'EatFitAI_v1.sln')], {
          cwd: repoRoot,
          env,
          timeoutMs: 30 * 60 * 1000,
        }),
      );
      if (gateResult.commands.at(-1).ok) {
        gateResult.commands.push(
          runCommand('mobile typecheck', 'npm', ['run', 'typecheck'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 15 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('mobile lint', 'npm', ['run', 'lint'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 15 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand(
            'direct AI guard',
            'npm',
            ['run', 'guard:no-direct-ai-provider'],
            {
              cwd: mobileRoot,
              env,
              timeoutMs: 5 * 60 * 1000,
            },
          ),
        );
      }
    }

    if (gateName === 'android') {
      const releaseLikeAndroidEnv = withExtraEnv(env, {
        EATFITAI_REQUIRE_RELEASE_LIKE_BUILD: '1',
      });
      let maestroBlockedByInstallPolicy = false;

      gateResult.commands.push(
        runPowerShellScript('Build Android preview candidate', buildAndroidPreviewScript, [], {
          cwd: mobileRoot,
          env: releaseLikeAndroidEnv,
          timeoutMs: 45 * 60 * 1000,
        }),
      );
      if (gateResult.commands.at(-1).ok) {
        const builtApkPath = resolveInstalledApkPath(gateResult.commands.at(-1));
        const installArgs = builtApkPath ? ['-ApkPath', builtApkPath] : [];
        gateResult.commands.push(
          runPowerShellScript(
            'Install Android preview candidate',
            installAndroidPreviewScript,
            installArgs,
            {
              cwd: mobileRoot,
              env: releaseLikeAndroidEnv,
              timeoutMs: 20 * 60 * 1000,
            },
          ),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('automation doctor (release-like)', 'npm', ['run', 'automation:doctor'], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.at(-1).ok) {
        gateResult.commands.push(
          runCommand('Maestro smoke', 'npm', ['run', 'maestro:smoke:android'], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
        maestroBlockedByInstallPolicy = markKnownMaestroInstallBlock(
          gateResult,
          gateResult.commands.at(-1),
        );
      }
      if (gateResult.commands.at(-1).ok && !maestroBlockedByInstallPolicy) {
        gateResult.commands.push(
          runCommand('Maestro regression', 'npm', ['run', 'maestro:regression:android'], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
        maestroBlockedByInstallPolicy = markKnownMaestroInstallBlock(
          gateResult,
          gateResult.commands.at(-1),
        );
      }
      if (gateResult.commands.at(-1).ok && !maestroBlockedByInstallPolicy) {
        gateResult.commands.push(
          runCommand('Maestro AI scan save', 'npm', ['run', 'maestro:ai-scan-save:android'], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
        maestroBlockedByInstallPolicy = markKnownMaestroInstallBlock(
          gateResult,
          gateResult.commands.at(-1),
        );
      }
      if (
        gateResult.commands.every((entry) => entry.ok) ||
        maestroBlockedByInstallPolicy
      ) {
        const appiumServer = readAppiumServerConfig(env);
        const appiumServerReachable = await isTcpServerReachable(
          appiumServer.host,
          appiumServer.port,
        );

        if (appiumServerReachable) {
          gateResult.commands.push(
            runCommand(
              maestroBlockedByInstallPolicy ? 'Appium sanity (diagnostic)' : 'Appium sanity',
              'npm',
              ['run', 'appium:smoke'],
              {
                cwd: mobileRoot,
                env: releaseLikeAndroidEnv,
                timeoutMs: 20 * 60 * 1000,
              },
            ),
          );
        } else {
          gateResult.appium = {
            skipped: true,
            reason: `Appium server is not reachable at http://${appiumServer.host}:${appiumServer.port}/; secondary Appium lane skipped.${maestroBlockedByInstallPolicy ? ' Android gate remains blocked by Maestro helper install policy.' : ''}`,
          };
        }
      }
    }

    if (gateName === 'device') {
      gateResult.deviceEvidence = evaluateDeviceEvidence(outputDir);
      gateResult.status = gateResult.deviceEvidence.passed ? 'passed' : 'failed';
    }

    if (gateName === 'cloud') {
      gateResult.commands.push(
        runCommand('Render verify', 'npm', ['run', 'smoke:render:verify', '--', outputDir], {
          cwd: mobileRoot,
          env,
          timeoutMs: 20 * 60 * 1000,
        }),
      );
      if (gateResult.commands.at(-1).ok) {
        gateResult.commands.push(
          runCommand('Cloud preflight', 'npm', ['run', 'smoke:preflight', '--', outputDir], {
            cwd: mobileRoot,
            env,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud regression', 'npm', ['run', 'smoke:regression', '--', outputDir], {
            cwd: mobileRoot,
            env,
            timeoutMs: 45 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud metrics', 'npm', ['run', 'smoke:metrics', '--', outputDir], {
            cwd: mobileRoot,
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud rehearsal', 'npm', ['run', 'smoke:rehearsal', '--', outputDir], {
            cwd: mobileRoot,
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
    }

    if (gateResult.status === 'pending') {
      gateResult.status = gateResult.commands.every((entry) => entry.ok) ? 'passed' : 'failed';
    }
    gateResult.finishedAt = new Date().toISOString();

    if (gateResult.status !== 'passed') {
      blockedByFailure = gateArg === 'all';
      if (gateResult.status === 'blocked') {
        report.summary.blockedGates.push(gateName);
      } else {
        report.summary.failedGates.push(gateName);
      }
    }
  }

  report.summary.passed =
    report.summary.failedGates.length === 0 && report.summary.blockedGates.length === 0;
  const outputPath = path.join(outputDir, 'release-gate-report.json');
  writeJson(outputPath, report);

  if (!report.summary.passed) {
    const blockedSummary =
      report.summary.blockedGates.length > 0
        ? ` blocked: ${report.summary.blockedGates.join(', ')}.`
        : '';
    const failedSummary =
      report.summary.failedGates.length > 0
        ? ` failed: ${report.summary.failedGates.join(', ')}.`
        : '';
    throw new Error(
      `Release gate did not pass.${failedSummary}${blockedSummary} Evidence: ${outputPath}`,
    );
  }

  console.log(`Release gate passed. Evidence: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
