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
};

const normalizeFoodItem = (data: any): FoodItem => ({
  id: String(data?.id ?? data?.foodId ?? ''),
  name: data?.name ?? data?.foodName ?? 'Mon an',
  brand: data?.brand ?? data?.brandName ?? null,
  calories: toNumber(data?.calories ?? data?.energy),
  protein: toNumber(data?.protein),
  carbs: toNumber(data?.carbs ?? data?.carbohydrate),
  fat: toNumber(data?.fat),
});

const normalizeFoodDetail = (data: any): FoodDetail => ({
  ...normalizeFoodItem(data),
  description: data?.description ?? null,
  servingSizeGram: toNumber(data?.servingSizeGram ?? data?.servingSize ?? data?.defaultGrams),
  servingUnit: data?.servingUnit ?? data?.unit ?? 'gram',
  perServingCalories: toNumber(data?.perServingCalories ?? data?.caloriesPerServing ?? data?.calories),
  perServingProtein: toNumber(data?.perServingProtein ?? data?.proteinPerServing ?? data?.protein),
  perServingCarbs: toNumber(data?.perServingCarbs ?? data?.carbsPerServing ?? data?.carbs),
  perServingFat: toNumber(data?.perServingFat ?? data?.fatPerServing ?? data?.fat),
});

export const foodService = {
  // Tim kiem thuc pham theo tu khoa va phan trang
  async searchFoods(query: string, page: number, pageSize = 20): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/foods/search', {
      params: {
        q: query,
        page,
        pageSize,
      },
    });

    const data = response.data ?? {};
    const rawItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : [];

    const normalizedItems = rawItems.map(normalizeFoodItem);

    const total = Number(data?.total ?? data?.totalCount ?? normalizedItems.length);
    const computedTotalPages = Math.ceil(total / pageSize) || 1;
    const totalPages = Number(data?.totalPages ?? data?.pageCount ?? computedTotalPages);
    const hasMore = Boolean(data?.hasMore ?? (page < totalPages));

    return {
      items: normalizedItems,
      page: Number(data?.page ?? page),
      pageSize: Number(data?.pageSize ?? pageSize),
      total,
      hasMore,
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
    mealType: string;
    note?: string;
  }): Promise<void> {
    await apiClient.post('/api/diary', {
      foodId: payload.foodId,
      grams: payload.grams,
      mealType: payload.mealType,
      note: payload.note ?? null,
    });
  },

  // Tao mon an thu cong
  async createCustomDish(payload: {
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
      servingSizeGram: payload.servingSizeGram,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fat: payload.fat,
    });
  },
};
