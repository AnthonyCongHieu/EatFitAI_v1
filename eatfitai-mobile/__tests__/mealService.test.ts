import { mealService } from '../src/services/mealService';
import apiClient from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('mealService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches meal data from the canonical meal-diary route', async () => {
    const mockData = [{ mealDiaryId: 1, foodItemName: 'Banana' }];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

    const result = await mealService.getMeals('2026-04-17');

    expect(apiClient.get).toHaveBeenCalledWith('/api/meal-diary', {
      params: { date: '2026-04-17' },
    });
    expect(result).toEqual(mockData);
  });

  it('posts catalog meal items with foodItemId', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

    await mealService.addMealItems('2026-04-17', 2, [
      { source: 'catalog', foodItemId: 42, grams: 120 },
    ]);

    expect(apiClient.post).toHaveBeenCalledWith('/api/meal-diary', {
      eatenDate: '2026-04-17',
      mealTypeId: 2,
      foodItemId: 42,
      grams: 120,
      note: null,
    });
  });

  it('posts user meal items with userFoodItemId', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

    await mealService.addMealItems('2026-04-17', 3, [
      { source: 'user', userFoodItemId: 7, grams: 80 },
    ]);

    expect(apiClient.post).toHaveBeenCalledWith('/api/meal-diary', {
      eatenDate: '2026-04-17',
      mealTypeId: 3,
      userFoodItemId: 7,
      grams: 80,
      note: null,
    });
  });
});
