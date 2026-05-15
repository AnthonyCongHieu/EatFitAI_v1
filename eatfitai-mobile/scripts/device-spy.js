#!/usr/bin/env node

const { captureOnce, startServer } = require('./lib/device-spy-core');

function readOption(name, fallback = '') {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

function readNumber(name, fallback) {
  const value = Number(readOption(name, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main() {
  const mode = process.argv[2] || 'once';
  const interval = readNumber('--interval', 1500);
  const port = readNumber('--port', 49152);
  const logTail = readNumber('--log-tail', 300);

  if (mode === 'once') {
    console.log(JSON.stringify(captureOnce({ logTail }), null, 2));
    return;
  }

  if (mode === 'watch') {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const state = captureOnce({ logTail });
      console.log(JSON.stringify({
        capturedAt: state.capturedAt,
        serial: state.serial,
        outputDir: state.outputDir,
        screenshot: state.screenshot.path,
      }));
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  if (mode === 'serve') {
    startServer({ port, logTail });
    return;
  }

  throw new Error(`Unsupported device-spy mode '${mode}'. Use once, watch, or serve.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
