export type PortionPreset = {
  label: string;
  grams: number;
};

const SYNONYMS: Record<string, string[]> = {
  ga: ['gà', 'chicken', 'ức gà', 'thịt gà'],
  bo: ['bò', 'beef', 'thịt bò'],
  heo: ['lợn', 'pork', 'thịt heo', 'thịt lợn'],
  com: ['cơm', 'rice', 'gạo'],
  pho: ['phở'],
  bun: ['bún'],
  sua: ['sữa', 'milk', 'yogurt', 'yaourt'],
};

export const normalizeVietnameseFoodText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const expandVietnameseFoodQuery = (query: string): string[] => {
  const normalized = normalizeVietnameseFoodText(query);
  const terms = new Set<string>([normalized]);

  Object.entries(SYNONYMS).forEach(([key, values]) => {
    if (normalized.includes(key)) {
      values.forEach((value) => terms.add(normalizeVietnameseFoodText(value)));
    }

    values.forEach((value) => {
      if (normalized.includes(normalizeVietnameseFoodText(value))) {
        terms.add(key);
        values.forEach((candidate) => terms.add(normalizeVietnameseFoodText(candidate)));
      }
    });
  });

  return Array.from(terms).filter(Boolean);
};

export const rankVietnameseFoodName = (query: string, foodName: string): number => {
  const normalizedName = normalizeVietnameseFoodText(foodName);
  const expandedTerms = expandVietnameseFoodQuery(query);
  if (!normalizedName || expandedTerms.length === 0) {
    return 0;
  }

  return expandedTerms.reduce((score, term) => {
    if (normalizedName === term) return Math.max(score, 100);
    if (normalizedName.startsWith(term)) return Math.max(score, 80);
    if (normalizedName.includes(term)) return Math.max(score, 60);
    return score;
  }, 0);
};

export const getVietnamesePortionPresets = (foodName: string): PortionPreset[] => {
  const name = normalizeVietnameseFoodText(foodName);

  if (name.includes('com') || name.includes('pho') || name.includes('bun')) {
    return [
      { label: 'Ít', grams: 150 },
      { label: 'Vừa', grams: 250 },
      { label: 'Nhiều', grams: 350 },
    ];
  }

  if (name.includes('ga') || name.includes('bo') || name.includes('heo') || name.includes('ca')) {
    return [
      { label: 'Ít', grams: 80 },
      { label: 'Vừa', grams: 120 },
      { label: 'Nhiều', grams: 180 },
    ];
  }

  return [
    { label: 'Ít', grams: 50 },
    { label: 'Vừa', grams: 100 },
    { label: 'Nhiều', grams: 150 },
  ];
};
