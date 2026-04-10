const fs = require('fs');
const path = require('path');

const DEFAULT_BACKEND_URL = 'https://eatfitai-backend.onrender.com';
const DEFAULT_AI_PROVIDER_URL = 'https://eatfitai-ai-provider.onrender.com';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 5000;
const DEFAULT_REQUEST_BUDGET = {
  healthPerEndpoint: 2,
  registerWithVerification: 1,
  resendVerification: 1,
  verifyEmail: 2,
  login: 1,
  refresh: 1,
  aiStatus: 1,
  visionDetect: 8,
  mealDiaryWrite: 3,
};
const DEFAULT_FIXTURE_MANIFEST = {
  version: 1,
  fixtureRootHint: 'tools/appium/fixtures/scan-demo',
  galleryRules: {
    maxFileSizeMb: 10,
    singleDishOnly: true,
    lowOcclusion: true,
    simpleBackgroundPreferred: true,
  },
  fixtures: {
    primary: [
      { key: 'egg', fileName: 'ai-primary-egg-01.jpg', relativePath: 'scan-demo/ai-primary-egg-01.jpg', targetOutcome: 'mapped-or-usable-result' },
      { key: 'banana', fileName: 'ai-primary-banana-01.jpg', relativePath: 'scan-demo/ai-primary-banana-01.jpg', targetOutcome: 'mapped-or-usable-result' },
      { key: 'rice', fileName: 'ai-primary-rice-01.jpg', relativePath: 'scan-demo/ai-primary-rice-01.jpg', targetOutcome: 'mapped-or-usable-result' },
      { key: 'broccoli', fileName: 'ai-primary-broccoli-01.jpg', relativePath: 'scan-demo/ai-primary-broccoli-01.jpg', targetOutcome: 'mapped-or-usable-result' },
      { key: 'spinach', fileName: 'ai-primary-spinach-01.jpg', relativePath: 'scan-demo/ai-primary-spinach-01.jpg', targetOutcome: 'mapped-or-usable-result' },
    ],
    benchmark: [
      { key: 'chicken', fileName: 'ai-benchmark-chicken-01.jpg', relativePath: 'scan-demo/ai-benchmark-chicken-01.jpg', targetOutcome: 'benchmark-only' },
      { key: 'beef', fileName: 'ai-benchmark-beef-01.jpg', relativePath: 'scan-demo/ai-benchmark-beef-01.jpg', targetOutcome: 'benchmark-only' },
      { key: 'pork', fileName: 'ai-benchmark-pork-01.jpg', relativePath: 'scan-demo/ai-benchmark-pork-01.jpg', targetOutcome: 'benchmark-only' },
    ],
  },
  searchCases: [],
  voiceCases: [],
  nutritionCases: [],
};
const MANIFEST_TEMPLATE_PATH = path.resolve(
  __dirname,
  'production-smoke-manifest.template.json',
);

function trimEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : '';
}

function normalizeBaseUrl(value, fallback) {
  const raw = value || fallback;
  return raw.replace(/\/+$/, '');
}

function buildOutputDir() {
  const explicit = trimEnv('EATFITAI_SMOKE_OUTPUT_DIR');
  if (explicit) {
    return explicit;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(__dirname, '..', '..', '_logs', 'production-smoke', stamp);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveNumberEnv(name, fallback) {
  const raw = trimEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const copy = { ...headers };
  if (copy.authorization) {
    copy.authorization = '<redacted>';
  }
  if (copy.Authorization) {
    copy.Authorization = '<redacted>';
  }
  return copy;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeJsonIfMissing(filePath, value) {
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, value);
  }
}

function createBudgetTemplate() {
  return {
    generatedAt: new Date().toISOString(),
    limits: DEFAULT_REQUEST_BUDGET,
    used: Object.fromEntries(Object.keys(DEFAULT_REQUEST_BUDGET).map((key) => [key, 0])),
    events: [],
  };
}

function loadFixtureManifestTemplate() {
  try {
    if (!fs.existsSync(MANIFEST_TEMPLATE_PATH)) {
      return DEFAULT_FIXTURE_MANIFEST;
    }

    return JSON.parse(fs.readFileSync(MANIFEST_TEMPLATE_PATH, 'utf8'));
  } catch (error) {
    console.warn('[production-smoke] Failed to load manifest template, using defaults:', error);
    return DEFAULT_FIXTURE_MANIFEST;
  }
}

function createSessionObservationsTemplate(context) {
  return {
    generatedAt: new Date().toISOString(),
    operator: '',
    accountEmail: context.email || '',
    reopenHome: {
      attempted: false,
      passed: false,
      notes: '',
    },
    scanToSave: {
      attempted: false,
      fixtureKey: '',
      passed: false,
      diaryReadbackPassed: false,
      mealType: '',
      notes: '',
    },
    nutritionApply: {
      attempted: false,
      passed: false,
      targetSummary: '',
      notes: '',
    },
    stability: {
      crashObserved: false,
      freezeObserved: false,
      notes: '',
    },
    riskScenarios: {
      aiDownFallback: {
        attempted: false,
        passed: false,
        notes: '',
      },
      networkLag: {
        attempted: false,
        passed: false,
        notes: '',
      },
      dataCorrupt: {
        attempted: false,
        passed: false,
        notes: '',
      },
    },
    evidence: {
      mailboxScreenshot: '',
      verificationScreenshot: '',
      onboardingScreenshot: '',
      homeScreenshot: '',
      aiResultScreenshot: '',
      diaryScreenshot: '',
      logcatPath: '',
      notes: [],
    },
  };
}

function buildChecklistMarkdown(context) {
  return [
    '# Result Production Smoke Session',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Backend URL: ${context.backendUrl}`,
    `AI Provider URL: ${context.aiProviderUrl}`,
    '',
    '## Health contract',
    '- Backend must return HTTP 200 on `/health/live` and `/health/ready`.',
    '- AI provider must return HTTP 200 on `/healthz`.',
    '',
    '## Temp-Mail lane',
    '- Open https://temp-mail.org/vi/ before register.',
    '- Copy the exact mailbox address shown on the page.',
    '- After register, poll the inbox every 15 seconds for up to 180 seconds.',
    '- If no mail arrives, use resend once, wait for cooldown, then poll for another 180 seconds.',
    '',
    '## Request budget',
    '- Track every budgeted hit in request-budget.json.',
    '- Stop the run when a limit reaches zero remaining.',
    '',
    '## Fixture order',
    '- Primary gate: egg, banana, rice, broccoli, spinach.',
    '- Benchmark only: chicken, beef, pork.',
    '',
    '## Regression + metrics',
    '- Run `node .\\scripts\\production-smoke-seed-cloud.js` before authenticated cloud regression when the dedicated demo account needs a deterministic 7-day reset.',
    '- Run `node .\\scripts\\production-smoke-regression.js` after login credentials are available.',
    '- Run `node .\\scripts\\production-smoke-metrics.js` after filling session-observations.json.',
    '- Run `node .\\scripts\\production-smoke-rehearsal.js` after at least 3 completed sessions.',
    '',
    '## Evidence',
    '- preflight-results.json',
    '- demo-seed.json',
    '- request-budget.json',
    '- fixture-manifest.json',
    '- session-observations.json',
    '- regression-run.json',
    '- metrics-baseline.json',
    '- temp-mail mailbox screenshot',
    '- verification mail screenshot',
    '- onboarding result screenshot',
    '- home reopen screenshot',
    '- AI result screenshot',
    '- diary write/readback screenshot',
    '',
  ].join('\n');
}

function buildRehearsalTemplateMarkdown() {
  return [
    '# Rehearsal Report',
    '',
    '- Run date:',
    '- Operator:',
    '- Account:',
    '- Passed all required gates: yes/no',
    '',
    '## Happy path',
    '- register -> verify -> onboarding:',
    '- reopen -> home:',
    '- scan -> add meal -> diary readback:',
    '',
    '## Risk scenarios',
    '- AI down fallback:',
    '- network lag:',
    '- data corrupt / invalid result:',
    '',
    '## Notes',
    '-',
    '',
  ].join('\n');
}

function ensureSessionArtifacts(outputDir, context) {
  writeJsonIfMissing(path.join(outputDir, 'request-budget.json'), createBudgetTemplate());
  writeJsonIfMissing(
    path.join(outputDir, 'fixture-manifest.json'),
    {
      generatedAt: new Date().toISOString(),
      ...loadFixtureManifestTemplate(),
    },
  );
  writeJsonIfMissing(
    path.join(outputDir, 'session-observations.json'),
    createSessionObservationsTemplate(context),
  );

  const checklistPath = path.join(outputDir, 'manual-checklist.md');
  if (!fs.existsSync(checklistPath)) {
    fs.writeFileSync(checklistPath, buildChecklistMarkdown(context), 'utf8');
  }

  const rehearsalTemplatePath = path.join(outputDir, 'rehearsal-report.md');
  if (!fs.existsSync(rehearsalTemplatePath)) {
    fs.writeFileSync(rehearsalTemplatePath, buildRehearsalTemplateMarkdown(), 'utf8');
  }
}

async function fetchJsonWithDetails(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal,
    });

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedAtMs;
    const rawText = await response.text();
    let json = null;

    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
      startedAt,
      completedAt,
      durationMs,
      headers: sanitizeHeaders(options.headers),
      body: json,
      rawText: json ? undefined : rawText,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedAtMs;
    return {
      ok: false,
      status: null,
      statusText: null,
      url,
      startedAt,
      completedAt,
      durationMs,
      headers: sanitizeHeaders(options.headers),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetries(url, options = {}) {
  const attempts = options.attempts || DEFAULT_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs || DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await fetchJsonWithDetails(url, {
      ...options,
      timeoutMs,
    });

    if (lastResult.ok) {
      return {
        ...lastResult,
        attemptsUsed: attempt,
      };
    }

    if (attempt < attempts) {
      await sleep(retryDelayMs);
    }
  }

  return {
    ...lastResult,
    attemptsUsed: attempts,
  };
}

async function runHealthChecks(context) {
  const timeoutMs = resolveNumberEnv('EATFITAI_SMOKE_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  const attempts = resolveNumberEnv('EATFITAI_SMOKE_ATTEMPTS', DEFAULT_ATTEMPTS);
  const retryDelayMs = resolveNumberEnv(
    'EATFITAI_SMOKE_RETRY_DELAY_MS',
    DEFAULT_RETRY_DELAY_MS,
  );

  return {
    backendReady: await fetchWithRetries(`${context.backendUrl}/health/ready`, {
      timeoutMs,
      attempts,
      retryDelayMs,
    }),
    backendLive: await fetchWithRetries(`${context.backendUrl}/health/live`, {
      timeoutMs,
      attempts,
      retryDelayMs,
    }),
    aiProviderHealthz: await fetchWithRetries(`${context.aiProviderUrl}/healthz`, {
      timeoutMs,
      attempts,
      retryDelayMs,
    }),
  };
}

async function runAuthChecks(context) {
  if (!context.email || !context.password) {
    return {
      skipped: true,
      reason: 'Set EATFITAI_SMOKE_EMAIL and EATFITAI_SMOKE_PASSWORD to enable login/refresh/API checks.',
    };
  }

  const loginResponse = await fetchJsonWithDetails(`${context.backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: context.email,
      password: context.password,
    }),
  });

  const accessToken = loginResponse.body?.accessToken;
  const refreshToken = loginResponse.body?.refreshToken;

  const aiStatusResponse = accessToken
    ? await fetchJsonWithDetails(`${context.backendUrl}/api/ai/status`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : {
        skipped: true,
        reason: 'Login did not return an access token.',
      };

  const refreshResponse = refreshToken
    ? await fetchJsonWithDetails(`${context.backendUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      })
    : {
        skipped: true,
        reason: 'Login did not return a refresh token.',
      };

  return {
    skipped: false,
    login: loginResponse,
    aiStatus: aiStatusResponse,
    refresh: refreshResponse,
  };
}

async function main() {
  const backendUrl = normalizeBaseUrl(
    trimEnv('EXPO_PUBLIC_API_BASE_URL') || trimEnv('EATFITAI_SMOKE_BACKEND_URL'),
    DEFAULT_BACKEND_URL,
  );
  const aiProviderUrl = normalizeBaseUrl(
    trimEnv('EATFITAI_SMOKE_AI_PROVIDER_URL'),
    DEFAULT_AI_PROVIDER_URL,
  );
  const outputDir = buildOutputDir();
  const context = {
    backendUrl,
    aiProviderUrl,
    email: trimEnv('EATFITAI_SMOKE_EMAIL'),
    password: trimEnv('EATFITAI_SMOKE_PASSWORD'),
  };

  fs.mkdirSync(outputDir, { recursive: true });
  ensureSessionArtifacts(outputDir, context);

  const results = {
    generatedAt: new Date().toISOString(),
    backendUrl,
    aiProviderUrl,
    cloudPath: 'mobile -> render-backend -> render-ai-provider -> supabase',
    requestBudget: DEFAULT_REQUEST_BUDGET,
    checks: {
      health: await runHealthChecks(context),
      auth: await runAuthChecks(context),
    },
  };

  const outputPath = path.join(outputDir, 'preflight-results.json');
  writeJson(outputPath, results);

  console.log(`[production-smoke] Evidence written to ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        generatedAt: results.generatedAt,
        backendUrl: results.backendUrl,
        aiProviderUrl: results.aiProviderUrl,
        outputDir,
        healthSummary: {
          aiProviderHealthz: results.checks.health.aiProviderHealthz.status,
          backendLive: results.checks.health.backendLive.status,
          backendReady: results.checks.health.backendReady.status,
        },
        authEnabled: !results.checks.auth.skipped,
        aiStatus: results.checks.auth.aiStatus?.status || null,
        refresh: results.checks.auth.refresh?.status || null,
        sessionArtifacts: [
          'request-budget.json',
          'fixture-manifest.json',
          'session-observations.json',
          'manual-checklist.md',
          'rehearsal-report.md',
        ],
      },
      null,
      2,
    ),
  );

  const failedHealthCheck = Object.values(results.checks.health).some(
    (check) => !check.ok,
  );
  const failedAuthCheck =
    !results.checks.auth.skipped &&
    [results.checks.auth.login, results.checks.auth.aiStatus, results.checks.auth.refresh].some(
      (check) => !check?.ok,
    );

  if (failedHealthCheck || failedAuthCheck) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[production-smoke] Unexpected failure:', error);
  process.exit(1);
});
