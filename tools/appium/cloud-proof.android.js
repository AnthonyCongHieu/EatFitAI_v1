const fs = require('fs');
const path = require('path');
const {
  captureDebugArtifacts,
  captureLogcat,
  connect,
  coldLaunchApp,
  loginIfNeeded,
  runAdb,
  waitForAppEntry,
} = require('./lib/common');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = '1';
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

function trim(value) {
  return String(value || '').trim();
}

function resolveEvidenceRoot(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  return path.resolve(__dirname, '..', 'artifacts', 'appium');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const evidenceRoot = resolveEvidenceRoot(args.output);
  const appiumOutputDir = path.join(evidenceRoot, 'appium');
  fs.mkdirSync(appiumOutputDir, { recursive: true });
  process.env.EATFITAI_SMOKE_OUTPUT_DIR = evidenceRoot;

  const driver = await connect();
  try {
    const initialEntry = await waitForAppEntry(driver, 60000);
    await loginIfNeeded(driver);

    const homeArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-home');
    const homeEvidence = {
      screenshotPath: homeArtifact.screenshotPath || null,
      pageSourcePath: homeArtifact.pageSourcePath || null,
      metaPath: homeArtifact.metaPath,
      currentPackage: homeArtifact.currentPackage || null,
      currentActivity: homeArtifact.currentActivity || null,
    };

    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    coldLaunchApp();
    await driver.pause(15000);

    const reopenArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-reopen-home');
    const reopenEvidence = {
      screenshotPath: reopenArtifact.screenshotPath || null,
      pageSourcePath: reopenArtifact.pageSourcePath || null,
      metaPath: reopenArtifact.metaPath,
      currentPackage: reopenArtifact.currentPackage || null,
      currentActivity: reopenArtifact.currentActivity || null,
    };

    const logcatPath = captureLogcat(appiumOutputDir, 'cloud-proof-auth.logcat.txt', {
      lines: 5000,
    });

    const summary = {
      generatedAt: new Date().toISOString(),
      evidenceRoot,
      appiumOutputDir,
      initialEntry,
      homeEvidence,
      reopenEvidence,
      logcatPath,
      diaryEvidence: null,
      status: 'passed',
    };
    const summaryPath = path.join(evidenceRoot, 'cloud-proof-auth.summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    console.log(`[cloud-proof.android] Wrote ${summaryPath}`);
    console.log('[cloud-proof.android] Auth evidence lane completed successfully.');
  } catch (error) {
    const failureArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-failure').catch(
      () => null,
    );
    const failureLogcatPath = captureLogcat(appiumOutputDir, 'cloud-proof-auth-failure.logcat.txt', {
      lines: 5000,
    });
    console.error(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          evidenceRoot,
          appiumOutputDir,
          failureArtifact: failureArtifact
            ? {
                screenshotPath: failureArtifact.screenshotPath || null,
                pageSourcePath: failureArtifact.pageSourcePath || null,
                metaPath: failureArtifact.metaPath,
                currentPackage: failureArtifact.currentPackage || null,
                currentActivity: failureArtifact.currentActivity || null,
              }
            : null,
          failureLogcatPath,
          error: error instanceof Error ? error.message : String(error),
          status: 'failed',
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await driver.deleteSession();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[cloud-proof.android] Failed:', error);
    process.exit(1);
  });
}

module.exports = {
  run,
};
