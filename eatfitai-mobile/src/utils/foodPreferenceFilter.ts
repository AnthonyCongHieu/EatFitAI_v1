import type { UserPreference } from '../app/types';
import type { FoodItem } from '../services/foodService';

type FoodFilterRule = {
  id: string;
  label: string;
  excludes: (food: FoodItem, haystack: string) => boolean;
};

const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value: string | null | undefined): string =>
  stripDiacritics(String(value ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const containsKeyword = (haystack: string, keywords: readonly string[]): boolean => {
  const paddedHaystack = ` ${haystack} `;
  return keywords.some((keyword) =>
    paddedHaystack.includes(` ${normalizeText(keyword)} `),
  );
};

const keywordRule = (
  id: string,
  label: string,
  keywords: readonly string[],
): FoodFilterRule => ({
  id,
  label,
  excludes: (_food, haystack) => containsKeyword(haystack, keywords),
});

const getFoodHaystack = (food: FoodItem): string =>
  normalizeText([food.name, food.nameEn, food.brand].filter(Boolean).join(' '));

const HIGH_CARB_KEYWORDS = [
  'com',
  'rice',
  'bun',
  'pho',
  'mi',
  'noodle',
  'pasta',
  'banh mi',
  'bread',
  'khoai',
  'potato',
  'cake',
  'cookie',
  'che',
  'tra sua',
];

const PROTEIN_RICH_KEYWORDS = [
  'ga',
  'chicken',
  'bo',
  'beef',
  'ca',
  'fish',
  'salmon',
  'tom',
  'shrimp',
  'trung',
  'egg',
  'tofu',
  'dau hu',
  'protein',
  'whey',
  'yogurt greek',
  'sua chua hy lap',
];

const DIETARY_RULES: Record<string, FoodFilterRule> = {
  vegetarian: keywordRule('vegetarian', '\u0102n chay', [
    'thit',
    'ga',
    'thit bo',
    'bo kho',
    'bo luc lac',
    'pho bo',
    'heo',
    'lon',
    'ca hoi',
    'ca ngu',
    'ca loc',
    'ca basa',
    'tom',
    'cua',
    'muc',
    'salmon',
    'chicken',
    'beef',
    'pork',
    'fish',
    'shrimp',
    'seafood',
  ]),
  vegan: keywordRule('vegan', 'Thu\u1ea7n chay', [
    'thit',
    'ga',
    'thit bo',
    'bo kho',
    'bo luc lac',
    'pho bo',
    'heo',
    'lon',
    'ca hoi',
    'ca ngu',
    'ca loc',
    'ca basa',
    'tom',
    'cua',
    'muc',
    'trung',
    'egg',
    'sua',
    'yogurt',
    'pho mai',
    'cheese',
    'milk',
    'butter',
    'honey',
    'salmon',
    'chicken',
    'beef',
    'pork',
    'fish',
    'shrimp',
    'seafood',
  ]),
  halal: keywordRule('halal', 'Halal', ['heo', 'lon', 'pork', 'ham', 'bacon']),
  'no-pork': keywordRule('no-pork', 'Kh\u00f4ng \u0103n heo', [
    'heo',
    'lon',
    'pork',
    'ham',
    'bacon',
  ]),
  'no-beef': keywordRule('no-beef', 'Kh\u00f4ng \u0103n b\u00f2', [
    'thit bo',
    'bo kho',
    'bo luc lac',
    'pho bo',
    'beef',
    'steak',
  ]),
  'low-carb': {
    id: 'low-carb',
    label: '\u00cdt tinh b\u1ed9t',
    excludes: (food, haystack) => {
      if (typeof food.carbs === 'number') {
        return food.carbs > 20;
      }
      return containsKeyword(haystack, HIGH_CARB_KEYWORDS);
    },
  },
  'high-protein': {
    id: 'high-protein',
    label: 'Gi\u00e0u protein',
    excludes: (food, haystack) => {
      if (typeof food.protein === 'number') {
        return food.protein < 10 && !containsKeyword(haystack, PROTEIN_RICH_KEYWORDS);
      }
      return !containsKeyword(haystack, PROTEIN_RICH_KEYWORDS);
    },
  },
};

const ALLERGY_RULES: Record<string, FoodFilterRule> = {
  seafood: keywordRule('seafood', 'D\u1ecb \u1ee9ng h\u1ea3i s\u1ea3n', [
    'hai san',
    'seafood',
    'tom',
    'shrimp',
    'cua',
    'crab',
    'muc',
    'squid',
  ]),
  peanut: keywordRule('peanut', 'D\u1ecb \u1ee9ng \u0111\u1eadu ph\u1ed9ng', [
    'dau phong',
    'peanut',
  ]),
  dairy: keywordRule('dairy', 'D\u1ecb \u1ee9ng s\u1eefa', [
    'sua',
    'milk',
    'cheese',
    'pho mai',
    'yogurt',
    'butter',
  ]),
  egg: keywordRule('egg', 'D\u1ecb \u1ee9ng tr\u1ee9ng', ['trung', 'egg']),
  wheat: keywordRule('wheat', 'D\u1ecb \u1ee9ng gluten', [
    'gluten',
    'lua mi',
    'wheat',
    'bread',
    'banh mi',
    'pasta',
    'noodle',
  ]),
  soy: keywordRule('soy', 'D\u1ecb \u1ee9ng \u0111\u1eadu n\u00e0nh', [
    'dau nanh',
    'soy',
    'tofu',
  ]),
};

const collectRules = (
  preferences: UserPreference | null | undefined,
): FoodFilterRule[] => {
  if (!preferences) {
    return [];
  }

  const seen = new Set<string>();
  const rules: FoodFilterRule[] = [];
  const addRule = (rule: FoodFilterRule | undefined) => {
    if (!rule || seen.has(rule.id)) {
      return;
    }

    seen.add(rule.id);
    rules.push(rule);
  };

  (preferences.dietaryRestrictions ?? []).forEach((restriction) =>
    addRule(DIETARY_RULES[restriction]),
  );
  (preferences.allergies ?? []).forEach((allergy) => addRule(ALLERGY_RULES[allergy]));

  return rules;
};

const matchesRule = (food: FoodItem, rule: FoodFilterRule): boolean => {
  const haystack = getFoodHaystack(food);
  if (!haystack) {
    return false;
  }

  return rule.excludes(food, haystack);
};

export const getActiveFoodFilterLabels = (
  preferences: UserPreference | null | undefined,
): string[] => collectRules(preferences).map((rule) => rule.label);

export const filterFoodsByPreferences = (
  items: FoodItem[],
  preferences: UserPreference | null | undefined,
): {
  items: FoodItem[];
  excludedCount: number;
  appliedLabels: string[];
} => {
  const rules = collectRules(preferences);
  if (rules.length === 0) {
    return { items, excludedCount: 0, appliedLabels: [] };
  }

  const filteredItems = items.filter(
    (food) => !rules.some((rule) => matchesRule(food, rule)),
  );

  return {
    items: filteredItems,
    excludedCount: Math.max(0, items.length - filteredItems.length),
    appliedLabels: rules.map((rule) => rule.label),
  };
};
