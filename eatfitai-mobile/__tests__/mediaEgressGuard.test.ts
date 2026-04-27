declare const require: any;

const {
  evaluateMediaEgressGuard,
  runMediaEgressGuard,
} = require('../scripts/lib/media-egress-guard');

describe('media egress guard', () => {
  it('passes non-production targets without placeholder mode', () => {
    expect(
      evaluateMediaEgressGuard({
        APP_ENV: 'preview',
        EATFITAI_SMOKE_BACKEND_URL: 'https://eatfitai-backend-dev.onrender.com',
      }),
    ).toMatchObject({
      status: 'pass',
      productionTarget: false,
    });
  });

  it('warns for production targets without placeholder mode when lockdown is not required', () => {
    expect(
      evaluateMediaEgressGuard({
        APP_ENV: 'production',
      }),
    ).toMatchObject({
      status: 'warn',
      productionTarget: true,
      lockdownRequired: false,
    });
  });

  it('fails production smoke during lockdown unless placeholder mode is enabled', () => {
    const env = {
      APP_ENV: 'production',
      EATFITAI_REQUIRE_MEDIA_BUDGET_MODE: '1',
    };

    expect(evaluateMediaEgressGuard(env)).toMatchObject({
      status: 'fail',
      productionTarget: true,
      lockdownRequired: true,
    });
    expect(() => runMediaEgressGuard({ env, logger: { log: jest.fn(), warn: jest.fn() } })).toThrow(
      /EXPO_PUBLIC_MEDIA_BUDGET_MODE=placeholder/,
    );
  });

  it('passes production smoke during lockdown when placeholder mode is enabled', () => {
    expect(
      evaluateMediaEgressGuard({
        APP_ENV: 'production',
        EATFITAI_REQUIRE_MEDIA_BUDGET_MODE: '1',
        EXPO_PUBLIC_MEDIA_BUDGET_MODE: 'placeholder',
      }),
    ).toMatchObject({
      status: 'pass',
      productionTarget: true,
      lockdownRequired: true,
      mediaBudgetMode: 'placeholder',
    });
  });
});
