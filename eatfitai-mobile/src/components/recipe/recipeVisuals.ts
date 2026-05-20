import type {
  RecipeDetail,
  RecipeIngredientDetail,
  RecipeSuggestion,
} from '../../types/aiEnhanced';
import { sanitizeFoodImageUrl } from '../../utils/imageHelpers';

export type RecipeVisualCategory =
  | 'noodle_soup'
  | 'rice_plate'
  | 'chicken'
  | 'fish'
  | 'egg'
  | 'salad'
  | 'soup'
  | 'stir_fry'
  | 'braised'
  | 'steamed'
  | 'drink'
  | 'snack'
  | 'generic';

export type RecipeVisualStatus = 'remote' | 'category_fallback' | 'none' | 'failed';

export type RecipeVisualInput = Partial<
  Pick<
    RecipeSuggestion,
    | 'recipeName'
    | 'imageUrl'
    | 'imageVariants'
    | 'matchedIngredients'
    | 'missingIngredients'
    | 'requiredIngredients'
    | 'allIngredients'
  >
> & {
  ingredients?: RecipeIngredientDetail[];
};

export type RecipeVisualState = {
  status: RecipeVisualStatus;
  category: RecipeVisualCategory;
  url?: string;
  urls?: string[];
};

export type IngredientAvailabilityStatus = 'available' | 'missing' | 'required' | 'extra';

export type RecipeIngredientDisplayRow = {
  key: string;
  name: string;
  grams?: number;
  status: IngredientAvailabilityStatus;
};

type ResolveRecipeVisualOptions = {
  size?: 'thumb' | 'medium';
  allowGenericFallback?: boolean;
};

type RecipeVisualUrlCandidate = {
  rawUrl?: string | null;
  size: 'thumb' | 'medium';
};

type RecipeIngredientRowsInput = {
  recipeName?: string;
  ingredients?: RecipeIngredientDetail[];
  availableIngredients?: string[];
  missingIngredients?: string[];
  extraIngredients?: string[];
  requiredIngredients?: string[];
};

type MatchBadgeInput = Pick<
  Partial<RecipeSuggestion>,
  'canCookNow' | 'missingIngredientCount' | 'missingIngredients' | 'matchPercentage' | 'matchScore'
>;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();

const compactText = (value: string | null | undefined): string =>
  normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();

const keyFromText = (value: string): string =>
  normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesAny = (haystack: string, needles: string[]): boolean =>
  needles.some((needle) => new RegExp(`(^| )${escapeRegExp(needle.trim())}( |$)`).test(haystack));

const uniqueUrls = (candidates: RecipeVisualUrlCandidate[]): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();

  candidates.forEach((candidate) => {
    const url = sanitizeFoodImageUrl(candidate.rawUrl, candidate.size);
    if (!url || seen.has(url)) return;

    seen.add(url);
    urls.push(url);
  });

  return urls;
};

const dedupeResolvedUrls = (urls: string[]): string[] => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const resolveRecipeVisualUrls = (
  input: RecipeVisualInput,
  preferredSize: 'thumb' | 'medium',
): string[] => {
  const mediumUrl = input.imageVariants?.mediumUrl;
  const thumbUrl = input.imageVariants?.thumbUrl;

  const candidates: RecipeVisualUrlCandidate[] =
    preferredSize === 'medium'
      ? [
          { rawUrl: mediumUrl, size: 'medium' },
          { rawUrl: thumbUrl, size: 'thumb' },
          { rawUrl: input.imageUrl, size: 'thumb' },
        ]
      : [
          { rawUrl: thumbUrl, size: 'thumb' },
          { rawUrl: input.imageUrl, size: 'thumb' },
          { rawUrl: mediumUrl, size: 'medium' },
        ];

  return uniqueUrls(candidates);
};

const categoryAssetCandidates = (
  label: string,
  preferredSize: 'thumb' | 'medium',
): RecipeVisualUrlCandidate[] =>
  preferredSize === 'medium'
    ? [
        { rawUrl: `food-images/v2/medium/${label}.webp`, size: 'medium' },
        { rawUrl: `food-images/v2/thumb/${label}.webp`, size: 'thumb' },
      ]
    : [
        { rawUrl: `food-images/v2/thumb/${label}.webp`, size: 'thumb' },
        { rawUrl: `food-images/v2/medium/${label}.webp`, size: 'medium' },
      ];

const categoryAssetLabels = (
  input: RecipeVisualInput,
  category: RecipeVisualCategory,
): string[] => {
  const text = visualText(input);

  if (category === 'noodle_soup') {
    if (includesAny(text, ['bun bo hue'])) return ['bun_bo_hue', 'pho', 'noodles'];
    if (includesAny(text, ['hu tieu'])) return ['hu_tieu', 'pho', 'noodles'];
    if (includesAny(text, ['mi quang'])) return ['mi_quang', 'pho', 'noodles'];
    if (includesAny(text, ['cao lau'])) return ['cao_lau', 'pho', 'noodles'];
    if (includesAny(text, ['bun'])) return ['bun', 'pho', 'noodles'];
    return ['pho', 'noodles'];
  }

  if (category === 'rice_plate') {
    if (includesAny(text, ['com chien'])) return ['fried_rice', 'rice'];
    if (includesAny(text, ['com ga'])) return ['chicken_rice', 'rice'];
    return ['rice'];
  }

  if (category === 'chicken') return ['chicken_rice', 'chicken'];
  if (category === 'fish') return ['fish'];
  if (category === 'egg') return ['fried_egg', 'egg'];
  if (category === 'soup') return ['canh'];
  if (category === 'stir_fry') return ['fried_rice'];
  if (category === 'braised') {
    if (includesAny(text, ['ca kho'])) return ['ca_kho', 'fish'];
    return ['thit_kho', 'chicken'];
  }
  if (category === 'steamed') return ['fish', 'chicken'];
  if (category === 'salad') return ['goi_cuon'];
  if (category === 'snack') return ['banh_mi', 'xoi'];

  return [];
};

const resolveCategoryFallbackUrls = (
  input: RecipeVisualInput,
  category: RecipeVisualCategory,
  preferredSize: 'thumb' | 'medium',
): string[] =>
  uniqueUrls(
    categoryAssetLabels(input, category).flatMap((label) =>
      categoryAssetCandidates(label, preferredSize),
    ),
  );

const visualText = (input: RecipeVisualInput): string => {
  const ingredientNames = [
    ...(input.ingredients ?? []).map((item) => item.foodName),
    ...(input.requiredIngredients ?? []),
    ...(input.allIngredients ?? []),
    ...(input.matchedIngredients ?? []),
    ...(input.missingIngredients ?? []),
  ];

  return compactText([input.recipeName, ...ingredientNames].filter(Boolean).join(' '));
};

export const inferRecipeVisualCategory = (
  input: RecipeVisualInput,
): RecipeVisualCategory => {
  const text = visualText(input);

  if (includesAny(text, ['sinh to', 'nuoc ep', 'do uong', 'drink', 'smoothie'])) {
    return 'drink';
  }

  if (includesAny(text, ['xao', 'ap chao', 'luc lac'])) {
    return 'stir_fry';
  }

  if (includesAny(text, ['kho', 'rim', 'om'])) {
    return 'braised';
  }

  if (includesAny(text, ['hap', 'luoc'])) {
    return 'steamed';
  }

  if (includesAny(text, ['pho', 'bun', 'hu tieu', 'mi quang', 'mien', 'cao lau'])) {
    return 'noodle_soup';
  }

  if (includesAny(text, ['com', 'rice'])) {
    return 'rice_plate';
  }

  if (includesAny(text, ['salad', 'goi', 'rau song'])) {
    return 'salad';
  }

  if (includesAny(text, ['canh', 'sup', 'soup', 'chao', 'lau'])) {
    return 'soup';
  }

  if (includesAny(text, ['ca', 'fish'])) {
    return 'fish';
  }

  if (includesAny(text, ['trung', 'egg'])) {
    return 'egg';
  }

  if (includesAny(text, ['ga', 'chicken'])) {
    return 'chicken';
  }

  if (includesAny(text, ['banh', 'xoi', 'snack', 'an nhe'])) {
    return 'snack';
  }

  return 'generic';
};

export const resolveRecipeVisual = (
  input: RecipeVisualInput,
  options: ResolveRecipeVisualOptions = {},
): RecipeVisualState => {
  const size = options.size ?? 'medium';
  const allowGenericFallback = options.allowGenericFallback ?? true;
  const category = inferRecipeVisualCategory(input);
  const recipeUrls = resolveRecipeVisualUrls(input, size);
  const fallbackUrls = category !== 'generic' || allowGenericFallback
    ? resolveCategoryFallbackUrls(input, category, size)
    : [];
  const urls = dedupeResolvedUrls([...recipeUrls, ...fallbackUrls]);
  const url = recipeUrls[0];

  if (url) {
    return { status: 'remote', category, url, urls };
  }

  if (category !== 'generic' || allowGenericFallback) {
    return { status: 'category_fallback', category, url: fallbackUrls[0], urls: fallbackUrls };
  }

  return { status: 'none', category };
};

export const toRecipeSpecificIngredientName = (
  recipeName: string | null | undefined,
  ingredientName: string,
): string => {
  const recipeKey = compactText(recipeName);
  const ingredientKey = compactText(ingredientName);

  if (ingredientKey === 'mi bun pho' || ingredientKey === 'noodles') {
    if (recipeKey.includes('pho')) return 'Bánh phở';
    if (recipeKey.includes('hu tieu')) return 'Hủ tiếu';
    if (recipeKey.includes('mi quang')) return 'Mì Quảng';
    if (recipeKey.includes('mien')) return 'Miến';
    if (recipeKey.includes('cao lau')) return 'Sợi cao lầu';
    if (recipeKey.includes('bun')) return 'Bún';
    if (recipeKey.includes('mi')) return 'Mì';
  }

  return ingredientName;
};

const buildStatusSet = (
  recipeName: string | null | undefined,
  values: string[] | undefined,
): Set<string> => {
  const keys = new Set<string>();
  (values ?? []).forEach((value) => {
    keys.add(compactText(value));
    keys.add(compactText(toRecipeSpecificIngredientName(recipeName, value)));
  });
  return keys;
};

const resolveIngredientStatus = (
  recipeName: string | null | undefined,
  rawName: string,
  availableKeys: Set<string>,
  missingKeys: Set<string>,
): IngredientAvailabilityStatus => {
  const displayName = toRecipeSpecificIngredientName(recipeName, rawName);
  const candidates = [compactText(rawName), compactText(displayName)];

  if (candidates.some((key) => availableKeys.has(key))) return 'available';
  if (candidates.some((key) => missingKeys.has(key))) return 'missing';
  return 'required';
};

export const buildRecipeIngredientRows = ({
  recipeName,
  ingredients,
  availableIngredients,
  missingIngredients,
  extraIngredients,
  requiredIngredients,
}: RecipeIngredientRowsInput): RecipeIngredientDisplayRow[] => {
  const availableKeys = buildStatusSet(recipeName, availableIngredients);
  const missingKeys = buildStatusSet(recipeName, missingIngredients);
  const rows: RecipeIngredientDisplayRow[] = [];
  const seen = new Set<string>();

  (ingredients ?? []).forEach((ingredient) => {
    const name = toRecipeSpecificIngredientName(recipeName, ingredient.foodName);
    const key = `ingredient-${ingredient.foodItemId || keyFromText(name)}`;
    seen.add(compactText(name));
    rows.push({
      key,
      name,
      grams: ingredient.grams,
      status: resolveIngredientStatus(recipeName, ingredient.foodName, availableKeys, missingKeys),
    });
  });

  if (rows.length === 0) {
    (requiredIngredients ?? []).forEach((rawName) => {
      const name = toRecipeSpecificIngredientName(recipeName, rawName);
      const nameKey = compactText(name);
      if (seen.has(nameKey)) return;
      seen.add(nameKey);
      rows.push({
        key: `required-${keyFromText(name)}`,
        name,
        status: resolveIngredientStatus(recipeName, rawName, availableKeys, missingKeys),
      });
    });
  }

  (extraIngredients ?? []).forEach((rawName) => {
    const name = toRecipeSpecificIngredientName(recipeName, rawName);
    const nameKey = compactText(name);
    if (seen.has(nameKey)) return;
    seen.add(nameKey);
    rows.push({
      key: `extra-${keyFromText(name)}`,
      name,
      status: 'extra',
    });
  });

  return rows;
};

export const getRecipeMatchBadgeLabel = (recipe: MatchBadgeInput): string => {
  if (recipe.canCookNow) return 'Nấu ngay';

  const missingCount =
    recipe.missingIngredientCount ??
    (Array.isArray(recipe.missingIngredients) ? recipe.missingIngredients.length : undefined);
  if (missingCount && missingCount > 0) {
    return `Thiếu ${missingCount} món`;
  }

  const score = recipe.matchPercentage ?? recipe.matchScore;
  if (typeof score === 'number' && Number.isFinite(score) && score > 0) {
    return `Phù hợp ${Math.round(score)}%`;
  }

  return 'Gợi ý phù hợp';
};

export const getRecipeIngredientSummary = (
  recipe: Pick<
    Partial<RecipeSuggestion>,
    'availableIngredients' | 'matchedIngredients' | 'missingIngredients' | 'missingIngredientCount'
  >,
): { available?: string; missing?: string } => {
  const available = recipe.availableIngredients?.length
    ? recipe.availableIngredients
    : recipe.matchedIngredients ?? [];
  const missing = recipe.missingIngredients ?? [];

  return {
    available: available.length > 0 ? `Có sẵn: ${available.slice(0, 2).join(', ')}` : undefined,
    missing: missing.length > 0
      ? `Thiếu ${recipe.missingIngredientCount ?? missing.length} nguyên liệu: ${missing[0]}`
      : undefined,
  };
};

const SOURCE_LABELS: [string, string][] = [
  ['dienmayxanh.com', 'Điện Máy Xanh'],
  ['monngonmoingay.com', 'Món Ngon Mỗi Ngày'],
  ['cookpad.com', 'Cookpad'],
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
];

export const formatRecipeSourceLabel = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const mapped = SOURCE_LABELS.find(([domain]) => host === domain || host.endsWith(`.${domain}`));
    if (mapped) return mapped[1];

    return host
      .split('.')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Nguồn tham khảo';
  }
};

export const hasDetailHeroVisual = (recipe: RecipeDetail): boolean =>
  resolveRecipeVisual(recipe, { allowGenericFallback: false }).status !== 'none';
