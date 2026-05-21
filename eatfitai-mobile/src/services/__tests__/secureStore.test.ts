import { SECURE_STORE_KEYS, tokenStorage } from '../secureStore';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('tokenStorage', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('round-trips long access and refresh tokens by chunking them', async () => {
    const accessToken = `access.${'a'.repeat(4100)}`;
    const refreshToken = `refresh.${'r'.repeat(3700)}`;

    await tokenStorage.saveTokensFull({
      accessToken,
      refreshToken,
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      refreshTokenExpiresAt: '2030-02-01T00:00:00.000Z',
    });

    expect(mockStore.get(SECURE_STORE_KEYS.ACCESS_TOKEN_KEY)).toBeUndefined();
    expect(mockStore.get(`${SECURE_STORE_KEYS.ACCESS_TOKEN_KEY}.chunkCount`)).toBe(
      '3',
    );
    await expect(tokenStorage.getAccessToken()).resolves.toBe(accessToken);
    await expect(tokenStorage.getRefreshToken()).resolves.toBe(refreshToken);
    await expect(tokenStorage.getAccessTokenExpiresAt()).resolves.toBe(
      '2030-01-01T00:00:00.000Z',
    );
  });

  it('clears chunked tokens and legacy single-key tokens', async () => {
    await tokenStorage.saveTokens('short-access', 'short-refresh');
    await tokenStorage.saveTokensFull({
      accessToken: `access.${'a'.repeat(4100)}`,
      refreshToken: `refresh.${'r'.repeat(3700)}`,
    });

    await tokenStorage.clearAll();

    expect(Array.from(mockStore.keys())).toEqual([]);
    await expect(tokenStorage.getAccessToken()).resolves.toBeNull();
    await expect(tokenStorage.getRefreshToken()).resolves.toBeNull();
  });
});
