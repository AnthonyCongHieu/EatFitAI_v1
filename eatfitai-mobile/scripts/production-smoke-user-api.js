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
const DEFAULT_PROFILE = {
  displayName: 'Smoke User API',
  currentHeightCm: 171,
  currentWeightKg: 69.5,
  gender: 'male',
  dateOfBirth: '1996-04-09',
  activityLevelId: 3,
  goal: 'maintain',
  targetWeightKg: 68,
};
const DEFAULT_PREFERENCES = {
  dietaryRestrictions: ['low-sugar'],
  allergies: ['peanuts'],
  preferredMealsPerDay: 4,
  preferredCuisine: 'vietnamese',
};
const BODY_METRICS = [
  { offsetDays: 14, heightCm: 171, weightKg: 70.2, note: 'Smoke lane history seed' },
  { offsetDays: 7, heightCm: 171, weightKg: 69.8, note: 'Smoke lane history seed' },
];
const SEARCH_QUERIES = ['Banana', 'Egg', 'Chicken Breast'];
const FAVORITE_QUERIES = ['Banana', 'Egg'];
const JPEG_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'fixtures',
  'scan-demo',
  'ai-primary-banana-01.jpg',
);
const MEAL_TYPE_IDS = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snack: 4,
};

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value, fallback) {
  const raw = trim(value) || fallback;
  return raw.replace(/\/+$/, '');
}

function buildOutputDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUTPUT_ROOT, stamp);
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  return buildOutputDir();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLocalDateOnly(date = new Date()) {
  const local = new Date(date);
  local.setUTCHours(local.getUTCHours() + 7);
  return local.toISOString().slice(0, 10);
}

function shiftLocalDate(daysOffset) {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 7);
  date.setUTCDate(date.getUTCDate() + Number(daysOffset || 0));
  return date.toISOString().slice(0, 10);
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

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function requestJson(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  const startedAtMs = Date.now();

  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body:
        options.json !== undefined
          ? JSON.stringify(options.json)
          : options.body,
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

async function requestMultipart(url, options = {}) {
  const formData = new FormData();
  for (const field of options.fields || []) {
    if (field.filePath) {
      const buffer = fs.readFileSync(field.filePath);
      formData.append(
        field.name,
        new Blob([buffer], { type: field.mimeType || guessMimeType(field.filePath) }),
        field.fileName || path.basename(field.filePath),
      );
      continue;
    }

    if (field.value !== undefined && field.value !== null) {
      formData.append(field.name, String(field.value));
    }
  }

  return requestJson(url, {
    method: options.method || 'POST',
    headers: {
      ...(options.headers || {}),
    },
    body: formData,
  });
}

async function login(backendUrl, email, password) {
  return requestJson(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    json: { email, password },
  });
}

async function deleteProfile(backendUrl, token) {
  return requestJson(`${backendUrl}/api/profile`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

const REDACTED_VALUE = '<redacted>';
const SENSITIVE_KEYS = new Set([
  'accesstoken',
  'authorization',
  'currentpassword',
  'password',
  'refreshtoken',
  'resetcode',
  'token',
  'verificationcode',
]);

function sanitizeForReport(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForReport(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
          return [key, REDACTED_VALUE];
        }

        return [key, sanitizeForReport(item)];
      }),
    );
  }

  return value;
}

function summarizeBody(body) {
  if (Array.isArray(body)) {
    return {
      kind: 'array',
      count: body.length,
      first: sanitizeForReport(body[0] || null),
    };
  }

  if (body && typeof body === 'object') {
    return sanitizeForReport(body);
  }

  return body ?? null;
}

function recordStep(report, step, result, extra = {}, expectedOk = true) {
  const entry = {
    step,
    ok: Boolean(result && result.ok),
    status: result ? result.status : null,
    durationMs: result ? result.durationMs : null,
    ...extra,
  };

  if (result?.error) {
    entry.error = result.error;
  }
  if (result?.body?.message) {
    entry.message = result.body.message;
  }
  if (result?.body && extra.includeBody !== false) {
    entry.body = summarizeBody(result.body);
  }

  report.steps.push(entry);

  if (expectedOk && !entry.ok) {
    report.failures.push({
      step,
      status: entry.status,
      message: entry.error || entry.message || 'request failed',
    });
  }

  return entry;
}

function recordNegativeCase(report, name, result, expectedStatuses) {
  const statuses = Array.isArray(expectedStatuses)
    ? expectedStatuses
    : [expectedStatuses];
  const statusOk = statuses.includes(result.status);
  const passed = !result.ok && statusOk;

  report.negativeCases.push({
    name,
    passed,
    expectedStatuses: statuses,
    status: result.status,
    error: result.error || result.body?.message || null,
    body: summarizeBody(result.body),
  });

  if (!passed) {
    report.failures.push({
      step: name,
      status: result.status,
      message: `expected non-2xx response with status ${statuses.join('/')}`,
    });
  }

  return passed;
}

function resolveCredentials() {
  const credentials = resolveSmokeCredentials({ allowLocalDefaults: false });
  if (!credentials?.email || !credentials?.password) {
    throw new Error(
      'Missing smoke credentials. Set EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD or EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD.',
    );
  }

  return credentials;
}

function buildFoodLookup(items) {
  const catalog = Array.isArray(items) ? items : [];
  return catalog.map((item) => ({
    id: item?.FoodItemId ?? item?.Id ?? null,
    foodName: item?.FoodName || null,
    source: item?.Source || 'catalog',
    unitType: item?.UnitType || 'g',
    caloriesPer100: item?.CaloriesPer100 ?? null,
    proteinPer100: item?.ProteinPer100 ?? null,
    carbPer100: item?.CarbPer100 ?? null,
    fatPer100: item?.FatPer100 ?? null,
  }));
}

function getFoodItemId(item) {
  const rawId =
    item?.FoodItemId ??
    item?.foodItemId ??
    item?.Id ??
    item?.id ??
    null;
  const numericId = Number(rawId);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function getFoodItemName(item) {
  return trim(item?.FoodName || item?.foodName);
}

async function searchFoodItem(backendUrl, token, query) {
  const result = await requestJson(
    `${backendUrl}/api/food/search?q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: authHeaders(token),
    },
  );

  const items = Array.isArray(result.body) ? result.body : [];
  const exact = items.find(
    (item) => trim(item?.FoodName).toLowerCase() === query.trim().toLowerCase(),
  );
  const chosen = exact || items[0] || null;

  return {
    query,
    result,
    items,
    chosen,
  };
}

async function getFoodDetail(backendUrl, token, foodId) {
  return requestJson(`${backendUrl}/api/food/${foodId}`, {
    headers: authHeaders(token),
  });
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const backendUrl = normalizeBaseUrl(
    process.env.EATFITAI_SMOKE_BACKEND_URL || process.env.EXPO_PUBLIC_API_BASE_URL,
    DEFAULT_BACKEND_URL,
  );
  const credentials = resolveCredentials();

  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    cloudOnly: true,
    credentials: {
      email: credentials.email,
      source: credentials.source || 'smoke-env',
    },
    passed: false,
    failures: [],
    steps: [],
    negativeCases: [],
    reset: {
      attempted: false,
      loginOk: false,
      deleted: false,
      registerOk: null,
      source: 'login-only',
      notes: [],
    },
    seeded: {
      profile: null,
      avatar: null,
      bodyMetrics: [],
      preferences: null,
      foods: [],
      foodDetail: null,
      customDish: null,
      userFoodItems: {
        primary: null,
        scratch: null,
      },
      favorites: null,
      mealDiaries: {
        catalogMeal: null,
        customDishMeal: null,
        userFoodMeal: null,
        scratchMeal: null,
      },
      waterIntake: null,
    },
    readback: {},
  };

  if (!fs.existsSync(JPEG_FIXTURE_PATH)) {
    throw new Error(`Missing avatar fixture: ${JPEG_FIXTURE_PATH}`);
  }

  const badTokenResult = await requestJson(`${backendUrl}/api/profile`, {
    headers: {
      Authorization: 'Bearer invalid-smoke-token',
    },
  });
  recordNegativeCase(report, 'bad-token-profile-get', badTokenResult, [401, 403]);

  report.reset.attempted = true;
  const loginResult = await login(backendUrl, credentials.email, credentials.password);
  report.reset.loginOk = loginResult.ok;
  report.steps.push({
    step: 'reset-login',
    ok: loginResult.ok,
    status: loginResult.status,
    durationMs: loginResult.durationMs,
    body: summarizeBody(loginResult.body),
    error: loginResult.error || null,
  });

  let token = loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!loginResult.ok || !token) {
    report.failures.push({
      step: 'reset-login',
      status: loginResult.status,
      message: loginResult.error || loginResult.body?.message || 'sandbox login failed',
    });
    report.passed = false;
    const outputPath = path.join(outputDir, 'user-api-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`[production-smoke-user-api] Wrote ${outputPath}`);
    console.log(
      JSON.stringify(
        {
          outputDir,
          backendUrl,
          passed: report.passed,
          failures: report.failures.length,
          selectedFood: null,
          seeded: {
            profileId: null,
            customDishId: null,
            primaryUserFoodItemId: null,
            catalogMealId: null,
            customDishMealId: null,
            userFoodMealId: null,
            scratchMealId: null,
          },
        },
        null,
        2,
      ),
    );

    process.exitCode = 1;
    return;
  }

  const deleteResult = await deleteProfile(backendUrl, token);
  report.reset.deleted = deleteResult.ok;
  report.steps.push({
    step: 'reset-delete-profile',
    ok: deleteResult.ok,
    status: deleteResult.status,
    durationMs: deleteResult.durationMs,
    body: summarizeBody(deleteResult.body),
    error: deleteResult.error || deleteResult.body?.message || null,
  });
  if (deleteResult.ok) {
    report.reset.notes.push('Existing sandbox profile deleted before reseed.');
    await sleep(1500);
  } else if (deleteResult.status !== 404) {
    report.failures.push({
      step: 'reset-delete-profile',
      status: deleteResult.status,
      message: deleteResult.error || deleteResult.body?.message || 'reset delete failed',
    });
  }

  if (!token) {
    throw new Error('Authenticated token was missing after sandbox account setup.');
  }

  const profileGetBefore = await requestJson(`${backendUrl}/api/profile`, {
    headers: authHeaders(token),
  });
  recordStep(report, 'profile-get-before', profileGetBefore);

  const profileUpdatePayload = {
    ...DEFAULT_PROFILE,
    displayName: credentials.email.includes('@') ? 'Smoke User API' : DEFAULT_PROFILE.displayName,
  };
  const profileUpdate = await requestJson(`${backendUrl}/api/profile`, {
    method: 'PUT',
    headers: authHeaders(token),
    json: profileUpdatePayload,
  });
  recordStep(report, 'profile-update', profileUpdate);

  const avatarUpload = await requestMultipart(`${backendUrl}/api/profile/avatar`, {
    headers: authHeaders(token),
    fields: [
      {
        name: 'file',
        filePath: JPEG_FIXTURE_PATH,
        fileName: path.basename(JPEG_FIXTURE_PATH),
      },
    ],
  });
  recordStep(report, 'profile-avatar-upload', avatarUpload, {
    fixturePath: JPEG_FIXTURE_PATH,
  });

  const avatarMissing = await requestMultipart(`${backendUrl}/api/profile/avatar`, {
    headers: authHeaders(token),
    fields: [],
  });
  recordNegativeCase(report, 'avatar-missing-file', avatarMissing, [400]);

  const profileGetAfter = await requestJson(`${backendUrl}/api/profile`, {
    headers: authHeaders(token),
  });
  recordStep(report, 'profile-get-after', profileGetAfter);

  const bodyMetricsCreated = [];
  for (const metric of BODY_METRICS) {
    const result = await requestJson(`${backendUrl}/api/body-metrics`, {
      method: 'POST',
      headers: authHeaders(token),
      json: {
        heightCm: metric.heightCm,
        weightKg: metric.weightKg,
        measuredDate: `${shiftLocalDate(metric.offsetDays)}T07:30:00.000Z`,
        note: metric.note,
      },
    });
    const step = `body-metrics-create-${metric.offsetDays}`;
    recordStep(report, step, result);
    if (result.ok) {
      bodyMetricsCreated.push({
        ...metric,
        response: summarizeBody(result.body),
      });
    }
  }
  report.seeded.bodyMetrics = bodyMetricsCreated;

  const bodyMetricsHistory = await requestJson(
    `${backendUrl}/api/body-metrics/history?limit=10`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'body-metrics-history', bodyMetricsHistory);

  const preferencesGetBefore = await requestJson(`${backendUrl}/api/user/preferences`, {
    headers: authHeaders(token),
  });
  recordStep(report, 'preferences-get-before', preferencesGetBefore);

  const preferencesUpdate = await requestJson(`${backendUrl}/api/user/preferences`, {
    method: 'POST',
    headers: authHeaders(token),
    json: DEFAULT_PREFERENCES,
  });
  recordStep(report, 'preferences-post', preferencesUpdate);

  const preferencesGetAfter = await requestJson(`${backendUrl}/api/user/preferences`, {
    headers: authHeaders(token),
  });
  recordStep(report, 'preferences-get-after', preferencesGetAfter);

  const foodLookups = [];
  let selectedFood = null;
  for (const query of SEARCH_QUERIES) {
    const search = await searchFoodItem(backendUrl, token, query);
    const chosenFoodId = getFoodItemId(search.chosen);
    const summary = {
      query,
      ok: search.result.ok,
      status: search.result.status,
      durationMs: search.result.durationMs,
      resultCount: search.items.length,
      items: buildFoodLookup(search.items),
      chosen: search.chosen
        ? {
            id: chosenFoodId,
            foodName: getFoodItemName(search.chosen) || null,
            source: search.chosen.Source || 'catalog',
          }
        : null,
      error: search.result.error || search.result.body?.message || null,
    };
    foodLookups.push(summary);
    report.steps.push({
      step: `food-search-${query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ok: search.result.ok,
      status: search.result.status,
      durationMs: search.result.durationMs,
      body: summarizeBody(search.result.body),
      error: search.result.error || search.result.body?.message || null,
    });

    if (!selectedFood && chosenFoodId) {
      selectedFood = search.chosen;
    }
  }
  report.seeded.foods = foodLookups;

  const selectedFoodId = getFoodItemId(selectedFood);
  const selectedFoodName = getFoodItemName(selectedFood) || 'selected-food';
  if (!selectedFood || !selectedFoodId) {
    throw new Error('Unable to resolve a catalog food item from the search lane.');
  }

  const foodDetail = await getFoodDetail(backendUrl, token, selectedFoodId);
  recordStep(report, 'food-detail', foodDetail, {
    foodId: selectedFoodId,
  });
  report.seeded.foodDetail = {
    foodId: selectedFoodId,
    response: summarizeBody(foodDetail.body),
  };

  const customDishRequest = {
    dishName: 'Smoke Lane Banana Egg Bowl',
    description: 'Seeded custom dish for downstream AI checks',
    ingredients: [
      {
        foodItemId: selectedFoodId,
        grams: 120,
      },
      {
        foodItemId:
          (foodLookups.find((entry) => entry.query === 'Egg')?.chosen?.id ??
            selectedFoodId),
        grams: 60,
      },
    ],
  };
  const customDish = await requestJson(`${backendUrl}/api/custom-dishes`, {
    method: 'POST',
    headers: authHeaders(token),
    json: customDishRequest,
  });
  recordStep(report, 'custom-dish-create', customDish);
  report.seeded.customDish = {
    request: customDishRequest,
    response: summarizeBody(customDish.body),
  };
  const customDishId = customDish.body?.userDishId || customDish.body?.UserDishId || null;

  const userFoodPrimaryCreate = await requestMultipart(`${backendUrl}/api/user-food-items`, {
    headers: authHeaders(token),
    fields: [
      { name: 'FoodName', value: 'Smoke Lane Yogurt Cup' },
      { name: 'UnitType', value: 'g' },
      { name: 'CaloriesPer100', value: 98 },
      { name: 'ProteinPer100', value: 9.1 },
      { name: 'CarbPer100', value: 12.3 },
      { name: 'FatPer100', value: 2.7 },
      {
        name: 'Thumbnail',
        filePath: JPEG_FIXTURE_PATH,
        fileName: path.basename(JPEG_FIXTURE_PATH),
      },
    ],
  });
  recordStep(report, 'user-food-item-create-primary', userFoodPrimaryCreate, {
    fixturePath: JPEG_FIXTURE_PATH,
  });
  const primaryUserFoodItemId =
    userFoodPrimaryCreate.body?.userFoodItemId ||
    userFoodPrimaryCreate.body?.UserFoodItemId ||
    null;

  let userFoodPrimaryUpdate = null;
  if (primaryUserFoodItemId) {
    userFoodPrimaryUpdate = await requestMultipart(
      `${backendUrl}/api/user-food-items/${primaryUserFoodItemId}`,
      {
        method: 'PUT',
        headers: authHeaders(token),
        fields: [
          { name: 'FoodName', value: 'Smoke Lane Yogurt Cup v2' },
          { name: 'UnitType', value: 'g' },
          { name: 'CaloriesPer100', value: 101 },
          { name: 'ProteinPer100', value: 9.4 },
          { name: 'CarbPer100', value: 11.9 },
          { name: 'FatPer100', value: 2.9 },
          {
            name: 'Thumbnail',
            filePath: JPEG_FIXTURE_PATH,
            fileName: path.basename(JPEG_FIXTURE_PATH),
          },
        ],
      },
    );
    recordStep(report, 'user-food-item-update-primary', userFoodPrimaryUpdate);
  }

  let userFoodPrimaryGet = null;
  if (primaryUserFoodItemId) {
    userFoodPrimaryGet = await requestJson(
      `${backendUrl}/api/user-food-items/${primaryUserFoodItemId}`,
      {
        headers: authHeaders(token),
      },
    );
    recordStep(report, 'user-food-item-get-primary', userFoodPrimaryGet);
  }

  const userFoodScratchCreate = await requestMultipart(`${backendUrl}/api/user-food-items`, {
    headers: authHeaders(token),
    fields: [
      { name: 'FoodName', value: 'Smoke Lane Scratch Berry' },
      { name: 'UnitType', value: 'g' },
      { name: 'CaloriesPer100', value: 55 },
      { name: 'ProteinPer100', value: 1.0 },
      { name: 'CarbPer100', value: 12.0 },
      { name: 'FatPer100', value: 0.2 },
      {
        name: 'Thumbnail',
        filePath: JPEG_FIXTURE_PATH,
        fileName: path.basename(JPEG_FIXTURE_PATH),
      },
    ],
  });
  recordStep(report, 'user-food-item-create-scratch', userFoodScratchCreate, {
    fixturePath: JPEG_FIXTURE_PATH,
  });
  const scratchUserFoodItemId =
    userFoodScratchCreate.body?.userFoodItemId ||
    userFoodScratchCreate.body?.UserFoodItemId ||
    null;

  let userFoodScratchDelete = null;
  if (scratchUserFoodItemId) {
    userFoodScratchDelete = await requestJson(
      `${backendUrl}/api/user-food-items/${scratchUserFoodItemId}`,
      {
        method: 'DELETE',
        headers: authHeaders(token),
      },
    );
    recordStep(report, 'user-food-item-delete-scratch', userFoodScratchDelete, {
      includeBody: false,
    });
  }

  const userFoodList = await requestJson(
    `${backendUrl}/api/user-food-items?q=${encodeURIComponent('Smoke Lane')}&page=1&pageSize=20`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'user-food-item-list', userFoodList);

  report.seeded.userFoodItems = {
    primary: {
      create: summarizeBody(userFoodPrimaryCreate.body),
      update: summarizeBody(userFoodPrimaryUpdate?.body),
      get: summarizeBody(userFoodPrimaryGet?.body),
      id: primaryUserFoodItemId,
    },
    scratch: {
      create: summarizeBody(userFoodScratchCreate.body),
      delete: summarizeBody(userFoodScratchDelete?.body),
      id: scratchUserFoodItemId,
    },
    list: summarizeBody(userFoodList.body),
  };

  const favoriteLookups = [];
  let favoriteFoodId = null;
  for (const query of FAVORITE_QUERIES) {
    const search = foodLookups.find((entry) => entry.query === query);
    const resolvedId = search?.chosen?.id || null;
    if (resolvedId) {
      favoriteFoodId = resolvedId;
      favoriteLookups.push({ query, foodId: resolvedId });
      break;
    }
  }
  if (!favoriteFoodId) {
    favoriteFoodId = selectedFoodId;
    favoriteLookups.push({ query: selectedFoodName, foodId: favoriteFoodId });
  }

  const favoriteToggle = await requestJson(`${backendUrl}/api/favorites`, {
    method: 'POST',
    headers: authHeaders(token),
    json: { foodItemId: favoriteFoodId },
  });
  recordStep(report, 'favorites-toggle', favoriteToggle, {
    foodItemId: favoriteFoodId,
  });

  const favoriteCheck = await requestJson(
    `${backendUrl}/api/favorites/check/${favoriteFoodId}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'favorites-check', favoriteCheck, {
    foodItemId: favoriteFoodId,
  });

  const favoriteList = await requestJson(`${backendUrl}/api/favorites`, {
    headers: authHeaders(token),
  });
  recordStep(report, 'favorites-list', favoriteList);

  report.seeded.favorites = {
    lookups: favoriteLookups,
    toggle: summarizeBody(favoriteToggle.body),
    check: summarizeBody(favoriteCheck.body),
    list: summarizeBody(favoriteList.body),
  };

  const today = toLocalDateOnly();
  const yesterday = shiftLocalDate(-1);

  const catalogMeal = await requestJson(`${backendUrl}/api/meal-diary`, {
    method: 'POST',
    headers: authHeaders(token),
    json: {
      eatenDate: `${today}T07:30:00.000Z`,
      mealTypeId: MEAL_TYPE_IDS.Breakfast,
      foodItemId: selectedFoodId,
      grams: 118,
      calories: 105,
      protein: 1.3,
      carb: 27,
      fat: 0.3,
      note: 'Smoke lane catalog meal',
      sourceMethod: 'manual',
    },
  });
  recordStep(report, 'meal-diary-create-catalog', catalogMeal);
  const catalogMealId = catalogMeal.body?.mealDiaryId || catalogMeal.body?.MealDiaryId || null;
  let catalogMealUpdate = null;
  if (catalogMealId) {
    catalogMealUpdate = await requestJson(`${backendUrl}/api/meal-diary/${catalogMealId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      json: {
        eatenDate: `${today}T07:45:00.000Z`,
        mealTypeId: MEAL_TYPE_IDS.Breakfast,
        foodItemId: selectedFoodId,
        grams: 125,
        calories: 112,
        protein: 1.4,
        carb: 28,
        fat: 0.3,
        note: 'Smoke lane catalog meal updated',
        sourceMethod: 'manual',
      },
    });
    recordStep(report, 'meal-diary-update-catalog', catalogMealUpdate);
  }

  let catalogMealGetAfterUpdate = null;
  if (catalogMealId) {
    catalogMealGetAfterUpdate = await requestJson(
      `${backendUrl}/api/meal-diary/${catalogMealId}`,
      {
        headers: authHeaders(token),
      },
    );
    recordStep(report, 'meal-diary-catalog-get-after-update', catalogMealGetAfterUpdate);
  }

  const customDishMeal = customDishId
    ? await requestJson(`${backendUrl}/api/meal-diary`, {
        method: 'POST',
        headers: authHeaders(token),
        json: {
          eatenDate: `${today}T08:30:00.000Z`,
          mealTypeId: MEAL_TYPE_IDS.Lunch,
          userDishId: customDishId,
          grams: 180,
          calories: 240,
          protein: 12,
          carb: 28,
          fat: 8,
          note: 'Smoke lane custom dish meal',
          sourceMethod: 'manual',
        },
      })
    : { ok: false, status: null, durationMs: 0, error: 'missing customDishId' };
  recordStep(report, 'meal-diary-create-custom-dish', customDishMeal);
  const customDishMealId =
    customDishMeal.body?.mealDiaryId || customDishMeal.body?.MealDiaryId || null;

  const userFoodMeal = primaryUserFoodItemId
    ? await requestJson(`${backendUrl}/api/meal-diary`, {
        method: 'POST',
        headers: authHeaders(token),
        json: {
          eatenDate: `${today}T10:30:00.000Z`,
          mealTypeId: MEAL_TYPE_IDS.Snack,
          userFoodItemId: primaryUserFoodItemId,
          grams: 150,
          calories: 150,
          protein: 14,
          carb: 18,
          fat: 4,
          note: 'Smoke lane user food meal',
          sourceMethod: 'user',
        },
      })
    : { ok: false, status: null, durationMs: 0, error: 'missing primaryUserFoodItemId' };
  recordStep(report, 'meal-diary-create-user-food', userFoodMeal);
  const userFoodMealId = userFoodMeal.body?.mealDiaryId || userFoodMeal.body?.MealDiaryId || null;

  const scratchMeal = await requestJson(`${backendUrl}/api/meal-diary`, {
    method: 'POST',
    headers: authHeaders(token),
    json: {
      eatenDate: `${yesterday}T18:30:00.000Z`,
      mealTypeId: MEAL_TYPE_IDS.Dinner,
      foodItemId: selectedFoodId,
      grams: 90,
      calories: 80,
      protein: 1,
      carb: 20,
      fat: 0.2,
      note: 'Smoke lane scratch meal',
      sourceMethod: 'manual',
    },
  });
  recordStep(report, 'meal-diary-create-scratch', scratchMeal);
  const scratchMealId = scratchMeal.body?.mealDiaryId || scratchMeal.body?.MealDiaryId || null;

  const dayReadback = await requestJson(
    `${backendUrl}/api/meal-diary?date=${encodeURIComponent(today)}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'meal-diary-day-readback', dayReadback);

  let scratchMealGet = null;
  if (scratchMealId) {
    scratchMealGet = await requestJson(`${backendUrl}/api/meal-diary/${scratchMealId}`, {
      headers: authHeaders(token),
    });
    recordStep(report, 'meal-diary-scratch-get-before-delete', scratchMealGet);
  }

  let scratchMealDelete = null;
  if (scratchMealId) {
    scratchMealDelete = await requestJson(`${backendUrl}/api/meal-diary/${scratchMealId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    recordStep(report, 'meal-diary-scratch-delete', scratchMealDelete, {
      includeBody: false,
    });
  }

  const scratchMealMissing = scratchMealId
    ? await requestJson(`${backendUrl}/api/meal-diary/${scratchMealId}`, {
        headers: authHeaders(token),
      })
    : { ok: false, status: null, durationMs: 0, error: 'missing scratchMealId' };
  recordNegativeCase(report, 'meal-diary-not-found', scratchMealMissing, [404]);

  report.seeded.mealDiaries = {
    catalogMeal: {
      id: catalogMealId,
      create: summarizeBody(catalogMeal.body),
      update: summarizeBody(catalogMealUpdate?.body),
      getAfterUpdate: summarizeBody(catalogMealGetAfterUpdate?.body),
    },
    customDishMeal: {
      id: customDishMealId,
      create: summarizeBody(customDishMeal.body),
    },
    userFoodMeal: {
      id: userFoodMealId,
      create: summarizeBody(userFoodMeal.body),
    },
    scratchMeal: {
      id: scratchMealId,
      create: summarizeBody(scratchMeal.body),
      get: summarizeBody(scratchMealGet?.body),
      delete: summarizeBody(scratchMealDelete?.body),
    },
  };

  const waterGetBefore = await requestJson(
    `${backendUrl}/api/water-intake?date=${encodeURIComponent(today)}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'water-get-before', waterGetBefore);

  const waterAdd1 = await requestJson(`${backendUrl}/api/water-intake/add`, {
    method: 'POST',
    headers: authHeaders(token),
    json: { date: today },
  });
  recordStep(report, 'water-add-1', waterAdd1);

  const waterAdd2 = await requestJson(`${backendUrl}/api/water-intake/add`, {
    method: 'POST',
    headers: authHeaders(token),
    json: { date: today },
  });
  recordStep(report, 'water-add-2', waterAdd2);

  const waterSubtract = await requestJson(`${backendUrl}/api/water-intake/subtract`, {
    method: 'POST',
    headers: authHeaders(token),
    json: { date: today },
  });
  recordStep(report, 'water-subtract', waterSubtract);

  const waterMonthly = await requestJson(
    `${backendUrl}/api/water-intake/monthly?year=${encodeURIComponent(
      Number(today.slice(0, 4)),
    )}&month=${encodeURIComponent(Number(today.slice(5, 7)))}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'water-monthly', waterMonthly);

  report.seeded.waterIntake = {
    date: today,
    before: summarizeBody(waterGetBefore.body),
    add1: summarizeBody(waterAdd1.body),
    add2: summarizeBody(waterAdd2.body),
    subtract: summarizeBody(waterSubtract.body),
    monthly: summarizeBody(waterMonthly.body),
  };

  const summaryDay = await requestJson(
    `${backendUrl}/api/summary/day?date=${encodeURIComponent(today)}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'summary-day', summaryDay);

  const summaryWeek = await requestJson(
    `${backendUrl}/api/summary/week?date=${encodeURIComponent(today)}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'summary-week', summaryWeek);

  const analyticsNutritionSummary = await requestJson(
    `${backendUrl}/api/analytics/nutrition-summary?startDate=${encodeURIComponent(
      shiftLocalDate(-7),
    )}&endDate=${encodeURIComponent(today)}`,
    {
      headers: authHeaders(token),
    },
  );
  recordStep(report, 'analytics-nutrition-summary', analyticsNutritionSummary);

  report.readback = {
    profileBefore: summarizeBody(profileGetBefore.body),
    profileAfter: summarizeBody(profileGetAfter.body),
    avatar: summarizeBody(avatarUpload.body),
    bodyMetricsHistory: summarizeBody(bodyMetricsHistory.body),
    preferencesBefore: summarizeBody(preferencesGetBefore.body),
    preferencesAfter: summarizeBody(preferencesGetAfter.body),
    foodDetail: summarizeBody(foodDetail.body),
    favorites: summarizeBody(favoriteList.body),
    mealDiaryDay: summarizeBody(dayReadback.body),
    waterMonthly: summarizeBody(waterMonthly.body),
    summaryDay: summarizeBody(summaryDay.body),
    summaryWeek: summarizeBody(summaryWeek.body),
    analyticsNutritionSummary: summarizeBody(analyticsNutritionSummary.body),
  };

  const chosenProfile = profileGetAfter.body || profileUpdate.body || profileGetBefore.body || {};
  const requiredFailures = report.failures.length;
  report.seeded.profile = {
    before: summarizeBody(profileGetBefore.body),
    after: summarizeBody(profileGetAfter.body),
    updateRequest: profileUpdatePayload,
    avatarFixture: JPEG_FIXTURE_PATH,
    avatarUpload: summarizeBody(avatarUpload.body),
    selectedUserId: chosenProfile.userId || chosenProfile.UserId || null,
  };

  report.passed = requiredFailures === 0;

  const outputPath = path.join(outputDir, 'user-api-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[production-smoke-user-api] Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        backendUrl,
        passed: report.passed,
        failures: report.failures.length,
        selectedFood: selectedFood
          ? { id: selectedFoodId, foodName: selectedFoodName }
          : null,
        seeded: {
          profileId: report.seeded.profile?.selectedUserId || null,
          customDishId,
          primaryUserFoodItemId,
          catalogMealId,
          customDishMealId,
          userFoodMealId,
          scratchMealId,
        },
      },
      null,
      2,
    ),
  );

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[production-smoke-user-api] Failed:', error);
  process.exit(1);
});
