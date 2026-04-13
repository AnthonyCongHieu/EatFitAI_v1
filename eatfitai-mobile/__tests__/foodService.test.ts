/**
 * Unit tests cho foodService
 * Test các function: searchFoods, getFoodDetail, searchAllFoods
 */

import { foodService } from '../src/services/foodService';
import apiClient from '../src/services/apiClient';

// Mock apiClient
jest.mock('../src/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('foodService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchFoods', () => {
    it('should search foods with valid query', async () => {
      // Arrange - Mock response từ API
      const mockData = [
        { foodItemId: 1, foodName: 'Cơm trắng', caloriesPer100g: 130 },
        { foodItemId: 2, foodName: 'Cơm chiên', caloriesPer100g: 180 },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

      // Act
      const result = await foodService.searchFoods('cơm');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/search', {
        params: expect.objectContaining({ q: 'cơm' }),
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.name).toBe('Cơm trắng');
    });

    it('should return empty array when no results found', async () => {
      // Arrange
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      // Act
      const result = await foodService.searchFoods('xyz123');

      // Assert
      expect(result.items).toEqual([]);
    });

    it('should handle API error gracefully', async () => {
      // Arrange
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(foodService.searchFoods('test')).rejects.toThrow('Network error');
    });

    it('should respect limit parameter', async () => {
      // Arrange
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      // Act
      await foodService.searchFoods('thịt', 10);

      // Assert - Verify limit được gửi đúng
      expect(apiClient.get).toHaveBeenCalledWith('/api/search', {
        params: expect.objectContaining({ limit: 10 }),
      });
    });
  });

  describe('getFoodDetail', () => {
    it('should return food details for valid ID', async () => {
      // Arrange
      const mockFood = {
        foodItemId: 1,
        foodName: 'Cơm trắng',
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbPer100g: 28,
        fatPer100g: 0.3,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockFood });

      // Act
      const result = await foodService.getFoodDetail('1', 'catalog');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/food/1');
      expect(result).toBeDefined();
    });

    it('should throw error for invalid ID', async () => {
      // Arrange
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(foodService.getFoodDetail('99999', 'catalog')).rejects.toThrow();
    });
  });

  describe('searchAllFoods', () => {
    it('should combine catalog and user foods', async () => {
      // Arrange - API trả về kết quả từ cả catalog và user
      const mockData = [
        { source: 'catalog', id: 1, foodName: 'Thịt bò' },
        { source: 'user', id: 1, foodName: 'Thịt heo nướng' },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

      // Act
      const result = await foodService.searchAllFoods('thịt');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/food/search-all', {
        params: expect.objectContaining({ q: 'thịt' }),
      });
      expect(result.items).toHaveLength(2);
    });
  });

  describe('addDiaryEntry', () => {
    it('should use provided eatenDate when adding a catalog food', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await foodService.addDiaryEntry({
        foodId: '42',
        grams: 150,
        mealTypeId: 2,
        eatenDate: '2026-04-01',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/meal-diary', {
        eatenDate: '2026-04-01',
        mealTypeId: 2,
        foodItemId: 42,
        grams: 150,
        note: null,
      });
    });
  });

  describe('addDiaryEntryFromUserFoodItem', () => {
    it('should use provided eatenDate when adding a user food item', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await foodService.addDiaryEntryFromUserFoodItem({
        userFoodItemId: '7',
        grams: 80,
        mealTypeId: 4,
        eatenDate: '2026-04-02',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/meal-diary', {
        eatenDate: '2026-04-02',
        mealTypeId: 4,
        userFoodItemId: 7,
        grams: 80,
        calories: 0,
        protein: 0,
        carb: 0,
        fat: 0,
        note: null,
      });
    });
  });
});
