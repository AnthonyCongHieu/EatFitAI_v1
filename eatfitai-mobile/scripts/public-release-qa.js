const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(repoRoot, '_logs', 'public-release-qa');

const DEFAULT_BACKEND_URL = 'https://eatfitai-api.duckdns.org';
const DEFAULT_AI_PROVIDER_URL = 'https://eatfitai-ai.duckdns.org';
const LEGACY_RENDER_BACKEND_URL = 'https://eatfitai-backend.onrender.com';

const requestedGate = String(process.argv[2] || 'all')
  .trim()
  .toLowerCase();
const dryRun = process.argv.includes('--dry-run');
const startedAt = new Date();

const gateOrder = ['preflight', 'code', 'cloud', 'android', 'device', 'visual', 'final'];
const gateAliases = {
  gate0: 'preflight',
  environment: 'preflight',
  gate1: 'code',
  gate2: 'cloud',
  gate3: 'android',
  build: 'android',
  gate4: 'device',
  rc: 'device',
  gate5: 'visual',
  gate6: 'final',
  release: 'final',
};

function trim(value) {
  return String(value || '').trim();
}

function isDisabled(value) {
  return ['0', 'false', 'no', 'off'].includes(trim(value).toLowerCase());
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

function powershellExecutable() {
  return process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
}

function makeTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sanitize(text) {
  let value = String(text || '');
  const secretKeys = [
    'EATFITAI_DEMO_MAIL_API',
    'EATFITAI_DEMO_PASSWORD',
    'EATFITAI_DEVICE_LOGIN_PASSWORD',
    'EATFITAI_ONBOARDING_PASSWORD',
    'EATFITAI_SMOKE_PASSWORD',
    'RENDER_API_KEY',
  ];

  for (const key of secretKeys) {
    const raw = trim(process.env[key]);
    if (raw) {
      value = value.split(raw).join(`[redacted:${key}]`);
    }
  }

  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(
      /("?(?:password|token|apiKey|accessToken|refreshToken)"?\s*[:=]\s*)("[^"]+"|\S+)/gi,
      '$1[redacted]',
    );
}

function buildBaseEnv(outputDir) {
  const env = {
    ...process.env,
    EATFITAI_ANDROID_TARGET: trim(process.env.EATFITAI_ANDROID_TARGET) || 'real-device',
    EATFITAI_DEVICE_BACKEND_URL:
      trim(process.env.EATFITAI_DEVICE_BACKEND_URL) || DEFAULT_BACKEND_URL,
    EATFITAI_SMOKE_BACKEND_URL:
      trim(process.env.EATFITAI_SMOKE_BACKEND_URL) || DEFAULT_BACKEND_URL,
    EATFITAI_SMOKE_AI_PROVIDER_URL:
      trim(process.env.EATFITAI_SMOKE_AI_PROVIDER_URL) || DEFAULT_AI_PROVIDER_URL,
    EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH:
      trim(process.env.EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH) || '1',
    EATFITAI_SMOKE_OUTPUT_DIR: path.join(outputDir, 'production-smoke'),
  };

  return env;
}

function command(label, commandNameValue, args, options = {}) {
  return {
    label,
    command: commandNameValue,
    args,
    cwd: options.cwd || repoRoot,
    timeoutMs: options.timeoutMs || 60 * 60 * 1000,
    envPatch: options.envPatch || {},
  };
}

function npmCommand(label, scriptName, options = {}) {
  return command(label, 'npm', ['run', scriptName, ...(options.extraArgs || [])], {
    cwd: mobileRoot,
    timeoutMs: options.timeoutMs,
    envPatch: options.envPatch,
  });
}

function powershellScript(label, scriptPath, options = {}) {
  return command(
    label,
    powershellExecutable(),
    [
      '-NoLogo',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      ...(options.args || []),
    ],
    {
      cwd: options.cwd || repoRoot,
      timeoutMs: options.timeoutMs,
      envPatch: options.envPatch,
    },
  );
}

function gates() {
  const devPreflight = path.resolve(repoRoot, 'tools', 'dev', 'Invoke-DevPreflight.ps1');

  return {
    preflight: {
      title: 'Gate 0 — Windows + Android real-device preflight',
      requiredEnv: ['ANDROID_SERIAL'],
      commands: [
        powershellScript('Developer workstation preflight', devPreflight, {
          timeoutMs: 10 * 60 * 1000,
        }),
        npmCommand('Android device doctor', 'device:doctor:android', {
          timeoutMs: 15 * 60 * 1000,
        }),
      ],
    },
    code: {
      title: 'Gate 1 — Code health and regression checks',
      commands: [
        npmCommand('Mobile TypeScript typecheck', 'typecheck', {
          timeoutMs: 15 * 60 * 1000,
        }),
        npmCommand('Mobile lint + direct AI guard', 'lint', {
          timeoutMs: 15 * 60 * 1000,
        }),
        command('Mobile unit/static tests', 'npm', ['test', '--', '--silent'], {
          cwd: mobileRoot,
          timeoutMs: 25 * 60 * 1000,
        }),
        command(
          'Backend .NET tests',
          'dotnet',
          ['test', path.join(repoRoot, 'EatFitAI_v1.sln'), '--no-restore'],
          {
            timeoutMs: 30 * 60 * 1000,
          },
        ),
        command(
          'AI provider Python tests',
          'python',
          ['-m', 'pytest', '-q', path.join(repoRoot, 'ai-provider')],
          {
            timeoutMs: 30 * 60 * 1000,
          },
        ),
        command(
          'Cloud smoke Python tests',
          'python',
          ['-m', 'pytest', '-q', path.join(repoRoot, 'scripts', 'cloud')],
          {
            timeoutMs: 20 * 60 * 1000,
          },
        ),
      ],
    },
    cloud: {
      title: 'Gate 2 — Production Lightsail cloud/API smoke',
      requiredEnv: ['EATFITAI_DEMO_MAIL_API'],
      commands: [
        npmCommand('Smoke preflight', 'smoke:preflight', { timeoutMs: 20 * 60 * 1000 }),
        npmCommand('Smoke auth API', 'smoke:auth:api', { timeoutMs: 30 * 60 * 1000 }),
        npmCommand('Smoke user API', 'smoke:user:api', { timeoutMs: 30 * 60 * 1000 }),
        npmCommand('Smoke AI API', 'smoke:ai:api', { timeoutMs: 45 * 60 * 1000 }),
        npmCommand('Smoke backend non-UI', 'smoke:backend:non-ui', {
          timeoutMs: 30 * 60 * 1000,
        }),
        npmCommand('Smoke regression', 'smoke:regression', { timeoutMs: 45 * 60 * 1000 }),
        npmCommand('Smoke cleanup', 'smoke:cleanup', { timeoutMs: 20 * 60 * 1000 }),
      ],
    },
    android: {
      title: 'Gate 3 — Android preview build/install on real device',
      requiredEnv: ['ANDROID_SERIAL'],
      commands: [
        npmCommand('Product release gate: Android build/install', 'release:gate', {
          extraArgs: ['--', 'android'],
          timeoutMs: 75 * 60 * 1000,
        }),
      ],
    },
    device: {
      title: 'Gate 4 — Real-device RC functional proof',
      requiredEnv: ['ANDROID_SERIAL'],
      commands: [
        npmCommand('Real-device RC proof', 'device:rc-proof:android', {
          timeoutMs: 60 * 60 * 1000,
        }),
      ],
    },
    visual: {
      title: 'Gate 5 — Visual/performance evidence capture',
      requiredEnv: ['ANDROID_SERIAL'],
      commands: [
        npmCommand('Real-device visual UI audit', 'device:visual-ui-audit:android', {
          timeoutMs: 45 * 60 * 1000,
        }),
      ],
    },
    final: {
      title: 'Gate 6 — Final product release gate',
      requiredEnv: ['ANDROID_SERIAL', 'EATFITAI_DEMO_MAIL_API'],
      commands: [
        npmCommand('Final release gate: all', 'release:gate', {
          extraArgs: ['--', 'all'],
          timeoutMs: 2 * 60 * 60 * 1000,
        }),
      ],
    },
  };
}

function normalizeRequestedGate(value) {
  if (value === 'help' || value === '--help' || value === '-h') {
    return 'help';
  }
  if (value === 'plan' || value === 'dry-run') {
    return 'plan';
  }
  return gateAliases[value] || value;
}

function requestedGateList(value) {
  const normalized = normalizeRequestedGate(value);
  if (normalized === 'all') {
    return gateOrder;
  }
  if (!gateOrder.includes(normalized)) {
    return [];
  }
  return [normalized];
}

function validateTargetUrls(env) {
  const urls = [
    ['EATFITAI_DEVICE_BACKEND_URL', env.EATFITAI_DEVICE_BACKEND_URL],
    ['EATFITAI_SMOKE_BACKEND_URL', env.EATFITAI_SMOKE_BACKEND_URL],
    ['EATFITAI_SMOKE_AI_PROVIDER_URL', env.EATFITAI_SMOKE_AI_PROVIDER_URL],
  ];
  const errors = [];

  for (const [key, value] of urls) {
    if (trim(value).toLowerCase().includes(LEGACY_RENDER_BACKEND_URL.toLowerCase())) {
      errors.push(
        `${key} must not use legacy suspended Render backend (${LEGACY_RENDER_BACKEND_URL}).`,
      );
    }
  }

  if (env.EATFITAI_DEVICE_BACKEND_URL !== DEFAULT_BACKEND_URL) {
    errors.push(
      `EATFITAI_DEVICE_BACKEND_URL must target production Lightsail backend (${DEFAULT_BACKEND_URL}).`,
    );
  }
  if (env.EATFITAI_SMOKE_BACKEND_URL !== DEFAULT_BACKEND_URL) {
    errors.push(
      `EATFITAI_SMOKE_BACKEND_URL must target production Lightsail backend (${DEFAULT_BACKEND_URL}).`,
    );
  }
  if (env.EATFITAI_SMOKE_AI_PROVIDER_URL !== DEFAULT_AI_PROVIDER_URL) {
    errors.push(
      `EATFITAI_SMOKE_AI_PROVIDER_URL must target production AI provider (${DEFAULT_AI_PROVIDER_URL}).`,
    );
  }

  return errors;
}

function validateGate(gateName, gate, env) {
  const errors = validateTargetUrls(env);
  const disposableRequired = !isDisabled(env.EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH);
  const requiredEnv = gate.requiredEnv || [];

  for (const key of requiredEnv) {
    if (key === 'EATFITAI_DEMO_MAIL_API' && !disposableRequired) {
      continue;
    }
    if (!trim(env[key])) {
      errors.push(`${key} is required for ${gateName}.`);
    }
  }

  if (['preflight', 'android', 'device', 'visual', 'final'].includes(gateName)) {
    if (trim(env.EATFITAI_ANDROID_TARGET).toLowerCase() !== 'real-device') {
      errors.push(
        'EATFITAI_ANDROID_TARGET must be real-device for public Android release QA.',
      );
    }
  }

  if (
    ['cloud', 'final'].includes(gateName) &&
    disposableRequired &&
    !trim(env.EATFITAI_DEMO_MAIL_API)
  ) {
    errors.push(
      'Disposable mailbox is required for public release cloud smoke. Set EATFITAI_DEMO_MAIL_API or explicitly disable EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH=0 for a non-public dry rehearsal.',
    );
  }

  return errors;
}

function runCommand(step, env) {
  const executable = commandName(step.command);
  const isBatchCommand = /\.cmd$/i.test(executable) || /\.bat$/i.test(executable);
  const batchCommandLine = [executable, ...step.args].map(quoteWindowsShellArg).join(' ');
  const invocation = isBatchCommand
    ? {
        command: process.env.ComSpec || 'cmd.exe',
        args: ['/d', '/s', '/c', batchCommandLine],
      }
    : {
        command: executable,
        args: step.args,
      };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: step.cwd,
    env: {
      ...env,
      ...step.envPatch,
    },
    encoding: 'utf8',
    shell: false,
    timeout: step.timeoutMs,
  });

  return {
    label: step.label,
    command: `${step.command} ${step.args.join(' ')}`.trim(),
    cwd: step.cwd,
    timeoutMs: step.timeoutMs,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr),
    error: result.error ? sanitize(result.error.message || String(result.error)) : '',
  };
}

function printHelp() {
  console.log(`EatFitAI public Android release QA

Usage:
  npm --prefix .\\eatfitai-mobile run qa:public-release:plan
  npm --prefix .\\eatfitai-mobile run qa:public-release:preflight
  npm --prefix .\\eatfitai-mobile run qa:public-release:code
  npm --prefix .\\eatfitai-mobile run qa:public-release:cloud
  npm --prefix .\\eatfitai-mobile run qa:public-release:android
  npm --prefix .\\eatfitai-mobile run qa:public-release:device
  npm --prefix .\\eatfitai-mobile run qa:public-release:visual
  npm --prefix .\\eatfitai-mobile run qa:public-release:final
  npm --prefix .\\eatfitai-mobile run qa:public-release

Default production targets:
  Backend: ${DEFAULT_BACKEND_URL}
  AI provider: ${DEFAULT_AI_PROVIDER_URL}

Required for real-device gates:
  ANDROID_SERIAL
  EATFITAI_ANDROID_TARGET=real-device

Required by default for cloud/final:
  EATFITAI_DEMO_MAIL_API
  EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH=1
`);
}

function printPlan(selectedGates) {
  const allGates = gates();
  for (const gateName of selectedGates) {
    const gate = allGates[gateName];
    console.log(`\n${gate.title}`);
    for (const step of gate.commands) {
      console.log(`  - ${step.label}: ${step.command} ${step.args.join(' ')}`.trim());
    }
  }
}

async function main() {
  const normalizedGate = normalizeRequestedGate(requestedGate);
  if (normalizedGate === 'help') {
    printHelp();
    return;
  }

  const selectedGates =
    normalizedGate === 'plan' ? gateOrder : requestedGateList(normalizedGate);
  if (selectedGates.length === 0) {
    printHelp();
    throw new Error(`Unknown public release QA gate: ${requestedGate}`);
  }

  if (normalizedGate === 'plan' || dryRun) {
    printPlan(selectedGates);
    return;
  }

  const outputDir = path.join(outputRoot, makeTimestamp(startedAt));
  fs.mkdirSync(outputDir, { recursive: true });
  const env = buildBaseEnv(outputDir);
  const allGates = gates();
  const report = {
    name: 'EatFitAI Android public release QA',
    startedAt: startedAt.toISOString(),
    productionTargets: {
      backend: env.EATFITAI_SMOKE_BACKEND_URL,
      aiProvider: env.EATFITAI_SMOKE_AI_PROVIDER_URL,
      legacyRenderBackendBlocked: LEGACY_RENDER_BACKEND_URL,
    },
    dryRun: false,
    outputDir,
    gates: [],
    summary: {
      passed: false,
      failedGates: [],
      blockedGates: [],
    },
  };

  for (const gateName of selectedGates) {
    const gate = allGates[gateName];
    const gateReport = {
      name: gateName,
      title: gate.title,
      startedAt: new Date().toISOString(),
      status: 'pending',
      commands: [],
      validationErrors: [],
    };
    report.gates.push(gateReport);

    const validationErrors = validateGate(gateName, gate, env);
    gateReport.validationErrors = validationErrors;
    if (validationErrors.length > 0) {
      gateReport.status = 'blocked';
      report.summary.blockedGates.push(gateName);
      gateReport.finishedAt = new Date().toISOString();
      break;
    }

    for (const step of gate.commands) {
      const commandReport = runCommand(step, env);
      gateReport.commands.push(commandReport);
      if (!commandReport.ok) {
        break;
      }
    }

    gateReport.status = gateReport.commands.every((entry) => entry.ok)
      ? 'passed'
      : 'failed';
    gateReport.finishedAt = new Date().toISOString();

    if (gateReport.status !== 'passed') {
      report.summary.failedGates.push(gateName);
      break;
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary.passed =
    report.summary.failedGates.length === 0 && report.summary.blockedGates.length === 0;
  const reportPath = path.join(outputDir, 'public-release-qa-report.json');
  writeJson(reportPath, report);

  if (!report.summary.passed) {
    throw new Error(`Public release QA did not pass. Evidence: ${reportPath}`);
  }

  console.log(`Public release QA passed. Evidence: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
