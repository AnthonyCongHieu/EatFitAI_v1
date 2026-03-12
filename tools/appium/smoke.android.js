const { remote } = require('webdriverio');

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = Number(process.env.APPIUM_PORT || 4723);
const APP_PACKAGE = 'com.eatfitai.app';
const APP_ACTIVITY = 'com.eatfitai.app.MainActivity';

const TEST_IDS = {
  loginScreen: 'auth-login-screen',
  loginEmail: 'auth-login-email-input',
  loginPassword: 'auth-login-password-input',
  loginSubmit: 'auth-login-submit-button',
  homeScreen: 'home-screen',
  homeSearch: 'home-search-food-button',
  homeDiary: 'home-view-diary-button',
  foodSearchScreen: 'food-search-screen',
  mealDiaryScreen: 'meal-diary-screen'
};

async function findByTestId(driver, testId, timeout = 5000) {
  const selectors = [
    `id=${APP_PACKAGE}:id/${testId}`,
    `android=new UiSelector().resourceId("${APP_PACKAGE}:id/${testId}")`,
    `//*[@resource-id="${APP_PACKAGE}:id/${testId}"]`
  ];

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

async function tapIfFound(driver, testId, timeout = 5000) {
  const element = await findByTestId(driver, testId, timeout);
  if (!element) {
    return false;
  }
  await element.click();
  return true;
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
  throw new Error(`Timed out waiting for any selector: ${ids.join(', ')}`);
}

async function loginIfNeeded(driver) {
  const current = await waitForAny(driver, [TEST_IDS.loginScreen, TEST_IDS.homeScreen], 15000);
  if (current === TEST_IDS.homeScreen) {
    console.log('Home screen detected, skipping login.');
    return;
  }

  const email = process.env.EATFITAI_DEMO_EMAIL;
  const password = process.env.EATFITAI_DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error('Login screen detected but EATFITAI_DEMO_EMAIL / EATFITAI_DEMO_PASSWORD are missing.');
  }

  const emailInput = await findByTestId(driver, TEST_IDS.loginEmail, 10000);
  const passwordInput = await findByTestId(driver, TEST_IDS.loginPassword, 10000);
  const submitButton = await findByTestId(driver, TEST_IDS.loginSubmit, 10000);

  if (!emailInput || !passwordInput || !submitButton) {
    throw new Error('Login selectors were not found.');
  }

  await emailInput.setValue(email);
  await passwordInput.setValue(password);
  await submitButton.click();

  await waitForAny(driver, [TEST_IDS.homeScreen], 20000);
  console.log('Login successful.');
}

async function run() {
  const driver = await remote({
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
      'appium:noReset': true,
      'appium:newCommandTimeout': 120
    }
  });

  try {
    await loginIfNeeded(driver);

    const home = await findByTestId(driver, TEST_IDS.homeScreen, 10000);
    if (!home) {
      throw new Error('Home screen selector not found.');
    }

    console.log('Home screen verified.');

    if (await tapIfFound(driver, TEST_IDS.homeSearch, 5000)) {
      await waitForAny(driver, [TEST_IDS.foodSearchScreen], 10000);
      console.log('Food search navigation verified.');
      await driver.back();
      await waitForAny(driver, [TEST_IDS.homeScreen], 10000);
    }

    if (await tapIfFound(driver, TEST_IDS.homeDiary, 5000)) {
      await waitForAny(driver, [TEST_IDS.mealDiaryScreen], 10000);
      console.log('Meal diary navigation verified.');
      await driver.back();
      await waitForAny(driver, [TEST_IDS.homeScreen], 10000);
    }

    console.log('Appium smoke flow completed successfully.');
  } finally {
    await driver.deleteSession();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
