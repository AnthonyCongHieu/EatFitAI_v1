const fs = require('fs');
const path = require('path');
const {
  buildSafeMailboxArtifact,
  buildSafeVerificationArtifact,
  createMailboxUnavailableError,
  getErrorReason,
  isEmailUnverifiedLogin,
} = require('./lib/seed-verification');

const DEFAULT_BACKEND_URL = 'https://eatfitai-backend-dev.onrender.com';
const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const DEFAULT_DEMO_EMAIL = 'scan-demo@redacted.local';
const DEFAULT_DEMO_PASSWORD = 'SET_IN_SEED_SCRIPT';
const DEFAULT_DEMO_DISPLAY_NAME = 'Scan Demo Reliability';
const DEFAULT_MAIL_API = 'https://api.mail.tm';
const VERIFY_TIMEOUT_MS = 240000;
const VERIFY_POLL_INTERVAL_MS = 10000;
let pendingFailureReport = null;

const DEFAULT_PROFILE = {
  displayName: DEFAULT_DEMO_DISPLAY_NAME,
  currentHeightCm: 170,
  currentWeightKg: 70,
  gender: 'male',
  dateOfBirth: '1996-04-09',
  activityLevelId: 3,
  goal: 'maintain',
  targetWeightKg: 68,
};

const DEFAULT_PREFERENCES = {
  dietaryRestrictions: [],
  allergies: [],
  preferredMealsPerDay: 4,
  preferredCuisine: 'vietnamese',
};

const BODY_METRICS = [
  { daysAgo: 21, heightCm: 170, weightKg: 71.2, note: 'Seeded weekly check-in' },
  { daysAgo: 14, heightCm: 170, weightKg: 70.8, note: 'Seeded weekly check-in' },
  { daysAgo: 7, heightCm: 170, weightKg: 70.4, note: 'Seeded weekly check-in' },
];

const NUTRITION_TARGETS = [
  { daysAgo: 60, calories: 2250, protein: 145, carb: 255, fat: 70 },
  { daysAgo: 14, calories: 2150, protein: 140, carb: 240, fat: 68 },
];

const FAVORITE_FOODS = ['Chicken Breast', 'Banana'];

const FOOD_NAME_ALIASES = {
  Egg: ['Trứng gà', 'Trứng gà (luộc)', 'Trứng gà (chiên)'],
  'Greek Yogurt': ['Sữa chua không đường', 'Sữa chua có đường'],
  Banana: ['Chuối (tươi)'],
  'Chicken Breast': ['Ức gà (luộc)', 'Ức gà (sống)'],
  'Brown Rice': ['Cơm gạo lứt (chín)'],
  Broccoli: ['Bông cải xanh', 'Bông cải xanh (luộc)'],
  Salmon: ['Cá hồi (sống)'],
  'Sweet Potato': ['Khoai lang (luộc)', 'Khoai lang (tươi)'],
  Spinach: ['Rau muống (tươi)'],
  Almonds: ['Hạt hạnh nhân'],
};

const MEAL_TYPE_IDS = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snack: 4,
};

const DEMO_MEALS = [
  {
    dayOffset: 0,
    mealType: 'Breakfast',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded breakfast eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 0,
    mealType: 'Breakfast',
    foodName: 'Greek Yogurt',
    grams: 180,
    seedSource: 'manual',
    note: 'Seeded breakfast yogurt',
  },
  {
    dayOffset: 0,
    mealType: 'Breakfast',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'manual',
    note: 'Seeded breakfast banana',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 0,
    mealType: 'Lunch',
    foodName: 'Chicken Breast',
    grams: 160,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch protein',
  },
  {
    dayOffset: 0,
    mealType: 'Lunch',
    foodName: 'Brown Rice',
    grams: 185,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch carbs',
  },
  {
    dayOffset: 0,
    mealType: 'Lunch',
    foodName: 'Broccoli',
    grams: 120,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch greens',
  },
  {
    dayOffset: 0,
    mealType: 'Dinner',
    foodName: 'Salmon',
    grams: 170,
    seedSource: 'manual',
    note: 'Seeded dinner salmon',
  },
  {
    dayOffset: 0,
    mealType: 'Dinner',
    foodName: 'Sweet Potato',
    grams: 180,
    seedSource: 'manual',
    note: 'Seeded dinner sweet potato',
  },
  {
    dayOffset: 0,
    mealType: 'Dinner',
    foodName: 'Spinach',
    grams: 90,
    seedSource: 'manual',
    note: 'Seeded dinner spinach',
  },
  {
    dayOffset: 0,
    mealType: 'Snack',
    foodName: 'Almonds',
    grams: 25,
    seedSource: 'voice',
    note: 'Seeded voice snack almonds',
  },

  {
    dayOffset: 1,
    mealType: 'Breakfast',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded breakfast eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 1,
    mealType: 'Breakfast',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'manual',
    note: 'Seeded breakfast banana',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 1,
    mealType: 'Lunch',
    foodName: 'Chicken Breast',
    grams: 150,
    seedSource: 'manual',
    note: 'Seeded lunch chicken',
  },
  {
    dayOffset: 1,
    mealType: 'Lunch',
    foodName: 'Brown Rice',
    grams: 170,
    seedSource: 'manual',
    note: 'Seeded lunch rice',
  },
  {
    dayOffset: 1,
    mealType: 'Lunch',
    foodName: 'Broccoli',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded lunch broccoli',
  },
  {
    dayOffset: 1,
    mealType: 'Dinner',
    foodName: 'Salmon',
    grams: 160,
    seedSource: 'manual',
    note: 'Seeded dinner salmon',
  },
  {
    dayOffset: 1,
    mealType: 'Dinner',
    foodName: 'Sweet Potato',
    grams: 170,
    seedSource: 'manual',
    note: 'Seeded dinner sweet potato',
  },
  {
    dayOffset: 1,
    mealType: 'Snack',
    foodName: 'Greek Yogurt',
    grams: 150,
    seedSource: 'manual',
    note: 'Seeded snack yogurt',
  },

  {
    dayOffset: 2,
    mealType: 'Breakfast',
    foodName: 'Greek Yogurt',
    grams: 200,
    seedSource: 'manual',
    note: 'Seeded breakfast yogurt',
  },
  {
    dayOffset: 2,
    mealType: 'Breakfast',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'manual',
    note: 'Seeded breakfast banana',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 2,
    mealType: 'Lunch',
    foodName: 'Chicken Breast',
    grams: 155,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch protein',
  },
  {
    dayOffset: 2,
    mealType: 'Lunch',
    foodName: 'Brown Rice',
    grams: 185,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch carbs',
  },
  {
    dayOffset: 2,
    mealType: 'Lunch',
    foodName: 'Broccoli',
    grams: 110,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch greens',
  },
  {
    dayOffset: 2,
    mealType: 'Dinner',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded dinner eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 2,
    mealType: 'Dinner',
    foodName: 'Spinach',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded dinner spinach',
  },
  {
    dayOffset: 2,
    mealType: 'Snack',
    foodName: 'Almonds',
    grams: 20,
    seedSource: 'voice',
    note: 'Seeded voice snack almonds',
  },

  {
    dayOffset: 3,
    mealType: 'Breakfast',
    foodName: 'Egg',
    grams: 50,
    seedSource: 'manual',
    note: 'Seeded breakfast egg',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 3,
    mealType: 'Breakfast',
    foodName: 'Greek Yogurt',
    grams: 180,
    seedSource: 'manual',
    note: 'Seeded breakfast yogurt',
  },
  {
    dayOffset: 3,
    mealType: 'Lunch',
    foodName: 'Salmon',
    grams: 160,
    seedSource: 'manual',
    note: 'Seeded lunch salmon',
  },
  {
    dayOffset: 3,
    mealType: 'Lunch',
    foodName: 'Sweet Potato',
    grams: 180,
    seedSource: 'manual',
    note: 'Seeded lunch sweet potato',
  },
  {
    dayOffset: 3,
    mealType: 'Lunch',
    foodName: 'Spinach',
    grams: 90,
    seedSource: 'manual',
    note: 'Seeded lunch spinach',
  },
  {
    dayOffset: 3,
    mealType: 'Dinner',
    foodName: 'Chicken Breast',
    grams: 150,
    seedSource: 'manual',
    note: 'Seeded dinner chicken',
  },
  {
    dayOffset: 3,
    mealType: 'Dinner',
    foodName: 'Brown Rice',
    grams: 160,
    seedSource: 'manual',
    note: 'Seeded dinner rice',
  },
  {
    dayOffset: 3,
    mealType: 'Snack',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'voice',
    note: 'Seeded voice snack banana',
    quantityNote: '1 piece',
  },

  {
    dayOffset: 4,
    mealType: 'Breakfast',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded breakfast eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 4,
    mealType: 'Breakfast',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'manual',
    note: 'Seeded breakfast banana',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 4,
    mealType: 'Lunch',
    foodName: 'Chicken Breast',
    grams: 150,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch protein',
  },
  {
    dayOffset: 4,
    mealType: 'Lunch',
    foodName: 'Brown Rice',
    grams: 185,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch carbs',
  },
  {
    dayOffset: 4,
    mealType: 'Lunch',
    foodName: 'Broccoli',
    grams: 120,
    seedSource: 'vision',
    note: 'Seeded scan demo lunch greens',
  },
  {
    dayOffset: 4,
    mealType: 'Dinner',
    foodName: 'Salmon',
    grams: 165,
    seedSource: 'manual',
    note: 'Seeded dinner salmon',
  },
  {
    dayOffset: 4,
    mealType: 'Dinner',
    foodName: 'Spinach',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded dinner spinach',
  },
  {
    dayOffset: 4,
    mealType: 'Snack',
    foodName: 'Greek Yogurt',
    grams: 150,
    seedSource: 'voice',
    note: 'Seeded voice snack yogurt',
  },

  {
    dayOffset: 5,
    mealType: 'Breakfast',
    foodName: 'Greek Yogurt',
    grams: 190,
    seedSource: 'manual',
    note: 'Seeded breakfast yogurt',
  },
  {
    dayOffset: 5,
    mealType: 'Breakfast',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'manual',
    note: 'Seeded breakfast banana',
    quantityNote: '1 piece',
  },
  {
    dayOffset: 5,
    mealType: 'Lunch',
    foodName: 'Chicken Breast',
    grams: 145,
    seedSource: 'manual',
    note: 'Seeded lunch chicken',
  },
  {
    dayOffset: 5,
    mealType: 'Lunch',
    foodName: 'Brown Rice',
    grams: 175,
    seedSource: 'manual',
    note: 'Seeded lunch rice',
  },
  {
    dayOffset: 5,
    mealType: 'Lunch',
    foodName: 'Broccoli',
    grams: 95,
    seedSource: 'manual',
    note: 'Seeded lunch broccoli',
  },
  {
    dayOffset: 5,
    mealType: 'Dinner',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded dinner eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 5,
    mealType: 'Dinner',
    foodName: 'Spinach',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded dinner spinach',
  },
  {
    dayOffset: 5,
    mealType: 'Snack',
    foodName: 'Almonds',
    grams: 20,
    seedSource: 'voice',
    note: 'Seeded voice snack almonds',
  },

  {
    dayOffset: 6,
    mealType: 'Breakfast',
    foodName: 'Egg',
    grams: 100,
    seedSource: 'manual',
    note: 'Seeded breakfast eggs',
    quantityNote: '2 pieces',
  },
  {
    dayOffset: 6,
    mealType: 'Breakfast',
    foodName: 'Greek Yogurt',
    grams: 180,
    seedSource: 'manual',
    note: 'Seeded breakfast yogurt',
  },
  {
    dayOffset: 6,
    mealType: 'Lunch',
    foodName: 'Salmon',
    grams: 150,
    seedSource: 'manual',
    note: 'Seeded lunch salmon',
  },
  {
    dayOffset: 6,
    mealType: 'Lunch',
    foodName: 'Sweet Potato',
    grams: 170,
    seedSource: 'manual',
    note: 'Seeded lunch sweet potato',
  },
  {
    dayOffset: 6,
    mealType: 'Lunch',
    foodName: 'Spinach',
    grams: 90,
    seedSource: 'manual',
    note: 'Seeded lunch spinach',
  },
  {
    dayOffset: 6,
    mealType: 'Dinner',
    foodName: 'Chicken Breast',
    grams: 150,
    seedSource: 'manual',
    note: 'Seeded dinner chicken',
  },
  {
    dayOffset: 6,
    mealType: 'Dinner',
    foodName: 'Brown Rice',
    grams: 165,
    seedSource: 'manual',
    note: 'Seeded dinner rice',
  },
  {
    dayOffset: 6,
    mealType: 'Snack',
    foodName: 'Banana',
    grams: 118,
    seedSource: 'voice',
    note: 'Seeded voice snack banana',
    quantityNote: '1 piece',
  },
];

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value, fallback) {
  return (trim(value) || fallback).replace(/\/+$/, '');
}

function buildNewOutputDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUTPUT_ROOT, stamp);
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  if (!fs.existsSync(DEFAULT_OUTPUT_ROOT)) {
    return buildNewOutputDir();
  }

  const candidates = fs
    .readdirSync(DEFAULT_OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (candidates.length === 0) {
    return buildNewOutputDir();
  }

  return path.join(DEFAULT_OUTPUT_ROOT, candidates[0]);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeDate(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Number(daysAgo || 0));
  return normalizeDate(date);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(value) {
  return trim(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function requestJson(url, options = {}) {
  const startedAt = Date.now();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
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
      durationMs: Date.now() - startedAt,
      body,
      rawText: body ? undefined : rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getMailItems(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.['hydra:member'])) {
    return body['hydra:member'];
  }

  return [];
}

function extractVerificationCode(message) {
  const candidates = [message?.text, message?.html, message?.intro, message?.subject]
    .filter(Boolean)
    .map((value) => String(value));

  for (const candidate of candidates) {
    const match = candidate.match(/\b(\d{6})\b/);
    if (match) {
      return match[1];
    }
  }

  return '';
}

async function requestMailboxToken(mailApi, address, password) {
  let lastResult = null;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    lastResult = await requestJson(`${mailApi}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password }),
    });

    if (lastResult.ok && lastResult.body?.token) {
      return lastResult;
    }

    if (attempt < 6) {
      await wait(5000);
    }
  }

  return lastResult;
}

async function resolveDisposableMailbox(credentials, outputDir) {
  const email = trim(credentials.email).toLowerCase();
  const password = trim(credentials.password);
  if (!email || !password) {
    return null;
  }

  const emailDomain = email.includes('@') ? email.split('@').pop() : '';
  if (!emailDomain) {
    return null;
  }

  const mailApi = trim(process.env.EATFITAI_DEMO_MAIL_API) || DEFAULT_MAIL_API;
  const domainsResult = await requestJson(`${mailApi}/domains`);
  const supportedDomains = getMailItems(domainsResult.body)
    .map((entry) => trim(entry?.domain).toLowerCase())
    .filter(Boolean);

  if (!domainsResult.ok || supportedDomains.length === 0 || !supportedDomains.includes(emailDomain)) {
    return null;
  }

  const tokenResult = await requestMailboxToken(mailApi, email, password);
  if (!tokenResult?.ok || !tokenResult.body?.token) {
    throw createMailboxUnavailableError(
      `failed to create mailbox token for ${email}. Status=${tokenResult?.status || 'unknown'}`,
    );
  }

  const artifact = buildSafeMailboxArtifact({
    address: email,
    token: tokenResult.body.token,
    mailApi,
  });
  const artifactPath = path.join(outputDir, 'disposable-mailbox.json');
  writeJson(artifactPath, artifact);

  return {
    artifactPath,
    address: email,
    token: tokenResult.body.token,
    mailApi,
  };
}

function selectNewestVerificationMessage(items, createdAfterIso = '') {
  const createdAfterMs = createdAfterIso ? Date.parse(createdAfterIso) : Number.NaN;
  return [...(Array.isArray(items) ? items : [])]
    .filter((item) => {
      if (!Number.isFinite(createdAfterMs)) {
        return true;
      }

      const createdAtMs = Date.parse(item?.createdAt || item?.updatedAt || 0);
      return Number.isFinite(createdAtMs) && createdAtMs >= createdAfterMs - 1000;
    })
    .sort((left, right) => {
      const rightMs = Date.parse(right?.updatedAt || right?.createdAt || 0);
      const leftMs = Date.parse(left?.updatedAt || left?.createdAt || 0);
      return (Number.isFinite(rightMs) ? rightMs : 0) - (Number.isFinite(leftMs) ? leftMs : 0);
    })[0] || null;
}

async function waitForVerificationMessage(mailbox, outputDir, options = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < VERIFY_TIMEOUT_MS) {
    const messages = await requestJson(`${mailbox.mailApi}/messages`, {
      headers: {
        Authorization: `Bearer ${mailbox.token}`,
      },
    });

    if (messages.ok) {
      const items = getMailItems(messages.body);
      const newest = selectNewestVerificationMessage(items, options.createdAfterIso);
      if (newest?.id) {
        const detail = await requestJson(`${mailbox.mailApi}/messages/${newest.id}`, {
          headers: {
            Authorization: `Bearer ${mailbox.token}`,
          },
        });

        if (detail.ok) {
          const verificationCode = extractVerificationCode(detail.body);
          const artifact = buildSafeVerificationArtifact({
            mailbox: mailbox.address,
            messageCount: items.length,
            newestMessageId: newest.id,
            subject: detail.body?.subject || newest.subject || '',
            verificationCode,
          });
          const artifactPath = path.join(outputDir, 'disposable-mail-message.json');
          writeJson(artifactPath, artifact);

          if (verificationCode) {
            return {
              artifactPath,
              verificationCode,
              subject: artifact.subject,
            };
          }
        }
      }
    }

    await wait(VERIFY_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for disposable mailbox verification message for ${mailbox.address}.`);
}

async function login(backendUrl, email, password) {
  return requestJson(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

async function registerLegacy(backendUrl, email, password, displayName) {
  return requestJson(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, displayName }),
  });
}

async function registerWithVerification(backendUrl, email, password, displayName) {
  return requestJson(`${backendUrl}/api/auth/register-with-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, displayName }),
  });
}

async function verifyEmailCode(backendUrl, email, verificationCode) {
  return requestJson(`${backendUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, verificationCode }),
  });
}

async function resendVerification(backendUrl, email) {
  return requestJson(`${backendUrl}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function resetAccount(backendUrl, credentials, events) {
  const loginResult = await login(backendUrl, credentials.email, credentials.password);
  events.push({
    step: 'login-before-reset',
    ok: loginResult.ok,
    status: loginResult.status,
    durationMs: loginResult.durationMs,
    error: loginResult.error || loginResult.body?.message || null,
  });

  const accessToken = loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!loginResult.ok || !accessToken) {
    return {
      resetAttempted: false,
      deleted: false,
      loginResult,
    };
  }

  const deleteResult = await requestJson(`${backendUrl}/api/profile`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  events.push({
    step: 'delete-existing-profile',
    ok: deleteResult.ok,
    status: deleteResult.status,
    durationMs: deleteResult.durationMs,
    error: deleteResult.error || deleteResult.body?.message || null,
  });

  if (deleteResult.ok) {
    await wait(1500);
  }

  return {
    resetAttempted: true,
    deleted: deleteResult.ok,
    loginResult,
    deleteResult,
  };
}

async function recoverUnverifiedExistingAccount(backendUrl, credentials, events, outputDir) {
  const mailbox = await resolveDisposableMailbox(credentials, outputDir);
  if (!mailbox) {
    throw createMailboxUnavailableError(
      `mail.tm-compatible mailbox is required for ${credentials.email}`,
    );
  }

  const resendTriggeredAt = new Date().toISOString();
  const resendResult = await resendVerification(backendUrl, credentials.email);
  events.push({
    step: 'resend-verification-existing-demo-account',
    ok: resendResult.ok,
    status: resendResult.status,
    durationMs: resendResult.durationMs,
    error: resendResult.error || resendResult.body?.message || null,
  });
  if (!resendResult.ok) {
    throw new Error(
      `Cloud resend verification failed. Status=${resendResult.status} Error=${resendResult.error || resendResult.body?.message || resendResult.rawText || 'unknown'}`,
    );
  }

  let verificationCode = trim(resendResult.body?.verificationCode);
  let verificationArtifactPath = '';
  if (!verificationCode) {
    const message = await waitForVerificationMessage(mailbox, outputDir, {
      createdAfterIso: resendTriggeredAt,
    });
    verificationCode = message.verificationCode;
    verificationArtifactPath = message.artifactPath;
  }

  const verifyResult = await verifyEmailCode(backendUrl, credentials.email, verificationCode);
  events.push({
    step: 'verify-existing-demo-account-email',
    ok: verifyResult.ok,
    status: verifyResult.status,
    durationMs: verifyResult.durationMs,
    error: verifyResult.error || verifyResult.body?.message || null,
  });
  if (!verifyResult.ok) {
    throw new Error(
      `Cloud verify existing demo account failed. Status=${verifyResult.status} Error=${verifyResult.error || verifyResult.body?.message || verifyResult.rawText || 'unknown'}`,
    );
  }

  const loginResult = await login(backendUrl, credentials.email, credentials.password);
  events.push({
    step: 'login-after-existing-email-verify',
    ok: loginResult.ok,
    status: loginResult.status,
    durationMs: loginResult.durationMs,
    error: loginResult.error || loginResult.body?.message || null,
  });

  const accessToken = loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!loginResult.ok || !accessToken) {
    throw new Error(
      `Cloud relogin failed after existing account verify. Status=${loginResult.status} Error=${loginResult.error || loginResult.body?.message || 'unknown'}`,
    );
  }

  return {
    accessToken,
    refreshToken: loginResult.body?.refreshToken || '',
    source: 'resend-verify-relogin',
    response: loginResult,
    mailboxArtifactPath: mailbox.artifactPath || '',
    verificationArtifactPath,
  };
}

function isLegacyRegistrationGone(registerResult) {
  const message = trim(registerResult?.body?.message || registerResult?.rawText || '').toLowerCase();
  return registerResult?.status === 410 || message.includes('register-with-verification');
}

async function authenticateFreshAccountWithVerification(
  backendUrl,
  credentials,
  events,
  outputDir,
) {
  const mailbox = await resolveDisposableMailbox(credentials, outputDir);
  const registerTriggeredAt = new Date().toISOString();
  let registerResult = await registerWithVerification(
    backendUrl,
    credentials.email,
    credentials.password,
    credentials.displayName,
  );
  events.push({
    step: 'register-demo-account-with-verification',
    ok: registerResult.ok,
    status: registerResult.status,
    durationMs: registerResult.durationMs,
    error: registerResult.error || registerResult.body?.message || null,
  });

  if (!registerResult.ok) {
    if (registerResult.status !== 400) {
      throw new Error(
        `Cloud register-with-verification failed. Status=${registerResult.status} Error=${registerResult.error || registerResult.body?.message || registerResult.rawText || 'unknown'}`,
      );
    }

    await wait(1500);
    registerResult = await registerWithVerification(
      backendUrl,
      credentials.email,
      credentials.password,
      credentials.displayName,
    );
    events.push({
      step: 'register-demo-account-with-verification-retry',
      ok: registerResult.ok,
      status: registerResult.status,
      durationMs: registerResult.durationMs,
      error: registerResult.error || registerResult.body?.message || null,
    });
  }

  if (!registerResult.ok) {
    throw new Error(
      `Cloud register-with-verification retry failed. Status=${registerResult.status} Error=${registerResult.error || registerResult.body?.message || registerResult.rawText || 'unknown'}`,
    );
  }

  let verificationCode = trim(registerResult.body?.verificationCode);
  let verificationArtifactPath = '';
  if (!verificationCode) {
    if (!mailbox) {
      throw createMailboxUnavailableError(
        'Cloud seed now requires a mail.tm-compatible email-verification mailbox in EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD.',
      );
    }

    const message = await waitForVerificationMessage(mailbox, outputDir, {
      createdAfterIso: registerTriggeredAt,
    });
    verificationCode = message.verificationCode;
    verificationArtifactPath = message.artifactPath;
  }

  const verifyResult = await verifyEmailCode(backendUrl, credentials.email, verificationCode);
  events.push({
    step: 'verify-demo-account-email',
    ok: verifyResult.ok,
    status: verifyResult.status,
    durationMs: verifyResult.durationMs,
    error: verifyResult.error || verifyResult.body?.message || null,
  });

  const accessToken = verifyResult.body?.accessToken || verifyResult.body?.token || '';
  if (verifyResult.ok && accessToken) {
    return {
      accessToken,
      refreshToken: verifyResult.body?.refreshToken || '',
      source: 'verify-email',
      response: verifyResult,
      mailboxArtifactPath: mailbox?.artifactPath || '',
      verificationArtifactPath,
    };
  }

  const loginResult = await login(backendUrl, credentials.email, credentials.password);
  events.push({
    step: 'login-after-verify-email',
    ok: loginResult.ok,
    status: loginResult.status,
    durationMs: loginResult.durationMs,
    error: loginResult.error || loginResult.body?.message || null,
  });

  const fallbackAccessToken =
    loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!loginResult.ok || !fallbackAccessToken) {
    throw new Error(
      `Cloud auth failed after register. Status=${loginResult.status} Error=${loginResult.error || loginResult.body?.message || 'unknown'}`,
    );
  }

  return {
    accessToken: fallbackAccessToken,
    refreshToken: loginResult.body?.refreshToken || '',
    source: 'login-after-verify-email',
    response: loginResult,
    mailboxArtifactPath: mailbox?.artifactPath || '',
    verificationArtifactPath,
  };
}

async function authenticateFreshAccount(backendUrl, credentials, events, outputDir) {
  let registerResult = await registerLegacy(
    backendUrl,
    credentials.email,
    credentials.password,
    credentials.displayName,
  );
  events.push({
    step: 'register-demo-account',
    ok: registerResult.ok,
    status: registerResult.status,
    durationMs: registerResult.durationMs,
    error: registerResult.error || registerResult.body?.message || null,
  });

  if (isLegacyRegistrationGone(registerResult)) {
    return authenticateFreshAccountWithVerification(backendUrl, credentials, events, outputDir);
  }

  if (!registerResult.ok) {
    if (registerResult.status !== 400) {
      throw new Error(
        `Cloud register failed. Status=${registerResult.status} Error=${registerResult.error || registerResult.body?.message || registerResult.rawText || 'unknown'}`,
      );
    }

    await wait(1500);
    registerResult = await registerLegacy(
      backendUrl,
      credentials.email,
      credentials.password,
      credentials.displayName,
    );
    events.push({
      step: 'register-demo-account-retry',
      ok: registerResult.ok,
      status: registerResult.status,
      durationMs: registerResult.durationMs,
      error: registerResult.error || registerResult.body?.message || null,
    });
  }

  const accessToken =
    registerResult.body?.accessToken || registerResult.body?.token || '';
  if (registerResult.ok && accessToken) {
    return {
      accessToken,
      refreshToken: registerResult.body?.refreshToken || '',
      source: 'register',
      response: registerResult,
      mailboxArtifactPath: '',
      verificationArtifactPath: '',
    };
  }

  const loginResult = await login(backendUrl, credentials.email, credentials.password);
  events.push({
    step: 'login-after-register',
    ok: loginResult.ok,
    status: loginResult.status,
    durationMs: loginResult.durationMs,
    error: loginResult.error || loginResult.body?.message || null,
  });

  const fallbackAccessToken =
    loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!loginResult.ok || !fallbackAccessToken) {
    throw new Error(
      `Cloud auth failed after register. Status=${loginResult.status} Error=${loginResult.error || loginResult.body?.message || 'unknown'}`,
    );
  }

  return {
    accessToken: fallbackAccessToken,
    refreshToken: loginResult.body?.refreshToken || '',
    source: 'login',
    response: loginResult,
    mailboxArtifactPath: '',
    verificationArtifactPath: '',
  };
}

async function getFoodItemId(backendUrl, token, foodName, cache, foodLookups) {
  if (cache.has(foodName)) {
    return cache.get(foodName);
  }

  const candidates = [foodName, ...(FOOD_NAME_ALIASES[foodName] || [])];

  for (const query of candidates) {
    const response = await requestJson(
      `${backendUrl}/api/food/search?q=${encodeURIComponent(query)}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const items = Array.isArray(response.body) ? response.body : [];
    const normalizedTargets = [normalizeName(foodName), normalizeName(query)];
    const exact = items.find((item) =>
      normalizedTargets.includes(normalizeName(item?.foodName)),
    );
    const fallback = items[0];
    const chosen = exact || fallback;
    const foodItemId = Number(chosen?.foodItemId || 0);

    foodLookups.push({
      foodName,
      query,
      ok: response.ok && foodItemId > 0,
      status: response.status,
      resultCount: items.length,
      selectedFoodItemId: foodItemId || null,
      selectedFoodName: chosen?.foodName || null,
    });

    if (response.ok && foodItemId > 0) {
      cache.set(foodName, foodItemId);
      return foodItemId;
    }
  }

  throw new Error(`Food lookup failed for "${foodName}".`);
}

async function createMealEntry(backendUrl, token, payload) {
  return requestJson(`${backendUrl}/api/meal-diary`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const backendUrl = normalizeBaseUrl(
    process.env.EATFITAI_SMOKE_BACKEND_URL || process.env.EXPO_PUBLIC_API_BASE_URL,
    DEFAULT_BACKEND_URL,
  );
  const credentials = {
    email: trim(process.env.EATFITAI_DEMO_EMAIL) || DEFAULT_DEMO_EMAIL,
    password: trim(process.env.EATFITAI_DEMO_PASSWORD) || DEFAULT_DEMO_PASSWORD,
    displayName:
      trim(process.env.EATFITAI_DEMO_DISPLAY_NAME) || DEFAULT_DEMO_DISPLAY_NAME,
  };

  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    cloudOnly: true,
    credentials: {
      email: credentials.email,
      displayName: credentials.displayName,
    },
    events: [],
    counters: {
      bodyMetricsCreated: 0,
      nutritionTargetsApplied: 0,
      mealDiaryCreated: 0,
      favoritesToggled: 0,
    },
    lookups: {
      foods: [],
    },
    verification: {},
    limitations: [
      'Public cloud APIs do not expose a dedicated recent-foods seed route.',
      'MealDiary sourceMethod for catalog items is normalized by backend services, so manual/voice/vision source intent is preserved in note text for seeded entries.',
    ],
  };
  const outputPath = path.join(outputDir, 'demo-seed.json');
  pendingFailureReport = {
    outputPath,
    report,
  };

  const resetResult = await resetAccount(backendUrl, credentials, report.events);
  report.reset = {
    resetAttempted: resetResult.resetAttempted,
    deletedExistingAccount: resetResult.deleted,
  };

  const auth = isEmailUnverifiedLogin(resetResult.loginResult)
    ? await recoverUnverifiedExistingAccount(backendUrl, credentials, report.events, outputDir)
    : await authenticateFreshAccount(backendUrl, credentials, report.events, outputDir);
  const token = auth.accessToken;
  report.auth = {
    source: auth.source,
    refreshTokenPresent: Boolean(auth.refreshToken),
    existingUnverifiedRecovered: auth.source === 'resend-verify-relogin',
    mailboxArtifactPath: auth.mailboxArtifactPath || '',
    verificationArtifactPath: auth.verificationArtifactPath || '',
  };

  const profilePayload = {
    ...DEFAULT_PROFILE,
    displayName: credentials.displayName,
  };
  const profileResult = await requestJson(`${backendUrl}/api/profile`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(profilePayload),
  });
  report.events.push({
    step: 'update-profile',
    ok: profileResult.ok,
    status: profileResult.status,
    durationMs: profileResult.durationMs,
    error: profileResult.error || profileResult.body?.message || null,
  });
  if (!profileResult.ok) {
    report.limitations.push(
      `Cloud profile update failed during seed. Status=${profileResult.status}. Continuing with body metrics + nutrition + onboarding workaround.`,
    );
  }

  const preferencesResult = await requestJson(`${backendUrl}/api/user/preferences`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(DEFAULT_PREFERENCES),
  });
  report.events.push({
    step: 'update-preferences',
    ok: preferencesResult.ok,
    status: preferencesResult.status,
    durationMs: preferencesResult.durationMs,
    error: preferencesResult.error || preferencesResult.body?.message || null,
  });
  if (!preferencesResult.ok) {
    report.limitations.push(
      `Cloud user preferences update failed during seed. Status=${preferencesResult.status}. Continuing without persisted dietary preferences.`,
    );
  }

  for (const metric of BODY_METRICS) {
    const metricResult = await requestJson(`${backendUrl}/api/body-metrics`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        heightCm: metric.heightCm,
        weightKg: metric.weightKg,
        measuredDate: `${shiftDate(metric.daysAgo)}T07:30:00.000Z`,
        note: metric.note,
      }),
    });
    report.events.push({
      step: `body-metric-${metric.daysAgo}d`,
      ok: metricResult.ok,
      status: metricResult.status,
      durationMs: metricResult.durationMs,
      error: metricResult.error || metricResult.body?.message || null,
    });
    if (!metricResult.ok) {
      throw new Error(`Body metric seed failed for ${metric.daysAgo} days ago.`);
    }
    report.counters.bodyMetricsCreated += 1;
  }

  for (const target of NUTRITION_TARGETS) {
    const nutritionResult = await requestJson(`${backendUrl}/api/ai/nutrition/apply`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        calories: target.calories,
        protein: target.protein,
        carb: target.carb,
        fat: target.fat,
        effectiveFrom: shiftDate(target.daysAgo),
      }),
    });
    report.events.push({
      step: `nutrition-target-${target.daysAgo}d`,
      ok: nutritionResult.ok,
      status: nutritionResult.status,
      durationMs: nutritionResult.durationMs,
      error: nutritionResult.error || nutritionResult.body?.message || null,
    });
    if (!nutritionResult.ok) {
      throw new Error(`Nutrition target seed failed for ${target.daysAgo} days ago.`);
    }
    report.counters.nutritionTargetsApplied += 1;
  }

  const foodIdCache = new Map();
  for (const meal of DEMO_MEALS) {
    const foodItemId = await getFoodItemId(
      backendUrl,
      token,
      meal.foodName,
      foodIdCache,
      report.lookups.foods,
    );
    const createResult = await createMealEntry(backendUrl, token, {
      eatenDate: shiftDate(meal.dayOffset),
      mealTypeId: MEAL_TYPE_IDS[meal.mealType],
      foodItemId,
      grams: meal.grams,
      note: `[seed:${meal.seedSource}] ${meal.note}${meal.quantityNote ? ` (${meal.quantityNote})` : ''}`,
    });
    report.events.push({
      step: `meal-${meal.dayOffset}-${meal.mealType}-${meal.foodName}`,
      ok: createResult.ok,
      status: createResult.status,
      durationMs: createResult.durationMs,
      error: createResult.error || createResult.body?.message || null,
    });
    if (!createResult.ok) {
      throw new Error(`Meal diary seed failed for ${meal.foodName} (${meal.mealType}).`);
    }
    report.counters.mealDiaryCreated += 1;
  }

  for (const foodName of FAVORITE_FOODS) {
    const foodItemId = await getFoodItemId(
      backendUrl,
      token,
      foodName,
      foodIdCache,
      report.lookups.foods,
    );
    const favoriteResult = await requestJson(`${backendUrl}/api/favorites`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ foodItemId }),
    });
    report.events.push({
      step: `favorite-${foodName}`,
      ok: favoriteResult.ok,
      status: favoriteResult.status,
      durationMs: favoriteResult.durationMs,
      error: favoriteResult.error || favoriteResult.body?.message || null,
    });
    if (!favoriteResult.ok) {
      throw new Error(`Favorite seed failed for ${foodName}.`);
    }
    report.counters.favoritesToggled += 1;
  }

  const onboardingResult = await requestJson(
    `${backendUrl}/api/auth/mark-onboarding-completed`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  report.events.push({
    step: 'mark-onboarding-completed',
    ok: onboardingResult.ok,
    status: onboardingResult.status,
    durationMs: onboardingResult.durationMs,
    error: onboardingResult.error || onboardingResult.body?.message || null,
  });
  if (!onboardingResult.ok) {
    throw new Error('Failed to mark onboarding completed for demo account.');
  }

  const verifyProfile = await requestJson(`${backendUrl}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const verifyDiary = await requestJson(
    `${backendUrl}/api/meal-diary?date=${encodeURIComponent(shiftDate(0))}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const verifyNutrition = await requestJson(`${backendUrl}/api/ai/nutrition/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const verifyFavorites = await requestJson(`${backendUrl}/api/favorites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const verifyLogin = await login(backendUrl, credentials.email, credentials.password);

  report.verification = {
    profileOk: verifyProfile.ok,
    diaryTodayOk: verifyDiary.ok,
    diaryTodayCount: Array.isArray(verifyDiary.body) ? verifyDiary.body.length : 0,
    nutritionCurrentOk: verifyNutrition.ok,
    favoritesOk: verifyFavorites.ok,
    favoritesCount: Array.isArray(verifyFavorites.body) ? verifyFavorites.body.length : 0,
    reloginOk: verifyLogin.ok,
    needsOnboarding: Boolean(verifyLogin.body?.needsOnboarding),
  };

  writeJson(outputPath, report);
  pendingFailureReport = null;

  console.log(`[production-smoke-seed-cloud] Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        backendUrl,
        accountEmail: credentials.email,
        counters: report.counters,
        verification: report.verification,
        limitations: report.limitations,
      },
      null,
      2,
    ),
  );

  const verificationFailed =
    !report.verification.profileOk ||
    !report.verification.diaryTodayOk ||
    report.verification.diaryTodayCount <= 0 ||
    !report.verification.nutritionCurrentOk ||
    !report.verification.favoritesOk ||
    report.verification.favoritesCount <= 0 ||
    !report.verification.reloginOk ||
    report.verification.needsOnboarding;

  if (verificationFailed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (pendingFailureReport?.outputPath && pendingFailureReport?.report) {
    pendingFailureReport.report.failure = {
      reason: getErrorReason(error) || 'seed-cloud-failed',
      message: error instanceof Error ? error.message : String(error),
    };
    try {
      writeJson(pendingFailureReport.outputPath, pendingFailureReport.report);
      console.error(`[production-smoke-seed-cloud] Wrote failure report ${pendingFailureReport.outputPath}`);
    } catch (writeError) {
      console.error(
        '[production-smoke-seed-cloud] Failed to write failure report:',
        writeError instanceof Error ? writeError.message : String(writeError),
      );
    }
  }
  console.error('[production-smoke-seed-cloud] Failed:', error);
  process.exit(1);
});
