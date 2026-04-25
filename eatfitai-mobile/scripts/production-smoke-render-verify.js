const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveEnv } = require('../../tools/automation/resolveEnv');
const {
  buildGitDeployReadiness,
  buildDockerPathAssessment,
  buildRootDirAssessment,
  parseAheadBehind,
  resolveExpectedRootDir,
} = require('./lib/render-rc');

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
  const normalized = String(value || '').trim();
  const quotedMatch = normalized.match(/^"(.*)"$/);
  return quotedMatch ? quotedMatch[1] : normalized;
}

function normalizePathArg(value) {
  return trim(value).replace(/\\"/g, '"').replace(/"/g, '');
}

function normalizeBaseUrl(value) {
  return trim(value).replace(/\/+$/, '');
}

function buildOutputDir() {
  const explicit =
    normalizePathArg(process.argv[2]) ||
    normalizePathArg(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
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

function isTruthy(value) {
  return ['1', 'true', 'yes', 'y'].includes(trim(value).toLowerCase());
}

function getGitState() {
  const statusPorcelain = tryReadGitValue(['status', '--porcelain']);
  const upstream = tryReadGitValue([
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  const aheadBehind = upstream
    ? parseAheadBehind(tryReadGitValue(['rev-list', '--left-right', '--count', '@{u}...HEAD']))
    : { behind: 0, ahead: 0 };
  const dirtyLines = statusPorcelain
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    branch: getExpectedBranch(),
    head: getExpectedCommit(),
    upstream,
    ahead: aheadBehind.ahead,
    behind: aheadBehind.behind,
    dirty: dirtyLines.length > 0,
    dirtyFileCount: dirtyLines.length,
    dirtyFiles: dirtyLines.slice(0, 30),
    allDirtyFiles: dirtyLines,
  };
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

async function getServiceEvents(baseUrl, serviceId, apiKey) {
  try {
    return await requestJson(`${baseUrl}/services/${serviceId}/events?limit=10`, apiKey);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeServiceEvents(payload, latestDeployId) {
  if (!Array.isArray(payload)) {
    return {
      failureReason: '',
      events: [],
      error: payload?.error || '',
    };
  }

  const events = payload
    .map((entry) => entry?.event || entry)
    .filter(Boolean)
    .slice(0, 6)
    .map((event) => ({
      id: trim(event.id),
      type: trim(event.type),
      timestamp: trim(event.timestamp),
      deployId: trim(event.details?.deployId),
      deployStatus: trim(event.details?.deployStatus),
      status: event.details?.status ?? null,
    }));
  const related = events.filter(
    (event) => !latestDeployId || !event.deployId || event.deployId === latestDeployId,
  );
  const failureReason = related.find((event) => event.type === 'pipeline_minutes_exhausted')
    ? 'pipeline_minutes_exhausted'
    : '';

  return {
    failureReason,
    events,
    error: '',
  };
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
  const gitState = getGitState();
  const gitDeployReadiness = buildGitDeployReadiness(gitState, {
    allowDirtyWorktree: isTruthy(resolveEnv('RENDER_ALLOW_DIRTY_WORKTREE')),
    allowUnpushedHead: isTruthy(resolveEnv('RENDER_ALLOW_UNPUSHED_HEAD')),
  });

  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    expectedBranch,
    expectedCommit,
    git: {
      ...gitState,
      deployReadiness: gitDeployReadiness,
    },
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
    const expectedAutoDeploy = trim(serviceTarget.expectedAutoDeploy || 'yes').toLowerCase();
    const expectedAutoDeployTrigger = trim(
      serviceTarget.expectedAutoDeployTrigger || 'commit',
    ).toLowerCase();
    const serviceUrl =
      trim(serviceInfo.serviceDetails?.url) || trim(serviceInfo.serviceUrl) || '';
    const runtime =
      trim(serviceInfo.serviceDetails?.runtime) || trim(serviceInfo.serviceDetails?.env);
    const suspended = trim(serviceInfo.suspended).toLowerCase();
    const rootDirAssessment = buildRootDirAssessment(
      serviceInfo,
      resolveExpectedRootDir(serviceKey, serviceTarget),
    );
    const dockerPathAssessment = buildDockerPathAssessment(serviceInfo, serviceTarget);
    const deployStatus = latestDeploy?.status || '';
    const deployPassed = SUCCESS_STATES.has(deployStatus);
    const eventSummary = deployPassed
      ? { failureReason: '', events: [], error: '' }
      : summarizeServiceEvents(
          await getServiceEvents(baseUrl, serviceTarget.id, apiKey),
          latestDeploy?.id,
        );
    const branchMatches = !expectedBranch || branch === expectedBranch;
    const commitMatches =
      !expectedCommit || !latestDeploy?.commitId || latestDeploy.commitId === expectedCommit;
    const ownerMatches =
      !trim(serviceTarget.ownerId) || trim(serviceInfo.ownerId) === trim(serviceTarget.ownerId);
    const autoDeployMatches = autoDeploy === expectedAutoDeploy;
    const autoDeployTriggerMatches = autoDeployTrigger === expectedAutoDeployTrigger;
    const passed =
      branchMatches &&
      ownerMatches &&
      autoDeployMatches &&
      autoDeployTriggerMatches &&
      suspended === 'not_suspended' &&
      rootDirAssessment.rootDirMatches &&
      dockerPathAssessment.dockerPathsMatch &&
      deployPassed &&
      commitMatches &&
      gitDeployReadiness.passed;

    if (!passed) {
      report.summary.failedServices.push(serviceKey);
    }

    report.services[serviceKey] = {
      id: trim(serviceInfo.id),
      name: trim(serviceInfo.name),
      ownerId: trim(serviceInfo.ownerId),
      expectedOwnerId: trim(serviceTarget.ownerId),
      ownerMatches,
      branch,
      branchMatches,
      autoDeploy,
      expectedAutoDeploy,
      autoDeployMatches,
      autoDeployTrigger,
      expectedAutoDeployTrigger,
      autoDeployTriggerMatches,
      suspended,
      runtime,
      ...rootDirAssessment,
      ...dockerPathAssessment,
      serviceUrl,
      dashboardUrl: trim(serviceInfo.dashboardUrl),
      latestDeploy,
      deployFailureReason: eventSummary.failureReason,
      recentEvents: eventSummary.events,
      recentEventsError: eventSummary.error,
      commitMatches,
      gitDeployReadiness: gitDeployReadiness.passed,
      gitDeployReadinessFailures: gitDeployReadiness.failures,
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
