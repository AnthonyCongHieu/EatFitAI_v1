const MAX_SMOKE_NAME_LENGTH = 255;

function normalizeWhitespace(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeRunId(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .trim();
}

function buildRunScopedSmokeName(baseName, runId, maxLength = MAX_SMOKE_NAME_LENGTH) {
  const normalizedBaseName = normalizeWhitespace(baseName) || 'Smoke Lane Item';
  const normalizedRunId = normalizeRunId(runId) || 'run';
  const safeMaxLength = Math.max(1, Number(maxLength) || MAX_SMOKE_NAME_LENGTH);
  const suffix = ` ${normalizedRunId}`;
  const availableBaseLength = Math.max(1, safeMaxLength - suffix.length);
  const clippedBaseName = normalizeWhitespace(normalizedBaseName.slice(0, availableBaseLength));

  return `${clippedBaseName || 'Smoke'}${suffix}`.slice(0, safeMaxLength);
}

function buildUserApiSmokeNames(runId) {
  return {
    customDishName: buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', runId),
    primaryFoodName: buildRunScopedSmokeName('Smoke Lane Yogurt Cup', runId),
    primaryFoodUpdatedName: buildRunScopedSmokeName('Smoke Lane Yogurt Cup v2', runId),
    scratchFoodName: buildRunScopedSmokeName('Smoke Lane Scratch Berry', runId),
  };
}

module.exports = {
  buildUserApiSmokeNames,
  buildRunScopedSmokeName,
};
