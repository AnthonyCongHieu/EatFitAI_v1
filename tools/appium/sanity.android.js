const fs = require('fs');
const path = require('path');
const {
  TEST_IDS,
  captureDebugArtifacts,
  connect,
  detectVisibleEntry,
  loginIfNeeded,
} = require('./lib/common');

async function run() {
  const driver = await connect();

  try {
    const initialEntry = await detectVisibleEntry(driver, 800);
    const currentEntry = await loginIfNeeded(driver);

    if (!currentEntry) {
      throw new Error('No visible authenticated or auth entry was detected during Appium sanity.');
    }

    const artifact = await captureDebugArtifacts(driver, 'sanity-android-pass');
    const summary = {
      capturedAt: new Date().toISOString(),
      entryScreen: initialEntry || null,
      currentEntry,
      loginMode: initialEntry && initialEntry === currentEntry ? 'skipped' : 'checked',
      currentPackage: artifact.currentPackage || null,
      currentActivity: artifact.currentActivity || null,
      pageSourcePath: artifact.pageSourcePath || null,
      screenshotPath: artifact.screenshotPath || null,
      metaPath: artifact.metaPath,
    };
    const summaryPath = path.join(path.dirname(artifact.metaPath), 'sanity-android-pass.summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    console.log('Appium sanity flow completed successfully.');
  } finally {
    await driver.deleteSession();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  run,
};
