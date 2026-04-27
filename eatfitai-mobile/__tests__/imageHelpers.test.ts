describe('imageHelpers media URL resolution', () => {
  const originalBudgetMode = process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE;
  const originalMediaBaseUrl = process.env.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL;
  const restoreEnv = (key: keyof NodeJS.ProcessEnv, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  };

  afterEach(() => {
    jest.resetModules();
    restoreEnv('EXPO_PUBLIC_MEDIA_BUDGET_MODE', originalBudgetMode);
    restoreEnv('EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL', originalMediaBaseUrl);
  });

  it('rewrites Supabase Storage object URLs to the configured media public base', () => {
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = '';
    process.env.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL = 'https://media.example.com';

    const { getFoodImageUrl } = require('../src/utils/imageHelpers');

    expect(
      getFoodImageUrl(
        'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/thumbnails/rice.png',
      ),
    ).toBe('https://media.example.com/food-images/thumbnails/rice.png');
    expect(
      getFoodImageUrl(
        'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/avatars/v2/thumb.webp',
      ),
    ).toBe('https://media.example.com/user-food/avatars/v2/thumb.webp');
  });

  it('builds relative catalog image paths through the configured media public base', () => {
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = '';
    process.env.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL = 'https://media.example.com/';

    const { getFoodImageUrl } = require('../src/utils/imageHelpers');

    expect(getFoodImageUrl('v2/thumb/rice.webp', 'thumb')).toBe(
      'https://media.example.com/food-images/v2/thumb/rice.webp',
    );
    expect(getFoodImageUrl('rice.png', 'medium')).toBe(
      'https://media.example.com/food-images/original/rice.png',
    );
    expect(getFoodImageUrl('food-images/thumbnails/rice.png', 'thumb')).toBe(
      'https://media.example.com/food-images/thumbnails/rice.png',
    );
  });

  it('returns the fallback image when placeholder media mode is enabled', () => {
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = 'placeholder';
    process.env.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL = 'https://media.example.com';

    const { getFoodImageUrl } = require('../src/utils/imageHelpers');

    expect(getFoodImageUrl('rice.png')).toContain('placehold.co');
    expect(
      getFoodImageUrl(
        'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/thumbnails/rice.png',
      ),
    ).toContain('placehold.co');
  });
});
