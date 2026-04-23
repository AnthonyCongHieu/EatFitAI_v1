const fs = require('fs');
const path = require('path');
const {
  APP_PACKAGE,
  captureDebugArtifacts,
  captureLogcat,
  connect,
  coldLaunchApp,
  deleteSessionQuietly,
  ensureHomeVisible,
  loginIfNeeded,
  runAdb,
  waitForAny,
  waitForAppEntry,
} = require('./lib/common');

const SCAN_DEMO_IMAGE_PATH = path.resolve(
  __dirname,
  'fixtures',
  'scan-demo',
  'ai-primary-rice-01.jpg',
);

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

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function updateObservations(evidenceRoot, patch) {
  const observationsPath = path.join(evidenceRoot, 'session-observations.json');
  const observations = readJsonIfExists(observationsPath) || {};
  const next = {
    ...observations,
    ...patch,
    evidence: {
      ...(observations.evidence || {}),
      ...(patch.evidence || {}),
      notes: [
        ...((observations.evidence && Array.isArray(observations.evidence.notes))
          ? observations.evidence.notes
          : []),
        ...((patch.evidence && Array.isArray(patch.evidence.notes)) ? patch.evidence.notes : []),
      ],
    },
  };
  writeJson(observationsPath, next);
}

function resolveEvidenceRoot(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  return path.resolve(__dirname, '..', 'artifacts', 'appium');
}

function resolveScanFixturePath(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SCAN_FIXTURE_PATH);
  if (explicit) {
    return path.resolve(explicit);
  }

  return SCAN_DEMO_IMAGE_PATH;
}

function seedGalleryFixture(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Missing gallery fixture image: ${imagePath}`);
  }

  const fileName = path.basename(imagePath);
  const deviceDir = '/sdcard/Pictures/EatFitAI/scan-demo';
  const devicePath = `${deviceDir}/${fileName}`;

  runAdb(['shell', 'mkdir', '-p', deviceDir]);
  runAdb(['push', imagePath, devicePath]);
  runAdb([
    'shell',
    'am',
    'broadcast',
    '-a',
    'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
    '-d',
    `file://${devicePath}`,
  ]);

  return devicePath;
}

async function dismissSystemDialogIfPresent(driver) {
  const labels = [
    'Allow',
    'Allow only while using the app',
    'While using the app',
    'Only this time',
    'Select photos and videos',
    'Allow access to photos and videos',
    'Allow access to photos',
    'Allow all photos',
    'Allow selected photos',
  ];

  for (const label of labels) {
    const selectors = [
      `android=new UiSelector().text("${label}")`,
      `android=new UiSelector().textContains("${label}")`,
      `android=new UiSelector().description("${label}")`,
      `android=new UiSelector().descriptionContains("${label}")`,
    ];

    for (const selector of selectors) {
      const element = await driver.$(selector).catch(() => null);
      if (!element || !(await element.isExisting().catch(() => false))) {
        continue;
      }

      try {
        await element.click();
        await driver.pause(500);
        return true;
      } catch (error) {
        console.warn(`Dialog dismissal failed for ${label}: ${error.message}`);
      }
    }
  }

  return false;
}

async function waitForPickerPackage(driver, appPackage, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const packageName = await driver.getCurrentPackage().catch(() => null);
    if (packageName && packageName !== appPackage) {
      if (packageName.includes('permission')) {
        await dismissSystemDialogIfPresent(driver);
        await driver.pause(500);
        continue;
      }

      return packageName;
    }

    await driver.pause(250);
  }

  return null;
}

async function tapFirstVisiblePickerItem(driver, preferredLabel = '') {
  const preferredName = path.parse(String(preferredLabel || '')).name;
  const selectorSeeds = [preferredLabel, preferredName].filter(Boolean);
  const selectors = [
    ...selectorSeeds.flatMap((label) => [
      `android=new UiSelector().text("${label}")`,
      `android=new UiSelector().textContains("${label}")`,
      `android=new UiSelector().description("${label}")`,
      `android=new UiSelector().descriptionContains("${label}")`,
    ]),
    'android=new UiSelector().descriptionContains("Ảnh được chụp")',
    'android=new UiSelector().descriptionContains("Photo taken")',
    'android=new UiSelector().className("android.view.View").clickable(true)',
    'android=new UiSelector().resourceIdMatches(".*thumbnail.*")',
    'android=new UiSelector().className("android.widget.ImageView")',
    'android=new UiSelector().className("android.widget.FrameLayout")',
  ];
  const windowRect = await driver.getWindowRect().catch(() => null);
  const resolveRect = async (element) => {
    if (typeof element?.getRect === 'function') {
      return element.getRect().catch(() => null);
    }

    if (element?.elementId && typeof driver.getElementRect === 'function') {
      return driver.getElementRect(element.elementId).catch(() => null);
    }

    return null;
  };

  for (const selector of selectors) {
    const elements = await driver.$$(selector).catch(() => []);
    for (const element of elements) {
      const isExisting = await element.isExisting().catch(() => false);
      if (!isExisting) {
        continue;
      }

      const isDisplayed = await element.isDisplayed().catch(() => true);
      if (!isDisplayed) {
        continue;
      }

      const rect = await resolveRect(element);
      if (rect) {
        const tooSmall = rect.width < 48 || rect.height < 48;
        const tooCloseToHeader =
          windowRect && !selectorSeeds.some((label) => selector.includes(label))
            ? rect.y < Math.max(120, Math.round(windowRect.height * 0.2))
            : false;
        if (tooSmall || tooCloseToHeader) {
          continue;
        }
      }

      try {
        await element.click();
        await driver.pause(700);
        return true;
      } catch (error) {
        const tapRect = rect || (await resolveRect(element));
        if (!tapRect) {
          continue;
        }

        try {
          await driver.execute('mobile: clickGesture', {
            x: Math.round(tapRect.x + tapRect.width / 2),
            y: Math.round(tapRect.y + tapRect.height / 2),
          });
          await driver.pause(700);
          return true;
        } catch (clickError) {
          console.warn(`Picker tap fallback failed: ${clickError.message}`);
        }
      }
    }
  }

  return false;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const evidenceRoot = resolveEvidenceRoot(args.output);
  const scanFixturePath = resolveScanFixturePath(args.fixture);
  const appiumOutputDir = path.join(evidenceRoot, 'appium');
  fs.mkdirSync(appiumOutputDir, { recursive: true });
  process.env.EATFITAI_SMOKE_OUTPUT_DIR = evidenceRoot;

  const driver = await connect();
  try {
    const initialEntry = await waitForAppEntry(driver, 60000);
    await loginIfNeeded(driver);
    await ensureHomeVisible(driver);

    const homeArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-home');
    const homeEvidence = {
      screenshotPath: homeArtifact.screenshotPath || null,
      pageSourcePath: homeArtifact.pageSourcePath || null,
      metaPath: homeArtifact.metaPath,
      currentPackage: homeArtifact.currentPackage || null,
      currentActivity: homeArtifact.currentActivity || null,
    };

    const seededGalleryPath = seedGalleryFixture(scanFixturePath);

    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    coldLaunchApp();
    await driver.pause(15000);
    await ensureHomeVisible(driver);

    const reopenArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-reopen-home');
    const reopenEvidence = {
      screenshotPath: reopenArtifact.screenshotPath || null,
      pageSourcePath: reopenArtifact.pageSourcePath || null,
      metaPath: reopenArtifact.metaPath,
      currentPackage: reopenArtifact.currentPackage || null,
      currentActivity: reopenArtifact.currentActivity || null,
    };

    const homeFab = await driver.$('android=new UiSelector().resourceId("home-smart-add-fab")');
    await homeFab.click();
    await driver.pause(1000);

    const quickScanButton = await driver.$(
      'android=new UiSelector().resourceId("home-quick-add-scan-button")',
    );
    await quickScanButton.click();
    await waitForAny(driver, ['ai-scan-screen'], 20000);

    const scanScreenArtifact = await captureDebugArtifacts(driver, 'cloud-proof-scan-screen');
    const scanScreenEvidence = {
      screenshotPath: scanScreenArtifact.screenshotPath || null,
      pageSourcePath: scanScreenArtifact.pageSourcePath || null,
      metaPath: scanScreenArtifact.metaPath,
      currentPackage: scanScreenArtifact.currentPackage || null,
      currentActivity: scanScreenArtifact.currentActivity || null,
    };

    const appPackageBeforeGallery = await driver.getCurrentPackage().catch(() => null);
    const galleryButton = await driver.$('android=new UiSelector().resourceId("ai-scan-gallery-button")');
    await galleryButton.click();

    const pickerBasePackage = appPackageBeforeGallery || APP_PACKAGE;
    const pickerPackage = await waitForPickerPackage(driver, pickerBasePackage, 15000);
    if (!pickerPackage) {
      throw new Error('Native gallery picker did not open after tapping the gallery button.');
    }

    const galleryPickerArtifact = await captureDebugArtifacts(driver, 'cloud-proof-gallery-picker');
    const galleryPickerEvidence = {
      screenshotPath: galleryPickerArtifact.screenshotPath || null,
      pageSourcePath: galleryPickerArtifact.pageSourcePath || null,
      metaPath: galleryPickerArtifact.metaPath,
      currentPackage: galleryPickerArtifact.currentPackage || null,
      currentActivity: galleryPickerArtifact.currentActivity || null,
    };

    const pickerSelected = await tapFirstVisiblePickerItem(driver, path.basename(scanFixturePath));
    if (!pickerSelected) {
      throw new Error(`Could not select the seeded gallery fixture: ${seededGalleryPath}`);
    }

    await waitForAny(driver, ['ai-scan-quick-save-button', 'ai-scan-add-to-diary-button'], 60000);
    const scanResultArtifact = await captureDebugArtifacts(driver, 'cloud-proof-scan-results');
    const scanResultEvidence = {
      screenshotPath: scanResultArtifact.screenshotPath || null,
      pageSourcePath: scanResultArtifact.pageSourcePath || null,
      metaPath: scanResultArtifact.metaPath,
      currentPackage: scanResultArtifact.currentPackage || null,
      currentActivity: scanResultArtifact.currentActivity || null,
    };

    const addToDiaryButton = await driver.$(
      'android=new UiSelector().resourceId("ai-scan-add-to-diary-button")',
    );
    await addToDiaryButton.click();

    await waitForAny(driver, ['vision-add-meal-screen'], 30000);
    const visionArtifact = await captureDebugArtifacts(driver, 'cloud-proof-vision-review');
    const visionEvidence = {
      screenshotPath: visionArtifact.screenshotPath || null,
      pageSourcePath: visionArtifact.pageSourcePath || null,
      metaPath: visionArtifact.metaPath,
      currentPackage: visionArtifact.currentPackage || null,
      currentActivity: visionArtifact.currentActivity || null,
    };

    const confirmButton = await driver.$(
      'android=new UiSelector().resourceId("vision-add-meal-confirm-button")',
    );
    await confirmButton.click();

    await waitForAny(driver, ['meal-diary-screen'], 30000);
    const diaryArtifact = await captureDebugArtifacts(driver, 'cloud-proof-diary-save');
    const diaryEvidence = {
      screenshotPath: diaryArtifact.screenshotPath || null,
      pageSourcePath: diaryArtifact.pageSourcePath || null,
      metaPath: diaryArtifact.metaPath,
      currentPackage: diaryArtifact.currentPackage || null,
      currentActivity: diaryArtifact.currentActivity || null,
    };

    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    coldLaunchApp();
    await driver.pause(15000);
    await ensureHomeVisible(driver);

    const finalReopenArtifact = await captureDebugArtifacts(driver, 'cloud-proof-auth-final-reopen-home');
    const finalReopenEvidence = {
      screenshotPath: finalReopenArtifact.screenshotPath || null,
      pageSourcePath: finalReopenArtifact.pageSourcePath || null,
      metaPath: finalReopenArtifact.metaPath,
      currentPackage: finalReopenArtifact.currentPackage || null,
      currentActivity: finalReopenArtifact.currentActivity || null,
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
      scanScreenEvidence,
      galleryPickerEvidence,
      scanResultEvidence,
      visionEvidence,
      diaryEvidence,
      finalReopenEvidence,
      logcatPath,
      status: 'passed',
    };
    const summaryPath = path.join(evidenceRoot, 'cloud-proof-auth.summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    updateObservations(evidenceRoot, {
      operator: 'codex',
      reopenHome: {
        attempted: true,
        passed: true,
        notes: 'Appium cloud-proof reopened the authenticated app to home successfully.',
      },
      scanToSave: {
        attempted: true,
        fixtureKey: path.parse(scanFixturePath).name,
        passed: true,
        diaryReadbackPassed: true,
        mealType: 'unspecified',
        notes: 'Appium cloud-proof completed gallery -> result -> add to diary -> diary readback.',
      },
      evidence: {
        homeScreenshot: homeEvidence.screenshotPath,
        aiResultScreenshot: scanResultEvidence.screenshotPath,
        diaryScreenshot: diaryEvidence.screenshotPath,
        logcatPath,
        notes: [
          `Cloud-proof summary: ${summaryPath}`,
          `Reopen evidence: ${finalReopenEvidence.screenshotPath || reopenEvidence.screenshotPath || ''}`,
          `Vision evidence: ${visionEvidence.screenshotPath || ''}`,
        ].filter(Boolean),
      },
      stability: {
        crashObserved: false,
        freezeObserved: false,
        notes: 'Appium cloud-proof completed without crash or freeze.',
      },
    });

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
    await deleteSessionQuietly(driver);
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
