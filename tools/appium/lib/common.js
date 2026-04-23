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
const APPIUM_ARTIFACT_TIMEOUT_MS = readPositiveInt(
  process.env.APPIUM_ARTIFACT_TIMEOUT_MS,
  12000,
);
const APPIUM_SESSION_TEARDOWN_TIMEOUT_MS = readPositiveInt(
  process.env.APPIUM_SESSION_TEARDOWN_TIMEOUT_MS,
  10000,
);
const APPIUM_ADB_TIMEOUT_MS = readPositiveInt(process.env.APPIUM_ADB_TIMEOUT_MS, 45000);
const WDIO_CONNECTION_RETRY_TIMEOUT_MS = readPositiveInt(
  process.env.WDIO_CONNECTION_RETRY_TIMEOUT_MS,
  30000,
);
const APPIUM_FATAL_DRIVER_PATTERNS = [
  'instrumentation process is not running',
  'not trusted uid',
  'socket hang up',
  'invalid session id',
  'target application appears to have died',
];
const ACCESSIBILITY_LABEL_FALLBACKS = {
  [TEST_IDS.auth.introStartButton]: ['Bắt đầu ngay'],
  [TEST_IDS.auth.welcomeGoogleButton]: ['Tiếp tục với Google'],
  [TEST_IDS.auth.welcomeLoginButton]: ['Tiếp tục với Email'],
  [TEST_IDS.auth.welcomeRegisterButton]: ['Đăng ký ngay'],
  [TEST_IDS.auth.registerTermsCheckbox]: [
    'Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật',
  ],
};
const AUTHENTICATED_ENTRY_IDS = new Set([
  TEST_IDS.home.screen,
  TEST_IDS.foodSearch.screen,
  TEST_IDS.mealDiary.screen,
  TEST_IDS.aiScan.screen,
  TEST_IDS.voice.screen,
  TEST_IDS.stats.screen,
  TEST_IDS.profile.screen,
]);
const ENTRY_PROBES = [
  [TEST_IDS.auth.introScreen, [TEST_IDS.auth.introScreen, TEST_IDS.auth.introStartButton]],
  [
    TEST_IDS.auth.welcomeScreen,
    [
      TEST_IDS.auth.welcomeScreen,
      TEST_IDS.auth.welcomeLoginButton,
      TEST_IDS.auth.welcomeRegisterButton,
      TEST_IDS.auth.welcomeGoogleButton,
    ],
  ],
  [
    TEST_IDS.auth.loginScreen,
    [
      TEST_IDS.auth.loginScreen,
      TEST_IDS.auth.emailInput,
      TEST_IDS.auth.passwordInput,
      TEST_IDS.auth.submitButton,
    ],
  ],
  [
    TEST_IDS.home.screen,
    [
      TEST_IDS.home.diaryButton,
      TEST_IDS.home.searchButton,
      TEST_IDS.home.quickAddSearchButton,
      TEST_IDS.home.fabButton,
      TEST_IDS.home.screen,
    ],
  ],
  [
    TEST_IDS.foodSearch.screen,
    [
      TEST_IDS.foodSearch.screen,
      TEST_IDS.foodSearch.queryInput,
      TEST_IDS.foodSearch.submitButton,
    ],
  ],
  [
    TEST_IDS.mealDiary.screen,
    [
      TEST_IDS.mealDiary.screen,
      TEST_IDS.mealDiary.datePickerButton,
      TEST_IDS.mealDiary.addManualButton,
      TEST_IDS.mealDiary.emptyAddManualButton,
    ],
  ],
  [
    TEST_IDS.aiScan.screen,
    [
      TEST_IDS.aiScan.screen,
      TEST_IDS.aiScan.captureButton,
      TEST_IDS.aiScan.galleryButton,
      TEST_IDS.aiScan.statusBadge,
    ],
  ],
  [
    TEST_IDS.voice.screen,
    [
      TEST_IDS.voice.screen,
      TEST_IDS.voice.statusCard,
      TEST_IDS.voice.textInput,
      TEST_IDS.voice.processButton,
    ],
  ],
  [
    TEST_IDS.stats.screen,
    [
      TEST_IDS.stats.screen,
      TEST_IDS.stats.todayTabButton,
      TEST_IDS.stats.weekTabButton,
      TEST_IDS.stats.monthTabButton,
    ],
  ],
  [
    TEST_IDS.profile.screen,
    [
      TEST_IDS.profile.screen,
      TEST_IDS.profile.editButton,
      TEST_IDS.profile.logoutButton,
    ],
  ],
];
const AUTHENTICATED_ENTRY_PROBES = ENTRY_PROBES.filter(([entryId]) =>
  AUTHENTICATED_ENTRY_IDS.has(entryId),
);
const KNOWN_ENTRY_IDS = Array.from(new Set(ENTRY_PROBES.map(([entryId]) => entryId)));

function readPositiveInt(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error) {
  return String(error && (error.stack || error.message || error) ? error.stack || error.message || error : '')
    .trim();
}

function throwIfFatalDriverError(error, context) {
  const message = errorMessage(error);
  const lowered = message.toLowerCase();
  if (!message) {
    return;
  }

  if (APPIUM_FATAL_DRIVER_PATTERNS.some((pattern) => lowered.includes(pattern))) {
    throw new Error(`[appium] ${context} aborted: ${message}`);
  }
}

async function withTimeout(run, timeoutMs, label) {
  let timer;

  try {
    return await Promise.race([
      Promise.resolve().then(run),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function withSoftTimeout(run, timeoutMs, label) {
  try {
    return await withTimeout(run, timeoutMs, label);
  } catch (error) {
    console.warn(`[appium] ${label} skipped: ${error.message}`);
    return null;
  }
}

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
    payload.currentPackage = await withSoftTimeout(
      () =>
        driver
          .execute('mobile: getCurrentPackage')
          .catch(() => driver.getCurrentPackage().catch(() => null)),
      APPIUM_ARTIFACT_TIMEOUT_MS,
      'getCurrentPackage',
    );
    payload.currentActivity = await withSoftTimeout(
      () =>
        driver
          .execute('mobile: getCurrentActivity')
          .catch(() => driver.getCurrentActivity().catch(() => null)),
      APPIUM_ARTIFACT_TIMEOUT_MS,
      'getCurrentActivity',
    );
    payload.currentContext = await withSoftTimeout(
      () => driver.getContext().catch(() => null),
      APPIUM_ARTIFACT_TIMEOUT_MS,
      'getContext',
    );
    const source = await withSoftTimeout(
      () => driver.getPageSource().catch(() => null),
      APPIUM_ARTIFACT_TIMEOUT_MS,
      'getPageSource',
    );
    if (source) {
      fs.writeFileSync(sourcePath, source, 'utf8');
      payload.pageSourcePath = sourcePath;
    }
    await withSoftTimeout(
      () => driver.saveScreenshot(screenshotPath).catch(() => null),
      APPIUM_ARTIFACT_TIMEOUT_MS,
      'saveScreenshot',
    );
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
    timeout: options.timeoutMs || APPIUM_ADB_TIMEOUT_MS,
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
    `~${testId}`,
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

  const driver = await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: '/',
    connectionRetryCount: 0,
    connectionRetryTimeout: WDIO_CONNECTION_RETRY_TIMEOUT_MS,
    logLevel: process.env.WDIO_LOG_LEVEL || 'error',
    capabilities,
  });

  await driver.setTimeout({ implicit: 0 });
  return driver;
}

async function findByTestId(driver, testId, timeout = 5000, options = {}) {
  const allowLabelFallbacks = options.allowLabelFallbacks !== false;
  const selectors = selectorCandidates(testId);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      let elements = [];
      try {
        elements = await driver.$$(selector);
      } catch (error) {
        throwIfFatalDriverError(error, `selector lookup for ${testId}`);
      }
      if (elements.length > 0) {
        return elements[0];
      }
    }

    const fallbackLabels = allowLabelFallbacks ? ACCESSIBILITY_LABEL_FALLBACKS[testId] : null;
    if (fallbackLabels) {
      for (const label of fallbackLabels) {
        for (const selector of [
          `android=new UiSelector().description("${label}")`,
          `android=new UiSelector().text("${label}")`,
          `android=new UiSelector().descriptionContains("${label}")`,
          `android=new UiSelector().textContains("${label}")`,
        ]) {
          let elements = [];
          try {
            elements = await driver.$$(selector);
          } catch (error) {
            throwIfFatalDriverError(error, `fallback selector lookup for ${testId}`);
          }
          if (elements.length > 0) {
            return elements[0];
          }
        }
      }
    }

    try {
      await driver.pause(250);
    } catch (error) {
      throwIfFatalDriverError(error, `pause while resolving ${testId}`);
    }
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
    try {
      await driver.pause(300);
    } catch (error) {
      throwIfFatalDriverError(error, `pause while waiting for ${ids.join(', ')}`);
    }
  }

  await captureDebugArtifacts(driver, 'wait-for-any-timeout').catch(() => null);
  throw new Error(`Timed out waiting for any selector: ${ids.join(', ')}`);
}

async function detectVisibleEntry(driver, timeoutPerProbe = 150, probes = ENTRY_PROBES) {
  for (const [entryId, probeIds] of probes) {
    for (const probeId of probeIds) {
      const element = await findByTestId(driver, probeId, timeoutPerProbe, {
        allowLabelFallbacks: false,
      });
      if (element) {
        return entryId;
      }
    }
  }

  return null;
}

async function detectAuthenticatedEntry(driver, timeoutPerProbe = 200) {
  return detectVisibleEntry(driver, timeoutPerProbe, AUTHENTICATED_ENTRY_PROBES);
}

async function waitForAppEntry(driver, timeout = 45000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const entryId = await detectVisibleEntry(driver);
    if (entryId) {
      return entryId;
    }

    try {
      await driver.pause(300);
    } catch (error) {
      throwIfFatalDriverError(error, 'pause while waiting for app entry');
    }
  }

  await captureDebugArtifacts(driver, 'wait-for-app-entry-timeout').catch(() => null);
  throw new Error(`Timed out waiting for a visible app entry: ${KNOWN_ENTRY_IDS.join(', ')}`);
}

async function loginIfNeeded(driver) {
  let current = await detectAuthenticatedEntry(driver, 250);
  if (!current) {
    current = await waitForAppEntry(driver, 60000);
  }

  if (AUTHENTICATED_ENTRY_IDS.has(current)) {
    console.log(`Authenticated screen detected (${current}), skipping login.`);
    return current;
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
        TEST_IDS.auth.emailInput,
        TEST_IDS.auth.passwordInput,
        TEST_IDS.auth.submitButton,
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
      [
        TEST_IDS.auth.loginScreen,
        TEST_IDS.auth.emailInput,
        TEST_IDS.auth.passwordInput,
        TEST_IDS.auth.submitButton,
        TEST_IDS.home.screen,
      ],
      15000,
    );
  }

  if (current === TEST_IDS.home.screen) {
    console.log('Home screen detected after intro/welcome, skipping login.');
    return current;
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

  current = await waitForAppEntry(driver, 20000);
  console.log('Login successful.');
  return current;
}

async function ensureHomeVisible(driver, timeout = 15000) {
  const current = await detectVisibleEntry(driver);
  if (current === TEST_IDS.home.screen) {
    return current;
  }

  const homeTabButton = await findByTestId(driver, TEST_IDS.navigation.homeTabButton, 3000, {
    allowLabelFallbacks: false,
  });
  if (!homeTabButton) {
    throw new Error('Home navigation tab button could not be resolved.');
  }

  await tapElement(driver, homeTabButton, { useAdbFirst: true });

  const start = Date.now();
  while (Date.now() - start < timeout) {
    const entry = await detectVisibleEntry(driver);
    if (entry === TEST_IDS.home.screen) {
      return entry;
    }

    try {
      await driver.pause(300);
    } catch (error) {
      throwIfFatalDriverError(error, 'pause while waiting for home screen');
    }
  }

  await captureDebugArtifacts(driver, 'ensure-home-visible-timeout').catch(() => null);
  throw new Error('Timed out waiting for a visible home surface.');
}

function runAdb(args) {
  const serial = process.env.ANDROID_SERIAL;
  const finalArgs = serial ? ['-s', serial, ...args] : args;
  const adbPath = process.env.ANDROID_ADB_PATH || (fs.existsSync(FALLBACK_ADB_PATH) ? FALLBACK_ADB_PATH : 'adb');

  execFileSync(adbPath, finalArgs, {
    stdio: 'inherit',
    timeout: APPIUM_ADB_TIMEOUT_MS,
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

async function deleteSessionQuietly(driver, timeoutMs = APPIUM_SESSION_TEARDOWN_TIMEOUT_MS) {
  if (!driver) {
    return;
  }

  try {
    await withTimeout(() => driver.deleteSession(), timeoutMs, 'deleteSession');
  } catch (error) {
    console.warn(`[appium] deleteSession skipped: ${error.message}`);
  }
}

module.exports = {
  APP_ACTIVITY,
  APP_PACKAGE,
  TEST_IDS,
  captureDebugArtifacts,
  captureLogcat,
  connect,
  coldLaunchApp,
  deleteSessionQuietly,
  findByTestId,
  loginIfNeeded,
  runAdb,
  tapElement,
  ensureHomeVisible,
  detectAuthenticatedEntry,
  detectVisibleEntry,
  waitForAppEntry,
  waitForAny,
};
