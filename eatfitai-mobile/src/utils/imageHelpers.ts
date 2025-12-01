// Helper to get food image URLs with fallback
// Supports local URLs and full Supabase URLs

const FALLBACK_FOOD_IMAGE = 'https://placehold.co/200x200/16A34A/FFFFFF/png?text=Food';

export const getFoodImageUrl = (
    thumbnail: string | null | undefined,
    size: 'thumb' | 'medium' = 'thumb'
): string => {
    if (!thumbnail) return FALLBACK_FOOD_IMAGE;

    // If already a full URL, return it
    if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
        return thumbnail;
    }

    // TODO: When Supabase is configured, construct the URL
    // const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
    // return `${SUPABASE_URL}/storage/v1/object/public/food-images/${size}/${thumbnail}`;

    // For now, return fallback
    return FALLBACK_FOOD_IMAGE;
};
