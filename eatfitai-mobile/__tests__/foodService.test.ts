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
  put: jest.fn(),
  delete: jest.fn(),
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

  describe('lookupByBarcode', () => {
    it('should call the backend barcode lookup endpoint and normalize the result', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          barcode: '8938505974198',
          source: 'catalog',
          foodItem: {
            foodItemId: 12,
            foodName: 'Sữa chua',
            barcode: '8938505974198',
            caloriesPer100g: 90,
            proteinPer100g: 3.5,
            carbPer100g: 12,
            fatPer100g: 2,
          },
        },
      });

      const result = await foodService.lookupByBarcode('8938505974198');

      expect(apiClient.get).toHaveBeenCalledWith('/api/food/barcode/8938505974198');
      expect(result).toMatchObject({
        id: '12',
        name: 'Sữa chua',
        barcode: '8938505974198',
        calories: 90,
      });
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

    it('prefers optimized thumb variants for search result thumbnails', async () => {
      const mockData = [
        {
          source: 'catalog',
          id: 1,
          foodName: 'Cơm trắng',
          imageVariants: {
            thumbUrl: 'https://media.example.com/food-images/v2/thumb/rice.webp',
            mediumUrl: 'https://media.example.com/food-images/v2/medium/rice.webp',
          },
          thumbnailUrl: 'rice.png',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await foodService.searchAllFoods('cơm');

      expect(result.items[0]?.thumbnail).toBe(
        'https://media.example.com/food-images/v2/thumb/rice.webp',
      );
    });
  });

  describe('getRecentFoods', () => {
    it('should normalize recent foods and preserve accented fallback copy', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: [
          { source: 'catalog', id: 1, foodName: null },
          { source: 'user', id: 7, foodName: 'Phở bò nhà làm' },
        ],
      });

      const result = await foodService.getRecentFoods(5);

      expect(apiClient.get).toHaveBeenCalledWith('/api/food/recent', {
        params: { limit: 5 },
      });
      expect(result[0]?.name).toBe('Món ăn');
      expect(result[1]).toMatchObject({
        id: '7',
        name: 'Phở bò nhà làm',
        source: 'user',
      });
    });
  });

  describe('common meals', () => {
    it('should fetch common meal templates', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: [
          {
            userDishId: 12,
            dishName: 'Cơm gà meal prep',
            ingredientCount: 3,
            defaultGrams: 320,
            calories: 540,
            protein: 38,
            carb: 44,
            fat: 18,
          },
        ],
      });

      const result = await foodService.getCommonMeals();

      expect(apiClient.get).toHaveBeenCalledWith('/api/custom-dishes');
      expect(result[0]).toMatchObject({
        id: '12',
        name: 'Cơm gà meal prep',
        ingredientCount: 3,
        defaultGrams: 320,
        calories: 540,
      });
    });

    it('should apply a common meal template to diary', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await foodService.applyCommonMeal({
        customDishId: '12',
        targetDate: '2026-04-24',
        mealTypeId: 2,
        grams: 320,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/custom-dishes/12/apply', {
        targetDate: '2026-04-24',
        mealTypeId: 2,
        grams: 320,
        note: null,
      });
    });

    it('should fetch common meal template detail for editing', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          userDishId: 12,
          dishName: 'Cơm gà meal prep',
          description: 'Lunch template',
          ingredients: [
            {
              foodItemId: 5,
              foodName: 'Ức gà',
              grams: 180,
              caloriesPer100g: 165,
            },
          ],
        },
      });

      const result = await (foodService as any).getCommonMealDetail('12');

      expect(apiClient.get).toHaveBeenCalledWith('/api/custom-dishes/12');
      expect(result).toMatchObject({
        id: '12',
        name: 'Cơm gà meal prep',
        ingredients: [
          {
            foodItemId: 5,
            foodName: 'Ức gà',
            grams: 180,
            caloriesPer100g: 165,
          },
        ],
      });
    });

    it('should update a common meal template', async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({ data: {} });

      await (foodService as any).updateCommonMeal('12', {
        dishName: 'Cơm gà tối ưu',
        description: 'Updated template',
        ingredients: [
          { foodItemId: 5, grams: 200 },
          { foodItemId: 9, grams: 120 },
        ],
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/custom-dishes/12', {
        dishName: 'Cơm gà tối ưu',
        description: 'Updated template',
        ingredients: [
          { foodItemId: 5, grams: 200 },
          { foodItemId: 9, grams: 120 },
        ],
      });
    });

    it('should delete a common meal template', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: {} });

      await (foodService as any).deleteCommonMeal('12');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/custom-dishes/12');
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
        note: null,
      });
    });
  });
});
