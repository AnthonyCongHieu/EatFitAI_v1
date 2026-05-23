const {
  DEVICE_FLOW_AUTH_COSTS,
  buildDeviceFlowAuthPacer,
} = require('../scripts/lib/device-flow-pacing');

describe('device flow auth pacing', () => {
  test('waits before a flow would exceed the production auth smoke budget', () => {
    const pacer = buildDeviceFlowAuthPacer({ limit: 6, windowMs: 65000 });

    expect(pacer.beforeFlow('login-real', 1000)).toBe(0);
    expect(pacer.beforeFlow('food-diary-readback', 2000)).toBe(0);
    expect(pacer.beforeFlow('food-search-ui-readback', 3000)).toBe(0);
    expect(pacer.beforeFlow('scan-save-readback', 4000)).toBe(62001);
  });

  test('does not charge flows that do not submit authentication', () => {
    const pacer = buildDeviceFlowAuthPacer({ limit: 1, windowMs: 65000 });

    expect(pacer.beforeFlow('doctor', 1000)).toBe(0);
    expect(pacer.beforeFlow('home-smoke', 2000)).toBe(0);
    expect(pacer.beforeFlow('login-real', 3000)).toBe(0);
    expect(pacer.beforeFlow('login-real', 4000)).toBe(64001);
  });

  test('accounts for account-registration auth traffic conservatively', () => {
    expect(DEVICE_FLOW_AUTH_COSTS['register-new-user']).toBe(6);
  });
});
