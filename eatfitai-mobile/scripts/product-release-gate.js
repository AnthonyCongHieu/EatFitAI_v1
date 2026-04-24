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

function quoteWindowsShellArg(value) {
  const text = String(value).replace(/%/g, '%%');
  if (text.length === 0) {
    return '""';
  }

  return /[\s&()^|<>"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
  const batchCommandLine = [executable, ...args].map(quoteWindowsShellArg).join(' ');
  const invocation = isBatchCommand
    ? {
        command: process.env.ComSpec || 'cmd.exe',
        args: ['/d', '/s', '/c', batchCommandLine],
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

function buildSyntheticCommandResult(label, command, ok, stderr, stdout = '') {
  return {
    label,
    command,
    cwd: mobileRoot,
    durationMs: 0,
    ok,
    exitCode: ok ? 0 : 1,
    stdout,
    stderr,
    error: '',
  };
}

function parseOnlineAndroidDevices(adbDevicesOutput) {
  return String(adbDevicesOutput || '')
    .split(/\r?\n/)
    .map(trim)
    .map((line) => line.match(/^(\S+)\s+device(?:\s|$)/)?.[1])
    .filter(Boolean);
}

function readAndroidTargetMode(env) {
  const rawMode = trim(
    env.EATFITAI_ANDROID_TARGET || env.EATFITAI_ANDROID_TARGET_MODE || 'emulator',
  ).toLowerCase();

  if (['emulator', 'avd'].includes(rawMode)) {
    return 'emulator';
  }

  if (['real', 'real-device', 'device', 'usb'].includes(rawMode)) {
    return 'real-device';
  }

  return '';
}

function resolveAndroidTarget(baseEnv) {
  const commands = [];
  const targetMode = readAndroidTargetMode(baseEnv);
  const devices = runCommand('Resolve Android devices', 'adb', ['devices'], {
    cwd: mobileRoot,
    env: baseEnv,
    timeoutMs: 30 * 1000,
  });
  commands.push(devices);

  if (!devices.ok) {
    return {
      commands,
      env: baseEnv,
    };
  }

  if (!targetMode) {
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android target mode',
        'EATFITAI_ANDROID_TARGET',
        false,
        'Unsupported EATFITAI_ANDROID_TARGET. Use emulator or real-device.',
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  const requestedSerial = trim(baseEnv.ANDROID_SERIAL);
  const onlineDevices = parseOnlineAndroidDevices(devices.stdout);
  const emulatorDevices = onlineDevices.filter((serial) => /^emulator-\d+$/.test(serial));
  const realDevices = onlineDevices.filter((serial) => !/^emulator-\d+$/.test(serial));
  let selectedSerial = '';

  if (requestedSerial) {
    if (!onlineDevices.includes(requestedSerial)) {
      commands.push(
        buildSyntheticCommandResult(
          'Validate Android target',
          `ANDROID_SERIAL=${requestedSerial}`,
          false,
          `ANDROID_SERIAL=${requestedSerial} is not an online adb device.`,
        ),
      );
      return {
        commands,
        env: baseEnv,
      };
    }

    selectedSerial = requestedSerial;
  } else if (targetMode === 'emulator' && emulatorDevices.length === 1) {
    selectedSerial = emulatorDevices[0];
  } else {
    const expectedDevices = targetMode === 'emulator' ? emulatorDevices : realDevices;
    const targetLabel = targetMode === 'emulator' ? 'Android emulator' : 'Android real device';
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android target',
        'adb devices',
        false,
        targetMode === 'real-device'
          ? 'Real-device Gate 2 requires explicit ANDROID_SERIAL with EATFITAI_ANDROID_TARGET=real-device.'
          : expectedDevices.length === 0
            ? `No online ${targetLabel} was found. Connect the target or set EATFITAI_ANDROID_TARGET correctly before Gate 2.`
            : `Multiple or mixed Android targets found (${onlineDevices.join(', ')}). Set ANDROID_SERIAL to the intended ${targetLabel} before Gate 2.`,
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  if (targetMode === 'emulator' && !/^emulator-\d+$/.test(selectedSerial)) {
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android emulator target',
        `ANDROID_SERIAL=${selectedSerial}`,
        false,
        `Gate 2 only runs on Android emulators by default. Refusing non-emulator adb target: ${selectedSerial}.`,
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  if (targetMode === 'real-device' && /^emulator-\d+$/.test(selectedSerial)) {
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android real-device target',
        `ANDROID_SERIAL=${selectedSerial}`,
        false,
        `Gate 2 real-device mode refuses emulator adb target: ${selectedSerial}.`,
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  const qemu = runCommand(
    targetMode === 'emulator' ? 'Verify Android emulator target' : 'Verify Android real-device target',
    'adb',
    ['-s', selectedSerial, 'shell', 'getprop', 'ro.kernel.qemu'],
    {
      cwd: mobileRoot,
      env: baseEnv,
      timeoutMs: 30 * 1000,
    },
  );
  commands.push(qemu);

  const qemuValue = trim(qemu.stdout);
  if (!qemu.ok || (targetMode === 'emulator' && qemuValue !== '1')) {
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android emulator target',
        `adb -s ${selectedSerial} shell getprop ro.kernel.qemu`,
        false,
        `ADB target ${selectedSerial} did not report ro.kernel.qemu=1.`,
        qemu.stdout,
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  if (targetMode === 'real-device' && qemuValue === '1') {
    commands.push(
      buildSyntheticCommandResult(
        'Validate Android real-device target',
        `adb -s ${selectedSerial} shell getprop ro.kernel.qemu`,
        false,
        `ADB target ${selectedSerial} reported ro.kernel.qemu=1, so it is not a real USB device.`,
        qemu.stdout,
      ),
    );
    return {
      commands,
      env: baseEnv,
    };
  }

  return {
    commands,
    env: withExtraEnv(baseEnv, {
      ANDROID_SERIAL: selectedSerial,
      ANDROID_DEVICE_NAME:
        baseEnv.ANDROID_DEVICE_NAME ||
        (targetMode === 'emulator' ? 'Android Emulator' : 'Android Device'),
      EATFITAI_ANDROID_TARGET: targetMode,
      EATFITAI_REQUIRE_ANDROID_EMULATOR: targetMode === 'emulator' ? '1' : '0',
    }),
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
          runCommand(
            'NuGet vulnerability gate',
            'python',
            ['scripts/cloud/check_dotnet_vulnerabilities.py'],
            {
              cwd: repoRoot,
              env,
              timeoutMs: 5 * 60 * 1000,
            },
          ),
        );
      }
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
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('mobile unit tests', 'npm', ['test', '--', '--ci', '--runInBand'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 15 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('mobile production audit', 'npm', ['audit', '--omit=dev', '--audit-level=high'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('mojibake guard', 'python', ['scripts/cloud/check_mojibake.py'], {
            cwd: repoRoot,
            env,
            timeoutMs: 5 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('secret tracking guard', 'python', ['scripts/cloud/check_secret_tracking.py'], {
            cwd: repoRoot,
            env,
            timeoutMs: 5 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('AI provider unit tests', 'python', ['-m', 'unittest', 'discover', '-s', 'tests'], {
            cwd: path.join(repoRoot, 'ai-provider'),
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
    }

    if (gateName === 'android') {
      const androidTarget = resolveAndroidTarget(env);
      gateResult.commands.push(...androidTarget.commands);
      const releaseLikeAndroidEnv = withExtraEnv(androidTarget.env, {
        EATFITAI_REQUIRE_RELEASE_LIKE_BUILD: '1',
      });

      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runPowerShellScript('Build Android preview candidate', buildAndroidPreviewScript, [], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 45 * 60 * 1000,
          }),
        );
      }
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
        const appiumServer = readAppiumServerConfig(releaseLikeAndroidEnv);
        const appiumServerReachable = await isTcpServerReachable(
          appiumServer.host,
          appiumServer.port,
        );

        if (!appiumServerReachable) {
          gateResult.commands.push({
            label: 'Appium availability',
            command: `http://${appiumServer.host}:${appiumServer.port}/`,
            cwd: mobileRoot,
            durationMs: 0,
            ok: false,
            exitCode: 1,
            stdout: '',
            stderr: `Appium server is not reachable at http://${appiumServer.host}:${appiumServer.port}/.`,
            error: '',
          });
        }
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Appium sanity', 'npm', ['run', 'appium:smoke'], {
            cwd: mobileRoot,
            env: releaseLikeAndroidEnv,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
      }
    }

    if (gateName === 'device') {
      gateResult.deviceEvidence = evaluateDeviceEvidence(outputDir);
      gateResult.status = gateResult.deviceEvidence.passed ? 'passed' : 'failed';
    }

    if (gateName === 'cloud') {
      gateResult.commands.push(
        runCommand('Render verify', 'npm', ['run', 'smoke:render:verify'], {
          cwd: mobileRoot,
          env,
          timeoutMs: 20 * 60 * 1000,
        }),
      );
      if (gateResult.commands.at(-1).ok) {
        gateResult.commands.push(
          runCommand('Cloud preflight', 'npm', ['run', 'smoke:preflight'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 20 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud regression', 'npm', ['run', 'smoke:regression'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 45 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud metrics', 'npm', ['run', 'smoke:metrics'], {
            cwd: mobileRoot,
            env,
            timeoutMs: 10 * 60 * 1000,
          }),
        );
      }
      if (gateResult.commands.every((entry) => entry.ok)) {
        gateResult.commands.push(
          runCommand('Cloud rehearsal', 'npm', ['run', 'smoke:rehearsal'], {
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
