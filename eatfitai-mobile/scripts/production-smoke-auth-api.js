const fs = require('fs');
const path = require('path');

const {
  createDisposableMailbox,
  waitForMatchingMessage,
} = require('./lib/disposable-mail');

const DEFAULT_BACKEND_URL = 'https://eatfitai-backend.onrender.com';
const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '_logs',
  'production-smoke',
);
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_MAIL_SUBJECT_VERIFY = 'Mã xác minh';
const DEFAULT_MAIL_SUBJECT_RESET = 'Mã đặt lại mật khẩu';
const DEFAULT_DISPLAY_NAME = 'Smoke API Disposable';
const DEFAULT_INITIAL_PASSWORD = `SmokeApi!${Date.now().toString().slice(-6)}Aa`;
const DEFAULT_FINAL_PASSWORD = `SmokeApi#${Date.now().toString().slice(-6)}Bb`;
const DEFAULT_RESET_PASSWORD = `SmokeApi@${Date.now().toString().slice(-6)}Cc`;
const WRONG_RESET_CODE = '000000';
const GOOGLE_NEGATIVE_TOKEN = '';

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

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeBaseUrl(value, fallback) {
  return trim(value || fallback).replace(/\/+$/, '');
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const copy = { ...body };
  if (Object.prototype.hasOwnProperty.call(copy, 'accessToken')) {
    copy.accessToken = copy.accessToken ? '<redacted>' : copy.accessToken;
  }
  if (Object.prototype.hasOwnProperty.call(copy, 'refreshToken')) {
    copy.refreshToken = copy.refreshToken ? '<redacted>' : copy.refreshToken;
  }
  if (Object.prototype.hasOwnProperty.call(copy, 'VerificationCode')) {
    copy.VerificationCode = copy.VerificationCode ? '<redacted>' : copy.VerificationCode;
  }
  if (Object.prototype.hasOwnProperty.call(copy, 'ResetCode')) {
    copy.ResetCode = copy.ResetCode ? '<redacted>' : copy.ResetCode;
  }

  return copy;
}

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const copy = { ...headers };
  if (copy.Authorization) {
    copy.Authorization = '<redacted>';
  }
  if (copy.authorization) {
    copy.authorization = '<redacted>';
  }

  return copy;
}

async function requestJson(url, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = Number(options.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let body = null;
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      body: sanitizeBody(body),
      rawText: body ? undefined : rawText,
      headers: sanitizeHeaders(options.headers),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      headers: sanitizeHeaders(options.headers),
    };
  } finally {
    clearTimeout(timer);
  }
}

function createEmptyReport(outputDir, backendUrl, mailbox) {
  return {
    generatedAt: new Date().toISOString(),
    outputDir,
    backendUrl,
    mailbox: {
      artifactPath: mailbox.artifactPath || '',
      address: mailbox.address || '',
      provider: mailbox.provider || 'mail.tm',
    },
    account: {
      email: mailbox.address || '',
      initialPassword: '',
      resetPassword: '',
      finalPassword: '',
    },
    passed: false,
    failures: [],
    cleanup: {
      attempted: false,
      possible: false,
      passed: false,
      ok: false,
      status: null,
      response: null,
      error: '',
      deletedAccount: false,
      credentials: null,
    },
    checks: {},
    artifacts: {
      verificationMailboxMessagePath: '',
      resetMailboxMessagePath: '',
    },
    auth: {
      register: null,
      resendVerification: null,
      verifyEmail: null,
      initialLogin: null,
      refresh: null,
      logout: null,
      forgotPassword: null,
      wrongResetCode: null,
      verifyResetCode: null,
      resetPassword: null,
      postResetLogin: null,
      duplicateRegister: null,
      changePassword: null,
      postChangeLogin: null,
      googleNegative: null,
    },
  };
}

function pushFailure(report, id, message, extra = {}) {
  report.failures.push({
    id,
    message,
    ...extra,
  });
}

function recordCheck(report, id, payload) {
  report.checks[id] = payload;
  return payload;
}

function statusMatches(status, expectedStatuses) {
  return expectedStatuses.includes(status);
}

function summarizeAuthResponse(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const hasSuccess = Object.prototype.hasOwnProperty.call(body, 'success');
  const hasSuccessPascal = Object.prototype.hasOwnProperty.call(body, 'Success');

  return {
    userId: body.userId || body.UserId || '',
    email: body.email || body.Email || '',
    displayName: body.displayName || body.DisplayName || '',
    needsOnboarding: Boolean(body.needsOnboarding ?? body.NeedsOnboarding),
    hasAccessToken: Boolean(body.accessToken || body.Token),
    hasRefreshToken: Boolean(body.refreshToken || body.RefreshToken),
    accessTokenExpiresAt: body.accessTokenExpiresAt || body.ExpiresAt || '',
    refreshTokenExpiresAt: body.refreshTokenExpiresAt || body.RefreshTokenExpiresAt || '',
    success: hasSuccess ? Boolean(body.success) : hasSuccessPascal ? Boolean(body.Success) : null,
    message: body.message || body.Message || '',
    verificationCodeExpiresAt:
      body.verificationCodeExpiresAt || body.VerificationCodeExpiresAt || '',
    resetCodeProvided: Boolean(body.resetCode || body.ResetCode),
  };
}

function summarizeResponse(response) {
  if (!response) {
    return null;
  }

  return {
    ok: Boolean(response.ok),
    status: response.status,
    statusText: response.statusText || '',
    durationMs: response.durationMs || 0,
    body: summarizeAuthResponse(response.body),
    error: response.error || '',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolveOutputDir(args.output);
  const backendUrl = normalizeBaseUrl(
    args.backend || process.env.EATFITAI_SMOKE_BACKEND_URL,
    DEFAULT_BACKEND_URL,
  );
  const reportPath = path.join(outputDir, 'auth-api-report.json');
  const registerDisplayName =
    trim(args.displayName || process.env.EATFITAI_SMOKE_DISPLAY_NAME) ||
    DEFAULT_DISPLAY_NAME;
  const initialPassword =
    trim(args.password || process.env.EATFITAI_SMOKE_PASSWORD) || DEFAULT_INITIAL_PASSWORD;
  const resetPassword = trim(args.resetPassword) || DEFAULT_RESET_PASSWORD;
  const finalPassword = trim(args.finalPassword) || DEFAULT_FINAL_PASSWORD;

  fs.mkdirSync(outputDir, { recursive: true });

  const report = createEmptyReport(outputDir, backendUrl, {
    artifactPath: '',
    address: '',
    provider: 'mail.tm',
  });
  report.account.initialPassword = initialPassword;
  report.account.resetPassword = resetPassword;
  report.account.finalPassword = finalPassword;

  let mailbox = null;
  let latestAccessToken = '';
  let latestRefreshToken = '';
  let latestEmail = '';
  let verificationMessage = null;
  let resetMessage = null;
  let cleanupAttempted = false;

  try {
    mailbox = await createDisposableMailbox({ outputDir });
    report.mailbox = {
      artifactPath: path.join(outputDir, 'disposable-mailbox.json'),
      address: mailbox.address,
      provider: mailbox.provider || 'mail.tm',
    };
    report.account.email = mailbox.address;

    const registerResponse = await requestJson(
      `${backendUrl}/api/auth/register-with-verification`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: mailbox.address,
          password: initialPassword,
          displayName: registerDisplayName,
        }),
      },
    );
    const registerPassed = registerResponse.ok && registerResponse.status === 200;
    report.auth.register = summarizeResponse(registerResponse);
    if (!registerPassed) {
      pushFailure(report, 'register-with-verification', 'Register with verification failed', {
        expectedStatuses: [200],
        response: summarizeResponse(registerResponse),
      });
    }

    const resendStartedAt = new Date().toISOString();
    const resendResponse = registerPassed
      ? await requestJson(`${backendUrl}/api/auth/resend-verification`, {
          method: 'POST',
          body: JSON.stringify({ email: mailbox.address }),
        })
      : null;
    const resendPassed = resendResponse ? resendResponse.ok && resendResponse.status === 200 : false;
    report.auth.resendVerification = summarizeResponse(resendResponse);
    if (registerPassed && !resendPassed) {
      pushFailure(report, 'resend-verification', 'Resend verification failed', {
        expectedStatuses: [200],
        response: summarizeResponse(resendResponse),
      });
    }

    if (registerPassed && resendPassed) {
      try {
        verificationMessage = await waitForMatchingMessage({
          apiBaseUrl: 'https://api.mail.tm',
          mailbox,
          outputDir,
          artifactName: 'auth-verification-mail.json',
          subjectIncludes: DEFAULT_MAIL_SUBJECT_VERIFY,
          createdAfterIso: resendStartedAt,
        });
        report.artifacts.verificationMailboxMessagePath = path.join(
          outputDir,
          'auth-verification-mail.json',
        );
      } catch (error) {
        pushFailure(report, 'verify-email-mailbox', 'Failed to read verification email', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const verificationCode = verificationMessage?.code || '';
    const verifyResponse =
      registerPassed && resendPassed && verificationCode
        ? await requestJson(`${backendUrl}/api/auth/verify-email`, {
            method: 'POST',
            body: JSON.stringify({
              email: mailbox.address,
              verificationCode,
            }),
          })
        : null;
    const verifyPassed = verifyResponse ? verifyResponse.ok && verifyResponse.status === 200 : false;
    report.auth.verifyEmail = summarizeResponse(verifyResponse);
    if (registerPassed && resendPassed && !verifyPassed) {
      pushFailure(report, 'verify-email', 'Verify email failed', {
        expectedStatuses: [200],
        response: summarizeResponse(verifyResponse),
        verificationCodeSource: report.artifacts.verificationMailboxMessagePath,
      });
    }

    if (verifyPassed && verifyResponse?.body?.accessToken && verifyResponse?.body?.refreshToken) {
      latestAccessToken = verifyResponse.body.accessToken;
      latestRefreshToken = verifyResponse.body.refreshToken;
      latestEmail = mailbox.address;
    }

    const duplicateRegisterResponse = verifyPassed
      ? await requestJson(`${backendUrl}/api/auth/register-with-verification`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            password: initialPassword,
            displayName: registerDisplayName,
          }),
        })
      : null;
    const duplicateRegisterPassed =
      duplicateRegisterResponse && duplicateRegisterResponse.status === 400;
    report.auth.duplicateRegister = summarizeResponse(duplicateRegisterResponse);
    if (verifyPassed && !duplicateRegisterPassed) {
      pushFailure(report, 'duplicate-register', 'Duplicate register did not return 400', {
        expectedStatuses: [400],
        response: summarizeResponse(duplicateRegisterResponse),
      });
    }

    const loginResponse = verifyPassed
      ? await requestJson(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            password: initialPassword,
          }),
        })
      : null;
    const loginPassed = loginResponse ? loginResponse.ok && loginResponse.status === 200 : false;
    report.auth.initialLogin = summarizeResponse(loginResponse);
    if (verifyPassed && !loginPassed) {
      pushFailure(report, 'login', 'Login failed', {
        expectedStatuses: [200],
        response: summarizeResponse(loginResponse),
      });
    }

    if (loginPassed && loginResponse?.body?.accessToken && loginResponse?.body?.refreshToken) {
      latestAccessToken = loginResponse.body.accessToken;
      latestRefreshToken = loginResponse.body.refreshToken;
      latestEmail = mailbox.address;
    }

    const invalidRefreshResponse = loginPassed
      ? await requestJson(`${backendUrl}/api/auth/refresh`, {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: 'invalid.refresh.token',
          }),
        })
      : null;
    const invalidRefreshPassed =
      invalidRefreshResponse &&
      statusMatches(invalidRefreshResponse.status, [401]);
    recordCheck(report, 'invalidRefreshToken', {
      passed: Boolean(invalidRefreshPassed),
      expectedStatuses: [401],
      response: summarizeResponse(invalidRefreshResponse),
    });
    if (loginPassed && !invalidRefreshPassed) {
      pushFailure(report, 'invalidRefreshToken', 'Invalid refresh token was accepted', {
        expectedStatuses: [401],
        response: summarizeResponse(invalidRefreshResponse),
      });
    }

    const refreshResponse = loginPassed
      ? await requestJson(`${backendUrl}/api/auth/refresh`, {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: latestRefreshToken,
          }),
        })
      : null;
    const refreshPassed = refreshResponse ? refreshResponse.ok && refreshResponse.status === 200 : false;
    report.auth.refresh = summarizeResponse(refreshResponse);
    if (loginPassed && !refreshPassed) {
      pushFailure(report, 'refresh', 'Refresh token rotation failed', {
        expectedStatuses: [200],
        response: summarizeResponse(refreshResponse),
      });
    }

    if (refreshPassed && refreshResponse?.body?.accessToken && refreshResponse?.body?.refreshToken) {
      latestAccessToken = refreshResponse.body.accessToken;
      latestRefreshToken = refreshResponse.body.refreshToken;
    }

    const logoutResponse = refreshPassed
      ? await requestJson(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          body: JSON.stringify({
            maRefreshToken: latestRefreshToken,
          }),
        })
      : null;
    const logoutPassed = logoutResponse ? logoutResponse.ok && logoutResponse.status === 200 : false;
    report.auth.logout = summarizeResponse(logoutResponse);
    if (refreshPassed && !logoutPassed) {
      pushFailure(report, 'logout', 'Logout failed', {
        expectedStatuses: [200],
        response: summarizeResponse(logoutResponse),
      });
    }

    const forgotPasswordRequestedAt = new Date().toISOString();
    const forgotPasswordResponse = verifyPassed
      ? await requestJson(`${backendUrl}/api/auth/forgot-password`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
          }),
        })
      : null;
    const forgotPasswordPassed =
      forgotPasswordResponse && forgotPasswordResponse.ok && forgotPasswordResponse.status === 200;
    report.auth.forgotPassword = summarizeResponse(forgotPasswordResponse);
    if (verifyPassed && !forgotPasswordPassed) {
      pushFailure(report, 'forgot-password', 'Forgot password request failed', {
        expectedStatuses: [200],
        response: summarizeResponse(forgotPasswordResponse),
      });
    }

    if (forgotPasswordPassed) {
      try {
        resetMessage = await waitForMatchingMessage({
          apiBaseUrl: 'https://api.mail.tm',
          mailbox,
          outputDir,
          artifactName: 'auth-reset-mail.json',
          subjectIncludes: DEFAULT_MAIL_SUBJECT_RESET,
          createdAfterIso: forgotPasswordRequestedAt,
        });
        report.artifacts.resetMailboxMessagePath = path.join(outputDir, 'auth-reset-mail.json');
      } catch (error) {
        pushFailure(report, 'forgot-password-mailbox', 'Failed to read reset email', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const resetCode = resetMessage?.code || '';
    const wrongResetResponse = resetCode
      ? await requestJson(`${backendUrl}/api/auth/verify-reset-code`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            resetCode: WRONG_RESET_CODE,
          }),
        })
      : null;
    const wrongResetPassed =
      wrongResetResponse && statusMatches(wrongResetResponse.status, [401]);
    recordCheck(report, 'wrongResetCode', {
      passed: Boolean(wrongResetPassed),
      expectedStatuses: [401],
      attemptedCode: WRONG_RESET_CODE,
      response: summarizeResponse(wrongResetResponse),
    });
    if (forgotPasswordPassed && !wrongResetPassed) {
      pushFailure(report, 'wrong-reset-code', 'Wrong reset code was accepted', {
        expectedStatuses: [401],
        response: summarizeResponse(wrongResetResponse),
      });
    }

    const verifyResetResponse = resetCode
      ? await requestJson(`${backendUrl}/api/auth/verify-reset-code`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            resetCode,
          }),
        })
      : null;
    const verifyResetPassed =
      verifyResetResponse && verifyResetResponse.ok && verifyResetResponse.status === 200;
    report.auth.verifyResetCode = summarizeResponse(verifyResetResponse);
    if (forgotPasswordPassed && !verifyResetPassed) {
      pushFailure(report, 'verify-reset-code', 'Verify reset code failed', {
        expectedStatuses: [200],
        response: summarizeResponse(verifyResetResponse),
        resetCodeSource: report.artifacts.resetMailboxMessagePath,
      });
    }

    const resetPasswordResponse = verifyResetPassed
      ? await requestJson(`${backendUrl}/api/auth/reset-password`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            resetCode,
            newPassword: resetPassword,
          }),
        })
      : null;
    const resetPasswordPassed =
      resetPasswordResponse && resetPasswordResponse.ok && resetPasswordResponse.status === 200;
    report.auth.resetPassword = summarizeResponse(resetPasswordResponse);
    if (verifyResetPassed && !resetPasswordPassed) {
      pushFailure(report, 'reset-password', 'Reset password failed', {
        expectedStatuses: [200],
        response: summarizeResponse(resetPasswordResponse),
      });
    }

    const postResetLoginResponse = resetPasswordPassed
      ? await requestJson(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            password: resetPassword,
          }),
        })
      : null;
    const postResetLoginPassed =
      postResetLoginResponse && postResetLoginResponse.ok && postResetLoginResponse.status === 200;
    report.auth.postResetLogin = summarizeResponse(postResetLoginResponse);
    if (resetPasswordPassed && !postResetLoginPassed) {
      pushFailure(report, 'login-after-reset', 'Login after reset failed', {
        expectedStatuses: [200],
        response: summarizeResponse(postResetLoginResponse),
      });
    }

    if (
      postResetLoginPassed &&
      postResetLoginResponse?.body?.accessToken &&
      postResetLoginResponse?.body?.refreshToken
    ) {
      latestAccessToken = postResetLoginResponse.body.accessToken;
      latestRefreshToken = postResetLoginResponse.body.refreshToken;
      latestEmail = mailbox.address;
    }

    const changePasswordResponse = postResetLoginPassed
      ? await requestJson(`${backendUrl}/api/auth/change-password`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${latestAccessToken}`,
          },
          body: JSON.stringify({
            currentPassword: resetPassword,
            newPassword: finalPassword,
          }),
        })
      : null;
    const changePasswordPassed =
      changePasswordResponse && changePasswordResponse.ok && changePasswordResponse.status === 200;
    report.auth.changePassword = summarizeResponse(changePasswordResponse);
    if (postResetLoginPassed && !changePasswordPassed) {
      pushFailure(report, 'change-password', 'Change password failed', {
        expectedStatuses: [200],
        response: summarizeResponse(changePasswordResponse),
      });
    }

    const postChangeLoginResponse = changePasswordPassed
      ? await requestJson(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify({
            email: mailbox.address,
            password: finalPassword,
          }),
        })
      : null;
    const postChangeLoginPassed =
      postChangeLoginResponse && postChangeLoginResponse.ok && postChangeLoginResponse.status === 200;
    report.auth.postChangeLogin = summarizeResponse(postChangeLoginResponse);
    if (changePasswordPassed && !postChangeLoginPassed) {
      pushFailure(report, 'login-after-change', 'Login after change-password failed', {
        expectedStatuses: [200],
        response: summarizeResponse(postChangeLoginResponse),
      });
    }

    if (
      postChangeLoginPassed &&
      postChangeLoginResponse?.body?.accessToken &&
      postChangeLoginResponse?.body?.refreshToken
    ) {
      latestAccessToken = postChangeLoginResponse.body.accessToken;
      latestRefreshToken = postChangeLoginResponse.body.refreshToken;
      latestEmail = mailbox.address;
    }

    const googleSigninResponse = latestEmail
      ? await requestJson(`${backendUrl}/api/auth/google/signin`, {
          method: 'POST',
          body: JSON.stringify({
            idToken: GOOGLE_NEGATIVE_TOKEN,
          }),
        })
      : null;
    const googleSigninPassed =
      googleSigninResponse &&
      statusMatches(googleSigninResponse.status, [400, 401, 503]);
    const googleLinkResponse = latestAccessToken
      ? await requestJson(`${backendUrl}/api/auth/google/link`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${latestAccessToken}`,
          },
          body: JSON.stringify({
            idToken: GOOGLE_NEGATIVE_TOKEN,
          }),
        })
      : null;
    const googleLinkPassed =
      googleLinkResponse &&
      statusMatches(googleLinkResponse.status, [400, 401, 503]);
    report.auth.googleNegative = {
      signin: summarizeResponse(googleSigninResponse),
      link: summarizeResponse(googleLinkResponse),
      passed: Boolean(googleSigninPassed && googleLinkPassed),
    };
    if (latestEmail && !googleSigninPassed) {
      pushFailure(report, 'google-signin-negative', 'Google signin negative contract failed', {
        expectedStatuses: [400, 401, 503],
        response: summarizeResponse(googleSigninResponse),
      });
    }
    if (latestAccessToken && !googleLinkPassed) {
      pushFailure(report, 'google-link-negative', 'Google link negative contract failed', {
        expectedStatuses: [400, 401, 503],
        response: summarizeResponse(googleLinkResponse),
      });
    }

    report.cleanup.possible = Boolean(latestAccessToken);
    if (latestAccessToken) {
      cleanupAttempted = true;
      report.cleanup.attempted = true;
      const cleanupResponse = await requestJson(`${backendUrl}/api/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${latestAccessToken}`,
        },
      });
      report.cleanup.ok = Boolean(cleanupResponse.ok && cleanupResponse.status === 200);
      report.cleanup.passed = report.cleanup.ok;
      report.cleanup.status = cleanupResponse.status;
      report.cleanup.response = summarizeResponse(cleanupResponse);
      report.cleanup.deletedAccount = report.cleanup.ok;
      if (!report.cleanup.ok) {
        report.cleanup.credentials = {
          email: mailbox.address,
          password: finalPassword,
        };
      }

      if (!report.cleanup.ok) {
        report.cleanup.error =
          cleanupResponse.error || cleanupResponse.body?.message || 'Cleanup request failed';
        pushFailure(report, 'cleanup-delete-profile', 'Account cleanup failed', {
          expectedStatuses: [200],
          response: summarizeResponse(cleanupResponse),
        });
      }
    } else {
      report.cleanup.error = 'No access token available for cleanup.';
      report.cleanup.credentials = {
        email: mailbox.address,
        password: finalPassword,
      };
    }

    report.passed = report.failures.length === 0 && report.cleanup.ok;
    writeJson(reportPath, report);

    console.log(`[production-smoke-auth-api] Wrote ${reportPath}`);
    console.log(
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          outputDir: report.outputDir,
          backendUrl: report.backendUrl,
          passed: report.passed,
          failureCount: report.failures.length,
          cleanup: report.cleanup,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    report.passed = false;
    report.cleanup.attempted = cleanupAttempted;
    report.cleanup.error = report.cleanup.error || (error instanceof Error ? error.message : String(error));
    if (!report.failures.length) {
      pushFailure(report, 'fatal', report.cleanup.error, {});
    }
    writeJson(reportPath, report);
    console.error('[production-smoke-auth-api] Failed:', error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[production-smoke-auth-api] Unexpected failure:', error);
  process.exit(1);
});
