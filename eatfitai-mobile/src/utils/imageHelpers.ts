// Helper to get food image URLs with fallback
// Supports local URLs and full Supabase URLs

const FALLBACK_FOOD_IMAGE = 'https://placehold.co/200x200/16A34A/FFFFFF/png?text=Food';
const DEFAULT_DEV_SUPABASE_URL = 'https://bjlmndmafrajjysenpbm.supabase.co';
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  (__DEV__ ? DEFAULT_DEV_SUPABASE_URL : '');
const MEDIA_BUDGET_MODE = process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE?.trim().toLowerCase();
const LEGACY_SUPABASE_HOSTS = new Set(['ddgwaufaifqohcxbwfcm.supabase.co']);

const isSupabaseStorageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
};

const isBudgetPlaceholderMode = (): boolean => MEDIA_BUDGET_MODE === 'placeholder';

export const getFoodImageUrl = (
  thumbnail: string | null | undefined,
  size: 'thumb' | 'medium' = 'thumb',
): string => {
  if (!thumbnail) return FALLBACK_FOOD_IMAGE;

  // If already a full URL, reject legacy dead hosts and keep valid ones.
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    try {
      const parsed = new URL(thumbnail);
      if (
        LEGACY_SUPABASE_HOSTS.has(parsed.host) ||
        (isBudgetPlaceholderMode() && isSupabaseStorageUrl(thumbnail))
      ) {
        return FALLBACK_FOOD_IMAGE;
      }

      return thumbnail;
    } catch {
      return FALLBACK_FOOD_IMAGE;
    }
  }

  if (!SUPABASE_URL) {
    return FALLBACK_FOOD_IMAGE;
  }

  if (isBudgetPlaceholderMode()) {
    return FALLBACK_FOOD_IMAGE;
  }

  if (thumbnail.startsWith('v2/')) {
    return `${SUPABASE_URL}/storage/v1/object/public/food-images/${thumbnail}`;
  }

  // Construct Supabase URL
  const folder = size === 'thumb' ? 'thumbnails' : 'original';
  return `${SUPABASE_URL}/storage/v1/object/public/food-images/${folder}/${thumbnail}`;
};

export const sanitizeFoodImageUrl = (
  thumbnail: string | null | undefined,
  size: 'thumb' | 'medium' = 'thumb',
): string | null => {
  if (!thumbnail) {
    return null;
  }

  return getFoodImageUrl(thumbnail, size);
};
