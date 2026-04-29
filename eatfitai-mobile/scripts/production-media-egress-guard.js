#!/usr/bin/env node

const { runMediaEgressGuard } = require('./lib/media-egress-guard');

try {
  const result = runMediaEgressGuard();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(`[media-egress-guard] ${error instanceof Error ? error.message : String(error)}`);
  if (error?.result && process.argv.includes('--json')) {
    console.error(JSON.stringify(error.result, null, 2));
  }
  process.exit(1);
}
