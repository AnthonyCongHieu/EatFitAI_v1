import { getCurrentApiUrl } from '../services/apiClient';
import { API_BASE_URL } from '../config/env';

// Helper to get food image URLs with fallback.
// Public food media must resolve through the configured media CDN/R2 base.

const FALLBACK_FOOD_IMAGE = 'https://placehold.co/200x200/16A34A/FFFFFF/png?text=Food';
const DEFAULT_DEV_MEDIA_PUBLIC_BASE_URL = 'https://pub-9081bce8ff6b4db5b4403ca7adae7b80.r2.dev';
const MEDIA_PUBLIC_BASE_URL =
  process.env.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ||
  (__DEV__ ? DEFAULT_DEV_MEDIA_PUBLIC_BASE_URL : '');
const MEDIA_BUDGET_MODE = process.env.EXPO_PUBLIC_MEDIA_BUDGET_MODE?.trim().toLowerCase();
const SUPABASE_PUBLIC_STORAGE_MARKER = '/storage/v1/object/public/';
const MEDIA_BUCKET_PREFIXES = ['food-images/', 'user-food/', 'recipe-images/'];

const isBudgetPlaceholderMode = (): boolean => MEDIA_BUDGET_MODE === 'placeholder';

const toKnownMediaObjectKey = (value: string): string | null => {
  const trimmed = value.trim().replace(/^\/+/, '');
  return MEDIA_BUCKET_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ? trimmed : null;
};

const toSupabaseStorageObjectKey = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (!parsed.host.endsWith('.supabase.co')) {
      return null;
    }

    const markerIndex = parsed.pathname.indexOf(SUPABASE_PUBLIC_STORAGE_MARKER);
    if (markerIndex < 0) {
      return null;
    }

    const objectKey = decodeURIComponent(
      parsed.pathname.slice(markerIndex + SUPABASE_PUBLIC_STORAGE_MARKER.length).replace(/^\/+/, ''),
    );

    return toKnownMediaObjectKey(objectKey);
  } catch {
    return null;
  }
};

const buildMediaUrl = (objectKey: string): string => {
  const encodedObjectKey = objectKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${MEDIA_PUBLIC_BASE_URL}/${encodedObjectKey}`;
};

export const getFoodImageUrl = (
  thumbnail: string | null | undefined,
  size: 'thumb' | 'medium' = 'thumb',
): string => {
  if (!thumbnail) return FALLBACK_FOOD_IMAGE;

  if (isBudgetPlaceholderMode()) {
    return FALLBACK_FOOD_IMAGE;
  }

  // If already a full URL, keep non-Supabase URLs and rewrite legacy storage
  // object URLs through the configured media base.
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    try {
      const objectKey = toSupabaseStorageObjectKey(thumbnail);
      if (objectKey) {
        return MEDIA_PUBLIC_BASE_URL ? buildMediaUrl(objectKey) : FALLBACK_FOOD_IMAGE;
      }

      return thumbnail;
    } catch {
      return FALLBACK_FOOD_IMAGE;
    }
  }

  if (!MEDIA_PUBLIC_BASE_URL) {
    return FALLBACK_FOOD_IMAGE;
  }

  const knownObjectKey = toKnownMediaObjectKey(thumbnail);
  if (knownObjectKey) {
    return buildMediaUrl(knownObjectKey);
  }

  if (thumbnail.startsWith('v2/')) {
    return buildMediaUrl(`food-images/${thumbnail}`);
  }

  const folder = size === 'thumb' ? 'thumbnails' : 'original';
  return buildMediaUrl(`food-images/${folder}/${thumbnail.replace(/^\/+/, '')}`);
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

export const resolveServerUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  const baseUrl = (getCurrentApiUrl() || API_BASE_URL || '').replace(/\/+$/, '');
  const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${relativePath}`;
};

/**
 * Smart resolver for diary entry photo URLs.
 *
 * `entry.photoUrl` can be:
 *  - A full URL (http/https)        → pass through
 *  - A CDN media key (food-images/, user-food/, recipe-images/, v2/) → resolve via R2 CDN
 *  - A server-relative path (/uploads/...) → prepend API base URL
 *  - A bare filename               → resolve via CDN as food thumbnail
 */
export const resolveEntryPhotoUrl = (
  url: string | null | undefined,
): string | null => {
  if (!url) return null;
  const trimmed = url.trim();

  // Already an absolute URL — pass through
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }

  // Check if it's a known CDN media key (food-images/..., user-food/..., recipe-images/..., v2/...)
  const stripped = trimmed.replace(/^\/+/, '');
  if (
    MEDIA_BUCKET_PREFIXES.some((prefix) => stripped.startsWith(prefix)) ||
    stripped.startsWith('v2/')
  ) {
    return getFoodImageUrl(stripped);
  }

  // Server-relative path (e.g. /uploads/food-photos/abc.jpg)
  if (trimmed.startsWith('/')) {
    return resolveServerUrl(trimmed);
  }

  // Bare filename or unknown pattern — try CDN as food thumbnail
  return getFoodImageUrl(trimmed);
};

