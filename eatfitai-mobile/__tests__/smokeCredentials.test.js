describe('resolveSmokeCredentials', () => {
  const envKeys = [
    'EATFITAI_SMOKE_EMAIL',
    'EATFITAI_SMOKE_PASSWORD',
    'EATFITAI_DEMO_EMAIL',
    'EATFITAI_DEMO_PASSWORD',
  ];

  const originalEnv = {};

  beforeAll(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }
  });

  beforeEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('falls back to demo credentials when smoke credentials are absent', () => {
    process.env.EATFITAI_DEMO_EMAIL = 'demo@example.com';
    process.env.EATFITAI_DEMO_PASSWORD = 'demo-password';

    const {
      resolveSmokeCredentials,
    } = require('../scripts/lib/smoke-credentials');

    expect(resolveSmokeCredentials()).toEqual({
      email: 'demo@example.com',
      password: 'demo-password',
      source: 'EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD',
    });
  });

  it('prefers smoke credentials over demo credentials', () => {
    process.env.EATFITAI_SMOKE_EMAIL = 'smoke@example.com';
    process.env.EATFITAI_SMOKE_PASSWORD = 'smoke-password';
    process.env.EATFITAI_DEMO_EMAIL = 'demo@example.com';
    process.env.EATFITAI_DEMO_PASSWORD = 'demo-password';

    const {
      resolveSmokeCredentials,
    } = require('../scripts/lib/smoke-credentials');

    expect(resolveSmokeCredentials()).toEqual({
      email: 'smoke@example.com',
      password: 'smoke-password',
      source: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
    });
  });
});
