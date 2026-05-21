import {
  aiService,
  buildRecipeSuggestionRequest,
  normalizeMappedFoodItem,
} from '../src/services/aiService';
import apiClient, {
  aiApiClient,
  fetchWithAuthRetry,
  getCurrentApiUrl,
} from '../src/services/apiClient';
import { assertBackendApiBaseUrl } from '../src/config/env';
import storageService from '../src/services/storageService';
import { getVisionFoodDisplayName, translateIngredient } from '../src/utils/translate';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  aiApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  fetchWithAuthRetry: jest.fn(),
  getCurrentApiUrl: jest.fn(() => 'http://mock-api.local'),
}));

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'http://mock-api.local',
  assertBackendApiBaseUrl: jest.fn((value: string) => value),
}));

jest.mock('../src/utils/imageHelpers', () => ({
  sanitizeFoodImageUrl: jest.fn((value: string | null) => value),
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/services/offlineCache', () => ({
  loadWithOfflineFallback: jest.fn(async (_key: string, loader: () => Promise<unknown>) =>
    loader(),
  ),
  offlineCache: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../src/services/errorTracking', () => ({
  captureError: jest.fn(),
  initErrorTracking: jest.fn(),
}));

jest.mock('../src/services/storageService', () => ({
  __esModule: true,
  default: {
    uploadMediaObject: jest.fn(),
  },
}));

describe('aiService', () => {
  const mockedApiClient = apiClient as unknown as {
    get: jest.Mock;
    post: jest.Mock;
  };
  const mockedAiApiClient = aiApiClient as unknown as {
    get: jest.Mock;
    post: jest.Mock;
  };
  const mockedFetchWithAuthRetry = fetchWithAuthRetry as jest.Mock;
  const mockedGetCurrentApiUrl = getCurrentApiUrl as jest.Mock;
  const mockedAssertBackendApiBaseUrl = assertBackendApiBaseUrl as jest.Mock;
  const mockedStorageService = storageService as unknown as {
    uploadMediaObject: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentApiUrl.mockReturnValue('http://mock-api.local');
    mockedAssertBackendApiBaseUrl.mockImplementation((value: string) => value);
    mockedStorageService.uploadMediaObject.mockResolvedValue({
      presignedUrl: 'https://r2-upload.local/put',
      publicUrl: 'https://media.local/vision/user/photo.jpg',
      objectKey: 'vision/user/photo.jpg',
      uploadId: 'upload-123',
      expiresInSeconds: 300,
    });
  });

  it('detectFoodByImage uses fetch and normalizes the payload', async () => {
    mockedFetchWithAuthRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            label: 'Rice',
            confidence: '0.9',
            detectedLabelVi: 'Cơm trắng',
            foodItemId: '12',
            foodName: 'Rice bowl',
            caloriesPer100g: '130',
            proteinPer100g: '4',
            fatPer100g: '1',
            carbPer100g: '28',
            missingNutrients: [],
            nutrientCompletenessScore: '100',
            trustSummary: {
              status: 'trusted',
              label: 'Đáng tin cậy',
              score: '88',
              needsReview: false,
              missingNutrients: [],
            },
            thumbNail: 'http://image.local/rice.jpg',
          },
        ],
        unmappedLabels: ['unknown'],
      }),
    });

    const result = await aiService.detectFoodByImage('file:///food.jpg');

    expect(mockedGetCurrentApiUrl).toHaveBeenCalled();
    expect(mockedAssertBackendApiBaseUrl).toHaveBeenCalledWith(
      'http://mock-api.local',
      'AI API base URL',
    );
    expect(mockedFetchWithAuthRetry).toHaveBeenCalledWith(
      'http://mock-api.local/api/ai/vision/detect',
      expect.any(Function),
    );
    const requestFactory = mockedFetchWithAuthRetry.mock.calls[0][1];
    const request = requestFactory();
    expect(JSON.parse(String(request.body))).toEqual({
      ObjectKey: 'vision/user/photo.jpg',
      ImageHash: 'upload-123',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      label: 'Rice',
      confidence: 0.9,
      detectedLabelVi: 'Cơm trắng',
      foodItemId: 12,
      foodName: 'Rice bowl',
      caloriesPer100g: 130,
      proteinPer100g: 4,
      fatPer100g: 1,
      carbPer100g: 28,
      missingNutrients: [],
      nutrientCompletenessScore: 100,
      trustSummary: expect.objectContaining({
        status: 'trusted',
        label: 'Đáng tin cậy',
        score: 88,
        needsReview: false,
      }),
      isMatched: true,
    });
    expect(result.unmappedLabels).toEqual(['unknown']);
  });

  it('normalizes PascalCase vision trust fields from cached or alternate backend payloads', () => {
    const item = normalizeMappedFoodItem({
      Label: 'com_tam',
      Confidence: '0.91',
      DetectedLabelVi: 'Cơm tấm',
      FoodItemId: '123',
      FoodName: 'Cơm tấm',
      CaloriesPer100g: '165',
      ProteinPer100g: '7',
      FatPer100g: '5',
      CarbPer100g: '22',
      MissingNutrients: [],
      NutrientCompletenessScore: '100',
      TrustSummary: {
        Status: 'trusted_reference',
        Label: 'Đã kiểm chứng',
        Score: '80',
        NeedsReview: false,
        MissingNutrients: [],
      },
    });

    expect(item).toMatchObject({
      label: 'com_tam',
      detectedLabelVi: 'Cơm tấm',
      foodName: 'Cơm tấm',
      caloriesPer100g: 165,
      trustSummary: expect.objectContaining({
        label: 'Đã kiểm chứng',
        score: 80,
        needsReview: false,
      }),
      isMatched: true,
    });
  });

  it('falls back from YOLO slug to Vietnamese display name when backend fields are missing', () => {
    const item = normalizeMappedFoodItem({
      label: 'com_tam',
      confidence: 0.91,
    });

    expect(translateIngredient('com_tam')).toBe('Cơm tấm');
    expect(getVisionFoodDisplayName(item)).toBe('Cơm tấm');
  });

  it('detectFoodByImage maps network errors to the offline message', async () => {
    mockedFetchWithAuthRetry.mockRejectedValue(new Error('Network request failed'));

    await expect(aiService.detectFoodByImage('file:///food.jpg')).rejects.toThrow(
      'AI tạm offline. Bạn có thể thử lại hoặc tìm món thủ công.',
    );
  });

  it('suggestRecipes uses apiClient.post and maps the backend recipe contract', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Chicken rice',
            description: 'Simple bowl',
            totalCalories: '650',
            totalProtein: '35',
            totalCarbs: '60',
            totalFat: '20',
            matchedIngredientsCount: '2',
            totalIngredientsCount: '4',
            matchPercentage: '50',
            matchedIngredients: ['Chicken', 'Rice'],
            missingIngredients: ['Egg'],
            allIngredients: ['Chicken', 'Rice', 'Egg', 'Onion'],
          },
        ],
      },
    });

    const result = await aiService.suggestRecipes(['Chicken', 'Rice']);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai/recipes/suggest', {
      availableIngredients: ['Chicken', 'Rice'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      recipeId: 1,
      recipeName: 'Chicken rice',
      description: 'Simple bowl',
      totalCalories: 650,
      totalProtein: 35,
      totalCarbs: 60,
      totalFat: 20,
      matchedIngredientsCount: 2,
      totalIngredientsCount: 4,
      matchPercentage: 50,
      matchedIngredients: ['Chicken', 'Rice'],
      missingIngredients: ['Egg'],
      allIngredients: ['Chicken', 'Rice', 'Egg', 'Onion'],
    });
  });

  it('buildRecipeSuggestionRequest only keeps food item ids for currently selected chips', () => {
    const request = buildRecipeSuggestionRequest({
      ingredients: ['Chicken'],
      availableFoodItemIds: [1, 2],
      ingredientHints: [
        { name: 'Chicken', foodItemId: 1, confidence: 0.9 },
        { name: 'Rice', foodItemId: 2, confidence: 0.8 },
      ],
      maxResults: 12,
    });

    expect(request).toEqual({
      mode: 'ingredient_combo',
      availableIngredients: ['Chicken'],
      availableFoodItemIds: [1],
      ingredientHints: [{ name: 'Chicken', foodItemId: 1, confidence: 0.9 }],
      maxResults: 12,
    });
  });

  it('buildRecipeSuggestionRequest preserves daily recommendation mode without ingredients', () => {
    const request = buildRecipeSuggestionRequest({
      ingredients: [],
      mode: 'daily_recommendation',
      maxResults: 6,
    });

    expect(request).toEqual({
      mode: 'daily_recommendation',
      availableIngredients: [],
      maxResults: 6,
    });
  });

  it('buildRecipeSuggestionRequest allows auto recipe discovery without ingredients', () => {
    const request = buildRecipeSuggestionRequest({
      ingredients: [],
      mode: 'auto',
      maxResults: 12,
    });

    expect(request).toEqual({
      mode: 'auto',
      availableIngredients: [],
      maxResults: 12,
    });
  });

  it('normalizes production recipe guide fields from suggestion payloads', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: [
        {
          RecipeId: 3,
          RecipeName: 'Gà xào rau củ',
          SuggestionGroup: 'readyNow',
          CanCookNow: true,
          GuideStatus: 'generated',
          PrepItems: ['Rửa rau', 'Cắt thịt'],
          SourceUrls: ['https://example.com/recipe'],
          YoutubeVideo: { videoId: 'abc', url: 'https://www.youtube.com/watch?v=abc' },
          RequiredIngredients: ['Thịt gà', 'Cà rốt', 'Hành tây'],
          ExtraIngredients: ['Tỏi'],
          Disclaimer: 'Gợi ý chỉ mang tính tham khảo; không phải khuyến nghị của chuyên gia.',
          AvailableIngredients: ['Thịt gà', 'Cà rốt'],
          MatchedIngredients: ['Thịt gà', 'Cà rốt'],
          MissingIngredients: [],
          AllIngredients: ['Thịt gà', 'Cà rốt'],
        },
      ],
    });

    const result = await aiService.suggestRecipesEnhanced({
      mode: 'ingredient_combo',
      availableIngredients: ['Thịt gà', 'Cà rốt'],
    });

    expect(result[0]).toMatchObject({
      recipeId: 3,
      recipeName: 'Gà xào rau củ',
      suggestionGroup: 'readyNow',
      canCookNow: true,
      guideStatus: 'generated',
      prepItems: ['Rửa rau', 'Cắt thịt'],
      sourceUrls: ['https://example.com/recipe'],
      youtubeVideo: { videoId: 'abc' },
      requiredIngredients: ['Thịt gà', 'Cà rốt', 'Hành tây'],
      extraIngredients: ['Tỏi'],
      disclaimer: 'Gợi ý chỉ mang tính tham khảo; không phải khuyến nghị của chuyên gia.',
      availableIngredients: ['Thịt gà', 'Cà rốt'],
    });
  });

  it('does not fall back to stale food ids when selected chips no longer have matched ids', () => {
    const request = buildRecipeSuggestionRequest({
      ingredients: ['Chicken'],
      availableFoodItemIds: [1, 2],
      ingredientHints: [{ name: 'Chicken', foodItemId: null, confidence: null }],
    });

    expect(request).toEqual({
      mode: 'ingredient_combo',
      availableIngredients: ['Chicken'],
      ingredientHints: [{ name: 'Chicken', foodItemId: null, confidence: null }],
    });
  });

  it('buildRecipeSuggestionRequest preserves Vietnamese chicken chip without stale ids', () => {
    const request = buildRecipeSuggestionRequest({
      ingredients: ['Gà'],
      availableFoodItemIds: [123],
      ingredientHints: [{ name: 'Gà', foodItemId: null, confidence: null }],
      maxResults: 12,
    });

    expect(request).toEqual({
      mode: 'ingredient_combo',
      availableIngredients: ['Gà'],
      ingredientHints: [{ name: 'Gà', foodItemId: null, confidence: null }],
      maxResults: 12,
    });
  });

  it('getRecipeDetail normalizes instructions and video fields', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        RecipeId: 12,
        RecipeName: 'Pho ga',
        Description: 'Warm bowl',
        TotalCalories: 520,
        TotalProtein: 28,
        TotalCarbs: 45,
        TotalFat: 18,
        Instructions: '1. Prep\n2. Cook',
        VideoUrl: 'https://youtu.be/demo',
        Ingredients: [
          {
            FoodItemId: 7,
            FoodName: 'Chicken',
            Grams: 200,
            Calories: 320,
            Protein: 24,
            Carbs: 0,
            Fat: 8,
          },
        ],
      },
    });

    const result = await aiService.getRecipeDetail(12);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai/recipes/12');
    expect(result).toMatchObject({
      recipeId: 12,
      recipeName: 'Pho ga',
      description: 'Warm bowl',
      totalCalories: 520,
      totalProtein: 28,
      totalCarbs: 45,
      totalFat: 18,
      instructions: ['1. Prep', '2. Cook'],
      videoUrl: 'https://youtu.be/demo',
    });
    expect(result.ingredients).toEqual([
      expect.objectContaining({
        foodItemId: 7,
        foodName: 'Chicken',
        grams: 200,
      }),
    ]);
  });

  it('applyNutritionTarget posts only to the valid nutrition apply route', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} });

    await aiService.applyNutritionTarget({
      calories: 2100,
      protein: 140,
      carbs: 220,
      fat: 60,
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai/nutrition/apply', {
      calories: 2100,
      protein: 140,
      carb: 220,
      fat: 60,
      effectiveFrom: null,
    });
  });

  it('recalculateNutritionTarget uses aiApiClient when the AI endpoint succeeds', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        currentHeightCm: 180,
        currentWeightKg: 80,
        gender: 'male',
        age: 30,
        activityFactor: 1.5,
        goal: 'gain',
      },
    });
    mockedAiApiClient.post.mockResolvedValue({
      data: {
        calories: 3000,
        protein: 170,
        carbs: 350,
        fat: 80,
        explanation: 'AI-based target',
      },
    });

    const result = await aiService.recalculateNutritionTarget();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/profile');
    expect(mockedAiApiClient.post).toHaveBeenCalledWith(
      '/api/ai/nutrition/recalculate',
      expect.objectContaining({
        sex: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 1.5,
        goal: 'gain',
      }),
    );
    expect(result).toEqual({
      calories: 3000,
      protein: 170,
      carbs: 350,
      fat: 80,
      explanation: 'AI-based target',
      source: 'ai',
      offlineMode: false,
    });
  });

  it('getNutritionInsights normalizes the response shape', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        recommendations: ['Eat more protein'],
        adherenceScore: '75',
        averageDailyCalories: '1800',
        averageDailyProtein: '120',
        averageDailyCarbs: '160',
        averageDailyFat: '55',
        currentTarget: {
          targetCalories: '2000',
          targetProtein: '140',
          targetCarbs: '180',
          targetFat: '60',
        },
        progressTrend: 'improving',
        daysAnalyzed: '7',
      },
    });

    const result = await aiService.getNutritionInsights();

    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai/nutrition/insights', {
      analysisDays: 30,
      includeMealTiming: true,
      includeMacroAnalysis: true,
    });
    expect(result).toMatchObject({
      recommendations: ['Eat more protein'],
      adherenceScore: 75,
      averageDailyCalories: 1800,
      averageDailyProtein: 120,
      averageDailyCarbs: 160,
      averageDailyFat: 55,
      currentTarget: {
        targetCalories: 2000,
        targetProtein: 140,
        targetCarbs: 180,
        targetFat: 60,
      },
      progressTrend: 'improving',
      daysAnalyzed: 7,
    });
  });

  it('getCookingInstructions uses fetch and returns the API payload', async () => {
    mockedFetchWithAuthRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: ['Step 1', 'Step 2'],
        cookingTime: '30 minutes',
        difficulty: 'Easy',
      }),
    });

    const result = await aiService.getCookingInstructions(
      'Chicken rice',
      [{ foodName: 'Chicken', grams: 200 }],
      'A quick meal',
    );

    expect(mockedFetchWithAuthRetry).toHaveBeenCalledWith(
      'http://mock-api.local/api/ai/cooking-instructions',
      expect.any(Function),
    );
    expect(result).toEqual({
      prepItems: [],
      seasonings: [],
      cookingMethod: undefined,
      steps: ['Step 1', 'Step 2'],
      cookingTime: '30 minutes',
      difficulty: 'Easy',
    });
  });

  it('getCookingInstructions falls back when the API returns a server error', async () => {
    mockedFetchWithAuthRetry.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service unavailable',
    });

    const result = await aiService.getCookingInstructions(
      'Chicken rice',
      [{ foodName: 'Chicken', grams: 200 }],
    );

    expect(result.steps).toHaveLength(4);
    expect(result.cookingTime).toBe('15-20 phút');
    expect(result.difficulty).toBe('Dễ');
  });
});
