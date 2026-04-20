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
const DEFAULT_MAIL_API = 'https://api.mail.tm';
const DEFAULT_APP_AUTH_PASSWORD = 'SET_IN_SEED_SCRIPT';
const RESET_MAIL_SUBJECT_FRAGMENT = 'Mã đặt lại mật khẩu';
const RESET_TIMEOUT_MS = 240000;
const RESET_POLL_INTERVAL_MS = 10000;
const WRONG_RESET_CODE = '000000';

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
      'Missing production smoke output root. Set --output or run a smoke session first.',
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readMailbox(outputDir, cliValue) {
  const filePath = path.resolve(
    trim(cliValue) || path.join(outputDir, 'disposable-mailbox.json'),
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Mailbox artifact not found: ${filePath}`);
  }

  const mailbox = readJson(filePath);
  if (!mailbox.address || !mailbox.password || !mailbox.token) {
    throw new Error(`Mailbox artifact is incomplete: ${filePath}`);
  }

  return {
    artifactPath: filePath,
    ...mailbox,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function extractResetCode(message) {
  const candidates = [message?.text, message?.html, message?.intro, message?.subject]
    .filter(Boolean)
    .map((value) => (Array.isArray(value) ? value.join('\n') : String(value)));

  for (const candidate of candidates) {
    const match = candidate.match(/\b(\d{6})\b/);
    if (match) {
      return match[1];
    }
  }

  return '';
}

function getMailItems(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.['hydra:member'])) {
    return body['hydra:member'];
  }

  return [];
}

async function waitForResetMessage(mailbox, outputDir, triggerStartedAt) {
  const startedAtMs = Date.parse(triggerStartedAt);
  const deadline = Date.now() + RESET_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const messages = await requestJson(`${DEFAULT_MAIL_API}/messages`, {
      headers: {
        Authorization: `Bearer ${mailbox.token}`,
      },
    });

    if (messages.ok) {
      const newest = getMailItems(messages.body)
        .filter(
          (message) =>
            String(message?.subject || '').includes(RESET_MAIL_SUBJECT_FRAGMENT) &&
            Date.parse(message?.createdAt || 0) >= startedAtMs - 1000,
        )
        .sort(
          (left, right) =>
            Date.parse(right?.createdAt || 0) - Date.parse(left?.createdAt || 0),
        )[0];

      if (newest?.id) {
        const detail = await requestJson(`${DEFAULT_MAIL_API}/messages/${newest.id}`, {
          headers: {
            Authorization: `Bearer ${mailbox.token}`,
          },
        });

        if (detail.ok) {
          const resetCode = extractResetCode(detail.body);
          if (resetCode) {
            const artifactPath = path.join(outputDir, 'forgot-reset-message.json');
            writeJson(artifactPath, {
              generatedAt: new Date().toISOString(),
              mailbox: mailbox.address,
              resetCode,
              message: detail.body,
            });

            return {
              artifactPath,
              resetCode,
              message: detail.body,
            };
          }
        }
      }
    }

    await sleep(RESET_POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for reset-password email in disposable mailbox.');
}

async function waitForTestId(driver, testId, timeout = 15000) {
  const element = await findByTestId(driver, testId, timeout);
  if (!element) {
    await captureDebugArtifacts(driver, `missing-${testId}`).catch(() => null);
    throw new Error(`Selector not found: ${testId}`);
  }

  return element;
}

async function tapByTestId(driver, testId, timeout = 15000, options = {}) {
  const element = await waitForTestId(driver, testId, timeout);
  await tapElement(driver, element, options);
  return element;
}

async function setValueByTestId(driver, testId, value, timeout = 15000) {
  const element = await waitForTestId(driver, testId, timeout);
  await element.click();
  try {
    await element.clearValue();
  } catch {}
  await element.setValue(String(value));
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

async function enterOtp(driver, prefix, code) {
  const digits = String(code).split('');
  for (let index = 0; index < digits.length; index += 1) {
    await setValueByTestId(driver, `${prefix}-${index}`, digits[index], 10000);
  }
}

async function enterOtpWithKeyboard(driver, slotPrefix, code) {
  await tapByTestId(driver, `${slotPrefix}-0`, 15000);
  await driver.pause(500);
  runAdb(['shell', 'input', 'text', String(code)]);
  await driver.pause(1200);
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

async function captureScreen(driver, outputDir, fileName) {
  const filePath = path.join(outputDir, fileName);
  await driver.saveScreenshot(filePath);
  return filePath;
}

async function navigateToLogin(driver) {
  const current = await waitForAny(
    driver,
    [
      TEST_IDS.auth.introScreen,
      TEST_IDS.auth.introStartButton,
      TEST_IDS.auth.welcomeScreen,
      TEST_IDS.auth.welcomeLoginButton,
      TEST_IDS.auth.loginScreen,
    ],
    60000,
  );

  let next = current;
  if (
    current === TEST_IDS.auth.introScreen ||
    current === TEST_IDS.auth.introStartButton
  ) {
    await tapByTestId(
      driver,
      TEST_IDS.auth.introStartButton,
      15000,
      { verticalBias: 0.5, useAdbFirst: true, adbPressDurationMs: 450 },
    );

    next = await waitForAny(
      driver,
      [
        TEST_IDS.auth.welcomeScreen,
        TEST_IDS.auth.welcomeLoginButton,
        TEST_IDS.auth.loginScreen,
      ],
      20000,
    );
  }

  if (next === TEST_IDS.auth.welcomeScreen || next === TEST_IDS.auth.welcomeLoginButton) {
    await tapByTestId(
      driver,
      TEST_IDS.auth.welcomeLoginButton,
      15000,
      { verticalBias: 0.5, useAdbFirst: true },
    );
  }

  await waitForAny(driver, [TEST_IDS.auth.loginScreen], 20000);
}

async function verifyLoginByApi(email, password) {
  const response = await fetch('https://eatfitai-backend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolveOutputDir(args.output);
  const mailbox = readMailbox(outputDir, args.mailbox);
  const previousPassword =
    trim(args.previousPassword || process.env.EATFITAI_SMOKE_PASSWORD) ||
    DEFAULT_APP_AUTH_PASSWORD;
  const newPassword =
    trim(args.newPassword) || `Reset!${Date.now().toString().slice(-6)}Aa`;
  const reportPath = path.join(outputDir, 'forgot-reset-report.json');

  fs.mkdirSync(outputDir, { recursive: true });
  clearLogcat();
  clearAppData();

  let driver = await connect();
  try {
    const openVerifyStep = async () => {
      await navigateToLogin(driver);
      await tapByTestId(driver, TEST_IDS.auth.forgotPasswordButton, 15000);
      await waitForAny(driver, [TEST_IDS.auth.forgotPasswordScreen], 20000);

      await setValueByTestId(
        driver,
        TEST_IDS.auth.forgotPasswordEmailInput,
        mailbox.address,
      );
      await dismissKeyboard(driver);

      const requestStartedAt = new Date().toISOString();
      await tapByTestId(driver, TEST_IDS.auth.forgotPasswordSendCodeButton, 15000);
      await waitForTestId(
        driver,
        `${TEST_IDS.auth.forgotPasswordVerifyCodeSlotPrefix}-0`,
        20000,
      );

      return requestStartedAt;
    };

    let resetRequestStartedAt = await openVerifyStep();

    const verifyScreenPath = await captureScreen(
      driver,
      outputDir,
      'forgot-password-verify-screen.png',
    );

    await enterOtpWithKeyboard(
      driver,
      TEST_IDS.auth.forgotPasswordVerifyCodeSlotPrefix,
      WRONG_RESET_CODE,
    );
    await tapByTestId(driver, TEST_IDS.auth.forgotPasswordVerifyButton, 15000);
    await driver.pause(3500);

    const wrongCodeNewPasswordField = await findByTestId(
      driver,
      TEST_IDS.auth.forgotPasswordNewPasswordInput,
      2500,
    );
    const wrongCodeStillOnVerify = !wrongCodeNewPasswordField;
    if (!wrongCodeStillOnVerify) {
      throw new Error('Invalid reset code incorrectly advanced to the new password step.');
    }

    const wrongCodePath = await captureScreen(
      driver,
      outputDir,
      'forgot-password-invalid-code.png',
    );

    await driver.deleteSession();
    driver = null;
    clearAppData();
    coldLaunchApp();
    driver = await connect();
    resetRequestStartedAt = await openVerifyStep();

    const resetMail = await waitForResetMessage(
      mailbox,
      outputDir,
      resetRequestStartedAt,
    );

    await enterOtpWithKeyboard(
      driver,
      TEST_IDS.auth.forgotPasswordVerifyCodeSlotPrefix,
      resetMail.resetCode,
    );
    await tapByTestId(driver, TEST_IDS.auth.forgotPasswordVerifyButton, 15000);
    await waitForTestId(driver, TEST_IDS.auth.forgotPasswordNewPasswordInput, 20000);

    await setValueByTestId(
      driver,
      TEST_IDS.auth.forgotPasswordNewPasswordInput,
      newPassword,
    );
    await setValueByTestId(
      driver,
      TEST_IDS.auth.forgotPasswordConfirmPasswordInput,
      newPassword,
    );
    await dismissKeyboard(driver);
    await tapByTestId(driver, TEST_IDS.auth.forgotPasswordResetButton, 15000);
    await waitForTestId(driver, TEST_IDS.auth.forgotPasswordLoginButton, 20000);

    const resetSuccessPath = await captureScreen(
      driver,
      outputDir,
      'forgot-password-reset-success.png',
    );

    await tapByTestId(driver, TEST_IDS.auth.forgotPasswordLoginButton, 15000);
    await waitForAny(driver, [TEST_IDS.auth.loginScreen], 20000);

    await setValueByTestId(driver, TEST_IDS.auth.emailInput, mailbox.address);
    await setValueByTestId(driver, TEST_IDS.auth.passwordInput, previousPassword);
    await dismissKeyboard(driver);
    await tapByTestId(driver, TEST_IDS.auth.submitButton, 15000);
    await driver.pause(5000);

    const oldPasswordEntry = await findByTestId(driver, TEST_IDS.auth.loginScreen, 5000);
    const oldPasswordRejected = Boolean(oldPasswordEntry);
    if (!oldPasswordRejected) {
      throw new Error('Old password unexpectedly left the login screen after reset.');
    }

    const oldPasswordApi = await verifyLoginByApi(mailbox.address, previousPassword);
    const oldPasswordPath = await captureScreen(
      driver,
      outputDir,
      'forgot-password-old-password-rejected.png',
    );

    await setValueByTestId(driver, TEST_IDS.auth.emailInput, mailbox.address);
    await setValueByTestId(driver, TEST_IDS.auth.passwordInput, newPassword);
    await dismissKeyboard(driver);
    await tapByTestId(driver, TEST_IDS.auth.submitButton, 15000);

    const successEntry = await waitForAny(
      driver,
      [TEST_IDS.home.screen, TEST_IDS.auth.onboardingScreen],
      30000,
    );
    const newPasswordApi = await verifyLoginByApi(mailbox.address, newPassword);
    const newPasswordPath = await captureScreen(
      driver,
      outputDir,
      successEntry === TEST_IDS.home.screen
        ? 'forgot-password-new-password-home.png'
        : 'forgot-password-new-password-onboarding.png',
    );

    const logcatPath = captureLogcat(outputDir, 'forgot-reset.logcat.txt');
    const report = {
      generatedAt: new Date().toISOString(),
      mailbox: {
        artifactPath: mailbox.artifactPath,
        address: mailbox.address,
      },
      wrongCodeCheck: {
        attemptedCode: WRONG_RESET_CODE,
        stayedOnVerifyStep: wrongCodeStillOnVerify,
        screenshotPath: wrongCodePath,
      },
      resetEmail: {
        artifactPath: resetMail.artifactPath,
        resetCode: resetMail.resetCode,
      },
      passwordReset: {
        verifyScreenPath,
        resetSuccessPath,
        oldPasswordScreenshotPath: oldPasswordPath,
        newPasswordScreenshotPath: newPasswordPath,
        previousPassword,
        oldPasswordApi,
        newPasswordApi,
        finalScreen: successEntry,
        newPassword,
      },
      logcatPath,
      passed: true,
    };

    writeJson(reportPath, report);
    console.log(`[production-smoke-forgot-reset] Wrote ${reportPath}`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (driver) {
      await driver.deleteSession().catch(() => null);
    }
  }
}

main().catch((error) => {
  console.error('[production-smoke-forgot-reset] Failed:', error);
  process.exit(1);
});
