function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveAuthSmokeTimeouts(env = process.env) {
  return {
    requestTimeoutMs: parsePositiveInteger(env.EATFITAI_SMOKE_AUTH_TIMEOUT_MS, 20000),
    resetPasswordTimeoutMs: parsePositiveInteger(
      env.EATFITAI_SMOKE_AUTH_RESET_TIMEOUT_MS,
      45000,
    ),
    mailboxTimeoutMs: parsePositiveInteger(
      env.EATFITAI_SMOKE_AUTH_MAILBOX_TIMEOUT_MS,
      90000,
    ),
    mailboxPollIntervalMs: parsePositiveInteger(
      env.EATFITAI_SMOKE_AUTH_MAILBOX_POLL_MS,
      5000,
    ),
    requestRetryAttempts: parsePositiveInteger(
      env.EATFITAI_SMOKE_AUTH_RETRY_ATTEMPTS,
      2,
    ),
    requestRetryDelayMs: parsePositiveInteger(
      env.EATFITAI_SMOKE_AUTH_RETRY_DELAY_MS,
      3000,
    ),
  };
}

function resolveAiSmokeTimeouts(env = process.env) {
  return {
    requestTimeoutMs: parsePositiveInteger(env.EATFITAI_SMOKE_AI_TIMEOUT_MS, 20000),
    requestRetryCount: parseNonNegativeInteger(env.EATFITAI_SMOKE_AI_RETRY_COUNT, 1),
    visionDetectTimeoutMs: parsePositiveInteger(
      env.EATFITAI_SMOKE_AI_DETECT_TIMEOUT_MS,
      15000,
    ),
    visionDetectRetryCount: parseNonNegativeInteger(
      env.EATFITAI_SMOKE_AI_DETECT_RETRY_COUNT,
      0,
    ),
  };
}

module.exports = {
  parseNonNegativeInteger,
  parsePositiveInteger,
  resolveAiSmokeTimeouts,
  resolveAuthSmokeTimeouts,
};
