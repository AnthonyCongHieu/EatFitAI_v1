describe('imageHelpers media budget mode', () => {
  const originalBudgetMode = process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE;
  const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = originalBudgetMode;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  it('returns the fallback image for Supabase Storage URLs when placeholder mode is enabled', () => {
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = 'placeholder';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://bjlmndmafrajjysenpbm.supabase.co';

    const { getFoodImageUrl } = require('../src/utils/imageHelpers');

    expect(getFoodImageUrl('rice.png')).toContain('placehold.co');
    expect(
      getFoodImageUrl(
        'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/thumbnails/rice.png',
      ),
    ).toContain('placehold.co');
  });

  it('builds v2 food image paths for optimized variants', () => {
    process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE = '';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://bjlmndmafrajjysenpbm.supabase.co';

    const { getFoodImageUrl } = require('../src/utils/imageHelpers');

    expect(getFoodImageUrl('v2/thumb/rice.webp', 'thumb')).toBe(
      'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/v2/thumb/rice.webp',
    );
    expect(getFoodImageUrl('rice.png', 'medium')).toBe(
      'https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/original/rice.png',
    );
  });
});
