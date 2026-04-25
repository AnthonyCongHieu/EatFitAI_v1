const fs = require('fs');
const path = require('path');
const { resolveEnv } = require('../../tools/automation/resolveEnv');
const {
  buildDockerPathAssessment,
  buildRootDirAssessment,
  readDockerDetails,
  readServiceRootDir,
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

function loadTargets() {
  return JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
}

async function requestJson(url, apiKey, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EatFitAI-Render-RC-Unblock/1.0',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
      `${options.method || 'GET'} ${url} failed with HTTP ${response.status}: ${rawText || response.statusText}`,
    );
  }

  return body;
}

function normalizeDeploy(payload) {
  const deploy = payload?.deploy || payload || {};
  return {
    id: trim(deploy.id),
    status: trim(deploy.status).toLowerCase(),
    trigger: trim(deploy.trigger),
    createdAt: trim(deploy.createdAt),
    updatedAt: trim(deploy.updatedAt),
    commitId: trim(deploy.commit?.id),
    commitMessage: trim(deploy.commit?.message),
  };
}

async function main() {
  const apiKey = trim(resolveEnv('RENDER_API_KEY'));
  if (!apiKey) {
    throw new Error('Missing RENDER_API_KEY. Store it in local user env or current shell env.');
  }

  const outputDir = buildOutputDir();
  fs.mkdirSync(outputDir, { recursive: true });

  const targets = loadTargets();
  const renderTargets = targets.render || {};
  const baseUrl = normalizeBaseUrl(renderTargets.baseUrl || 'https://api.render.com/v1');
  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    baseUrl,
    services: {},
    summary: {
      passed: false,
      failedServices: [],
      deploysTriggered: [],
    },
  };
  const outputPath = path.join(outputDir, 'render-unblock.json');

  try {
    for (const [serviceKey, serviceTarget] of Object.entries(renderTargets.services || {})) {
      const expectedRootDir = resolveExpectedRootDir(serviceKey, serviceTarget);
      const before = await requestJson(`${baseUrl}/services/${serviceTarget.id}`, apiKey);
      const beforeRootDir = readServiceRootDir(before);
      const beforeDockerDetails = readDockerDetails(before);
      const beforeRootDirAssessment = buildRootDirAssessment(before, expectedRootDir);
      const beforeDockerPathAssessment = buildDockerPathAssessment(before, serviceTarget);
      const expectedDockerContext = beforeDockerPathAssessment.expectedDockerContext;
      const expectedDockerfilePath = beforeDockerPathAssessment.expectedDockerfilePath;
      const envSpecificDetails = {
        dockerContext: expectedDockerContext,
        dockerfilePath: expectedDockerfilePath,
      };
      if (beforeDockerDetails.dockerCommand) {
        envSpecificDetails.dockerCommand = beforeDockerDetails.dockerCommand;
      }
      const shouldPatch =
        serviceTarget.updateService !== false &&
        (!beforeRootDirAssessment.rootDirMatches ||
          !beforeDockerPathAssessment.dockerPathsMatch);
      const updated = shouldPatch
        ? await requestJson(`${baseUrl}/services/${serviceTarget.id}`, apiKey, {
            method: 'PATCH',
            body: {
              rootDir: expectedRootDir,
              serviceDetails: {
                envSpecificDetails,
              },
            },
          })
        : before;
      const after = await requestJson(`${baseUrl}/services/${serviceTarget.id}`, apiKey);
      const rootDirAssessment = buildRootDirAssessment(after, expectedRootDir);
      const dockerPathAssessment = buildDockerPathAssessment(after, serviceTarget);
      const shouldTriggerDeploy = serviceTarget.triggerDeploy !== false;
      const deploy = shouldTriggerDeploy
        ? normalizeDeploy(
            await requestJson(`${baseUrl}/services/${serviceTarget.id}/deploys`, apiKey, {
              method: 'POST',
              body: {
                clearCache: 'clear',
              },
            }),
          )
        : {
            id: '',
            status: 'skipped',
            trigger: 'target-triggerDeploy-false',
            createdAt: '',
            updatedAt: '',
            commitId: '',
            commitMessage: '',
          };
      const servicePassed =
        rootDirAssessment.rootDirMatches &&
        dockerPathAssessment.dockerPathsMatch &&
        (!shouldTriggerDeploy || Boolean(deploy.id));

      if (!servicePassed) {
        report.summary.failedServices.push(serviceKey);
      }
      if (deploy.id) {
        report.summary.deploysTriggered.push(serviceKey);
      }

      report.services[serviceKey] = {
        id: trim(serviceTarget.id),
        name: trim(after.name || serviceTarget.name),
        expectedRootDir,
        beforeRootDir,
        beforeDockerDetails,
        patched: shouldPatch,
        deployTriggered: shouldTriggerDeploy && Boolean(deploy.id),
        updatedRootDir: readServiceRootDir(updated),
        ...rootDirAssessment,
        ...dockerPathAssessment,
        deploy,
        passed: servicePassed,
      };
    }

    report.summary.passed = report.summary.failedServices.length === 0;
    writeJson(outputPath, report);

    if (!report.summary.passed) {
      throw new Error(
        `Render unblock failed for: ${report.summary.failedServices.join(', ')}. See ${outputPath}.`,
      );
    }

    console.log(
      `Render rootDir updated and deploy triggered for ${report.summary.deploysTriggered.length} service(s). Evidence: ${outputPath}`,
    );
  } catch (error) {
    report.summary.passed = false;
    report.failure = {
      reason: error instanceof Error ? error.message : String(error),
    };
    writeJson(outputPath, report);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
