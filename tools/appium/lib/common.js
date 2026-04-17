const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { remote } = require('webdriverio');
const { resolveEnv } = require('../../automation/resolveEnv');
const { loadTestIds } = require('./loadTestIds');

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = Number(process.env.APPIUM_PORT || 4723);
const APPIUM_AUTOMATION_NAME = process.env.APPIUM_AUTOMATION_NAME || 'UiAutomator2';
const APP_PACKAGE = 'com.eatfitai.app';
const APP_ACTIVITY = 'com.eatfitai.app.MainActivity';
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FALLBACK_ADB_PATH = path.resolve(
  REPO_ROOT,
  '_tooling',
  'android-sdk',
  'platform-tools',
  process.platform === 'win32' ? 'adb.exe' : 'adb',
);
const TEST_IDS = loadTestIds();
const ACCESSIBILITY_LABEL_FALLBACKS = {
  [TEST_IDS.auth.introStartButton]: ['Bắt đầu ngay'],
  [TEST_IDS.auth.welcomeGoogleButton]: ['Tiếp tục với Google'],
  [TEST_IDS.auth.welcomeLoginButton]: ['Tiếp tục với Email'],
  [TEST_IDS.auth.welcomeRegisterButton]: ['Đăng ký ngay'],
  [TEST_IDS.auth.registerTermsCheckbox]: [
    'Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật',
  ],
};
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

function resolveArtifactDir() {
  const sessionRoot = process.env.EATFITAI_SMOKE_OUTPUT_DIR || process.env.APPIUM_EVIDENCE_DIR;
  if (sessionRoot) {
    return path.join(path.resolve(sessionRoot), 'appium');
  }

  return path.resolve(__dirname, '..', '..', '..', 'artifacts', 'appium');
}

async function captureDebugArtifacts(driver, label) {
  const artifactDir = resolveArtifactDir();
  fs.mkdirSync(artifactDir, { recursive: true });
  const baseName = createArtifactBaseName(label);
  const metaPath = path.join(artifactDir, `${baseName}.json`);
  const sourcePath = path.join(artifactDir, `${baseName}.xml`);
  const screenshotPath = path.join(artifactDir, `${baseName}.png`);
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

  return {
    ...payload,
    metaPath,
  };
}

function adbOutput(args, options = {}) {
  const serial = process.env.ANDROID_SERIAL;
  const finalArgs = serial ? ['-s', serial, ...args] : args;
  const adbPath = process.env.ANDROID_ADB_PATH || (fs.existsSync(FALLBACK_ADB_PATH) ? FALLBACK_ADB_PATH : 'adb');
  return execFileSync(adbPath, finalArgs, {
    encoding: 'utf8',
    maxBuffer: options.maxBuffer || 8 * 1024 * 1024,
  });
}

function captureLogcat(outputDir, fileName = 'appium.logcat.txt', options = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, fileName);
  const lines = options.lines || '4000';
  const content = adbOutput(['logcat', '-d', '-t', String(lines)]);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

async function tapElement(driver, element, options = {}) {
  const {
    horizontalBias = 0.5,
    verticalBias = 0.5,
    useAdbFirst = false,
    adbPressDurationMs = 0,
  } = options;

  const getTapPoint = async () => {
    const rect =
      typeof element.getRect === 'function'
        ? await element.getRect()
        : await driver.getElementRect(element.elementId);
    return {
      x: Math.round(rect.x + rect.width * horizontalBias),
      y: Math.round(rect.y + rect.height * verticalBias),
    };
  };

  const adbTap = async () => {
    const { x, y } = await getTapPoint();
    if (adbPressDurationMs > 0) {
      runAdb([
        'shell',
        'input',
        'swipe',
        String(x),
        String(y),
        String(x),
        String(y),
        String(adbPressDurationMs),
      ]);
      await driver.pause(Math.max(700, adbPressDurationMs + 250));
      return;
    }

    runAdb(['shell', 'input', 'tap', String(x), String(y)]);
    await driver.pause(500);
  };

  const mobileClickGestureTap = async () => {
    const { x, y } = await getTapPoint();
    await driver.execute('mobile: clickGesture', { x, y });
    await driver.pause(400);
  };

  const pointerActionsTap = async () => {
    const { x, y } = await getTapPoint();
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 80 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions().catch(() => null);
    await driver.pause(400);
  };

  if (useAdbFirst) {
    try {
      await adbTap();
      return;
    } catch (error) {
      if (String(error?.message || '').toLowerCase().includes('stale')) {
        return;
      }
      console.warn(`ADB tap fallback failed before click: ${error.message}`);
    }
  }

  try {
    await element.click();
    return;
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('stale')) {
      return;
    }
    console.warn(`Element click failed, retrying with mobile click gesture: ${error.message}`);
  }

  try {
    await mobileClickGestureTap();
    return;
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('stale')) {
      return;
    }
    console.warn(`mobile: clickGesture failed, retrying with pointer actions: ${error.message}`);
  }

  try {
    await pointerActionsTap();
    return;
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('stale')) {
      return;
    }
    console.warn(`Pointer actions tap failed, retrying with adb tap: ${error.message}`);
  }

  await adbTap();
}

function selectorCandidates(testId) {
  if (APPIUM_AUTOMATION_NAME.toLowerCase() === 'espresso') {
    return [
      `id=${testId}`,
      `id=${APP_PACKAGE}:id/${testId}`,
      `~${testId}`,
    ];
  }

  return [
    `android=new UiSelector().resourceId("${testId}")`,
    `android=new UiSelector().resourceId("${APP_PACKAGE}:id/${testId}")`,
  ];
}

async function connect() {
  coldLaunchApp();

  const capabilities = {
    platformName: 'Android',
    'appium:automationName': APPIUM_AUTOMATION_NAME,
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    'appium:udid': process.env.ANDROID_SERIAL || undefined,
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || undefined,
    'appium:appPackage': APP_PACKAGE,
    'appium:appActivity': APP_ACTIVITY,
    'appium:autoLaunch': false,
    'appium:noReset': true,
    'appium:appWaitDuration': 120000,
    'appium:disableWindowAnimation': true,
    'appium:ignoreHiddenApiPolicyError': true,
    'appium:skipDeviceInitialization': true,
    'appium:newCommandTimeout': 180,
    'appium:adbExecTimeout': 120000,
    'appium:uiautomator2ServerLaunchTimeout': 120000,
    'appium:uiautomator2ServerInstallTimeout': 120000,
  };

  if (process.env.APPIUM_USE_KEYSTORE === '1' || process.env.APPIUM_USE_KEYSTORE === 'true') {
    capabilities['appium:useKeystore'] = true;
    capabilities['appium:keystorePath'] = process.env.APPIUM_KEYSTORE_PATH;
    capabilities['appium:keystorePassword'] = process.env.APPIUM_KEYSTORE_PASSWORD;
    capabilities['appium:keyAlias'] = process.env.APPIUM_KEY_ALIAS;
    capabilities['appium:keyPassword'] = process.env.APPIUM_KEY_PASSWORD;
  }

  return remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: '/',
    capabilities,
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

    const fallbackLabels = ACCESSIBILITY_LABEL_FALLBACKS[testId];
    if (fallbackLabels) {
      for (const label of fallbackLabels) {
        for (const selector of [
          `android=new UiSelector().description("${label}")`,
          `android=new UiSelector().text("${label}")`,
          `android=new UiSelector().descriptionContains("${label}")`,
          `android=new UiSelector().textContains("${label}")`,
        ]) {
          const element = await driver.$(selector);
          if (await element.isExisting()) {
            return element;
          }
        }
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

    await tapElement(driver, introStartButton, {
      verticalBias: 0.5,
      useAdbFirst: true,
      adbPressDurationMs: 450,
    });
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

    await tapElement(driver, welcomeLoginButton);
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
  await tapElement(driver, submitButton);

  await waitForAny(driver, [TEST_IDS.home.screen], 20000);
  console.log('Login successful.');
}

function runAdb(args) {
  const serial = process.env.ANDROID_SERIAL;
  const finalArgs = serial ? ['-s', serial, ...args] : args;
  const adbPath = process.env.ANDROID_ADB_PATH || (fs.existsSync(FALLBACK_ADB_PATH) ? FALLBACK_ADB_PATH : 'adb');

  execFileSync(adbPath, finalArgs, {
    stdio: 'inherit',
  });
}

function coldLaunchApp() {
  console.log('Cold launching app for Appium automation.');
  try {
    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  } catch (error) {
    console.warn('Skipping KEYCODE_HOME during launch:', error.message);
  }
  runAdb(['shell', 'am', 'start', '-S', '-W', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);
}

module.exports = {
  APP_ACTIVITY,
  APP_PACKAGE,
  TEST_IDS,
  captureDebugArtifacts,
  captureLogcat,
  connect,
  coldLaunchApp,
  findByTestId,
  loginIfNeeded,
  runAdb,
  tapElement,
  waitForAppEntry,
  waitForAny,
};
