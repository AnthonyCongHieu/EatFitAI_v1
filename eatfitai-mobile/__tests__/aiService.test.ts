import { aiService } from '../src/services/aiService';
import apiClient, {
  aiApiClient,
  fetchWithAuthRetry,
  getCurrentApiUrl,
} from '../src/services/apiClient';
import { assertBackendApiBaseUrl } from '../src/config/env';

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentApiUrl.mockReturnValue('http://mock-api.local');
    mockedAssertBackendApiBaseUrl.mockImplementation((value: string) => value);
  });

  it('detectFoodByImage uses fetch and normalizes the payload', async () => {
    mockedFetchWithAuthRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            label: 'Rice',
            confidence: '0.9',
            foodItemId: '12',
            foodName: 'Rice bowl',
            caloriesPer100g: '130',
            proteinPer100g: '4',
            fatPer100g: '1',
            carbPer100g: '28',
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
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      label: 'Rice',
      confidence: 0.9,
      foodItemId: 12,
      foodName: 'Rice bowl',
      caloriesPer100g: 130,
      proteinPer100g: 4,
      fatPer100g: 1,
      carbPer100g: 28,
      isMatched: true,
    });
    expect(result.unmappedLabels).toEqual(['unknown']);
  });

  it('detectFoodByImage maps network errors to the offline message', async () => {
    mockedFetchWithAuthRetry.mockRejectedValue(new Error('Network request failed'));

    await expect(aiService.detectFoodByImage('file:///food.jpg')).rejects.toThrow(
      'AI tạm offline. Bạn có thể thử lại hoặc tìm món thủ công.',
    );
  });

  it('suggestRecipes uses apiClient.post and maps the response', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 1,
            title: 'Chicken rice',
            description: 'Simple bowl',
            calories: '650',
            protein: '35',
            carbs: '60',
            fat: '20',
            ingredients: ['Chicken', 'Rice'],
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
      id: '1',
      title: 'Chicken rice',
      description: 'Simple bowl',
      calories: 650,
      protein: 35,
      carbs: 60,
      fat: 20,
      ingredients: ['Chicken', 'Rice'],
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
