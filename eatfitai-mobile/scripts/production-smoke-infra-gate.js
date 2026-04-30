const fs = require('fs');
const path = require('path');

const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function trim(value) {
  const normalized = String(value || '').trim();
  const quotedMatch = normalized.match(/^"(.*)"$/);
  return quotedMatch ? quotedMatch[1] : normalized;
}

function normalizePathArg(value) {
  return trim(value).replace(/\\"/g, '"').replace(/"/g, '');
}

function resolveOutputDir(cliValue) {
  const explicit =
    normalizePathArg(cliValue) || normalizePathArg(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    if (path.isAbsolute(explicit)) {
      return explicit;
    }

    const cwdPath = path.resolve(explicit);
    if (fs.existsSync(cwdPath)) {
      return cwdPath;
    }

    return path.resolve(REPO_ROOT, explicit);
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function getNested(value, keys) {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function findEnvValue(renderYaml, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `-\\s+key:\\s*${escapedKey}\\s*\\r?\\n\\s*(?:value:\\s*"?([^"\\r\\n]+)"?|sync:\\s*(false|true))`,
    'i',
  );
  const match = renderYaml.match(pattern);
  if (!match) {
    return null;
  }

  return trim(match[1] || match[2] || '');
}

function pushCheck(checks, key, passed, details = {}) {
  checks.push({
    key,
    passed: Boolean(passed),
    details,
  });
}

function summarizeGeminiHealth(preflight) {
  const health = preflight?.checks?.health || {};
  const geminiCheck = health.aiProviderGeminiHealthz || {};
  const body = geminiCheck.body || {};

  return {
    status: geminiCheck.status ?? null,
    ok: Boolean(geminiCheck.ok),
    geminiConfigured: Boolean(body.gemini_configured),
    usageStateStore: trim(body.gemini_usage_state_store),
    usageStateStoreDegraded: Boolean(body.gemini_usage_state_store_degraded),
    usageStateStoreError: trim(body.gemini_usage_state_store_error),
  };
}

function buildMarkdown(report) {
  const lines = [
    '# Infra Hardening Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Output dir: ${report.outputDir}`,
    `- Phase: ${report.phase}`,
    `- Passed: ${report.passed ? 'yes' : 'no'}`,
    '',
    '## Checks',
  ];

  for (const check of report.checks) {
    lines.push(`- ${check.passed ? 'PASS' : 'FAIL'} ${check.key}`);
  }

  if (report.failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return lines.join('\n');
}

function main() {
  const outputDir = resolveOutputDir(process.argv[2]);
  const phase =
    trim(process.env.EATFITAI_INFRA_PHASE).toLowerCase() === 'phase-a'
      ? 'phase-a'
      : 'phase-b';
  const requireSchemaReport = trim(process.env.EATFITAI_REQUIRE_SCHEMA_REPORT || '1') !== '0';
  const preflight = readJsonIfExists(path.join(outputDir, 'preflight-results.json')) || {};
  const authReport = readJsonIfExists(path.join(outputDir, 'auth-api-report.json')) || {};
  const schemaReport = readJsonIfExists(
    path.join(outputDir, 'schema-bootstrap-report.json'),
  );
  const renderYamlPath = path.join(REPO_ROOT, 'render.yaml');
  const renderYaml = fs.existsSync(renderYamlPath)
    ? fs.readFileSync(renderYamlPath, 'utf8')
    : '';
  const checks = [];

  const health = preflight?.checks?.health || {};
  pushCheck(checks, 'backend-ready-health-ok', Boolean(health.backendReady?.ok), {
    status: health.backendReady?.status ?? null,
  });
  pushCheck(checks, 'backend-live-health-ok', Boolean(health.backendLive?.ok), {
    status: health.backendLive?.status ?? null,
  });
  pushCheck(checks, 'ai-provider-healthz-ok', Boolean(health.aiProviderHealthz?.ok), {
    status: health.aiProviderHealthz?.status ?? null,
  });

  const geminiHealth = summarizeGeminiHealth(preflight);
  pushCheck(
    checks,
    'ai-provider-gemini-healthz-ok',
    geminiHealth.ok && geminiHealth.status === 200 && geminiHealth.geminiConfigured,
    geminiHealth,
  );
  pushCheck(
    checks,
    'gemini-state-store-postgres-not-degraded',
    geminiHealth.usageStateStore === 'postgres' &&
      !geminiHealth.usageStateStoreDegraded,
    geminiHealth,
  );

  const legacyGoogle = getNested(authReport, ['auth', 'legacyGoogleEndpoint']);
  const phaseALegacyPassed =
    Boolean(legacyGoogle?.passed) &&
    legacyGoogle?.status === 410 &&
    trim(legacyGoogle?.deprecatedEndpoint).includes('/api/auth/google/signin');
  const phaseBLegacyPassed =
    Boolean(legacyGoogle?.passed) && [404, 405].includes(legacyGoogle?.status);
  pushCheck(
    checks,
    phase === 'phase-b'
      ? 'legacy-google-phase-b-removed'
      : 'legacy-google-phase-a-contract',
    phase === 'phase-b' ? phaseBLegacyPassed : phaseALegacyPassed,
    {
      phase,
      status: legacyGoogle?.status ?? null,
      deprecatedEndpoint: trim(legacyGoogle?.deprecatedEndpoint),
      passed: Boolean(legacyGoogle?.passed),
    },
  );

  pushCheck(
    checks,
    'schema-bootstrap-report-present',
    !requireSchemaReport || Boolean(schemaReport),
    {
      required: requireSchemaReport,
      action: trim(schemaReport?.action),
      environment: trim(schemaReport?.environment),
    },
  );
  if (schemaReport) {
    pushCheck(
      checks,
      'schema-bootstrap-report-action',
      trim(schemaReport.action) === 'schema-bootstrap',
      {
        action: trim(schemaReport.action),
      },
    );
  }

  pushCheck(checks, 'render-media-provider-r2', findEnvValue(renderYaml, 'Media__Provider') === 'r2', {
    configured: findEnvValue(renderYaml, 'Media__Provider'),
  });
  pushCheck(
    checks,
    'render-schema-bootstrap-startup-disabled',
    findEnvValue(renderYaml, 'SchemaBootstrap__RunOnStartup') === 'false',
    {
      configured: findEnvValue(renderYaml, 'SchemaBootstrap__RunOnStartup'),
    },
  );
  pushCheck(
    checks,
    'render-gemini-state-store-postgres',
    findEnvValue(renderYaml, 'GEMINI_USAGE_STATE_STORE') === 'postgres',
    {
      configured: findEnvValue(renderYaml, 'GEMINI_USAGE_STATE_STORE'),
    },
  );
  pushCheck(
    checks,
    'render-gemini-state-database-url-secret',
    findEnvValue(renderYaml, 'GEMINI_USAGE_STATE_DATABASE_URL') === 'false',
    {
      configured: findEnvValue(renderYaml, 'GEMINI_USAGE_STATE_DATABASE_URL'),
    },
  );

  const failures = checks.filter((check) => !check.passed).map((check) => check.key);
  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    phase,
    passed: failures.length === 0,
    failures,
    checks,
  };

  const jsonPath = path.join(outputDir, 'infra-hardening-gate.json');
  const markdownPath = path.join(outputDir, 'infra-hardening-gate.md');
  writeJson(jsonPath, report);
  writeText(markdownPath, buildMarkdown(report));

  console.log(`[production-smoke-infra-gate] Wrote ${jsonPath}`);
  console.log(
    JSON.stringify(
      {
        outputDir,
        phase,
        passed: report.passed,
        failures,
      },
      null,
      2,
    ),
  );

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main();
