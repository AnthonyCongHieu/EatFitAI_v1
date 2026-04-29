const PRODUCTION_APP_ENV_VALUES = new Set(['production', 'prod']);
const PLACEHOLDER_MODE = 'placeholder';

function trim(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return trim(value).toLowerCase();
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalize(value));
}

function normalizeMediaBudgetMode(env = process.env) {
  return normalize(env.EXPO_PUBLIC_MEDIA_BUDGET_MODE);
}

function hostLooksProduction(hostname) {
  const host = normalize(hostname);
  return (
    host === 'eatfitai.com' ||
    host === 'api.eatfitai.com' ||
    host.includes('eatfitai-backend-prod') ||
    host.includes('eatfitai-production') ||
    host.includes('production') ||
    /(^|[.-])prod([.-]|$)/.test(host)
  );
}

function urlLooksProduction(value) {
  const raw = trim(value);
  if (!raw) {
    return false;
  }

  try {
    return hostLooksProduction(new URL(raw).hostname);
  } catch {
    return false;
  }
}

function isProductionTarget(env = process.env) {
  const appEnv = normalize(env.APP_ENV || env.EXPO_PUBLIC_APP_ENV || env.EATFITAI_SMOKE_TARGET);
  if (PRODUCTION_APP_ENV_VALUES.has(appEnv)) {
    return true;
  }

  const easProfile = normalize(env.EAS_BUILD_PROFILE);
  if (easProfile === 'production') {
    return true;
  }

  return (
    urlLooksProduction(env.EATFITAI_SMOKE_BACKEND_URL) ||
    urlLooksProduction(env.EATFITAI_DEVICE_BACKEND_URL) ||
    urlLooksProduction(env.EXPO_PUBLIC_API_BASE_URL)
  );
}

function isLockdownRequired(env = process.env) {
  return (
    isTruthy(env.EATFITAI_REQUIRE_MEDIA_BUDGET_MODE) ||
    isTruthy(env.EATFITAI_SUPABASE_EGRESS_LOCKDOWN)
  );
}

function evaluateMediaEgressGuard(env = process.env) {
  const productionTarget = isProductionTarget(env);
  const lockdownRequired = isLockdownRequired(env);
  const mediaBudgetMode = normalizeMediaBudgetMode(env);
  const placeholderMode = mediaBudgetMode === PLACEHOLDER_MODE;

  if (!productionTarget) {
    return {
      status: 'pass',
      productionTarget,
      lockdownRequired,
      mediaBudgetMode,
      message: 'Media egress guard passed for a non-production target.',
    };
  }

  if (placeholderMode) {
    return {
      status: 'pass',
      productionTarget,
      lockdownRequired,
      mediaBudgetMode,
      message: 'Production media budget mode is enabled.',
    };
  }

  const message =
    'Production target is not using EXPO_PUBLIC_MEDIA_BUDGET_MODE=placeholder. ' +
    'Enable it during Supabase egress lockdown before running release/smoke flows.';

  return {
    status: lockdownRequired ? 'fail' : 'warn',
    productionTarget,
    lockdownRequired,
    mediaBudgetMode,
    message,
  };
}

function runMediaEgressGuard(options = {}) {
  const env = options.env || process.env;
  const logger = options.logger || console;
  const result = evaluateMediaEgressGuard(env);
  const prefix = options.label || 'media-egress-guard';
  const line = `[${prefix}] ${result.message}`;

  if (result.status === 'fail') {
    const error = new Error(result.message);
    error.result = result;
    throw error;
  }

  if (result.status === 'warn') {
    logger.warn(line);
  } else if (logger.log) {
    logger.log(line);
  }

  return result;
}

module.exports = {
  PLACEHOLDER_MODE,
  evaluateMediaEgressGuard,
  isLockdownRequired,
  isProductionTarget,
  runMediaEgressGuard,
};
