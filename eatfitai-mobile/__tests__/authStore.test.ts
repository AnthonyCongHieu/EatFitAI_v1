import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from '../src/services/apiClient';
import { tokenStorage } from '../src/services/secureStore';
import { googleAuthService } from '../src/services/googleAuthService';
import { useAuthStore } from '../src/store/useAuthStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
  setAuthExpiredCallback: jest.fn(),
}));

jest.mock('../src/services/authTokens', () => ({
  setAccessTokenMem: jest.fn(),
}));

jest.mock('../src/services/secureStore', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    getAccessTokenExpiresAt: jest.fn(),
    getRefreshTokenExpiresAt: jest.fn(),
    saveTokensFull: jest.fn(),
    clearAll: jest.fn(),
  },
}));

jest.mock('../src/services/authSession', () => ({
  initAuthSession: jest.fn(),
  updateSessionFromAuthResponse: jest.fn(),
}));

jest.mock('../src/services/tokenService', () => ({
  postRefreshToken: jest.fn(),
}));

jest.mock('../src/services/googleAuthService', () => ({
  googleAuthService: {
    configure: jest.fn(),
    signIn: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);
    (tokenStorage.getAccessTokenExpiresAt as jest.Mock).mockResolvedValue(null);
    (tokenStorage.getRefreshTokenExpiresAt as jest.Mock).mockResolvedValue(null);
    (tokenStorage.saveTokensFull as jest.Mock).mockResolvedValue(undefined);
    (tokenStorage.clearAll as jest.Mock).mockResolvedValue(undefined);
    useAuthStore.setState({
      isInitializing: false,
      isAuthenticated: false,
      needsOnboarding: false,
      user: null,
    });
  });

  it('calls forgot-password endpoint and returns the reset code when present', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { resetCode: '123456' },
    });

    await expect(
      useAuthStore.getState().forgotPassword('demo@example.com'),
    ).resolves.toBe('123456');

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
      Email: 'demo@example.com',
    });
  });

  it('calls verify-reset-code before continuing the reset flow', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { message: 'Mã hợp lệ' } });

    await expect(
      useAuthStore.getState().verifyResetCode('demo@example.com', '123456'),
    ).resolves.toBeUndefined();

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/verify-reset-code', {
      Email: 'demo@example.com',
      ResetCode: '123456',
    });
  });

  it('calls reset-password with the expected payload', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { message: 'ok' } });

    await expect(
      useAuthStore.getState().resetPassword('demo@example.com', '123456', 'NewPass123'),
    ).resolves.toBeUndefined();

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/reset-password', {
      Email: 'demo@example.com',
      ResetCode: '123456',
      NewPassword: 'NewPass123',
    });
  });

  it('surfaces Google config errors from the native setup stage', async () => {
    (googleAuthService.configure as jest.Mock).mockResolvedValue(false);

    await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow(
      'Không thể khởi tạo Google Sign-In. Kiểm tra EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID và env mobile.',
    );
  });

  it('surfaces operator-visible Google sign-in errors from the native module', async () => {
    (googleAuthService.configure as jest.Mock).mockResolvedValue(true);
    (googleAuthService.signIn as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Google Sign-in chua duoc cau hinh tren may chu',
    });

    await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow(
      'Google Sign-in chua duoc cau hinh tren may chu',
    );
  });
});
