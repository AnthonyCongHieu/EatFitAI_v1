const fs = require('fs');
const path = require('path');
const { resolveSmokeCredentials } = require('./lib/smoke-credentials');

const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const DEFAULT_BACKEND_URL = 'https://eatfitai-backend-dev.onrender.com';

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value, fallback) {
  return (trim(value) || fallback).replace(/\/+$/, '');
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

async function requestJson(url, options = {}) {
  const startedAtMs = Date.now();
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      body: options.body,
    });
    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = rawText;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAtMs,
      body,
      rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAtMs,
      body: null,
      rawText: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
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

async function deleteProfile(backendUrl, token) {
  return requestJson(`${backendUrl}/api/profile`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function resolveAuthCleanupCandidate(authReport) {
  const cleanup = authReport?.cleanup || {};
  const account = authReport?.account || {};
  const credentials = cleanup.credentials || authReport?.credentials || {};
  const email =
    trim(cleanup.accountEmail) ||
    trim(cleanup.email) ||
    trim(account.email) ||
    trim(credentials.email);
  const password =
    trim(cleanup.finalPassword) ||
    trim(cleanup.password) ||
    trim(account.finalPassword) ||
    trim(account.password) ||
    trim(credentials.password);

  return {
    email,
    password,
    prevalidatedPass: Boolean(cleanup.passed || cleanup.ok),
    prevalidatedFailures: Array.isArray(cleanup.failures) ? cleanup.failures : [],
  };
}

async function cleanupNamedAccount(options) {
  const backendUrl = options.backendUrl;
  const label = options.label;
  const email = trim(options.email);
  const password = trim(options.password);
  const result = {
    label,
    email,
    attempted: false,
    passed: false,
    alreadyDeleted: false,
    trustedFromPriorStep: false,
    failures: [],
    loginStatus: null,
    deleteStatus: null,
    verifyLoginStatus: null,
  };

  if (!email || !password) {
    result.failures.push('missing-credentials');
    return result;
  }

  result.attempted = true;
  const loginResult = await login(backendUrl, email, password);
  result.loginStatus = loginResult.status;

  if (!loginResult.ok) {
    if ([400, 401, 404].includes(Number(loginResult.status))) {
      result.alreadyDeleted = true;
      result.passed = true;
      return result;
    }

    result.failures.push(`login-failed:${loginResult.status || 'network'}`);
    return result;
  }

  const accessToken = loginResult.body?.accessToken || loginResult.body?.token || '';
  if (!accessToken) {
    result.failures.push('missing-access-token');
    return result;
  }

  const deleteResult = await deleteProfile(backendUrl, accessToken);
  result.deleteStatus = deleteResult.status;
  if (!deleteResult.ok) {
    result.failures.push(`delete-failed:${deleteResult.status || 'network'}`);
    return result;
  }

  await sleep(1500);
  const verifyResult = await login(backendUrl, email, password);
  result.verifyLoginStatus = verifyResult.status;
  result.passed = !verifyResult.ok;
  if (!result.passed) {
    result.failures.push('post-delete-login-still-succeeds');
  }

  return result;
}

async function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json')) || {};
  const authReport = readJsonIfExists(path.join(outputDir, 'auth-api-report.json')) || {};
  const backendUrl = normalizeBaseUrl(
    process.env.EATFITAI_SMOKE_BACKEND_URL || preflight.backendUrl,
    DEFAULT_BACKEND_URL,
  );
  const sandboxCredentials = resolveSmokeCredentials();
  const authCandidate = resolveAuthCleanupCandidate(authReport);

  const sandboxCleanup = sandboxCredentials
    ? await cleanupNamedAccount({
        backendUrl,
        label: 'sandbox-account',
        email: sandboxCredentials.email,
        password: sandboxCredentials.password,
      })
    : {
        label: 'sandbox-account',
        attempted: false,
        passed: false,
        alreadyDeleted: false,
        trustedFromPriorStep: false,
        failures: ['missing-sandbox-credentials'],
      };

  let authCleanup = null;
  if (authCandidate.email && authCandidate.password) {
    authCleanup = await cleanupNamedAccount({
      backendUrl,
      label: 'auth-disposable-account',
      email: authCandidate.email,
      password: authCandidate.password,
    });
  } else if (authCandidate.prevalidatedPass) {
    authCleanup = {
      label: 'auth-disposable-account',
      email: authCandidate.email,
      attempted: false,
      passed: true,
      alreadyDeleted: false,
      trustedFromPriorStep: true,
      failures: [],
    };
  } else {
    authCleanup = {
      label: 'auth-disposable-account',
      email: authCandidate.email,
      attempted: false,
      passed: false,
      alreadyDeleted: false,
      trustedFromPriorStep: false,
      failures: authCandidate.prevalidatedFailures.length > 0
        ? authCandidate.prevalidatedFailures
        : ['missing-auth-cleanup-credentials'],
    };
  }

  const failures = [];
  for (const cleanupResult of [sandboxCleanup, authCleanup]) {
    if (!cleanupResult?.passed) {
      failures.push(`${cleanupResult.label}:${cleanupResult.failures.join('|')}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    sandboxCleanup,
    authCleanup,
    passed: failures.length === 0,
    failures,
  };

  const outputPath = path.join(outputDir, 'cleanup-report.json');
  writeJson(outputPath, report);

  console.log(`[production-smoke-cleanup] Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        backendUrl,
        sandboxCleanup: {
          passed: sandboxCleanup.passed,
          failures: sandboxCleanup.failures,
        },
        authCleanup: {
          passed: authCleanup.passed,
          failures: authCleanup.failures,
          trustedFromPriorStep: Boolean(authCleanup.trustedFromPriorStep),
        },
        passed: report.passed,
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
  console.error('[production-smoke-cleanup] Failed:', error);
  process.exit(1);
});
