describe('RC unblock helpers', () => {
  it('fails Render verification when service rootDir differs from the expected root', () => {
    const {
      buildRootDirAssessment,
      buildDockerPathAssessment,
      buildGitDeployReadiness,
      extractGitStatusPath,
      isDeployRelevantPath,
      parseAheadBehind,
      readServiceRootDir,
      resolveExpectedRootDir,
    } = require('../scripts/lib/render-rc');

    const serviceInfo = {
      rootDir: 'api',
      serviceDetails: {
        runtime: 'docker',
      },
    };

    expect(readServiceRootDir(serviceInfo)).toBe('api');
    expect(
      buildRootDirAssessment(serviceInfo, 'eatfitai-backend'),
    ).toEqual({
      expectedRootDir: 'eatfitai-backend',
      rootDir: 'api',
      rootDirMatches: false,
    });
    expect(
      buildDockerPathAssessment({
        serviceDetails: {
          envSpecificDetails: {
            dockerContext: './eatfitai-backend',
            dockerfilePath: './eatfitai-backend/Dockerfile',
          },
        },
      }),
    ).toEqual({
      expectedDockerContext: '.',
      expectedDockerfilePath: './Dockerfile',
      dockerContext: './eatfitai-backend',
      dockerfilePath: './eatfitai-backend/Dockerfile',
      dockerPathsMatch: false,
    });
    expect(resolveExpectedRootDir('backend', { expectedRootDir: '' })).toBe('');
    expect(
      buildRootDirAssessment({ rootDir: '' }, ''),
    ).toEqual({
      expectedRootDir: '',
      rootDir: '',
      rootDirMatches: true,
    });
    expect(
      buildDockerPathAssessment(
        {
          serviceDetails: {
            envSpecificDetails: {
              dockerContext: './eatfitai-backend',
              dockerfilePath: './eatfitai-backend/Dockerfile',
            },
          },
        },
        {
          expectedDockerContext: './eatfitai-backend',
          expectedDockerfilePath: './eatfitai-backend/Dockerfile',
        },
      ).dockerPathsMatch,
    ).toBe(true);
    expect(parseAheadBehind('0\t2')).toEqual({ behind: 0, ahead: 2 });
    expect(
      buildGitDeployReadiness({
        dirtyFiles: [' M eatfitai-backend/Services/EncryptionService.cs'],
        upstream: 'origin/hieu_deploy/production',
        ahead: 0,
        behind: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        passed: false,
        failures: ['dirty-worktree'],
      }),
    );
    expect(
      buildGitDeployReadiness({
        dirtyFiles: [' M docs/26_RC_STABILIZATION_REPORT_2026-04-25.md', ' M .serena/memories/task_completion.md'],
        upstream: 'origin/hieu_deploy/production',
        ahead: 0,
        behind: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        passed: true,
        deployRelevantDirtyFileCount: 0,
      }),
    );
    expect(
      buildGitDeployReadiness({
        dirtyFiles: [],
        upstream: 'origin/hieu_deploy/production',
        ahead: 1,
        behind: 0,
      }).failures,
    ).toContain('unpushed-head');
    expect(extractGitStatusPath('R  old.js -> eatfitai-mobile/scripts/new.js')).toBe(
      'eatfitai-mobile/scripts/new.js',
    );
    expect(isDeployRelevantPath('docs/26_RC_STABILIZATION_REPORT_2026-04-25.md')).toBe(false);
    expect(isDeployRelevantPath('ai-provider/app.py')).toBe(true);
  });

  it('treats a 401 unverified login as recoverable for demo seed auth', () => {
    const {
      isEmailUnverifiedLogin,
    } = require('../scripts/lib/seed-verification');

    expect(
      isEmailUnverifiedLogin({
        status: 401,
        body: {
          message: 'Email chua duoc xac minh. Vui long kiem tra email.',
        },
      }),
    ).toBe(true);

    expect(
      isEmailUnverifiedLogin({
        status: 401,
        body: {
          message: 'Email hoac mat khau khong dung',
        },
      }),
    ).toBe(false);
  });

  it('writes mailbox proof artifacts without passwords, bearer tokens, or verification codes', () => {
    const {
      buildSafeMailboxArtifact,
      buildSafeVerificationArtifact,
    } = require('../scripts/lib/seed-verification');

    const mailboxArtifact = buildSafeMailboxArtifact({
      address: 'demo@example.com',
      mailApi: 'https://api.mail.tm',
      token: 'secret-token',
      password: 'secret-password',
    });
    const messageArtifact = buildSafeVerificationArtifact({
      mailbox: 'demo@example.com',
      messageCount: 1,
      newestMessageId: 'message-1',
      subject: 'Verification code 123456',
      verificationCode: '123456',
      message: {
        text: 'Your code is 123456',
      },
    });

    const serialized = JSON.stringify({ mailboxArtifact, messageArtifact });
    expect(serialized).toContain('demo@example.com');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('secret-password');
    expect(serialized).not.toContain('123456');
    expect(messageArtifact.verificationCodeFound).toBe(true);
  });

  it('requires every Android RC proof flow and mandatory API readback to pass', () => {
    const {
      REQUIRED_RC_DEVICE_MODES,
      evaluateRcDeviceReports,
    } = require('../scripts/lib/device-rc-evidence');
    const makeReport = (mode, apiReadbacks = []) => ({
      mode,
      status: 'pass',
      authenticated: true,
      flowAssertions: [
        {
          name: `${mode}-home-ui-marker`,
          status: 'pass',
        },
      ],
      apiReadbacks,
      criticalFailures: [],
    });
    const reports = [
      makeReport('login-real'),
      makeReport('home-smoke'),
      makeReport('food-diary-readback', [
        { name: 'food-diary-mandatory-readback', status: 'pass', mandatory: true },
      ]),
      makeReport('scan-save-readback', [
        { name: 'scan-save-readback-mandatory-readback', status: 'pass', mandatory: true },
      ]),
      makeReport('voice-text-readback', [
        { name: 'voice-text-readback-mandatory-readback', status: 'pass', mandatory: true },
      ]),
      makeReport('stats-profile-smoke', [
        { name: 'stats-summary-day-readback', status: 'pass', mandatory: true },
        { name: 'profile-readback', status: 'pass', mandatory: true },
      ]),
    ];

    expect(REQUIRED_RC_DEVICE_MODES).toHaveLength(6);
    expect(evaluateRcDeviceReports(reports).passed).toBe(true);
    expect(evaluateRcDeviceReports(reports.slice(0, 5))).toEqual(
      expect.objectContaining({
        passed: false,
        missingModes: ['stats-profile-smoke'],
      }),
    );
    expect(
      evaluateRcDeviceReports([
        ...reports.slice(0, 3),
        makeReport('scan-save-readback', [
          { name: 'scan-save-readback-mandatory-readback', status: 'fail', mandatory: true },
        ]),
        ...reports.slice(4),
      ]).failedModes,
    ).toContain('scan-save-readback');
  });

  it('builds run-scoped smoke names so cloud seed data can be rerun safely', () => {
    const {
      buildUserApiSmokeNames,
      buildRunScopedSmokeName,
    } = require('../scripts/lib/user-smoke-data');

    expect(buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', '2026-04-25T14-05-01-234Z')).toBe(
      'Smoke Lane Banana Egg Bowl 20260425T140501234Z',
    );
    expect(buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', 'same-run')).toBe(
      buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', 'same-run'),
    );
    expect(buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', 'first-run')).not.toBe(
      buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', 'second-run'),
    );
    expect(buildRunScopedSmokeName('Smoke Lane Banana Egg Bowl', 'x'.repeat(300))).toHaveLength(255);

    const seedNames = buildUserApiSmokeNames('2026-04-25T14-18-15-903Z');
    expect(seedNames).toEqual({
      customDishName: 'Smoke Lane Banana Egg Bowl 20260425T141815903Z',
      primaryFoodName: 'Smoke Lane Yogurt Cup 20260425T141815903Z',
      primaryFoodUpdatedName: 'Smoke Lane Yogurt Cup v2 20260425T141815903Z',
      scratchFoodName: 'Smoke Lane Scratch Berry 20260425T141815903Z',
    });
    expect(new Set(Object.values(seedNames)).size).toBe(Object.values(seedNames).length);
    expect(Object.values(seedNames).every((name) => name.length <= 255)).toBe(true);
  });

  it('matches voice add-food readback rows from camelCase meal diary payloads', () => {
    const {
      extractStringsFromMealDiary,
      mealDiaryRowsContainFoodName,
    } = require('../scripts/lib/ai-smoke-readback');

    const rows = [
      {
        mealDiaryId: 3128,
        foodItemName: 'Chuối (tươi)',
        note: 'Voice AI: them 100g Chuối (tươi) bua trua',
      },
      {
        MealDiaryId: 3129,
        UserDishName: 'Smoke Lane Bowl',
      },
    ];

    expect(extractStringsFromMealDiary(rows)).toEqual([
      'Chuối (tươi)',
      'Voice AI: them 100g Chuối (tươi) bua trua',
      'Smoke Lane Bowl',
    ]);
    expect(mealDiaryRowsContainFoodName(rows, 'Chuối (tươi)')).toBe(true);
    expect(mealDiaryRowsContainFoodName(rows, 'Apple')).toBe(false);
  });

  it('builds stable voice add-food dates for readback across Vietnam midnight', () => {
    const {
      buildNoonUtcIsoForDateOnly,
      toVietnamDateOnly,
    } = require('../scripts/lib/ai-smoke-dates');

    const utcLateEvening = new Date('2026-04-25T17:05:00.000Z');
    const dateOnly = toVietnamDateOnly(utcLateEvening);

    expect(dateOnly).toBe('2026-04-26');
    expect(buildNoonUtcIsoForDateOnly(dateOnly)).toBe('2026-04-26T12:00:00.000Z');
    expect(new Date(buildNoonUtcIsoForDateOnly(dateOnly)).toISOString().slice(0, 10)).toBe(
      dateOnly,
    );
  });

  it('uses fail-fast smoke timeout defaults with env overrides', () => {
    const {
      resolveAiSmokeTimeouts,
      resolveAuthSmokeTimeouts,
    } = require('../scripts/lib/smoke-timeouts');

    expect(resolveAuthSmokeTimeouts({})).toEqual({
      requestTimeoutMs: 20000,
      resetPasswordTimeoutMs: 45000,
      mailboxTimeoutMs: 90000,
      mailboxPollIntervalMs: 5000,
      requestRetryAttempts: 2,
      requestRetryDelayMs: 3000,
    });
    expect(resolveAiSmokeTimeouts({})).toEqual({
      requestTimeoutMs: 20000,
      requestRetryCount: 1,
      visionDetectTimeoutMs: 15000,
      visionDetectRetryCount: 1,
    });
    expect(
      resolveAiSmokeTimeouts({
        EATFITAI_SMOKE_AI_DETECT_TIMEOUT_MS: '25000',
        EATFITAI_SMOKE_AI_DETECT_RETRY_COUNT: '2',
      }),
    ).toEqual(expect.objectContaining({
      visionDetectTimeoutMs: 25000,
      visionDetectRetryCount: 2,
    }));
  });

  it('stops the vision fixture sweep after timeout-like provider failures', () => {
    const {
      isTimeoutLikeResponse,
      shouldStopVisionFixtureSweep,
    } = require('../scripts/lib/ai-smoke-timeouts');

    expect(isTimeoutLikeResponse({ ok: false, status: null, error: 'This operation was aborted' })).toBe(true);
    expect(isTimeoutLikeResponse({ ok: false, status: 504 })).toBe(true);
    expect(isTimeoutLikeResponse({ ok: false, status: 503 })).toBe(false);
    expect(shouldStopVisionFixtureSweep({ ok: false, status: null })).toBe(true);
    expect(shouldStopVisionFixtureSweep({ ok: true, status: 200 })).toBe(false);
  });

  it('writes disposable mailbox artifacts without secrets or one-time codes', () => {
    const {
      buildSafeMailboxArtifact,
      buildSafeMessageArtifact,
    } = require('../scripts/lib/disposable-mail');

    const mailboxArtifact = buildSafeMailboxArtifact({
      generatedAt: '2026-04-25T00:00:00.000Z',
      provider: 'mail.tm',
      address: 'smoke@example.com',
      password: 'secret-password',
      token: 'secret-token',
      domain: 'example.com',
    });
    const messageArtifact = buildSafeMessageArtifact({
      generatedAt: '2026-04-25T00:01:00.000Z',
      mailbox: 'smoke@example.com',
      messageId: 'message-1',
      subject: 'Mã xác minh 123456',
      code: '123456',
      message: {
        text: 'Use code 123456',
      },
      source: 'message-detail',
    });

    const serialized = JSON.stringify({ mailboxArtifact, messageArtifact });
    expect(serialized).toContain('smoke@example.com');
    expect(serialized).not.toContain('secret-password');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('123456');
    expect(mailboxArtifact.tokenPresent).toBe(true);
    expect(messageArtifact.codeFound).toBe(true);
  });

  it('extracts auth smoke codes from response before falling back to mailbox', () => {
    const {
      extractResponseCode,
      resolveAuthCode,
    } = require('../scripts/lib/auth-smoke-codes');

    expect(extractResponseCode({ verificationCode: '123456' }, 'verificationCode')).toBe('123456');
    expect(extractResponseCode({ VerificationCode: '234567' }, 'verificationCode')).toBe('234567');
    expect(extractResponseCode({ resetCode: '345678' }, 'resetCode')).toBe('345678');
    expect(extractResponseCode({ verificationCode: '<redacted>' }, 'verificationCode')).toBe('');
    expect(resolveAuthCode({
      responseBodies: [{ verificationCode: '' }, { VerificationCode: '456789' }],
      responseKey: 'verificationCode',
      mailboxMessage: { code: '999999' },
    })).toEqual({
      code: '456789',
      source: 'response',
    });
    expect(resolveAuthCode({
      responseBodies: [{ verificationCode: '' }],
      responseKey: 'verificationCode',
      mailboxMessage: { code: '999999' },
    })).toEqual({
      code: '999999',
      source: 'mailbox',
    });
  });
});
