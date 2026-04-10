const fs = require('fs');
const path = require('path');

const DEFAULT_LIMITS = {
  healthPerEndpoint: 2,
  registerWithVerification: 1,
  resendVerification: 1,
  verifyEmail: 2,
  login: 1,
  refresh: 1,
  aiStatus: 1,
  visionDetect: 6,
  mealDiaryWrite: 3,
};

function trim(value) {
  return String(value || '').trim();
}

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (!explicit) {
    throw new Error('Missing output directory. Pass it explicitly or set EATFITAI_SMOKE_OUTPUT_DIR.');
  }

  return path.resolve(explicit);
}

function getBudgetFilePath(outputDir) {
  return path.join(outputDir, 'request-budget.json');
}

function buildLimits(outputDir) {
  const limits = { ...DEFAULT_LIMITS };
  const manifestPath = path.join(outputDir, 'fixture-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return limits;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const totalVisionFixtures = ['primary', 'benchmark']
      .map((bucket) => (Array.isArray(manifest.fixtures?.[bucket]) ? manifest.fixtures[bucket].length : 0))
      .reduce((sum, count) => sum + count, 0);

    if (totalVisionFixtures > 0) {
      limits.visionDetect = Math.max(limits.visionDetect, totalVisionFixtures);
    }
  } catch {
    // Keep static defaults when fixture manifest is absent or malformed.
  }

  return limits;
}

function createBudgetDocument(outputDir) {
  const limits = buildLimits(outputDir);
  return {
    generatedAt: new Date().toISOString(),
    limits,
    used: Object.fromEntries(Object.keys(limits).map((key) => [key, 0])),
    events: [],
  };
}

function ensureBudget(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const budgetFilePath = getBudgetFilePath(outputDir);

  if (!fs.existsSync(budgetFilePath)) {
    fs.writeFileSync(budgetFilePath, JSON.stringify(createBudgetDocument(outputDir), null, 2), 'utf8');
  }

  return budgetFilePath;
}

function readBudget(outputDir) {
  const budgetFilePath = ensureBudget(outputDir);
  return {
    budgetFilePath,
    budget: JSON.parse(fs.readFileSync(budgetFilePath, 'utf8')),
  };
}

function writeBudget(budgetFilePath, budget) {
  fs.writeFileSync(budgetFilePath, JSON.stringify(budget, null, 2), 'utf8');
}

function printStatus(outputDir) {
  const { budget } = readBudget(outputDir);
  const summary = {};

  for (const [key, limit] of Object.entries(budget.limits || {})) {
    const used = Number(budget.used?.[key] || 0);
    summary[key] = {
      used,
      remaining: Math.max(0, limit - used),
      limit,
    };
  }

  console.log(
    JSON.stringify(
      {
        outputDir,
        generatedAt: budget.generatedAt,
        summary,
        events: budget.events?.length || 0,
      },
      null,
      2,
    ),
  );
}

function recordHit(outputDir, key, count, note) {
  const { budgetFilePath, budget } = readBudget(outputDir);

  if (!Object.prototype.hasOwnProperty.call(budget.limits, key)) {
    throw new Error(`Unknown budget key: ${key}`);
  }

  const increment = Number.parseInt(count, 10);
  if (!Number.isFinite(increment) || increment <= 0) {
    throw new Error(`Count must be a positive integer. Received: ${count}`);
  }

  const used = Number(budget.used[key] || 0);
  const limit = Number(budget.limits[key]);
  const nextUsed = used + increment;

  if (nextUsed > limit) {
    console.error(
      `[production-smoke-budget] Refusing to exceed budget for ${key}. Used=${used}, increment=${increment}, limit=${limit}.`,
    );
    process.exit(2);
  }

  budget.used[key] = nextUsed;
  budget.events.push({
    type: 'hit',
    key,
    count: increment,
    note: trim(note),
    recordedAt: new Date().toISOString(),
  });

  writeBudget(budgetFilePath, budget);
  printStatus(outputDir);
}

function recordNote(outputDir, note) {
  const { budgetFilePath, budget } = readBudget(outputDir);
  budget.events.push({
    type: 'note',
    note: trim(note),
    recordedAt: new Date().toISOString(),
  });
  writeBudget(budgetFilePath, budget);
  printStatus(outputDir);
}

function printUsage() {
  console.log('Usage:');
  console.log('  node production-smoke-budget.js init [outputDir]');
  console.log('  node production-smoke-budget.js status [outputDir]');
  console.log('  node production-smoke-budget.js hit <key> [count] [note...] [outputDir]');
  console.log('  node production-smoke-budget.js note <message...> [outputDir]');
  console.log('');
  console.log(`Keys: ${Object.keys(DEFAULT_LIMITS).join(', ')}`);
}

function resolveOutputDirFromTail(args) {
  if (args.length === 0) {
    return resolveOutputDir('');
  }

  const lastArg = trim(args[args.length - 1]);
  if (lastArg && fs.existsSync(lastArg)) {
    args.pop();
    return resolveOutputDir(lastArg);
  }

  return resolveOutputDir('');
}

function main() {
  const [command = 'status', ...rest] = process.argv.slice(2);

  if (command === 'init') {
    const outputDir = resolveOutputDir(rest[0]);
    ensureBudget(outputDir);
    printStatus(outputDir);
    return;
  }

  if (command === 'status') {
    const outputDir = resolveOutputDir(rest[0]);
    printStatus(outputDir);
    return;
  }

  if (command === 'hit') {
    if (rest.length === 0) {
      printUsage();
      process.exit(1);
    }

    const args = [...rest];
    const outputDir = resolveOutputDirFromTail(args);
    const [key, maybeCount, ...noteParts] = args;
    const count = Number.parseInt(maybeCount, 10);
    const normalizedCount = Number.isFinite(count) && count > 0 ? count : 1;
    const note = Number.isFinite(count) && count > 0
      ? noteParts.join(' ')
      : [maybeCount, ...noteParts].filter(Boolean).join(' ');

    recordHit(outputDir, key, normalizedCount, note);
    return;
  }

  if (command === 'note') {
    const args = [...rest];
    const outputDir = resolveOutputDirFromTail(args);
    recordNote(outputDir, args.join(' '));
    return;
  }

  printUsage();
  process.exit(1);
}

main();
