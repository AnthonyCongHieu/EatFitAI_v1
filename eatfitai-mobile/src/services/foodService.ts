// Service xu ly tim kiem thuc pham va thao tac them vao nhat ky
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export type FoodItem = {
  id: string;
  name: string;
  brand?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

export type FoodDetail = FoodItem & {
  description?: string | null;
  servingSizeGram?: number | null;
  servingUnit?: string | null;
  perServingCalories?: number | null;
  perServingProtein?: number | null;
  perServingCarbs?: number | null;
  perServingFat?: number | null;
};

export type SearchFoodsResult = {
  items: FoodItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  totalCount?: number;
  offset?: number;
  limit?: number;
};

const normalizeFoodItem = (data: any): FoodItem => ({
  id: String(data?.id ?? data?.foodId ?? ''),
  name: data?.name ?? data?.foodName ?? 'Mon an',
  brand: data?.brand ?? data?.brandName ?? null,
  calories: toNumber(data?.caloriesKcal ?? data?.calories ?? data?.energy),
  protein: toNumber(data?.proteinGrams ?? data?.protein),
  carbs: toNumber(data?.carbohydrateGrams ?? data?.carbs ?? data?.carbohydrate),
  fat: toNumber(data?.fatGrams ?? data?.fat),
});

const normalizeFoodDetail = (data: any): FoodDetail => ({
  ...normalizeFoodItem(data),
  description: data?.description ?? null,
  servingSizeGram: toNumber(data?.servingSizeGrams ?? data?.servingSizeGram ?? data?.servingSize ?? data?.defaultGrams),
  servingUnit: data?.servingUnit ?? data?.unit ?? 'gram',
  perServingCalories: toNumber(data?.caloriesKcal ?? data?.perServingCalories ?? data?.caloriesPerServing ?? data?.calories),
  perServingProtein: toNumber(data?.proteinGrams ?? data?.perServingProtein ?? data?.proteinPerServing ?? data?.protein),
  perServingCarbs: toNumber(data?.carbohydrateGrams ?? data?.perServingCarbs ?? data?.carbsPerServing ?? data?.carbs),
  perServingFat: toNumber(data?.fatGrams ?? data?.perServingFat ?? data?.fatPerServing ?? data?.fat),
});

export const foodService = {
  // Tim kiem thuc pham theo tu khoa va phan trang
  async searchFoods(query: string, page: number, pageSize = 20): Promise<SearchFoodsResult> {
    const requestOffset = Math.max(0, (page - 1) * pageSize);
    const response = await apiClient.get('/api/foods/search', {
      params: {
        query,
        offset: requestOffset,
        limit: pageSize,
      },
    });

    const data = response.data;
    const rawItems = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
      ? (data as any).results
      : [];

    const normalizedItems = rawItems.map(normalizeFoodItem);

    const total = Number((data as any)?.totalCount ?? (data as any)?.total ?? normalizedItems.length);
    const responseOffset = Number((data as any)?.offset ?? requestOffset);
    const responseLimit = Number((data as any)?.limit ?? pageSize);
    const hasMore = total > (responseOffset + normalizedItems.length);

    return {
      items: normalizedItems,
      page: Math.floor(responseOffset / responseLimit) + 1,
      pageSize: responseLimit,
      total,
      hasMore,
      totalCount: total,
      offset: responseOffset,
      limit: responseLimit,
    };
  },

  // Lay chi tiet mot thuc pham
  async getFoodDetail(foodId: string): Promise<FoodDetail> {
    const response = await apiClient.get(`/api/foods/${foodId}`);
    return normalizeFoodDetail(response.data ?? {});
  },

  // Them mot entry vao nhat ky tu mot thuc pham co san
  async addDiaryEntry(payload: {
    foodId: string;
    grams: number;
    mealType: string; // breakfast/lunch/dinner/snack
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const mealDate = `${y}-${m}-${day}`;

    await apiClient.post('/api/diary', {
      mealDate,
      mealCode: payload.mealType,
      source: 'food',
      itemId: payload.foodId,
      quantityGrams: payload.grams,
      notes: payload.note ?? null,
    });
  },

  // Tao mon an thu cong
  async createCustomDish(payload: {
    // Placeholder: existing UI likely uses a different flow; keeping method for compatibility
    name: string;
    description?: string | null;
    servingSizeGram: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }): Promise<void> {
    await apiClient.post('/api/custom-dishes', {
      name: payload.name,
      description: payload.description ?? null,
      ingredients: [
        {
          foodId: null,
          name: 'Custom',
          quantityGrams: payload.servingSizeGram,
          caloriesKcal: payload.calories,
          proteinGrams: payload.protein,
          carbohydrateGrams: payload.carbs,
          fatGrams: payload.fat,
        },
      ],
    });
  },
};
