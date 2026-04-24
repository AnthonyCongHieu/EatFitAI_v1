const fs = require('fs');
const path = require('path');
const { resolveSmokeCredentials } = require('./lib/smoke-credentials');

const DEFAULT_BACKEND_URL = 'https://eatfitai-backend.onrender.com';
const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const DEFAULT_DEMO_EMAIL = 'scan-demo@redacted.local';
const DEFAULT_DEMO_PASSWORD = 'SET_IN_SEED_SCRIPT';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 1500;
const DEFAULT_PRIMARY_FIXTURES = [
  { key: 'egg', fileName: 'ai-primary-egg-01.jpg' },
  { key: 'banana', fileName: 'ai-primary-banana-01.jpg' },
  { key: 'rice', fileName: 'ai-primary-rice-01.jpg' },
  { key: 'broccoli', fileName: 'ai-primary-broccoli-01.jpg' },
  { key: 'spinach', fileName: 'ai-primary-spinach-01.jpg' },
];
const DEFAULT_INGREDIENT_FALLBACKS = [
  'Chicken Breast',
  'Banana',
  'Egg',
  'Brown Rice',
  'Broccoli',
  'Spinach',
];
const GOOGLE_CREDENTIAL_ENV_KEYS = [
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'GOOGLE_WEB_CLIENT_ID',
  'Google__WebClientId',
  'EATFITAI_GOOGLE_WEB_CLIENT_ID',
];

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value, fallback) {
  return (trim(value) || fallback).replace(/\/+$/, '');
}

function isPlaceholder(value) {
  const normalized = trim(value).toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    'set_in_user_secrets',
    'set_in_env_or_secret_store',
    'set_in_seed_script',
    'replace_me',
    'replace_me_too',
    'your_optional_extra_pool_key_here',
  ].includes(normalized);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLocalDateOnly(date = new Date()) {
  const local = new Date(date);
  local.setUTCHours(local.getUTCHours() + 7);
  return local.toISOString().slice(0, 10);
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarizeValue(value, maxLength = 240) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  }

  try {
    const text = JSON.stringify(value);
    return text.length <= maxLength ? value : `${text.slice(0, maxLength)}...`;
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function normalizeName(value) {
  return trim(value).toLowerCase();
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  if (!fs.existsSync(DEFAULT_OUTPUT_ROOT)) {
    throw new Error(
      'Missing production smoke output root. Run production-smoke-preflight.js first or set EATFITAI_SMOKE_OUTPUT_DIR.',
    );
  }

  const candidates = fs
    .readdirSync(DEFAULT_OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (candidates.length === 0) {
    throw new Error('No production smoke sessions found.');
  }

  return path.join(DEFAULT_OUTPUT_ROOT, candidates[0]);
}

function loadSmokeBackendUrl(outputDir) {
  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json')) || {};
  return normalizeBaseUrl(
    process.env.EATFITAI_SMOKE_BACKEND_URL || preflight.backendUrl,
    DEFAULT_BACKEND_URL,
  );
}

function loadSeedAccountEmail(outputDir) {
  const seed = readJsonIfExists(path.join(outputDir, 'demo-seed.json')) || {};
  return (
    trim(seed.accountEmail) ||
    trim(seed?.credentials?.email) ||
    trim(seed.email) ||
    ''
  );
}

function resolveCredentials(outputDir, backendUrl) {
  const direct = resolveSmokeCredentials({
    allowLocalDefaults: false,
    backendUrl,
  });
  if (direct) {
    return direct;
  }

  const seedEmail = loadSeedAccountEmail(outputDir);
  if (seedEmail) {
    return {
      email: seedEmail,
      password: DEFAULT_DEMO_PASSWORD,
      source: 'demo-seed.json',
    };
  }

  return {
    email: DEFAULT_DEMO_EMAIL,
    password: DEFAULT_DEMO_PASSWORD,
    source: 'default-demo-account',
  };
}

function authHeaders(token, extraHeaders = {}) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
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
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    default:
      return 'image/jpeg';
  }
}

async function requestJson(url, options = {}) {
  const retryCount = Math.max(0, Number.parseInt(String(options.retryCount ?? DEFAULT_ATTEMPTS), 10) || 0);
  const retryDelayMs = Math.max(
    200,
    Number.parseInt(String(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS), 10) || DEFAULT_RETRY_DELAY_MS,
  );
  let lastResult = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const startedAtMs = Date.now();

    try {
      const controller = new AbortController();
      const timeoutMs = Math.max(
        1000,
        Number.parseInt(String(options.timeoutMs ?? DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS,
      );
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body,
          signal: controller.signal,
        });
        const durationMs = Date.now() - startedAtMs;
        const rawText = await response.text();
        let body = null;

        try {
          body = rawText ? JSON.parse(rawText) : null;
        } catch {
          body = null;
        }

        lastResult = {
          ok: response.ok,
          status: response.status,
          durationMs,
          body,
          rawText: body ? undefined : rawText,
        };

        const shouldRetryStatus =
          !response.ok && [408, 425, 429, 500, 502, 503, 504].includes(response.status);
        if (!shouldRetryStatus || attempt === retryCount) {
          return lastResult;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastResult = {
        ok: false,
        status: null,
        durationMs: Date.now() - startedAtMs,
        error: error instanceof Error ? error.message : String(error),
      };

      if (attempt === retryCount) {
        return lastResult;
      }
    }

    await sleep(retryDelayMs * (attempt + 1));
  }

  return (
    lastResult || {
      ok: false,
      status: null,
      durationMs: 0,
      error: 'request failed without result',
    }
  );
}

async function requestMultipart(url, filePath, token, fieldName = 'file') {
  const formData = new FormData();
  const buffer = fs.readFileSync(filePath);
  formData.append(
    fieldName,
    new Blob([buffer], { type: guessMimeType(filePath) }),
    path.basename(filePath),
  );

  return requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
      body: formData,
    });
}

async function requestMultipartForm(url, token, formData) {
  return requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

async function requestAudioMultipart(url, filePath, token) {
  return requestMultipart(url, filePath, token, 'audio');
}

function loadFixtureManifest(outputDir) {
  return readJsonIfExists(path.join(outputDir, 'fixture-manifest.json')) || {};
}

function resolveFixtureDir(outputDir) {
  const manifest = loadFixtureManifest(outputDir);
  const hint = trim(manifest.fixtureRootHint) || 'tools/fixtures/scan-demo';
  return path.resolve(__dirname, '..', '..', hint);
}

function resolvePrimaryFixtures(outputDir) {
  const manifest = loadFixtureManifest(outputDir);
  const manifestFixtures = Array.isArray(manifest.fixtures?.primary)
    ? manifest.fixtures.primary
    : [];

  const source = manifestFixtures.length >= 5 ? manifestFixtures : DEFAULT_PRIMARY_FIXTURES;
  return source.slice(0, 5).map((fixture, index) => ({
    key: trim(fixture.key) || `primary-${index + 1}`,
    fileName: trim(fixture.fileName) || DEFAULT_PRIMARY_FIXTURES[index].fileName,
    relativePath: trim(fixture.relativePath) || `scan-demo/${DEFAULT_PRIMARY_FIXTURES[index].fileName}`,
  }));
}

function normalizeMealTypeName(value) {
  const raw = normalizeName(value);
  if (!raw) {
    return '';
  }

  if (['1', 'breakfast', 'bua sang', 'sang', 'morning'].includes(raw)) {
    return 'breakfast';
  }
  if (['2', 'lunch', 'bua trua', 'trua', 'noon'].includes(raw)) {
    return 'lunch';
  }
  if (['3', 'dinner', 'bua toi', 'toi', 'evening'].includes(raw)) {
    return 'dinner';
  }
  if (['4', 'snack', 'bua phu', 'phu', 'between meals'].includes(raw)) {
    return 'snack';
  }

  return raw;
}

function extractStringsFromMealDiary(rows) {
  const items = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const names = [row?.FoodItemName, row?.RecipeName, row?.UserDishName, row?.Note];
    for (const name of names) {
      const trimmed = trim(name);
      if (trimmed) {
        items.push(trimmed);
      }
    }
  }

  return [...new Set(items)];
}

function selectFirstSuggestionLabel(payload) {
  const mapped = Array.isArray(payload?.items) ? payload.items : [];
  const unmapped = Array.isArray(payload?.unmappedLabels) ? payload.unmappedLabels : [];

  const firstUnmapped = trim(unmapped[0]);
  if (firstUnmapped) {
    return firstUnmapped;
  }

  for (const item of mapped) {
    const label = trim(item?.label);
    if (label) {
      return label;
    }
  }

  return 'banana';
}

function extractFoodNamesFromFavorites(rows) {
  const items = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = trim(row?.FoodName || row?.foodName);
    if (name) {
      items.push(name);
    }
  }

  return [...new Set(items)];
}

async function login(backendUrl, credentials, report) {
  const result = await requestJson(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  return {
    ...result,
    source: credentials.source,
    email: credentials.email,
    accessToken: result.body?.accessToken || result.body?.token || '',
    refreshToken: result.body?.refreshToken || '',
  };
}

async function loadUserContext(backendUrl, token) {
  const localDate = toLocalDateOnly();
  const [profileResult, favoritesResult, mealDiaryResult] = await Promise.all([
    requestJson(`${backendUrl}/api/profile`, {
      headers: authHeaders(token),
    }),
    requestJson(`${backendUrl}/api/favorites`, {
      headers: authHeaders(token),
    }),
    requestJson(
      `${backendUrl}/api/meal-diary?date=${encodeURIComponent(localDate)}`,
      {
        headers: authHeaders(token),
      },
    ),
  ]);

  return {
    profileResult,
    favoritesResult,
    mealDiaryResult,
    profile: profileResult.body || {},
    favorites: extractFoodNamesFromFavorites(favoritesResult.body),
    meals: extractStringsFromMealDiary(mealDiaryResult.body),
  };
}

async function resolveFoodItemId(backendUrl, token, candidates) {
  const candidateList = [...new Set((Array.isArray(candidates) ? candidates : []).map(trim).filter(Boolean))];

  for (const candidate of candidateList) {
    const response = await requestJson(
      `${backendUrl}/api/food/search?q=${encodeURIComponent(candidate)}&limit=10`,
      {
        headers: authHeaders(token),
      },
    );

    const items = Array.isArray(response.body) ? response.body : [];
    const lowerCandidate = normalizeName(candidate);
    const exact =
      items.find((item) => normalizeName(item?.FoodName || item?.foodName) === lowerCandidate) ||
      items.find((item) => normalizeName(item?.FoodName || item?.foodName).includes(lowerCandidate));
    const chosen = exact || items[0];
    const foodItemId = Number(chosen?.FoodItemId || chosen?.foodItemId || 0);

    if (response.ok && foodItemId > 0) {
      return {
        foodItemId,
        foodName: trim(chosen?.FoodName || chosen?.foodName || candidate),
        query: candidate,
        response,
      };
    }
  }

  return null;
}

function createReport(outputDir, backendUrl, credentials) {
  return {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    credentials: {
      email: credentials.email,
      source: credentials.source,
    },
    passed: false,
    summary: {
      attempted: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      averageLatencyMs: null,
      p95LatencyMs: null,
    },
    failures: [],
    blockedCoverageItems: [],
    endpointSummaries: [],
    endpointGroups: {},
    readback: {},
  };
}

function addEndpointSummary(report, group, summary) {
  const entry = {
    group,
    ...summary,
  };

  report.endpointSummaries.push(entry);
  report.endpointGroups[group] = report.endpointGroups[group] || [];
  report.endpointGroups[group].push(entry);
  report.summary.attempted += 1;

  if (entry.blocked) {
    report.summary.blocked += 1;
  } else if (entry.passed) {
    report.summary.passed += 1;
  } else {
    report.summary.failed += 1;
    report.failures.push({
      group,
      name: entry.name || group,
      status: entry.status,
      reason: entry.reason || entry.error || 'unexpected-failure',
      details: entry.details || null,
    });
  }

  return entry;
}

function finalizeSummary(report) {
  const latencyValues = report.endpointSummaries
    .map((entry) => entry.latencyMs)
    .filter((value) => Number.isFinite(value));

  report.summary.averageLatencyMs = average(latencyValues);
  report.summary.p95LatencyMs = percentile(latencyValues, 95);
  report.passed = report.summary.failed === 0;
  return report;
}

function blockedCoverage(report, key, reason, details = {}) {
  const item = {
    key,
    reason,
    ...details,
  };
  report.blockedCoverageItems.push(item);
  return item;
}

function responseTextPreview(response) {
  if (!response) {
    return null;
  }

  if (response.body != null) {
    return summarizeValue(response.body);
  }

  return summarizeValue(response.rawText);
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const backendUrl = loadSmokeBackendUrl(outputDir);
  const credentials = resolveCredentials(outputDir, backendUrl);
  fs.mkdirSync(outputDir, { recursive: true });

  const report = createReport(outputDir, backendUrl, credentials);
  const reportPath = path.join(outputDir, 'ai-api-report.json');

  try {
    const loginResult = await login(backendUrl, credentials, report);
    report.login = {
      ok: loginResult.ok,
      status: loginResult.status,
      source: loginResult.source,
      email: loginResult.email,
      accessTokenPresent: Boolean(loginResult.accessToken),
      refreshTokenPresent: Boolean(loginResult.refreshToken),
      latencyMs: loginResult.durationMs,
      error: loginResult.error || loginResult.body?.message || null,
    };

    if (!loginResult.ok || !loginResult.accessToken) {
      throw new Error(
        `Login failed. Status=${loginResult.status} Error=${loginResult.error || loginResult.body?.message || 'unknown'}`,
      );
    }

    const token = loginResult.accessToken;
    const userContext = await loadUserContext(backendUrl, token);
    report.userContext = {
      profileStatus: userContext.profileResult.status,
      profileOk: userContext.profileResult.ok,
      favoritesStatus: userContext.favoritesResult.status,
      favoritesOk: userContext.favoritesResult.ok,
      mealDiaryStatus: userContext.mealDiaryResult.status,
      mealDiaryOk: userContext.mealDiaryResult.ok,
      favoritesCount: userContext.favorites.length,
      mealDiaryCount: Array.isArray(userContext.mealDiaryResult.body)
        ? userContext.mealDiaryResult.body.length
        : 0,
    };

    const invalidTokenCheck = await requestJson(`${backendUrl}/api/ai/status`, {
      headers: authHeaders('not-a-real-token'),
    });
    addEndpointSummary(report, 'invalid-token', {
      name: 'api/ai/status',
      passed: invalidTokenCheck.status === 401 || invalidTokenCheck.status === 403,
      blocked: false,
      status: invalidTokenCheck.status,
      latencyMs: invalidTokenCheck.durationMs,
      reason:
        invalidTokenCheck.status === 401 || invalidTokenCheck.status === 403
          ? null
          : 'expected-unauthorized',
      details: {
        body: responseTextPreview(invalidTokenCheck),
      },
    });

    const aiStatus = await requestJson(`${backendUrl}/api/ai/status`, {
      headers: authHeaders(token),
    });
    report.aiStatus = {
      status: aiStatus.status,
      latencyMs: aiStatus.durationMs,
      ok: aiStatus.ok,
      state: trim(aiStatus.body?.state),
      providerUrl: trim(aiStatus.body?.providerUrl),
      modelLoaded: Boolean(aiStatus.body?.modelLoaded),
      geminiConfigured: Boolean(aiStatus.body?.geminiConfigured),
      message: trim(aiStatus.body?.message),
    };
    addEndpointSummary(report, 'api/ai/status', {
      name: 'api/ai/status',
      passed: aiStatus.ok && aiStatus.status === 200,
      blocked: false,
      status: aiStatus.status,
      latencyMs: aiStatus.durationMs,
      details: report.aiStatus,
    });

    const providerDownGateActive =
      normalizeName(aiStatus.body?.state) === 'down' &&
      aiStatus.body?.lastCheckedAt &&
      Number.isFinite(Date.parse(aiStatus.body.lastCheckedAt));
    if (providerDownGateActive) {
      const providerDownVisionResponse = await requestMultipart(
        `${backendUrl}/api/ai/vision/detect`,
        path.resolve(resolveFixtureDir(outputDir), DEFAULT_PRIMARY_FIXTURES[0].fileName),
        token,
      );
      addEndpointSummary(report, 'vision/provider-down-contract', {
        name: 'api/ai/vision/detect',
        passed: providerDownVisionResponse.status === 503,
        blocked: false,
        status: providerDownVisionResponse.status,
        latencyMs: providerDownVisionResponse.durationMs,
        reason: providerDownVisionResponse.status === 503 ? null : 'expected-503-ai-provider-down',
        details: {
          body: responseTextPreview(providerDownVisionResponse),
        },
      });
    } else {
      blockedCoverage(report, 'vision/provider-down-contract', 'provider-not-down-or-no-fresh-health-gate', {
        endpoint: 'api/ai/vision/detect',
        aiStatus: {
          state: trim(aiStatus.body?.state),
          lastCheckedAt: aiStatus.body?.lastCheckedAt || null,
        },
      });
    }

    const negativeVision = await requestMultipartForm(
      `${backendUrl}/api/ai/vision/detect`,
      token,
      new FormData(),
    );

    addEndpointSummary(report, 'vision/detect-negative', {
      name: 'api/ai/vision/detect',
      passed: negativeVision.status === 400,
      blocked: false,
      status: negativeVision.status,
      latencyMs: negativeVision.durationMs,
      reason: negativeVision.status === 400 ? null : 'expected-400-no-file',
      details: {
        body: responseTextPreview(negativeVision),
      },
    });

    const fixtureDir = resolveFixtureDir(outputDir);
    const primaryFixtures = resolvePrimaryFixtures(outputDir);
    report.fixtureDir = fixtureDir;

    const detectResults = [];
    for (const fixture of primaryFixtures) {
      const filePath = path.resolve(
        fixtureDir,
        fixture.relativePath.replace(/^scan-demo[\\/]/, ''),
      );
      if (!fs.existsSync(filePath)) {
        addEndpointSummary(report, 'vision/detect', {
          name: fixture.key,
          passed: false,
          blocked: false,
          status: null,
          latencyMs: null,
          reason: 'missing-fixture-file',
          details: { filePath },
        });
        continue;
      }

      const response = await requestMultipart(
        `${backendUrl}/api/ai/vision/detect`,
        filePath,
        token,
      );
      const items = Array.isArray(response.body?.items) ? response.body.items : [];
      const unmappedLabels = Array.isArray(response.body?.unmappedLabels)
        ? response.body.unmappedLabels
        : [];
      const entry = {
        name: fixture.key,
        filePath,
        passed: response.ok && response.status === 200,
        blocked: false,
        status: response.status,
        latencyMs: response.durationMs,
        details: {
          itemCount: items.length,
          unmappedCount: unmappedLabels.length,
          firstItem: items[0]
            ? {
                label: trim(items[0].label),
                foodName: trim(items[0].foodName),
                foodItemId: items[0].foodItemId || null,
                matched: Boolean(items[0].isMatched ?? items[0].foodItemId),
              }
            : null,
          responsePreview: responseTextPreview(response),
        },
      };
      addEndpointSummary(report, 'vision/detect', entry);
      detectResults.push({
        fixture,
        response,
        items,
        unmappedLabels,
      });
    }

    const allDetectedItems = detectResults.flatMap((result) => result.items || []);
    const allUnmappedLabels = [
      ...new Set(
        detectResults
          .flatMap((result) => result.unmappedLabels || [])
          .map(trim)
          .filter(Boolean),
      ),
    ];

    const historyResponse = await requestJson(`${backendUrl}/api/ai/vision/history`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        days: 30,
        maxResults: 25,
        onlyUnmapped: false,
      }),
    });
    const historyRows = Array.isArray(historyResponse.body) ? historyResponse.body : [];
    report.visionHistory = {
      status: historyResponse.status,
      latencyMs: historyResponse.durationMs,
      count: historyRows.length,
      firstRow: historyRows[0]
        ? {
            labels: historyRows[0].detectedLabels || [],
            mappedFoodNames: historyRows[0].mappedFoodNames || [],
            unmappedCount: historyRows[0].unmappedCount ?? null,
          }
        : null,
    };
    addEndpointSummary(report, 'vision/history', {
      name: 'api/ai/vision/history',
      passed: historyResponse.ok && historyRows.length >= 1,
      blocked: false,
      status: historyResponse.status,
      latencyMs: historyResponse.durationMs,
      reason: historyRows.length >= 1 ? null : 'expected-detection-history',
      details: report.visionHistory,
    });

    const unmappedStatsResponse = await requestJson(`${backendUrl}/api/ai/vision/unmapped-stats?days=30`, {
      headers: authHeaders(token),
    });
    const unmappedStats = unmappedStatsResponse.body || {};
    const unmappedStatsKeys = Object.keys(unmappedStats);
    report.visionUnmappedStats = {
      status: unmappedStatsResponse.status,
      latencyMs: unmappedStatsResponse.durationMs,
      count: unmappedStatsKeys.length,
      topEntries: unmappedStatsKeys.slice(0, 5).map((key) => ({
        label: key,
        count: unmappedStats[key],
      })),
    };
    addEndpointSummary(report, 'vision/unmapped-stats', {
      name: 'api/ai/vision/unmapped-stats',
      passed: unmappedStatsResponse.ok,
      blocked: false,
      status: unmappedStatsResponse.status,
      latencyMs: unmappedStatsResponse.durationMs,
      details: report.visionUnmappedStats,
    });

    const mappingLabel = selectFirstSuggestionLabel({
      items: allDetectedItems,
      unmappedLabels: allUnmappedLabels,
    });
    const suggestMappingResponse = await requestJson(
      `${backendUrl}/api/ai/vision/suggest-mapping/${encodeURIComponent(mappingLabel)}`,
      {
        headers: authHeaders(token),
      },
    );
    const suggestions = Array.isArray(suggestMappingResponse.body)
      ? suggestMappingResponse.body
      : [];
    report.visionSuggestMapping = {
      status: suggestMappingResponse.status,
      latencyMs: suggestMappingResponse.durationMs,
      label: mappingLabel,
      suggestionCount: suggestions.length,
      firstSuggestion: suggestions[0]
        ? {
            foodItemId: suggestions[0].foodItemId || null,
            foodName: trim(suggestions[0].foodName),
            matchScore: suggestions[0].matchScore ?? null,
            reasoning: trim(suggestions[0].reasoning),
          }
        : null,
    };
    addEndpointSummary(report, 'vision/suggest-mapping', {
      name: 'api/ai/vision/suggest-mapping',
      passed: suggestMappingResponse.ok,
      blocked: false,
      status: suggestMappingResponse.status,
      latencyMs: suggestMappingResponse.durationMs,
      details: report.visionSuggestMapping,
    });

    const teachTarget =
      (await resolveFoodItemId(backendUrl, token, [
        mappingLabel,
        ...DEFAULT_INGREDIENT_FALLBACKS,
      ])) || {
        foodItemId: 0,
        foodName: DEFAULT_INGREDIENT_FALLBACKS[0],
        query: DEFAULT_INGREDIENT_FALLBACKS[0],
      };
    report.teachTarget = teachTarget;

    const teachLabelResponse = await requestJson(`${backendUrl}/api/ai/labels/teach`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        label: mappingLabel,
        foodItemId: teachTarget.foodItemId,
        minConfidence: 0.6,
        detectedConfidence: 0.9,
        selectedFoodName: teachTarget.foodName,
        source: 'production-smoke-ai-api',
        clientTimestamp: new Date().toISOString(),
      }),
    });
    addEndpointSummary(report, 'labels/teach', {
      name: 'api/ai/labels/teach',
      passed: teachLabelResponse.status === 204,
      blocked: false,
      status: teachLabelResponse.status,
      latencyMs: teachLabelResponse.durationMs,
      reason: teachLabelResponse.status === 204 ? null : 'expected-204',
      details: {
        label: mappingLabel,
        foodItemId: teachTarget.foodItemId,
        responsePreview: responseTextPreview(teachLabelResponse),
      },
    });

    const correctionResponse = await requestJson(`${backendUrl}/api/ai/corrections`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        label: mappingLabel,
        foodItemId: teachTarget.foodItemId,
        detectedConfidence: 0.85,
        selectedFoodName: teachTarget.foodName,
        source: 'production-smoke-ai-api',
        clientTimestamp: new Date().toISOString(),
      }),
    });
    addEndpointSummary(report, 'corrections', {
      name: 'api/ai/corrections',
      passed: correctionResponse.status === 204,
      blocked: false,
      status: correctionResponse.status,
      latencyMs: correctionResponse.durationMs,
      reason: correctionResponse.status === 204 ? null : 'expected-204',
      details: {
        label: mappingLabel,
        foodItemId: teachTarget.foodItemId,
      },
    });

    const correctionStatsResponse = await requestJson(`${backendUrl}/api/ai/corrections/stats`, {
      headers: authHeaders(token),
    });
    const correctionStats = correctionStatsResponse.body || {};
    report.correctionStats = {
      status: correctionStatsResponse.status,
      latencyMs: correctionStatsResponse.durationMs,
      totalCorrections: correctionStats.TotalCorrections ?? correctionStats.totalCorrections ?? null,
      todayCorrections: correctionStats.TodayCorrections ?? correctionStats.todayCorrections ?? null,
      topSources: correctionStats.TopSources || correctionStats.topSources || [],
      topCorrectedLabels:
        correctionStats.TopCorrectedLabels || correctionStats.topCorrectedLabels || [],
    };
    addEndpointSummary(report, 'corrections/stats', {
      name: 'api/ai/corrections/stats',
      passed: correctionStatsResponse.ok,
      blocked: false,
      status: correctionStatsResponse.status,
      latencyMs: correctionStatsResponse.durationMs,
      details: report.correctionStats,
    });

    const ingredientCandidates = [
      ...userContext.favorites,
      ...userContext.meals,
      ...DEFAULT_INGREDIENT_FALLBACKS,
    ];
    const recipeSuggestResponse = await requestJson(`${backendUrl}/api/ai/recipes/suggest`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        availableIngredients: [...new Set(ingredientCandidates)].slice(0, 10),
        maxCookingTimeMinutes: 45,
        minMatchedIngredients: 1,
        maxResults: 5,
      }),
    });
    const recipeSuggestions = Array.isArray(recipeSuggestResponse.body)
      ? recipeSuggestResponse.body
      : [];
    report.recipeSuggestions = {
      status: recipeSuggestResponse.status,
      latencyMs: recipeSuggestResponse.durationMs,
      count: recipeSuggestions.length,
      firstRecipe: recipeSuggestions[0]
        ? {
            recipeId: recipeSuggestions[0].recipeId || null,
            recipeName: trim(recipeSuggestions[0].recipeName),
            matchPercentage: recipeSuggestions[0].matchPercentage ?? null,
            matchedIngredientsCount: recipeSuggestions[0].matchedIngredientsCount ?? null,
          }
        : null,
    };
    addEndpointSummary(report, 'recipes/suggest', {
      name: 'api/ai/recipes/suggest',
      passed: recipeSuggestResponse.ok && recipeSuggestions.length >= 1,
      blocked: false,
      status: recipeSuggestResponse.status,
      latencyMs: recipeSuggestResponse.durationMs,
      reason: recipeSuggestions.length >= 1 ? null : 'expected-recipe-suggestion',
      details: report.recipeSuggestions,
    });

    const chosenRecipe = recipeSuggestions[0] || null;
    if (chosenRecipe) {
      const recipeDetailResponse = await requestJson(
        `${backendUrl}/api/ai/recipes/${encodeURIComponent(chosenRecipe.recipeId)}`,
        {
          headers: authHeaders(token),
        },
      );
      const recipeDetail = recipeDetailResponse.body || {};
      report.recipeDetail = {
        status: recipeDetailResponse.status,
        latencyMs: recipeDetailResponse.durationMs,
        recipeId: chosenRecipe.recipeId,
        recipeName: trim(recipeDetail.RecipeName || recipeDetail.recipeName),
        ingredientsCount: Array.isArray(recipeDetail.Ingredients || recipeDetail.ingredients)
          ? (recipeDetail.Ingredients || recipeDetail.ingredients).length
          : 0,
      };
      addEndpointSummary(report, 'recipes/{id}', {
        name: 'api/ai/recipes/{id}',
        passed: recipeDetailResponse.ok,
        blocked: false,
        status: recipeDetailResponse.status,
        latencyMs: recipeDetailResponse.durationMs,
        details: report.recipeDetail,
      });

      const instructionsResponse = await requestJson(
        `${backendUrl}/api/ai/cooking-instructions`,
        {
          method: 'POST',
          headers: authHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            recipeName: trim(recipeDetail.RecipeName || recipeDetail.recipeName || chosenRecipe.recipeName),
            description: trim(recipeDetail.Description || recipeDetail.description),
            ingredients: (recipeDetail.Ingredients || recipeDetail.ingredients || [])
              .slice(0, 5)
              .map((ingredient) => ({
                foodName: trim(ingredient.foodName || ingredient.FoodName),
                grams: Number(ingredient.grams || ingredient.Grams || 0),
              })),
          }),
        },
      );
      const instructions = instructionsResponse.body || {};
      report.cookingInstructions = {
        status: instructionsResponse.status,
        latencyMs: instructionsResponse.durationMs,
        stepCount: Array.isArray(instructions.Steps || instructions.steps)
          ? (instructions.Steps || instructions.steps).length
          : 0,
        difficulty: trim(instructions.Difficulty || instructions.difficulty),
        cookingTime: trim(instructions.CookingTime || instructions.cookingTime),
      };
      addEndpointSummary(report, 'cooking-instructions', {
        name: 'api/ai/cooking-instructions',
        passed: instructionsResponse.ok,
        blocked: false,
        status: instructionsResponse.status,
        latencyMs: instructionsResponse.durationMs,
        details: report.cookingInstructions,
      });
    } else {
      blockedCoverage(report, 'recipe-detail', 'recipe-suggestion-empty', {
        endpoint: 'api/ai/recipes/{id}',
      });
    }

    const aiNutritionCurrentResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition-targets/current`,
      {
        headers: authHeaders(token),
      },
    );
    const aiNutritionCurrent = aiNutritionCurrentResponse.body || {};
    report.aiNutritionCurrent = {
      status: aiNutritionCurrentResponse.status,
      latencyMs: aiNutritionCurrentResponse.durationMs,
      calories: aiNutritionCurrent.caloriesKcal ?? aiNutritionCurrent.calories ?? null,
      protein: aiNutritionCurrent.proteinGrams ?? aiNutritionCurrent.protein ?? null,
      carbs: aiNutritionCurrent.carbohydrateGrams ?? aiNutritionCurrent.carbs ?? null,
      fat: aiNutritionCurrent.fatGrams ?? aiNutritionCurrent.fat ?? null,
    };
    addEndpointSummary(report, 'nutrition-targets/current', {
      name: 'api/ai/nutrition-targets/current',
      passed: aiNutritionCurrentResponse.ok,
      blocked: false,
      status: aiNutritionCurrentResponse.status,
      latencyMs: aiNutritionCurrentResponse.durationMs,
      details: report.aiNutritionCurrent,
    });

    const profile = userContext.profile || {};
    const recalculatePayload = {
      sex: trim(profile.gender || profile.sex || 'male'),
      age: Number.isFinite(Number(profile.age)) ? Number(profile.age) : 30,
      heightCm: Number(profile.currentHeightCm || profile.heightCm || 170),
      weightKg: Number(profile.currentWeightKg || profile.weightKg || 70),
      activityLevel: Number(profile.activityLevel || 1.55) || 1.55,
      goal: trim(profile.goal || 'maintain'),
    };
    const aiNutritionRecalculateResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition/recalculate`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(recalculatePayload),
      },
    );
    const aiNutritionRecalculate = aiNutritionRecalculateResponse.body || {};
    report.aiNutritionRecalculate = {
      status: aiNutritionRecalculateResponse.status,
      latencyMs: aiNutritionRecalculateResponse.durationMs,
      calories: aiNutritionRecalculate.calories ?? null,
      protein: aiNutritionRecalculate.protein ?? null,
      carbs: aiNutritionRecalculate.carbs ?? null,
      fat: aiNutritionRecalculate.fat ?? null,
      offlineMode: Boolean(aiNutritionRecalculate.offlineMode),
      source: trim(aiNutritionRecalculate.source),
    };
    addEndpointSummary(report, 'nutrition/recalculate', {
      name: 'api/ai/nutrition/recalculate',
      passed: aiNutritionRecalculateResponse.ok,
      blocked: false,
      status: aiNutritionRecalculateResponse.status,
      latencyMs: aiNutritionRecalculateResponse.durationMs,
      details: report.aiNutritionRecalculate,
    });

    const aiNutritionInsightsResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition/insights`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          analysisDays: 30,
          includeMealTiming: true,
          includeMacroAnalysis: true,
        }),
      },
    );
    const aiNutritionInsights = aiNutritionInsightsResponse.body || {};
    report.aiNutritionInsights = {
      status: aiNutritionInsightsResponse.status,
      latencyMs: aiNutritionInsightsResponse.durationMs,
      adherenceScore: aiNutritionInsights.AdherenceScore ?? aiNutritionInsights.adherenceScore ?? null,
      progressTrend: trim(aiNutritionInsights.ProgressTrend || aiNutritionInsights.progressTrend),
      recommendationsCount: Array.isArray(
        aiNutritionInsights.Recommendations || aiNutritionInsights.recommendations,
      )
        ? (aiNutritionInsights.Recommendations || aiNutritionInsights.recommendations).length
        : 0,
    };
    addEndpointSummary(report, 'nutrition/insights', {
      name: 'api/ai/nutrition/insights',
      passed: aiNutritionInsightsResponse.ok,
      blocked: false,
      status: aiNutritionInsightsResponse.status,
      latencyMs: aiNutritionInsightsResponse.durationMs,
      details: report.aiNutritionInsights,
    });

    const aiAdaptiveTargetResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition/adaptive-target`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          analysisDays: 14,
          autoApply: false,
        }),
      },
    );
    const aiAdaptiveTarget = aiAdaptiveTargetResponse.body || {};
    report.aiAdaptiveTarget = {
      status: aiAdaptiveTargetResponse.status,
      latencyMs: aiAdaptiveTargetResponse.durationMs,
      confidenceScore: aiAdaptiveTarget.ConfidenceScore ?? aiAdaptiveTarget.confidenceScore ?? null,
      applied: Boolean(aiAdaptiveTarget.Applied ?? aiAdaptiveTarget.applied),
      suggestedTarget: aiAdaptiveTarget.SuggestedTarget || aiAdaptiveTarget.suggestedTarget || null,
    };
    addEndpointSummary(report, 'nutrition/adaptive-target', {
      name: 'api/ai/nutrition/adaptive-target',
      passed: aiAdaptiveTargetResponse.ok,
      blocked: false,
      status: aiAdaptiveTargetResponse.status,
      latencyMs: aiAdaptiveTargetResponse.durationMs,
      details: report.aiAdaptiveTarget,
    });

    const targetForApply =
      aiAdaptiveTarget.SuggestedTarget ||
      aiAdaptiveTarget.suggestedTarget ||
      aiNutritionCurrent ||
      aiNutritionRecalculate;
    const applyTargetPayload = {
      targetCalories:
        targetForApply.TargetCalories ??
        targetForApply.caloriesKcal ??
        targetForApply.calories ??
        2000,
      targetProtein:
        targetForApply.TargetProtein ??
        targetForApply.proteinGrams ??
        targetForApply.protein ??
        50,
      targetCarbs:
        targetForApply.TargetCarbs ??
        targetForApply.carbohydrateGrams ??
        targetForApply.carbs ??
        250,
      targetFat:
        targetForApply.TargetFat ?? targetForApply.fatGrams ?? targetForApply.fat ?? 65,
    };
    const aiApplyTargetResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition/apply-target`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(applyTargetPayload),
      },
    );
    addEndpointSummary(report, 'nutrition/apply-target', {
      name: 'api/ai/nutrition/apply-target',
      passed: aiApplyTargetResponse.status === 204,
      blocked: false,
      status: aiApplyTargetResponse.status,
      latencyMs: aiApplyTargetResponse.durationMs,
      reason: aiApplyTargetResponse.status === 204 ? null : 'expected-204',
      details: {
        payload: applyTargetPayload,
      },
    });

    const nutritionSuggestResponse = await requestJson(
      `${backendUrl}/api/ai/nutrition/suggest`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(recalculatePayload),
      },
    );
    const nutritionSuggest = nutritionSuggestResponse.body || {};
    report.nutritionSuggest = {
      status: nutritionSuggestResponse.status,
      latencyMs: nutritionSuggestResponse.durationMs,
      calories: nutritionSuggest.calories ?? nutritionSuggest.Calories ?? null,
      protein: nutritionSuggest.protein ?? nutritionSuggest.Protein ?? null,
      carbs: nutritionSuggest.carbs ?? nutritionSuggest.Carb ?? null,
      fat: nutritionSuggest.fat ?? nutritionSuggest.Fat ?? null,
      explanation: trim(nutritionSuggest.explanation || nutritionSuggest.Explanation),
    };
    addEndpointSummary(report, 'nutrition/suggest', {
      name: 'api/ai/nutrition/suggest',
      passed: nutritionSuggestResponse.ok,
      blocked: false,
      status: nutritionSuggestResponse.status,
      latencyMs: nutritionSuggestResponse.durationMs,
      details: report.nutritionSuggest,
    });

    const nutritionApplyPayload = {
      calories: Number(nutritionSuggest.calories ?? nutritionSuggest.Calories ?? 0) || 2000,
      protein: Number(nutritionSuggest.protein ?? nutritionSuggest.Protein ?? 0) || 50,
      carb: Number(nutritionSuggest.carbs ?? nutritionSuggest.Carb ?? 0) || 250,
      fat: Number(nutritionSuggest.fat ?? nutritionSuggest.Fat ?? 0) || 65,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    };
    const nutritionApplyResponse = await requestJson(`${backendUrl}/api/ai/nutrition/apply`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(nutritionApplyPayload),
    });
    addEndpointSummary(report, 'nutrition/apply', {
      name: 'api/ai/nutrition/apply',
      passed: nutritionApplyResponse.status === 204,
      blocked: false,
      status: nutritionApplyResponse.status,
      latencyMs: nutritionApplyResponse.durationMs,
      reason: nutritionApplyResponse.status === 204 ? null : 'expected-204',
      details: {
        payload: nutritionApplyPayload,
      },
    });

    const nutritionCurrentResponse = await requestJson(`${backendUrl}/api/ai/nutrition/current`, {
      headers: authHeaders(token),
    });
    const nutritionCurrent = nutritionCurrentResponse.body || {};
    report.nutritionCurrent = {
      status: nutritionCurrentResponse.status,
      latencyMs: nutritionCurrentResponse.durationMs,
      calories: nutritionCurrent.calories ?? nutritionCurrent.TargetCalories ?? null,
      protein: nutritionCurrent.protein ?? nutritionCurrent.TargetProtein ?? null,
      carbs: nutritionCurrent.carbs ?? nutritionCurrent.TargetCarbs ?? null,
      fat: nutritionCurrent.fat ?? nutritionCurrent.TargetFat ?? null,
    };
    addEndpointSummary(report, 'nutrition/current', {
      name: 'api/ai/nutrition/current',
      passed: nutritionCurrentResponse.ok,
      blocked: false,
      status: nutritionCurrentResponse.status,
      latencyMs: nutritionCurrentResponse.durationMs,
      details: report.nutritionCurrent,
    });

    const aiReviewCheckResponse = await requestJson(
      `${backendUrl}/api/AIReview/check-trigger`,
      {
        headers: authHeaders(token),
      },
    );
    const aiReviewCheck = aiReviewCheckResponse.body || {};
    report.aiReviewCheck = {
      status: aiReviewCheckResponse.status,
      latencyMs: aiReviewCheckResponse.durationMs,
      level: aiReviewCheck.Level ?? aiReviewCheck.level ?? null,
      type: trim(aiReviewCheck.Type || aiReviewCheck.type),
      enabled: Boolean(aiReviewCheck.Enabled ?? aiReviewCheck.enabled),
      priority: trim(aiReviewCheck.Priority || aiReviewCheck.priority),
      dataQuality: aiReviewCheck.DataQuality ?? aiReviewCheck.dataQuality ?? null,
      reason: trim(aiReviewCheck.Reason || aiReviewCheck.reason),
    };
    addEndpointSummary(report, 'AIReview/check-trigger', {
      name: 'api/AIReview/check-trigger',
      passed: aiReviewCheckResponse.ok,
      blocked: false,
      status: aiReviewCheckResponse.status,
      latencyMs: aiReviewCheckResponse.durationMs,
      details: report.aiReviewCheck,
    });

    const aiReviewWeeklyResponse = await requestJson(`${backendUrl}/api/AIReview/weekly`, {
      headers: authHeaders(token),
    });
    const aiReviewWeekly = aiReviewWeeklyResponse.body || {};
    report.aiReviewWeekly = {
      status: aiReviewWeeklyResponse.status,
      latencyMs: aiReviewWeeklyResponse.durationMs,
      statusText: trim(aiReviewWeekly.Status || aiReviewWeekly.status),
      confidence: aiReviewWeekly.Confidence ?? aiReviewWeekly.confidence ?? null,
      dataQuality: aiReviewWeekly.DataQuality ?? aiReviewWeekly.dataQuality ?? null,
      recommendationsCount: Array.isArray(
        aiReviewWeekly.Insights?.Recommendations || aiReviewWeekly.insights?.recommendations,
      )
        ? (aiReviewWeekly.Insights?.Recommendations || aiReviewWeekly.insights?.recommendations)
            .length
        : 0,
    };
    addEndpointSummary(report, 'AIReview/weekly', {
      name: 'api/AIReview/weekly',
      passed: aiReviewWeeklyResponse.ok,
      blocked: false,
      status: aiReviewWeeklyResponse.status,
      latencyMs: aiReviewWeeklyResponse.durationMs,
      details: report.aiReviewWeekly,
    });

    const aiReviewApplyResponse = await requestJson(
      `${backendUrl}/api/AIReview/apply-suggestions`,
      {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          newTargetCalories:
            Number(report.nutritionCurrent.calories || report.aiNutritionCurrent.calories || 2000),
          newMacros: {
            protein: Number(report.nutritionCurrent.protein || report.aiNutritionCurrent.protein || 50),
            carbs: Number(report.nutritionCurrent.carbs || report.aiNutritionCurrent.carbs || 250),
            fat: Number(report.nutritionCurrent.fat || report.aiNutritionCurrent.fat || 65),
          },
        }),
      },
    );
    addEndpointSummary(report, 'AIReview/apply-suggestions', {
      name: 'api/AIReview/apply-suggestions',
      passed: aiReviewApplyResponse.ok,
      blocked: false,
      status: aiReviewApplyResponse.status,
      latencyMs: aiReviewApplyResponse.durationMs,
      details: {
        body: responseTextPreview(aiReviewApplyResponse),
      },
    });

    const voiceCommandsResponse = await requestJson(`${backendUrl}/api/voice/commands`, {
      headers: {
        Accept: 'application/json',
      },
    });
    const voiceCommands = voiceCommandsResponse.body || {};
    report.voiceCommands = {
      status: voiceCommandsResponse.status,
      latencyMs: voiceCommandsResponse.durationMs,
      supportedLanguages: voiceCommands.supportedLanguages || [],
      supportedIntents: voiceCommands.supportedIntents || [],
    };
    addEndpointSummary(report, 'voice/commands', {
      name: 'api/voice/commands',
      passed: voiceCommandsResponse.ok,
      blocked: false,
      status: voiceCommandsResponse.status,
      latencyMs: voiceCommandsResponse.durationMs,
      details: report.voiceCommands,
    });

    const voiceParseResponse = await requestJson(`${backendUrl}/api/voice/parse`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        text: 'hom nay toi an bao nhieu calo',
        language: 'vi',
      }),
    });
    const voiceParse = voiceParseResponse.body || {};
    report.voiceParse = {
      status: voiceParseResponse.status,
      latencyMs: voiceParseResponse.durationMs,
      intent: trim(voiceParse.Intent || voiceParse.intent),
      confidence: voiceParse.Confidence ?? voiceParse.confidence ?? null,
      reviewRequired: Boolean(voiceParse.ReviewRequired ?? voiceParse.reviewRequired),
      source: trim(voiceParse.Source || voiceParse.source),
      reviewReason: trim(voiceParse.ReviewReason || voiceParse.reviewReason),
    };
    addEndpointSummary(report, 'voice/parse', {
      name: 'api/voice/parse',
      passed: voiceParseResponse.ok,
      blocked: false,
      status: voiceParseResponse.status,
      latencyMs: voiceParseResponse.durationMs,
      details: report.voiceParse,
    });

    const voiceProcessResponse = await requestJson(`${backendUrl}/api/voice/process`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        text: 'hom nay toi an bao nhieu calo',
        language: 'vi',
      }),
    });
    const voiceProcess = voiceProcessResponse.body || {};
    report.voiceProcess = {
      status: voiceProcessResponse.status,
      latencyMs: voiceProcessResponse.durationMs,
      success: Boolean(voiceProcess.Success ?? voiceProcess.success),
      intent: trim(voiceProcess.Command?.Intent || voiceProcess.command?.intent),
      error: trim(voiceProcess.Error || voiceProcess.error),
      executedAction: voiceProcess.ExecutedAction || voiceProcess.executedAction || null,
    };
    addEndpointSummary(report, 'voice/process', {
      name: 'api/voice/process',
      passed: voiceProcessResponse.ok && Boolean(voiceProcess.Success ?? voiceProcess.success),
      blocked: false,
      status: voiceProcessResponse.status,
      latencyMs: voiceProcessResponse.durationMs,
      details: report.voiceProcess,
    });

    const voiceExecutePayload =
      voiceProcess.Command || voiceProcess.command || voiceParse.Command || voiceParse.command || {
        intent: 'ASK_CALORIES',
        entities: {},
        confidence: 0.9,
        rawText: 'hom nay toi an bao nhieu calo',
        source: 'production-smoke-ai-api',
      };
    const voiceExecuteResponse = await requestJson(`${backendUrl}/api/voice/execute`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(voiceExecutePayload),
    });
    const voiceExecute = voiceExecuteResponse.body || {};
    report.voiceExecute = {
      status: voiceExecuteResponse.status,
      latencyMs: voiceExecuteResponse.durationMs,
      success: Boolean(voiceExecute.Success ?? voiceExecute.success),
      commandIntent: trim(voiceExecute.Command?.Intent || voiceExecute.command?.intent),
      executedActionType: trim(
        voiceExecute.ExecutedAction?.Type || voiceExecute.executedAction?.type,
      ),
      error: trim(voiceExecute.Error || voiceExecute.error),
    };
    addEndpointSummary(report, 'voice/execute', {
      name: 'api/voice/execute',
      passed: voiceExecuteResponse.ok && Boolean(voiceExecute.Success ?? voiceExecute.success),
      blocked: false,
      status: voiceExecuteResponse.status,
      latencyMs: voiceExecuteResponse.durationMs,
      details: report.voiceExecute,
    });

    const voiceAddFoodTarget =
      teachTarget?.foodItemId > 0
        ? teachTarget
        : await resolveFoodItemId(backendUrl, token, [
            ...userContext.favorites,
            ...DEFAULT_INGREDIENT_FALLBACKS,
          ]);
    const voiceAddFoodName =
      trim(voiceAddFoodTarget?.foodName) || DEFAULT_INGREDIENT_FALLBACKS[0];
    const voiceAddFoodPayload = {
      intent: 'ADD_FOOD',
      entities: {
        foodName: voiceAddFoodName,
        weight: 100,
        mealType: 'Lunch',
        date: new Date().toISOString(),
      },
      confidence: 0.95,
      rawText: `them 100g ${voiceAddFoodName} bua trua`,
      source: 'production-smoke-ai-api',
      reviewRequired: true,
    };
    const voiceExecuteAddFoodResponse = await requestJson(`${backendUrl}/api/voice/execute`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(voiceAddFoodPayload),
    });
    const voiceExecuteAddFood = voiceExecuteAddFoodResponse.body || {};
    report.voiceExecuteAddFood = {
      status: voiceExecuteAddFoodResponse.status,
      latencyMs: voiceExecuteAddFoodResponse.durationMs,
      success: Boolean(voiceExecuteAddFood.Success ?? voiceExecuteAddFood.success),
      commandIntent: trim(
        voiceExecuteAddFood.Command?.Intent || voiceExecuteAddFood.command?.intent,
      ),
      executedActionType: trim(
        voiceExecuteAddFood.ExecutedAction?.Type || voiceExecuteAddFood.executedAction?.type,
      ),
      error: trim(voiceExecuteAddFood.Error || voiceExecuteAddFood.error),
      foodName: voiceAddFoodName,
    };
    addEndpointSummary(report, 'voice/execute-add-food', {
      name: 'api/voice/execute',
      passed:
        voiceExecuteAddFoodResponse.ok &&
        Boolean(voiceExecuteAddFood.Success ?? voiceExecuteAddFood.success) &&
        trim(voiceExecuteAddFood.ExecutedAction?.Type || voiceExecuteAddFood.executedAction?.type) ===
          'ADD_FOOD',
      blocked: false,
      status: voiceExecuteAddFoodResponse.status,
      latencyMs: voiceExecuteAddFoodResponse.durationMs,
      details: report.voiceExecuteAddFood,
    });

    const voiceAddFoodReadbackResponse = await requestJson(
      `${backendUrl}/api/meal-diary?date=${encodeURIComponent(toLocalDateOnly())}`,
      {
        headers: authHeaders(token),
      },
    );
    const voiceAddFoodReadbackRows = Array.isArray(voiceAddFoodReadbackResponse.body)
      ? voiceAddFoodReadbackResponse.body
      : [];
    const voiceAddFoodReadbackMatched = voiceAddFoodReadbackRows.some((row) =>
      extractStringsFromMealDiary([row]).some((value) =>
        normalizeName(value).includes(normalizeName(voiceAddFoodName)),
      ),
    );
    report.voiceExecuteAddFoodReadback = {
      status: voiceAddFoodReadbackResponse.status,
      latencyMs: voiceAddFoodReadbackResponse.durationMs,
      count: voiceAddFoodReadbackRows.length,
      matched: voiceAddFoodReadbackMatched,
      foodName: voiceAddFoodName,
    };
    addEndpointSummary(report, 'voice/execute-add-food-readback', {
      name: 'api/meal-diary',
      passed: voiceAddFoodReadbackResponse.ok && voiceAddFoodReadbackMatched,
      blocked: false,
      status: voiceAddFoodReadbackResponse.status,
      latencyMs: voiceAddFoodReadbackResponse.durationMs,
      reason: voiceAddFoodReadbackMatched ? null : 'expected-added-food-in-diary-readback',
      details: report.voiceExecuteAddFoodReadback,
    });

    const currentWeight =
      Number(
        userContext.profile.currentWeightKg ||
          userContext.profile.CurrentWeightKg ||
          70,
      ) || 70;
    const voiceConfirmResponse = await requestJson(`${backendUrl}/api/voice/confirm-weight`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        newWeight: currentWeight,
      }),
    });
    const voiceConfirm = voiceConfirmResponse.body || {};
    report.voiceConfirmWeight = {
      status: voiceConfirmResponse.status,
      latencyMs: voiceConfirmResponse.durationMs,
      success: Boolean(voiceConfirm.Success ?? voiceConfirm.success),
      executedActionType: trim(
        voiceConfirm.ExecutedAction?.Type || voiceConfirm.executedAction?.type,
      ),
      savedWeight: voiceConfirm.ExecutedAction?.Data?.savedWeight ?? null,
      error: trim(voiceConfirm.Error || voiceConfirm.error),
    };
    addEndpointSummary(report, 'voice/confirm-weight', {
      name: 'api/voice/confirm-weight',
      passed: voiceConfirmResponse.ok && Boolean(voiceConfirm.Success ?? voiceConfirm.success),
      blocked: false,
      status: voiceConfirmResponse.status,
      latencyMs: voiceConfirmResponse.durationMs,
      details: report.voiceConfirmWeight,
    });

    const voiceTranscribeFixture = trim(process.env.EATFITAI_VOICE_AUDIO_FIXTURE);
    const voiceTranscribeNegative = await requestMultipartForm(
      `${backendUrl}/api/voice/transcribe`,
      token,
      new FormData(),
    );
    addEndpointSummary(report, 'voice/transcribe-negative', {
      name: 'api/voice/transcribe',
      passed: voiceTranscribeNegative.status === 400,
      blocked: false,
      status: voiceTranscribeNegative.status,
      latencyMs: voiceTranscribeNegative.durationMs,
      reason: voiceTranscribeNegative.status === 400 ? null : 'expected-400-missing-file',
      details: {
        body: responseTextPreview(voiceTranscribeNegative),
      },
    });

    if (!voiceTranscribeFixture) {
      blockedCoverage(report, 'voice/transcribe', 'missing-EATFITAI_VOICE_AUDIO_FIXTURE', {
        endpoint: 'api/voice/transcribe',
        note: 'Pass-path stays blocked until EATFITAI_VOICE_AUDIO_FIXTURE is provided.',
      });
    } else if (!fs.existsSync(voiceTranscribeFixture)) {
      blockedCoverage(report, 'voice/transcribe', 'fixture-path-does-not-exist', {
        endpoint: 'api/voice/transcribe',
        fixturePath: voiceTranscribeFixture,
      });
    } else {
      const voiceTranscribePositive = await requestAudioMultipart(
        `${backendUrl}/api/voice/transcribe`,
        voiceTranscribeFixture,
        token,
      );
      addEndpointSummary(report, 'voice/transcribe', {
        name: 'api/voice/transcribe',
        passed: voiceTranscribePositive.ok,
        blocked: false,
        status: voiceTranscribePositive.status,
        latencyMs: voiceTranscribePositive.durationMs,
        details: {
          fixturePath: voiceTranscribeFixture,
          bodyPreview: responseTextPreview(voiceTranscribePositive),
        },
      });
    }

    const googleCredentialValue = GOOGLE_CREDENTIAL_ENV_KEYS.find((name) => {
      const value = trim(process.env[name]);
      return value && !isPlaceholder(value);
    });
    if (!googleCredentialValue) {
      blockedCoverage(report, 'google-credential-coverage', 'missing-google-credential-env', {
        envKeys: GOOGLE_CREDENTIAL_ENV_KEYS,
      });
    } else {
      report.googleCredentialCoverage = {
        envKey: googleCredentialValue,
        state: 'available',
      };
    }

    report.readback = {
      favoritesCount: userContext.favorites.length,
      mealDiaryCount: Array.isArray(userContext.mealDiaryResult.body)
        ? userContext.mealDiaryResult.body.length
        : 0,
      detectedLabels: detectResults.length,
      recipeSuggestionCount: Array.isArray(recipeSuggestions) ? recipeSuggestions.length : 0,
      voiceExecuteIntent: trim(report.voiceExecute?.commandIntent),
      voiceExecuteAddFoodMatched: Boolean(report.voiceExecuteAddFoodReadback?.matched),
      currentNutritionCalories: report.nutritionCurrent?.calories ?? null,
    };

    finalizeSummary(report);
  } catch (error) {
    report.fatalError = error instanceof Error ? error.message : String(error);
    finalizeSummary(report);
    writeJson(reportPath, report);
    console.error('[production-smoke-ai-api] Failed:', error);
    process.exit(1);
  }

  writeJson(reportPath, report);
  console.log(`[production-smoke-ai-api] Wrote ${reportPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        backendUrl,
        passed: report.passed,
        summary: report.summary,
        blockedCoverageItems: report.blockedCoverageItems.map((item) => item.key),
        failures: report.failures.map((failure) => ({
          group: failure.group,
          name: failure.name,
          status: failure.status,
          reason: failure.reason,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[production-smoke-ai-api] Unhandled failure:', error);
  process.exit(1);
});
