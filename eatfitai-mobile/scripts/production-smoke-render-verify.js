const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');

const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const TARGETS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'security-ops',
  'targets.json',
);
const SUCCESS_STATES = new Set(['live', 'succeeded', 'success', 'deployed']);
const FAILURE_STATES = new Set([
  'build_failed',
  'failed',
  'canceled',
  'cancelled',
  'update_failed',
  'deactivated',
  'timed_out',
]);

function trim(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl(value) {
  return trim(value).replace(/\/+$/, '');
}

function buildOutputDir() {
  const explicit = trim(process.argv[2]) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUTPUT_ROOT, stamp);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryReadGitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function loadTargets() {
  return JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
}

function getExpectedBranch() {
  return trim(resolveEnv('RENDER_EXPECTED_BRANCH')) || tryReadGitValue(['branch', '--show-current']);
}

function getExpectedCommit() {
  return trim(resolveEnv('RENDER_EXPECTED_COMMIT')) || tryReadGitValue(['rev-parse', 'HEAD']);
}

async function requestJson(url, apiKey) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'EatFitAI-Release-Gate/1.0',
    },
  });

  const rawText = await response.text();
  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      `GET ${url} failed with HTTP ${response.status}: ${rawText || response.statusText}`,
    );
  }

  return body;
}

function normalizeDeploy(entry) {
  const deploy = entry?.deploy || entry || {};
  return {
    id: trim(deploy.id),
    status: trim(deploy.status).toLowerCase(),
    trigger: trim(deploy.trigger),
    createdAt: trim(deploy.createdAt),
    updatedAt: trim(deploy.updatedAt),
    startedAt: trim(deploy.startedAt),
    finishedAt: trim(deploy.finishedAt),
    commitId: trim(deploy.commit?.id),
    commitMessage: trim(deploy.commit?.message),
    commitCreatedAt: trim(deploy.commit?.createdAt),
  };
}

async function getServiceInfo(baseUrl, serviceId, apiKey) {
  return requestJson(`${baseUrl}/services/${serviceId}`, apiKey);
}

async function getLatestDeploy(baseUrl, serviceId, apiKey) {
  const payload = await requestJson(`${baseUrl}/services/${serviceId}/deploys?limit=5`, apiKey);
  const items = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return normalizeDeploy(items[0]);
}

async function waitForStableDeploy(baseUrl, serviceId, apiKey, waitMs, pollMs) {
  const deadlineAt = Date.now() + waitMs;

  while (true) {
    const latestDeploy = await getLatestDeploy(baseUrl, serviceId, apiKey);
    if (!latestDeploy) {
      return null;
    }

    if (SUCCESS_STATES.has(latestDeploy.status) || FAILURE_STATES.has(latestDeploy.status)) {
      return latestDeploy;
    }

    if (Date.now() >= deadlineAt) {
      throw new Error(
        `Timed out waiting for latest deploy of service ${serviceId}. Last status=${latestDeploy.status || 'unknown'}.`,
      );
    }

    await sleep(pollMs);
  }
}

async function main() {
  const apiKey = trim(resolveEnv('RENDER_API_KEY'));
  if (!apiKey) {
    throw new Error('Missing RENDER_API_KEY. Store it in local user env or current shell env.');
  }

  const waitMsRaw = Number.parseInt(trim(resolveEnv('RENDER_VERIFY_WAIT_MS')) || '900000', 10);
  const pollMsRaw = Number.parseInt(trim(resolveEnv('RENDER_VERIFY_POLL_MS')) || '10000', 10);
  const waitMs = Number.isFinite(waitMsRaw) && waitMsRaw > 0 ? waitMsRaw : 900000;
  const pollMs = Number.isFinite(pollMsRaw) && pollMsRaw > 0 ? pollMsRaw : 10000;
  const outputDir = buildOutputDir();
  fs.mkdirSync(outputDir, { recursive: true });

  const targets = loadTargets();
  const renderTargets = targets.render || {};
  const baseUrl = normalizeBaseUrl(renderTargets.baseUrl || 'https://api.render.com/v1');
  const expectedBranch = getExpectedBranch();
  const expectedCommit = getExpectedCommit();

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    expectedBranch,
    expectedCommit,
    services: {},
    summary: {
      passed: false,
      failedServices: [],
    },
  };

  const serviceEntries = Object.entries(renderTargets.services || {});
  for (const [serviceKey, serviceTarget] of serviceEntries) {
    const serviceInfo = await getServiceInfo(baseUrl, serviceTarget.id, apiKey);
    const latestDeploy = await waitForStableDeploy(
      baseUrl,
      serviceTarget.id,
      apiKey,
      waitMs,
      pollMs,
    );

    const branch = trim(serviceInfo.branch);
    const autoDeploy = trim(serviceInfo.autoDeploy).toLowerCase();
    const autoDeployTrigger = trim(serviceInfo.autoDeployTrigger).toLowerCase();
    const serviceUrl =
      trim(serviceInfo.serviceDetails?.url) || trim(serviceInfo.serviceUrl) || '';
    const runtime =
      trim(serviceInfo.serviceDetails?.runtime) || trim(serviceInfo.serviceDetails?.env);
    const suspended = trim(serviceInfo.suspended).toLowerCase();
    const deployStatus = latestDeploy?.status || '';
    const deployPassed = SUCCESS_STATES.has(deployStatus);
    const branchMatches = !expectedBranch || branch === expectedBranch;
    const commitMatches =
      !expectedCommit || !latestDeploy?.commitId || latestDeploy.commitId === expectedCommit;
    const passed =
      branchMatches &&
      autoDeploy === 'yes' &&
      autoDeployTrigger === 'commit' &&
      suspended === 'not_suspended' &&
      deployPassed;

    if (!passed) {
      report.summary.failedServices.push(serviceKey);
    }

    report.services[serviceKey] = {
      id: trim(serviceInfo.id),
      name: trim(serviceInfo.name),
      branch,
      branchMatches,
      autoDeploy,
      autoDeployTrigger,
      suspended,
      runtime,
      serviceUrl,
      dashboardUrl: trim(serviceInfo.dashboardUrl),
      latestDeploy,
      commitMatches,
      passed,
    };
  }

  report.summary.passed = report.summary.failedServices.length === 0;

  const outputPath = path.join(outputDir, 'render-verify.json');
  writeJson(outputPath, report);

  if (!report.summary.passed) {
    throw new Error(
      `Render verify failed for: ${report.summary.failedServices.join(', ')}. See ${outputPath}.`,
    );
  }

  console.log(
    `Render verify passed for ${serviceEntries.length} service(s). Evidence: ${outputPath}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
