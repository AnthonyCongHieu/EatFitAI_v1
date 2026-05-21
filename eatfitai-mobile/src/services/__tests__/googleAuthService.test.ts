import { normalizeGoogleAuthResponse } from '../googleAuthService';

describe('normalizeGoogleAuthResponse', () => {
  it('normalizes nested Google auth shapes', () => {
    const response = normalizeGoogleAuthResponse({
      accessToken: 'token',
      needsOnboarding: true,
      user: {
        userId: 'user-1',
        email: 'nested@example.com',
        displayName: 'Nested Name',
        NeedsOnboarding: false,
      },
    });

    expect(response.userId).toBe('user-1');
    expect(response.displayName).toBe('Nested Name');
    expect(response.email).toBe('nested@example.com');
    expect(response.needsOnboarding).toBe(true);
    expect(response.user?.id).toBe('user-1');
    expect(response.user?.displayName).toBe('Nested Name');
  });

  it('normalizes top-level Google auth shapes', () => {
    const response = normalizeGoogleAuthResponse({
      accessToken: 'token',
      UserId: 'user-2',
      Email: 'top@example.com',
      DisplayName: 'Top Name',
      NeedsOnboarding: true,
    });

    expect(response.userId).toBe('user-2');
    expect(response.displayName).toBe('Top Name');
    expect(response.email).toBe('top@example.com');
    expect(response.needsOnboarding).toBe(true);
    expect(response.user?.id).toBe('user-2');
    expect(response.user?.name).toBe('Top Name');
  });
});

describe('googleAuthService native sign-in paths', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS: 'false',
      EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('react-native');
    jest.dontMock('@react-native-google-signin/google-signin');
  });

  it('uses legacy Google Sign-In before Android Credential Manager when both are available', async () => {
    const credentialSignIn = jest.fn().mockResolvedValue({
      idToken: 'modern-id-token',
      user: {
        id: 'google-user-1',
        email: 'modern@example.com',
        name: 'Modern User',
        photo: 'https://example.com/avatar.png',
      },
    });
    const legacySignIn = jest.fn().mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'legacy-id-token',
        serverAuthCode: null,
        user: {
          id: 'legacy-user-1',
          email: 'legacy@example.com',
          name: 'Legacy User',
          photo: null,
        },
      },
    });

    jest.doMock('react-native', () => {
      return {
        Platform: { OS: 'android' },
        NativeModules: {
          EatFitCredentialManager: {
            signIn: credentialSignIn,
            clearCredentialState: jest.fn(),
          },
        },
      };
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn().mockResolvedValue(true),
        signIn: legacySignIn,
      },
      statusCodes: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { googleAuthService } = require('../googleAuthService');

    await expect(googleAuthService.configure()).resolves.toBe(true);
    await expect(googleAuthService.signIn()).resolves.toMatchObject({
      success: true,
      idToken: 'legacy-id-token',
      user: {
        email: 'legacy@example.com',
      },
    });

    expect(legacySignIn).toHaveBeenCalledTimes(1);
    expect(credentialSignIn).not.toHaveBeenCalled();
  });

  it('falls back to legacy Google Sign-In when Credential Manager is unavailable', async () => {
    const legacySignIn = jest.fn().mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'legacy-id-token',
        serverAuthCode: null,
        user: {
          id: 'legacy-user-1',
          email: 'legacy@example.com',
          name: 'Legacy User',
          photo: null,
        },
      },
    });

    jest.doMock('react-native', () => {
      return {
        Platform: { OS: 'android' },
        NativeModules: {
          EatFitCredentialManager: undefined,
        },
      };
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn().mockResolvedValue(true),
        signIn: legacySignIn,
      },
      statusCodes: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { googleAuthService } = require('../googleAuthService');

    await expect(googleAuthService.configure()).resolves.toBe(true);
    await expect(googleAuthService.signIn()).resolves.toMatchObject({
      success: true,
      idToken: 'legacy-id-token',
      user: {
        email: 'legacy@example.com',
      },
    });

    expect(legacySignIn).toHaveBeenCalledTimes(1);
  });

  it('handles cancelled legacy Google Sign-In without reporting a missing email', async () => {
    const legacySignIn = jest.fn().mockResolvedValue({
      type: 'cancelled',
      data: null,
    });

    jest.doMock('react-native', () => {
      return {
        Platform: { OS: 'android' },
        NativeModules: {
          EatFitCredentialManager: undefined,
        },
      };
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn().mockResolvedValue(true),
        signIn: legacySignIn,
      },
      statusCodes: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { googleAuthService } = require('../googleAuthService');

    await expect(googleAuthService.configure()).resolves.toBe(true);
    await expect(googleAuthService.signIn()).resolves.toMatchObject({
      success: false,
      error: 'Đã hủy đăng nhập',
    });

    expect(legacySignIn).toHaveBeenCalledTimes(1);
  });

  it('accepts a legacy Google ID token even when the SDK omits email details', async () => {
    const legacySignIn = jest.fn().mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'legacy-id-token',
        serverAuthCode: null,
        user: {
          id: 'legacy-user-1',
          email: '',
          name: null,
          photo: null,
        },
      },
    });

    jest.doMock('react-native', () => {
      return {
        Platform: { OS: 'android' },
        NativeModules: {
          EatFitCredentialManager: undefined,
        },
      };
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn().mockResolvedValue(true),
        signIn: legacySignIn,
      },
      statusCodes: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { googleAuthService } = require('../googleAuthService');

    await expect(googleAuthService.configure()).resolves.toBe(true);
    await expect(googleAuthService.signIn()).resolves.toMatchObject({
      success: true,
      idToken: 'legacy-id-token',
      user: {
        email: '',
      },
    });

    expect(legacySignIn).toHaveBeenCalledTimes(1);
  });
});
