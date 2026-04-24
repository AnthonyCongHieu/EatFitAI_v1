/* global by, device, element, expect, waitFor */

describe('Auth smoke', () => {
  beforeAll(async () => {
    await device.launchApp({
      resetAppState: true,
      newInstance: true,
    });
  });

  it('opens the automation login entry and navigates to register', async () => {
    await expect(element(by.id('auth-login-screen'))).toBeVisible();
    await expect(element(by.id('auth-login-email-input'))).toBeVisible();
    await expect(element(by.id('auth-login-password-input'))).toBeVisible();

    await element(by.id('auth-login-register-link')).tap();

    await waitFor(element(by.id('auth-register-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('auth-register-email-input'))).toBeVisible();
  });
});
