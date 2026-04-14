const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  APP_PACKAGE,
  TEST_IDS,
  captureDebugArtifacts,
  connect,
  coldLaunchApp,
  findByTestId,
  runAdb,
  tapElement,
  waitForAny,
} = require('../../tools/appium/lib/common');

const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const DEFAULT_DEMO_EMAIL = 'scan-demo@redacted.local';
const DEFAULT_DEMO_PASSWORD = 'SET_IN_SEED_SCRIPT';
const DEFAULT_DEMO_DISPLAY_NAME = 'Scan Demo Reliability';
const DEFAULT_MAIL_API = 'https://api.mail.tm';
const VERIFY_TIMEOUT_MS = 240000;
const VERIFY_POLL_INTERVAL_MS = 10000;
const ACCESSIBILITY_LABEL_FALLBACKS = {
  [TEST_IDS.auth.onboardingNextButton]: ['Tiếp tục', 'Hoàn tất'],
  [TEST_IDS.auth.onboardingCompleteButton]: ['Bắt đầu sử dụng'],
  [TEST_IDS.auth.onboardingGenderMaleButton]: ['Nam'],
  [TEST_IDS.auth.onboardingGenderFemaleButton]: ['Nữ'],
};
const TAP_OPTIONS_BY_TEST_ID = {
  [TEST_IDS.auth.introStartButton]: { verticalBias: 0.82, useAdbFirst: true },
  [TEST_IDS.auth.welcomeLoginButton]: { verticalBias: 0.72, useAdbFirst: true },
  [TEST_IDS.auth.welcomeRegisterButton]: { verticalBias: 0.72, useAdbFirst: true },
  [TEST_IDS.auth.submitButton]: { verticalBias: 0.7 },
  [TEST_IDS.auth.registerSubmitButton]: { verticalBias: 0.75, useAdbFirst: true },
  [TEST_IDS.auth.verifySubmitButton]: { verticalBias: 0.7, useAdbFirst: true },
  [TEST_IDS.auth.onboardingGenderMaleButton]: { verticalBias: 0.55, useAdbFirst: true },
  [TEST_IDS.auth.onboardingGenderFemaleButton]: { verticalBias: 0.55, useAdbFirst: true },
  [TEST_IDS.home.diaryButton]: { verticalBias: 0.6 },
};

function trim(value) {
  return String(value || '').trim();
}

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

function resolveOutputDir(cliValue) {
  const explicit = trim(cliValue) || trim(process.env.EATFITAI_SMOKE_OUTPUT_DIR);
  if (explicit) {
    return path.resolve(explicit);
  }

  if (!fs.existsSync(DEFAULT_OUTPUT_ROOT)) {
    throw new Error(
      'Missing production smoke output root. Run production-smoke-preflight.js first or set EATFITAI_SMOKE_OUTPUT_DIR.',
    );
  }

  const candidates = fs
    .readdirSync(DEFAULT_OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (candidates.length === 0) {
    throw new Error('No production smoke sessions found.');
  }

  return path.join(DEFAULT_OUTPUT_ROOT, candidates[0]);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTestId(driver, testId, timeout = 15000) {
  let element = await findByTestId(driver, testId, timeout);
  if (!element && ACCESSIBILITY_LABEL_FALLBACKS[testId]) {
    element = await findByAccessibilityLabels(
      driver,
      ACCESSIBILITY_LABEL_FALLBACKS[testId],
      timeout,
    );
  }
  if (!element) {
    await captureDebugArtifacts(driver, `missing-${testId}`).catch(() => null);
    throw new Error(`Selector not found: ${testId}`);
  }
  return element;
}

async function tapByTestId(driver, testId, timeout = 15000) {
  const element = await waitForTestId(driver, testId, timeout);
  await tapElement(driver, element, TAP_OPTIONS_BY_TEST_ID[testId] || {});
}

async function setValueByTestId(driver, testId, value, timeout = 15000) {
  const element = await waitForTestId(driver, testId, timeout);
  await element.click();
  try {
    await element.clearValue();
  } catch {}
  await element.setValue(String(value));
}

async function setValueByTestIdIfPresent(driver, testId, value, timeout = 5000) {
  const element = await findByTestId(driver, testId, timeout);
  if (!element) {
    return false;
  }

  await element.click();
  try {
    await element.clearValue();
  } catch {}
  await element.setValue(String(value));
  return true;
}

async function tapRegisterTerms(driver) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const byTestId = await findByTestId(driver, TEST_IDS.auth.registerTermsCheckbox, 3000);
    if (byTestId) {
      await tapElement(driver, byTestId, { verticalBias: 0.5, useAdbFirst: true });
      return;
    }

    const byAccessibility = await findByAccessibilityLabels(
      driver,
      ['Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật'],
      5000,
    );
    if (byAccessibility) {
      await tapElement(driver, byAccessibility, { verticalBias: 0.5, useAdbFirst: true });
      return;
    }

    runAdb(['shell', 'input', 'swipe', '540', '1800', '540', '1450', '250']);
    await sleep(1000);
  }

  await captureDebugArtifacts(driver, 'missing-register-terms-checkbox').catch(() => null);
  throw new Error('Selector not found: register terms checkbox');
}

async function tapOnboardingGender(driver, testId, timeout = 15000) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const element = await findByTestId(driver, testId, 3000);
    if (element) {
      await tapElement(driver, element, TAP_OPTIONS_BY_TEST_ID[testId] || { useAdbFirst: true });
      return;
    }

    runAdb(['shell', 'input', 'swipe', '540', '1800', '540', '1400', '250']);
    await sleep(900);
  }

  await captureDebugArtifacts(driver, `missing-${testId}`).catch(() => null);
  throw new Error(`Selector not found: ${testId}`);
}

async function findByAccessibilityLabels(driver, labels, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const label of labels) {
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
    await driver.pause(250);
  }

  return null;
}

async function dismissKeyboard(driver) {
  try {
    const keyboardShown = await driver.isKeyboardShown();
    if (!keyboardShown) {
      return;
    }
  } catch {}

  try {
    await driver.hideKeyboard();
    await driver.pause(500);
    return;
  } catch {}

  try {
    runAdb(['shell', 'input', 'keyevent', '4']);
    await driver.pause(700);
  } catch {}
}

async function saveScreenshot(driver, outputDir, fileName) {
  const filePath = path.join(outputDir, fileName);
  await driver.saveScreenshot(filePath);
  return filePath;
}

async function scrollUntilVisible(driver, testId, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const existing = await findByTestId(driver, testId, 2000);
    if (existing) {
      return existing;
    }

    runAdb(['shell', 'input', 'swipe', '540', '1850', '540', '950', '250']);
    await sleep(1200);
  }

  return null;
}

async function advanceIntroIfPresent(driver) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await waitForAny(
      driver,
      [
        TEST_IDS.auth.introStartButton,
        TEST_IDS.auth.welcomeScreen,
        TEST_IDS.auth.welcomeLoginButton,
        TEST_IDS.auth.welcomeRegisterButton,
        TEST_IDS.auth.loginScreen,
        TEST_IDS.auth.registerScreen,
        TEST_IDS.home.screen,
      ],
      15000,
    );

    if (state !== TEST_IDS.auth.introStartButton) {
      return state;
    }

    await tapByTestId(driver, TEST_IDS.auth.introStartButton);
    await sleep(800);
  }

  return waitForAny(
    driver,
    [
      TEST_IDS.auth.welcomeScreen,
      TEST_IDS.auth.welcomeLoginButton,
      TEST_IDS.auth.welcomeRegisterButton,
      TEST_IDS.auth.loginScreen,
      TEST_IDS.auth.registerScreen,
      TEST_IDS.home.screen,
    ],
    15000,
  );
}

function extractVerificationCode(message) {
  const candidates = [message?.text, message?.html, message?.intro, message?.subject]
    .filter(Boolean)
    .map((value) => String(value));

  for (const candidate of candidates) {
    const match = candidate.match(/\b(\d{6})\b/);
    if (match) {
      return match[1];
    }
  }

  return '';
}

async function requestJson(url, options = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
    });
    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body,
      rawText: body ? undefined : rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createDisposableMailbox(outputDir) {
  const domains = await requestJson(`${DEFAULT_MAIL_API}/domains`);
  if (
    !domains.ok ||
    !Array.isArray(domains.body?.['hydra:member']) ||
    domains.body['hydra:member'].length === 0
  ) {
    throw new Error(
      `Failed to resolve disposable mail domains. Status=${domains.status}`,
    );
  }

  const domain = domains.body['hydra:member'][0].domain;
  const localPart = `eatfitai${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const address = `${localPart}@${domain}`;
  const password = `Tm${Date.now()}!${Math.random().toString(36).slice(2, 8)}`;

  const account = await requestJson(`${DEFAULT_MAIL_API}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, password }),
  });
  if (!account.ok) {
    throw new Error(
      `Failed to create disposable mailbox. Status=${account.status} Error=${account.error || account.rawText || ''}`,
    );
  }

  let token = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    token = await requestJson(`${DEFAULT_MAIL_API}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password }),
    });

    if (token.ok && token.body?.token) {
      break;
    }

    if (attempt < 6) {
      await sleep(5000);
    }
  }
  if (!token?.ok || !token.body?.token) {
    throw new Error(`Failed to create disposable mailbox token. Status=${token?.status}`);
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    provider: 'mail.tm',
    address,
    password,
    token: token.body.token,
    domain,
  };
  const artifactPath = path.join(outputDir, 'disposable-mailbox.json');
  writeJson(artifactPath, artifact);
  return {
    artifactPath,
    address,
    password,
    token: token.body.token,
  };
}

async function waitForVerificationMessage(mailbox, outputDir) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < VERIFY_TIMEOUT_MS) {
    const messages = await requestJson(`${DEFAULT_MAIL_API}/messages`, {
      headers: {
        Authorization: `Bearer ${mailbox.token}`,
      },
    });

    if (messages.ok) {
      const items = Array.isArray(messages.body?.['hydra:member'])
        ? messages.body['hydra:member']
        : [];
      const newest = items[0];
      if (newest?.id) {
        const detail = await requestJson(`${DEFAULT_MAIL_API}/messages/${newest.id}`, {
          headers: {
            Authorization: `Bearer ${mailbox.token}`,
          },
        });
        if (detail.ok) {
          const verificationCode = extractVerificationCode(detail.body);
          const artifact = {
            generatedAt: new Date().toISOString(),
            mailbox: mailbox.address,
            messageCount: items.length,
            newestMessageId: newest.id,
            subject: detail.body?.subject || newest.subject || '',
            verificationCode,
            message: detail.body,
          };
          const artifactPath = path.join(outputDir, 'disposable-mail-message.json');
          writeJson(artifactPath, artifact);
          if (verificationCode) {
            return {
              artifactPath,
              verificationCode,
              subject: artifact.subject,
            };
          }
        }
      }
    }

    await sleep(VERIFY_POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for disposable mailbox verification message.');
}

function adbOutput(args, options = {}) {
  const serial = trim(process.env.ANDROID_SERIAL);
  const fullArgs = serial ? ['-s', serial, ...args] : args;
  return execFileSync('adb', fullArgs, {
    encoding: 'utf8',
    maxBuffer: options.maxBuffer || 8 * 1024 * 1024,
  });
}

function clearAppData() {
  try {
    runAdb(['shell', 'pm', 'clear', APP_PACKAGE]);
  } catch (error) {
    console.warn(`Skipping pm clear for ${APP_PACKAGE}: ${error.message}`);
  }
}

function clearLogcat() {
  try {
    runAdb(['logcat', '-c']);
  } catch {}
}

function captureLogcat(outputDir, fileName) {
  const filePath = path.join(outputDir, fileName);
  const content = adbOutput(['logcat', '-d', '-t', '4000']);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function updateBudget(outputDir, key, note) {
  const budgetPath = path.join(outputDir, 'request-budget.json');
  const budget = readJsonIfExists(budgetPath);
  if (
    !budget ||
    !budget.limits ||
    !Object.prototype.hasOwnProperty.call(budget.limits, key)
  ) {
    return;
  }

  const limit = Number(budget.limits[key] || 0);
  const used = Number(budget.used?.[key] || 0);
  if (used + 1 > limit) {
    throw new Error(`Request budget exceeded for ${key}. Used=${used}, limit=${limit}.`);
  }

  budget.used[key] = used + 1;
  budget.events = Array.isArray(budget.events) ? budget.events : [];
  budget.events.push({
    type: 'hit',
    key,
    count: 1,
    note,
    recordedAt: new Date().toISOString(),
    recordedBy: 'production-smoke-auth-e2e',
  });
  writeJson(budgetPath, budget);
}

function updateObservations(outputDir, patch) {
  const observationsPath = path.join(outputDir, 'session-observations.json');
  const observations = readJsonIfExists(observationsPath) || {};
  const next = {
    ...observations,
    ...patch,
    evidence: {
      ...(observations.evidence || {}),
      ...(patch.evidence || {}),
      notes: [
        ...(observations.evidence && Array.isArray(observations.evidence.notes)
          ? observations.evidence.notes
          : []),
        ...(patch.evidence && Array.isArray(patch.evidence.notes)
          ? patch.evidence.notes
          : []),
      ],
    },
  };
  writeJson(observationsPath, next);
  return next;
}

async function runDemoLoginMode(driver, outputDir, options) {
  clearAppData();
  coldLaunchApp();

  let current = await waitForAny(
    driver,
    [
      TEST_IDS.auth.introScreen,
      TEST_IDS.auth.introStartButton,
      TEST_IDS.auth.welcomeScreen,
      TEST_IDS.auth.welcomeLoginButton,
      TEST_IDS.auth.loginScreen,
      TEST_IDS.home.screen,
    ],
    60000,
  );

  if (
    current === TEST_IDS.auth.introScreen ||
    current === TEST_IDS.auth.introStartButton
  ) {
    current = await advanceIntroIfPresent(driver);
  }

  if (
    current === TEST_IDS.auth.welcomeScreen ||
    current === TEST_IDS.auth.welcomeLoginButton
  ) {
    await tapByTestId(driver, TEST_IDS.auth.welcomeLoginButton);
  }

  await setValueByTestId(driver, TEST_IDS.auth.emailInput, options.email);
  await setValueByTestId(driver, TEST_IDS.auth.passwordInput, options.password);
  await tapByTestId(driver, TEST_IDS.auth.submitButton);
  await waitForAny(driver, [TEST_IDS.home.screen], 30000);

  const homeScreenshot = await saveScreenshot(driver, outputDir, 'demo-home-screen.png');
  const diaryButton = await scrollUntilVisible(driver, TEST_IDS.home.diaryButton, 6);
  if (!diaryButton) {
    throw new Error(`Selector not found after scroll: ${TEST_IDS.home.diaryButton}`);
  }
  await tapElement(driver, diaryButton, TAP_OPTIONS_BY_TEST_ID[TEST_IDS.home.diaryButton]);
  await waitForAny(driver, [TEST_IDS.mealDiary.screen], 20000);
  const diaryScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'demo-diary-screen.png',
  );

  coldLaunchApp();
  await waitForAny(driver, [TEST_IDS.home.screen], 30000);
  const reopenScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'demo-home-reopen.png',
  );

  return {
    mode: 'demo-login',
    accountEmail: options.email,
    homeScreenshot,
    diaryScreenshot,
    reopenScreenshot,
    passed: true,
  };
}

async function runDisposableRegisterMode(driver, outputDir, options) {
  clearAppData();
  coldLaunchApp();

  const mailbox = await createDisposableMailbox(outputDir);
  const current = await waitForAny(
    driver,
    [
      TEST_IDS.auth.introScreen,
      TEST_IDS.auth.introStartButton,
      TEST_IDS.auth.welcomeScreen,
      TEST_IDS.auth.welcomeRegisterButton,
      TEST_IDS.auth.registerScreen,
    ],
    60000,
  );

  let next = current;
  if (
    current === TEST_IDS.auth.introScreen ||
    current === TEST_IDS.auth.introStartButton
  ) {
    next = await advanceIntroIfPresent(driver);
  }

  const registerButton = await findByTestId(
    driver,
    TEST_IDS.auth.welcomeRegisterButton,
    5000,
  );
  if (registerButton) {
    await tapElement(
      driver,
      registerButton,
      TAP_OPTIONS_BY_TEST_ID[TEST_IDS.auth.welcomeRegisterButton],
    );
  } else if (next !== TEST_IDS.auth.registerScreen) {
    throw new Error('Register entry point was not reachable from intro/welcome flow.');
  }

  await waitForAny(driver, [TEST_IDS.auth.registerScreen], 20000);
  await setValueByTestId(driver, TEST_IDS.auth.registerNameInput, options.displayName);
  await setValueByTestId(driver, TEST_IDS.auth.registerEmailInput, mailbox.address);
  await setValueByTestId(driver, TEST_IDS.auth.registerPasswordInput, options.password);
  await setValueByTestId(
    driver,
    TEST_IDS.auth.registerConfirmPasswordInput,
    options.password,
  );
  await dismissKeyboard(driver);
  await tapRegisterTerms(driver);
  const registerSubmitButton = await scrollUntilVisible(
    driver,
    TEST_IDS.auth.registerSubmitButton,
    6,
  );
  if (!registerSubmitButton) {
    await captureDebugArtifacts(driver, 'missing-register-submit-button').catch(
      () => null,
    );
    throw new Error(
      `Selector not found after scroll: ${TEST_IDS.auth.registerSubmitButton}`,
    );
  }
  await tapElement(
    driver,
    registerSubmitButton,
    TAP_OPTIONS_BY_TEST_ID[TEST_IDS.auth.registerSubmitButton],
  );
  updateBudget(outputDir, 'registerWithVerification', `register ${mailbox.address}`);

  await waitForAny(driver, [TEST_IDS.auth.verifyScreen], 30000);
  const verifyScreenScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'disposable-verify-screen.png',
  );

  const message = await waitForVerificationMessage(mailbox, outputDir);
  for (let index = 0; index < message.verificationCode.length; index += 1) {
    await setValueByTestId(
      driver,
      `${TEST_IDS.auth.verifyCodeInputPrefix}-${index}`,
      message.verificationCode[index],
      10000,
    );
  }

  updateBudget(outputDir, 'verifyEmail', `verify ${mailbox.address}`);
  await tapByTestId(driver, TEST_IDS.auth.verifySubmitButton);
  await waitForAny(driver, [TEST_IDS.auth.onboardingScreen], 30000);

  await setValueByTestId(driver, TEST_IDS.auth.onboardingNameInput, options.displayName);
  await dismissKeyboard(driver);
  await tapOnboardingGender(driver, TEST_IDS.auth.onboardingGenderMaleButton);
  await setValueByTestIdIfPresent(driver, TEST_IDS.auth.onboardingAgeInput, '29');
  await dismissKeyboard(driver);
  await tapByTestId(driver, TEST_IDS.auth.onboardingNextButton);
  await setValueByTestId(driver, TEST_IDS.auth.onboardingHeightInput, '170');
  await setValueByTestId(driver, TEST_IDS.auth.onboardingWeightInput, '70');
  await dismissKeyboard(driver);
  await tapByTestId(driver, TEST_IDS.auth.onboardingNextButton);
  await tapByTestId(driver, `${TEST_IDS.auth.onboardingGoalPrefix}-maintain`);
  await tapByTestId(driver, TEST_IDS.auth.onboardingNextButton);
  await tapByTestId(driver, `${TEST_IDS.auth.onboardingActivityPrefix}-moderate`);
  await tapByTestId(driver, TEST_IDS.auth.onboardingNextButton);

  const resultState = await waitForAny(
    driver,
    [TEST_IDS.auth.onboardingResultCard, TEST_IDS.auth.onboardingErrorCard],
    60000,
  );
  const onboardingScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'disposable-onboarding-result.png',
  );
  if (resultState === TEST_IDS.auth.onboardingErrorCard) {
    throw new Error('Onboarding reached error card instead of result card.');
  }

  await tapByTestId(driver, TEST_IDS.auth.onboardingCompleteButton, 15000);
  await waitForAny(driver, [TEST_IDS.home.screen], 30000);
  const homeScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'disposable-home-screen.png',
  );

  coldLaunchApp();
  await waitForAny(driver, [TEST_IDS.home.screen], 30000);
  const reopenScreenshot = await saveScreenshot(
    driver,
    outputDir,
    'disposable-home-reopen.png',
  );

  return {
    mode: 'disposable-register',
    accountEmail: mailbox.address,
    mailboxArtifactPath: mailbox.artifactPath,
    verificationArtifactPath: message.artifactPath,
    verificationCode: message.verificationCode,
    verifyScreenScreenshot,
    onboardingScreenshot,
    homeScreenshot,
    reopenScreenshot,
    passed: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolveOutputDir(args.output);
  const mode = trim(args.mode || process.env.EATFITAI_AUTH_E2E_MODE || 'demo-login');
  const authReportPath = path.join(outputDir, 'auth-e2e-report.json');

  fs.mkdirSync(outputDir, { recursive: true });
  clearLogcat();

  const driver = await connect();
  try {
    let result;
    if (mode === 'disposable-register') {
      result = await runDisposableRegisterMode(driver, outputDir, {
        displayName:
          trim(args.displayName || process.env.EATFITAI_SMOKE_DISPLAY_NAME) ||
          DEFAULT_DEMO_DISPLAY_NAME,
        password:
          trim(args.password || process.env.EATFITAI_SMOKE_PASSWORD) ||
          DEFAULT_DEMO_PASSWORD,
      });
      updateObservations(outputDir, {
        operator: 'codex',
        accountEmail: result.accountEmail,
        reopenHome: {
          attempted: true,
          passed: true,
          notes:
            'Disposable mailbox register -> verify -> onboarding -> reopen passed on emulator.',
        },
        evidence: {
          mailboxScreenshot: result.mailboxArtifactPath,
          verificationScreenshot: result.verifyScreenScreenshot,
          onboardingScreenshot: result.onboardingScreenshot,
          homeScreenshot: result.reopenScreenshot,
          notes: [
            `Disposable verification artifact: ${result.verificationArtifactPath}`,
            'Mailbox evidence captured as disposable-mail JSON artifact because the run is headless.',
          ],
        },
      });
    } else if (mode === 'demo-login') {
      result = await runDemoLoginMode(driver, outputDir, {
        email:
          trim(
            args.email ||
              process.env.EATFITAI_SMOKE_EMAIL ||
              process.env.EATFITAI_DEMO_EMAIL,
          ) || DEFAULT_DEMO_EMAIL,
        password:
          trim(
            args.password ||
              process.env.EATFITAI_SMOKE_PASSWORD ||
              process.env.EATFITAI_DEMO_PASSWORD,
          ) || DEFAULT_DEMO_PASSWORD,
      });
      updateObservations(outputDir, {
        operator: 'codex',
        accountEmail: result.accountEmail,
        reopenHome: {
          attempted: true,
          passed: true,
          notes:
            'Dedicated cloud demo account login -> diary -> reopen passed on emulator.',
        },
        evidence: {
          homeScreenshot: result.reopenScreenshot,
          diaryScreenshot: result.diaryScreenshot,
          notes: ['Dedicated demo account verified on emulator.'],
        },
      });
    } else {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const logcatPath = captureLogcat(outputDir, `auth-e2e-${mode}.logcat.txt`);
    updateObservations(outputDir, {
      evidence: {
        logcatPath,
      },
      stability: {
        crashObserved: false,
        freezeObserved: false,
        notes: `${mode} completed without force-close or freeze.`,
      },
    });

    const report = {
      generatedAt: new Date().toISOString(),
      outputDir,
      mode,
      result,
      logcatPath,
    };
    writeJson(authReportPath, report);
    console.log(`[production-smoke-auth-e2e] Wrote ${authReportPath}`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await driver.deleteSession();
  }
}

main().catch((error) => {
  console.error('[production-smoke-auth-e2e] Failed:', error);
  process.exit(1);
});
