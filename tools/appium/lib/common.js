const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { remote } = require('webdriverio');
const { resolveEnv } = require('../../automation/resolveEnv');
const { loadTestIds } = require('./loadTestIds');

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = Number(process.env.APPIUM_PORT || 4723);
const APP_PACKAGE = 'com.eatfitai.app';
const APP_ACTIVITY = 'com.eatfitai.app.MainActivity';
const ARTIFACT_DIR = path.resolve(__dirname, '..', '..', '..', 'artifacts', 'appium');
const TEST_IDS = loadTestIds();
const KNOWN_ENTRY_IDS = [
  TEST_IDS.auth.introScreen,
  TEST_IDS.auth.introStartButton,
  TEST_IDS.auth.welcomeScreen,
  TEST_IDS.auth.welcomeLoginButton,
  TEST_IDS.auth.loginScreen,
  TEST_IDS.home.screen,
  TEST_IDS.foodSearch.screen,
  TEST_IDS.mealDiary.screen,
  TEST_IDS.aiScan.screen,
];
const AUTHENTICATED_ENTRY_IDS = new Set([
  TEST_IDS.home.screen,
  TEST_IDS.foodSearch.screen,
  TEST_IDS.mealDiary.screen,
  TEST_IDS.aiScan.screen,
]);

function createArtifactBaseName(label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${stamp}-${label}`;
}

async function captureDebugArtifacts(driver, label) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const baseName = createArtifactBaseName(label);
  const metaPath = path.join(ARTIFACT_DIR, `${baseName}.json`);
  const sourcePath = path.join(ARTIFACT_DIR, `${baseName}.xml`);
  const screenshotPath = path.join(ARTIFACT_DIR, `${baseName}.png`);
  const payload = {
    label,
    capturedAt: new Date().toISOString(),
  };

  try {
    payload.currentPackage = await driver.getCurrentPackage().catch(() => null);
    payload.currentActivity = await driver.getCurrentActivity().catch(() => null);
    payload.currentContext = await driver.getContext().catch(() => null);
    const source = await driver.getPageSource().catch(() => null);
    if (source) {
      fs.writeFileSync(sourcePath, source, 'utf8');
      payload.pageSourcePath = sourcePath;
    }
    await driver.saveScreenshot(screenshotPath).catch(() => null);
    if (fs.existsSync(screenshotPath)) {
      payload.screenshotPath = screenshotPath;
    }
  } finally {
    fs.writeFileSync(metaPath, JSON.stringify(payload, null, 2), 'utf8');
  }
}

function selectorCandidates(testId) {
  return [
    `android=new UiSelector().resourceId("${testId}")`,
    `android=new UiSelector().resourceId("${APP_PACKAGE}:id/${testId}")`,
  ];
}

async function connect() {
  coldLaunchApp();

  return remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: '/',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
      'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || undefined,
      'appium:appPackage': APP_PACKAGE,
      'appium:appActivity': APP_ACTIVITY,
      'appium:autoLaunch': false,
      'appium:noReset': true,
      'appium:appWaitDuration': 120000,
      'appium:disableWindowAnimation': true,
      'appium:newCommandTimeout': 180,
      'appium:adbExecTimeout': 120000,
      'appium:uiautomator2ServerLaunchTimeout': 120000,
    },
  });
}

async function findByTestId(driver, testId, timeout = 5000) {
  const selectors = selectorCandidates(testId);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const element = await driver.$(selector);
      if (await element.isExisting()) {
        return element;
      }
    }
    await driver.pause(250);
  }

  return null;
}

async function waitForAny(driver, ids, timeout = 10000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const id of ids) {
      const element = await findByTestId(driver, id, 500);
      if (element) {
        return id;
      }
    }
    await driver.pause(300);
  }

  await captureDebugArtifacts(driver, 'wait-for-any-timeout').catch(() => null);
  throw new Error(`Timed out waiting for any selector: ${ids.join(', ')}`);
}

async function waitForAppEntry(driver, timeout = 45000) {
  return waitForAny(driver, KNOWN_ENTRY_IDS, timeout);
}

async function loginIfNeeded(driver) {
  let current = await waitForAppEntry(driver, 60000);

  if (AUTHENTICATED_ENTRY_IDS.has(current) && current !== TEST_IDS.home.screen) {
    console.log(`Authenticated non-home screen detected (${current}), relaunching to normalize state.`);
    coldLaunchApp();
    current = await waitForAppEntry(driver, 30000);
  }

  if (current === TEST_IDS.home.screen) {
    console.log('Home screen detected, skipping login.');
    return;
  }

  if (
    current === TEST_IDS.auth.introScreen ||
    current === TEST_IDS.auth.introStartButton
  ) {
    const introStartButton = await findByTestId(
      driver,
      TEST_IDS.auth.introStartButton,
      5000,
    );
    if (!introStartButton) {
      throw new Error('Intro screen detected but start button could not be resolved.');
    }

    await introStartButton.click();
    current = await waitForAny(
      driver,
      [
        TEST_IDS.auth.welcomeScreen,
        TEST_IDS.auth.welcomeLoginButton,
        TEST_IDS.auth.loginScreen,
        TEST_IDS.home.screen,
      ],
      15000,
    );
  }

  if (current === TEST_IDS.auth.welcomeScreen) {
    current = TEST_IDS.auth.welcomeLoginButton;
  }

  if (current === TEST_IDS.auth.welcomeLoginButton) {
    const welcomeLoginButton = await findByTestId(driver, TEST_IDS.auth.welcomeLoginButton, 5000);
    if (!welcomeLoginButton) {
      throw new Error('Welcome login button was detected but could not be resolved.');
    }

    await welcomeLoginButton.click();
    current = await waitForAny(
      driver,
      [TEST_IDS.auth.loginScreen, TEST_IDS.home.screen],
      15000,
    );
  }

  if (current === TEST_IDS.home.screen) {
    console.log('Home screen detected after intro/welcome, skipping login.');
    return;
  }

  const email = resolveEnv('EATFITAI_DEMO_EMAIL');
  const password = resolveEnv('EATFITAI_DEMO_PASSWORD');
  if (!email || !password) {
    throw new Error('Login screen detected but EATFITAI_DEMO_EMAIL / EATFITAI_DEMO_PASSWORD are missing.');
  }

  const emailInput = await findByTestId(driver, TEST_IDS.auth.emailInput, 10000);
  const passwordInput = await findByTestId(driver, TEST_IDS.auth.passwordInput, 10000);
  const submitButton = await findByTestId(driver, TEST_IDS.auth.submitButton, 10000);

  if (!emailInput || !passwordInput || !submitButton) {
    throw new Error('Login selectors were not found from shared testIds.ts.');
  }

  await emailInput.setValue(email);
  await passwordInput.setValue(password);
  await submitButton.click();

  await waitForAny(driver, [TEST_IDS.home.screen], 20000);
  console.log('Login successful.');
}

function runAdb(args) {
  const serial = process.env.ANDROID_SERIAL;
  const finalArgs = serial ? ['-s', serial, ...args] : args;

  execFileSync('adb', finalArgs, {
    stdio: 'inherit',
  });
}

function coldLaunchApp() {
  console.log('Cold launching app for Appium automation.');
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  runAdb(['shell', 'am', 'start', '-S', '-W', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);
}

module.exports = {
  APP_ACTIVITY,
  APP_PACKAGE,
  TEST_IDS,
  captureDebugArtifacts,
  connect,
  coldLaunchApp,
  findByTestId,
  loginIfNeeded,
  runAdb,
  waitForAppEntry,
  waitForAny,
};
