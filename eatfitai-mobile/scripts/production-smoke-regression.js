const fs = require('fs');
const path = require('path');

const DEFAULT_BACKEND_URL = 'https://eatfitai-backend.onrender.com';
const DEFAULT_OUTPUT_ROOT = path.resolve(__dirname, '..', '..', '_logs', 'production-smoke');
const DEFAULT_DEMO_EMAIL = 'scan-demo@redacted.local';
const DEFAULT_DEMO_PASSWORD = 'SET_IN_SEED_SCRIPT';

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value, fallback) {
  const raw = trim(value) || fallback;
  return raw.replace(/\/+$/, '');
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  if (!fs.existsSync(DEFAULT_OUTPUT_ROOT)) {
    throw new Error(
      'Missing production smoke session output. Run production-smoke-preflight.js first or set EATFITAI_SMOKE_OUTPUT_DIR.',
    );
  }

  const candidates = fs
    .readdirSync(DEFAULT_OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (candidates.length === 0) {
    throw new Error(
      'No production smoke session folders found. Run production-smoke-preflight.js first.',
    );
  }

  return path.join(DEFAULT_OUTPUT_ROOT, candidates[0]);
}

function looksLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2'].includes(url.hostname);
  } catch {
    return false;
  }
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function guessMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

async function requestJson(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  const startedAtMs = Date.now();

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
    const durationMs = Date.now() - startedAtMs;
    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      body,
      rawText: body ? undefined : rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAtMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function requestMultipart(url, filePath, token) {
  const formData = new FormData();
  const buffer = fs.readFileSync(filePath);
  const mimeType = guessMimeType(filePath);
  formData.append('file', new Blob([buffer], { type: mimeType }), path.basename(filePath));

  return requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

function resolveFixtureDir(outputDir, manifest) {
  const explicit = trim(process.env.EATFITAI_SMOKE_FIXTURE_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  const hint = trim(manifest.fixtureRootHint);
  if (!hint) {
    return path.resolve(__dirname, '..', '..', 'tools', 'appium', 'fixtures');
  }

  return path.resolve(__dirname, '..', '..', hint);
}

function resolveCredentials(backendUrl) {
  const smokeEmail = trim(process.env.EATFITAI_SMOKE_EMAIL);
  const smokePassword = trim(process.env.EATFITAI_SMOKE_PASSWORD);
  if (smokeEmail && smokePassword) {
    return {
      email: smokeEmail,
      password: smokePassword,
      source: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
    };
  }

  const demoEmail = trim(process.env.EATFITAI_DEMO_EMAIL);
  const demoPassword = trim(process.env.EATFITAI_DEMO_PASSWORD);
  if (demoEmail && demoPassword) {
    return {
      email: demoEmail,
      password: demoPassword,
      source: 'EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD',
    };
  }

  if (looksLocalUrl(backendUrl)) {
    return {
      email: DEFAULT_DEMO_EMAIL,
      password: DEFAULT_DEMO_PASSWORD,
      source: 'local-default-demo-account',
    };
  }

  return null;
}

function loadBudget(outputDir) {
  const budgetPath = path.join(outputDir, 'request-budget.json');
  return {
    budgetPath,
    budget: readJsonIfExists(budgetPath),
  };
}

function recordBudgetHit(outputDir, key, count, note) {
  const { budgetPath, budget } = loadBudget(outputDir);
  if (!budget || !budget.limits || !Object.prototype.hasOwnProperty.call(budget.limits, key)) {
    return;
  }

  const increment = Number.parseInt(String(count), 10);
  if (!Number.isFinite(increment) || increment <= 0) {
    return;
  }

  const used = Number(budget.used?.[key] || 0);
  const limit = Number(budget.limits[key] || 0);
  const nextUsed = used + increment;
  if (limit > 0 && nextUsed > limit) {
    throw new Error(
      `Budget exceeded for ${key}. Used=${used}, increment=${increment}, limit=${limit}.`,
    );
  }

  budget.used[key] = nextUsed;
  budget.events = Array.isArray(budget.events) ? budget.events : [];
  budget.events.push({
    type: 'hit',
    key,
    count: increment,
    note: trim(note),
    recordedAt: new Date().toISOString(),
    recordedBy: 'production-smoke-regression',
  });
  writeJson(budgetPath, budget);
}

async function login(backendUrl, credentials, outputDir) {
  const result = await requestJson(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (result.ok) {
    recordBudgetHit(outputDir, 'login', 1, `regression login via ${credentials.source}`);
  }

  return {
    ...result,
    source: credentials.source,
    email: credentials.email,
    accessToken: result.body?.accessToken || result.body?.token || '',
    refreshToken: result.body?.refreshToken || '',
  };
}

async function runSearchCases(backendUrl, manifest) {
  const cases = Array.isArray(manifest.searchCases) ? manifest.searchCases : [];
  const results = [];

  for (const searchCase of cases) {
    const query = trim(searchCase.query);
    const response = await requestJson(
      `${backendUrl}/api/food/search?q=${encodeURIComponent(query)}&limit=10`,
    );
    const items = Array.isArray(response.body) ? response.body : [];
    const passed = searchCase.expectEmpty
      ? items.length === 0
      : response.ok && items.length >= Number(searchCase.minResults || 1);

    results.push({
      key: searchCase.key,
      query,
      expectEmpty: Boolean(searchCase.expectEmpty),
      minResults: Number(searchCase.minResults || 0),
      status: response.status,
      latencyMs: response.durationMs,
      resultCount: items.length,
      passed,
      error: response.error || null,
    });
  }

  return results;
}

async function runVoiceCases(backendUrl, manifest, token, allowMutations) {
  const cases = Array.isArray(manifest.voiceCases) ? manifest.voiceCases : [];
  const results = [];

  for (const voiceCase of cases) {
    const parseResponse = await requestJson(`${backendUrl}/api/voice/parse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: voiceCase.text,
        language: 'vi',
      }),
    });

    const parsedIntent = parseResponse.body?.intent || 'UNKNOWN';
    const parsePassed = parseResponse.ok && parsedIntent === voiceCase.expectedIntent;
    const result = {
      key: voiceCase.key,
      text: voiceCase.text,
      expectedIntent: voiceCase.expectedIntent,
      parse: {
        status: parseResponse.status,
        latencyMs: parseResponse.durationMs,
        parsedIntent,
        confidence: parseResponse.body?.confidence ?? null,
        passed: parsePassed,
        error: parseResponse.error || null,
      },
      execute: {
        attempted: false,
        skipped: false,
        skipReason: '',
        status: null,
        latencyMs: null,
        passed: false,
        error: null,
      },
    };

    const executeMode = trim(voiceCase.executeMode || 'none').toLowerCase();
    const mutatesData = Boolean(voiceCase.mutatesData);
    const canExecute = parsePassed && executeMode !== 'none';

    if (!canExecute) {
      result.execute.skipped = true;
      result.execute.skipReason = parsePassed ? 'execute-mode-none' : 'parse-failed';
      results.push(result);
      continue;
    }

    if (mutatesData && !allowMutations) {
      result.execute.skipped = true;
      result.execute.skipReason = 'mutations-disabled';
      results.push(result);
      continue;
    }

    result.execute.attempted = true;
    const executeResponse = await requestJson(`${backendUrl}/api/voice/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parseResponse.body),
    });

    result.execute.status = executeResponse.status;
    result.execute.latencyMs = executeResponse.durationMs;

    if (executeMode === 'confirm-weight') {
      const newWeight =
        executeResponse.body?.executedAction?.data?.newWeight ??
        parseResponse.body?.entities?.weight;

      if (executeResponse.ok && Number.isFinite(Number(newWeight))) {
        const confirmResponse = await requestJson(`${backendUrl}/api/voice/confirm-weight`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newWeight: Number(newWeight),
          }),
        });
        result.execute.status = confirmResponse.status;
        result.execute.latencyMs =
          Number(executeResponse.durationMs || 0) + Number(confirmResponse.durationMs || 0);
        result.execute.passed = Boolean(confirmResponse.ok && confirmResponse.body?.success);
        result.execute.error = confirmResponse.error || confirmResponse.body?.error || null;
      } else {
        result.execute.passed = false;
        result.execute.error = executeResponse.error || executeResponse.body?.error || 'Missing newWeight confirmation payload.';
      }
    } else {
      result.execute.passed = Boolean(executeResponse.ok && executeResponse.body?.success);
      result.execute.error = executeResponse.error || executeResponse.body?.error || null;
    }

    results.push(result);
  }

  return results;
}

async function runNutritionCases(backendUrl, manifest, token, allowMutations) {
  const cases = Array.isArray(manifest.nutritionCases) ? manifest.nutritionCases : [];
  const results = [];

  for (const nutritionCase of cases) {
    const suggestResponse = await requestJson(`${backendUrl}/api/ai/nutrition/suggest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nutritionCase.payload || {}),
    });

    const result = {
      key: nutritionCase.key,
      suggest: {
        status: suggestResponse.status,
        latencyMs: suggestResponse.durationMs,
        passed: suggestResponse.ok,
        calories: suggestResponse.body?.calories ?? null,
        protein: suggestResponse.body?.protein ?? null,
        carb: suggestResponse.body?.carb ?? null,
        fat: suggestResponse.body?.fat ?? null,
        error: suggestResponse.error || null,
      },
      apply: {
        attempted: false,
        skipped: false,
        skipReason: '',
        status: null,
        latencyMs: null,
        passed: false,
        error: null,
      },
    };

    if (!nutritionCase.applySuggestedTarget) {
      result.apply.skipped = true;
      result.apply.skipReason = 'apply-disabled';
      results.push(result);
      continue;
    }

    if (nutritionCase.mutatesData && !allowMutations) {
      result.apply.skipped = true;
      result.apply.skipReason = 'mutations-disabled';
      results.push(result);
      continue;
    }

    if (!suggestResponse.ok) {
      result.apply.skipped = true;
      result.apply.skipReason = 'suggest-failed';
      results.push(result);
      continue;
    }

    result.apply.attempted = true;
    const applyResponse = await requestJson(`${backendUrl}/api/ai/nutrition/apply`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calories: Number(suggestResponse.body?.calories || 0),
        protein: Number(suggestResponse.body?.protein || 0),
        carb: Number(suggestResponse.body?.carb || 0),
        fat: Number(suggestResponse.body?.fat || 0),
      }),
    });

    result.apply.status = applyResponse.status;
    result.apply.latencyMs = applyResponse.durationMs;
    result.apply.passed = applyResponse.ok;
    result.apply.error = applyResponse.error || applyResponse.body?.error || null;
    results.push(result);
  }

  return results;
}

async function runScanCases(backendUrl, manifest, token, fixtureDir, outputDir) {
  const buckets = ['primary', 'benchmark'];
  const results = [];

  for (const bucket of buckets) {
    const fixtures = Array.isArray(manifest.fixtures?.[bucket]) ? manifest.fixtures[bucket] : [];
    for (const fixture of fixtures) {
      const relativePath = trim(fixture.relativePath || fixture.fileName || '');
      const filePath = relativePath
        ? path.resolve(fixtureDir, relativePath.replace(/^scan-demo[\\/]/, ''))
        : path.resolve(fixtureDir, fixture.fileName || '');
      const exists = fs.existsSync(filePath);
      const result = {
        bucket,
        key: fixture.key,
        filePath,
        exists,
        status: null,
        latencyMs: null,
        mappedCount: 0,
        unmappedCount: 0,
        usableResult: false,
        passed: false,
        error: null,
      };

      if (!exists) {
        result.error = 'missing-fixture-file';
        results.push(result);
        continue;
      }

      recordBudgetHit(outputDir, 'visionDetect', 1, `regression detect ${bucket}:${fixture.key}`);
      const response = await requestMultipart(`${backendUrl}/api/ai/vision/detect`, filePath, token);
      const items = Array.isArray(response.body?.items) ? response.body.items : [];
      const unmappedLabels = Array.isArray(response.body?.unmappedLabels)
        ? response.body.unmappedLabels
        : [];
      const usableResult = items.length > 0 || unmappedLabels.length > 0;

      result.status = response.status;
      result.latencyMs = response.durationMs;
      result.mappedCount = items.filter((item) => Boolean(item?.isMatched ?? item?.foodItemId)).length;
      result.unmappedCount = unmappedLabels.length;
      result.usableResult = usableResult;
      result.passed =
        bucket === 'benchmark'
          ? Boolean(response.ok)
          : Boolean(response.ok && usableResult);
      result.error = response.error || null;
      results.push(result);
    }
  }

  return results;
}

function buildSummary(results) {
  const searchPositive = results.search.filter((entry) => !entry.expectEmpty);
  const searchEmpty = results.search.filter((entry) => entry.expectEmpty);
  const voiceParseLatencies = results.voice
    .filter((entry) => entry.parse.passed)
    .map((entry) => entry.parse.latencyMs)
    .filter((value) => Number.isFinite(value));
  const voiceExecuteLatencies = results.voice
    .filter((entry) => entry.execute.passed)
    .map((entry) => entry.execute.latencyMs)
    .filter((value) => Number.isFinite(value));
  const primaryScans = results.scan.filter((entry) => entry.bucket === 'primary' && entry.exists);
  const benchmarkScans = results.scan.filter((entry) => entry.bucket === 'benchmark' && entry.exists);

  return {
    search: {
      attempted: results.search.length,
      positiveCases: searchPositive.length,
      positivePassed: searchPositive.filter((entry) => entry.passed).length,
      emptyCases: searchEmpty.length,
      emptyPassed: searchEmpty.filter((entry) => entry.passed).length,
      actualEmptyResponses: results.search.filter((entry) => entry.resultCount === 0).length,
    },
    voice: {
      attempted: results.voice.length,
      parsePassed: results.voice.filter((entry) => entry.parse.passed).length,
      executeAttempted: results.voice.filter((entry) => entry.execute.attempted).length,
      executePassed: results.voice.filter((entry) => entry.execute.passed).length,
      parseLatencyAvgMs: average(voiceParseLatencies),
      parseLatencyP95Ms: percentile(voiceParseLatencies, 95),
      executeLatencyAvgMs: average(voiceExecuteLatencies),
      executeLatencyP95Ms: percentile(voiceExecuteLatencies, 95),
    },
    nutrition: {
      attempted: results.nutrition.length,
      suggestPassed: results.nutrition.filter((entry) => entry.suggest.passed).length,
      applyAttempted: results.nutrition.filter((entry) => entry.apply.attempted).length,
      applyPassed: results.nutrition.filter((entry) => entry.apply.passed).length,
    },
    scan: {
      attempted: results.scan.length,
      fixtureFilesFound: results.scan.filter((entry) => entry.exists).length,
      primaryAttempted: primaryScans.length,
      primaryPassed: primaryScans.filter((entry) => entry.passed).length,
      benchmarkAttempted: benchmarkScans.length,
      benchmarkPassed: benchmarkScans.filter((entry) => entry.passed).length,
      usablePrimaryResults: primaryScans.filter((entry) => entry.usableResult).length,
    },
  };
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json')) || {};
  const manifest = readJsonIfExists(path.join(outputDir, 'fixture-manifest.json')) || {};
  const backendUrl = normalizeBaseUrl(
    process.env.EATFITAI_SMOKE_BACKEND_URL || preflight.backendUrl,
    DEFAULT_BACKEND_URL,
  );
  const fixtureDir = resolveFixtureDir(outputDir, manifest);
  const allowMutations = ['1', 'true', 'yes'].includes(
    trim(process.env.EATFITAI_REGRESSION_ALLOW_MUTATIONS).toLowerCase(),
  );

  const credentials = resolveCredentials(backendUrl);
  if (!credentials) {
    throw new Error(
      'Missing credentials for protected regression checks. Set EATFITAI_SMOKE_EMAIL/PASSWORD or EATFITAI_DEMO_EMAIL/PASSWORD.',
    );
  }

  const loginResult = await login(backendUrl, credentials, outputDir);
  if (!loginResult.ok || !loginResult.accessToken) {
    throw new Error(
      `Login failed for regression (${credentials.source}). Status=${loginResult.status} Error=${loginResult.error || loginResult.body?.message || 'unknown'}`,
    );
  }

  const results = {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    fixtureDir,
    allowMutations,
    credentialsSource: credentials.source,
    login: {
      email: credentials.email,
      status: loginResult.status,
      source: loginResult.source,
      needsOnboarding: Boolean(loginResult.body?.needsOnboarding),
    },
    search: await runSearchCases(backendUrl, manifest),
    voice: await runVoiceCases(
      backendUrl,
      manifest,
      loginResult.accessToken,
      allowMutations,
    ),
    nutrition: await runNutritionCases(
      backendUrl,
      manifest,
      loginResult.accessToken,
      allowMutations,
    ),
    scan: await runScanCases(
      backendUrl,
      manifest,
      loginResult.accessToken,
      fixtureDir,
      outputDir,
    ),
  };

  results.summary = buildSummary(results);

  const outputPath = path.join(outputDir, 'regression-run.json');
  writeJson(outputPath, results);

  console.log(`[production-smoke-regression] Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        backendUrl,
        fixtureDir,
        allowMutations,
        credentialsSource: results.credentialsSource,
        summary: results.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[production-smoke-regression] Failed:', error);
  process.exit(1);
});
