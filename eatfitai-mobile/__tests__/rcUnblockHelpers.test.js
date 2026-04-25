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
});
