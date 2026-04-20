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
