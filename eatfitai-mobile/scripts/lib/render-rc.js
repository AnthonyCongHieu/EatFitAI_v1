function trim(value) {
  return String(value || '').trim();
}

function normalizeRootDir(value) {
  return trim(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function readServiceRootDir(serviceInfo) {
  const candidates = [
    serviceInfo?.rootDir,
    serviceInfo?.service?.rootDir,
    serviceInfo?.serviceDetails?.rootDir,
    serviceInfo?.repoDetails?.rootDir,
    serviceInfo?.buildFilter?.rootDir,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRootDir(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function buildRootDirAssessment(serviceInfo, expectedRootDir) {
  const normalizedExpected = normalizeRootDir(expectedRootDir);
  const rootDir = readServiceRootDir(serviceInfo);

  return {
    expectedRootDir: normalizedExpected,
    rootDir,
    rootDirMatches: rootDir === normalizedExpected,
  };
}

function readDockerDetails(serviceInfo) {
  const details =
    serviceInfo?.serviceDetails?.envSpecificDetails ||
    serviceInfo?.service?.serviceDetails?.envSpecificDetails ||
    serviceInfo?.envSpecificDetails ||
    {};

  return {
    dockerContext: trim(details.dockerContext),
    dockerfilePath: trim(details.dockerfilePath),
    dockerCommand: trim(details.dockerCommand),
  };
}

function buildDockerPathAssessment(serviceInfo, expected = {}) {
  const details = readDockerDetails(serviceInfo);
  const expectedDockerContext = trim(
    expected.expectedDockerContext || expected.dockerContext || '.',
  );
  const expectedDockerfilePath = trim(
    expected.expectedDockerfilePath || expected.dockerfilePath || './Dockerfile',
  );

  return {
    expectedDockerContext,
    expectedDockerfilePath,
    dockerContext: details.dockerContext,
    dockerfilePath: details.dockerfilePath,
    dockerPathsMatch:
      details.dockerContext === expectedDockerContext &&
      details.dockerfilePath === expectedDockerfilePath,
  };
}

function resolveExpectedRootDir(serviceKey, serviceTarget = {}) {
  if (Object.prototype.hasOwnProperty.call(serviceTarget, 'expectedRootDir')) {
    return normalizeRootDir(serviceTarget.expectedRootDir);
  }

  if (serviceKey === 'backend') {
    return 'eatfitai-backend';
  }

  if (serviceKey === 'aiProvider') {
    return 'ai-provider';
  }

  return '';
}

function parseAheadBehind(value) {
  const [behindRaw, aheadRaw] = trim(value).split(/\s+/);
  const behind = Number.parseInt(behindRaw || '0', 10);
  const ahead = Number.parseInt(aheadRaw || '0', 10);

  return {
    behind: Number.isFinite(behind) ? behind : 0,
    ahead: Number.isFinite(ahead) ? ahead : 0,
  };
}

const DEFAULT_DEPLOY_RELEVANT_PATH_PREFIXES = [
  'ai-provider/',
  'eatfitai-backend/',
  'eatfitai-mobile/',
  'tools/security-ops/',
  'tools/fixtures/scan-demo/',
];

function normalizeGitPath(value) {
  return trim(value).replace(/\\/g, '/').replace(/^"+|"+$/g, '');
}

function extractGitStatusPath(line) {
  const text = String(line || '');
  const renameParts = text.slice(3).split(' -> ');
  return normalizeGitPath(renameParts[renameParts.length - 1] || text.slice(3));
}

function isDeployRelevantPath(filePath, prefixes = DEFAULT_DEPLOY_RELEVANT_PATH_PREFIXES) {
  const normalized = normalizeGitPath(filePath);
  return prefixes.some((prefix) => normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix));
}

function buildGitDeployReadiness(gitState = {}, options = {}) {
  const allowDirtyWorktree = options.allowDirtyWorktree === true;
  const allowUnpushedHead = options.allowUnpushedHead === true;
  const relevantPrefixes =
    Array.isArray(options.deployRelevantPathPrefixes) && options.deployRelevantPathPrefixes.length > 0
      ? options.deployRelevantPathPrefixes
      : DEFAULT_DEPLOY_RELEVANT_PATH_PREFIXES;
  const dirtyFiles = Array.isArray(gitState.allDirtyFiles)
    ? gitState.allDirtyFiles
    : Array.isArray(gitState.dirtyFiles)
      ? gitState.dirtyFiles
      : [];
  const deployRelevantDirtyFiles = dirtyFiles.filter((line) =>
    isDeployRelevantPath(extractGitStatusPath(line), relevantPrefixes),
  );
  const dirty = deployRelevantDirtyFiles.length > 0;
  const hasUpstream = Boolean(trim(gitState.upstream));
  const ahead = Number.isFinite(gitState.ahead) ? gitState.ahead : 0;
  const failures = [];

  if (dirty && !allowDirtyWorktree) {
    failures.push('dirty-worktree');
  }
  if (!hasUpstream && !allowUnpushedHead) {
    failures.push('missing-upstream');
  }
  if (hasUpstream && ahead > 0 && !allowUnpushedHead) {
    failures.push('unpushed-head');
  }

  return {
    dirty,
    dirtyFileCount: dirtyFiles.length,
    deployRelevantDirtyFileCount: deployRelevantDirtyFiles.length,
    deployRelevantDirtyFiles,
    upstream: trim(gitState.upstream),
    ahead,
    behind: Number.isFinite(gitState.behind) ? gitState.behind : 0,
    allowDirtyWorktree,
    allowUnpushedHead,
    passed: failures.length === 0,
    failures,
  };
}

module.exports = {
  DEFAULT_DEPLOY_RELEVANT_PATH_PREFIXES,
  buildGitDeployReadiness,
  buildDockerPathAssessment,
  buildRootDirAssessment,
  extractGitStatusPath,
  isDeployRelevantPath,
  normalizeRootDir,
  parseAheadBehind,
  readDockerDetails,
  readServiceRootDir,
  resolveExpectedRootDir,
};
