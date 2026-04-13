/**
 * Unit tests cho aiService
 * Test AI Vision và Recipe suggestion functions
 */

import { aiService } from '../src/services/aiService';
import { aiApiClient } from '../src/services/apiClient';

// Mock apiClient
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
}));

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectFoodByImage', () => {
    it('should detect food in image successfully', async () => {
      // Arrange - Mock response từ AI Vision API
      const mockResponse = {
        data: {
          items: [
            { label: 'Cơm trắng', confidence: 0.95, grams: 200 },
            { label: 'Thịt gà', confidence: 0.88, grams: 150 },
          ],
        },
      };

      (aiApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const mockImageUri = 'file:///path/to/food/image.jpg';
      const result = await aiService.detectFoodByImage(mockImageUri);

      // Assert
      expect(aiApiClient.post).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle no food detected', async () => {
      // Arrange
      const mockResponse = {
        data: {
          items: [],
          message: 'No food detected',
        },
      };

      (aiApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.detectFoodByImage('file:///empty-image.jpg');

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle API error', async () => {
      // Arrange
      (aiApiClient.post as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable'),
      );

      // Act & Assert
      await expect(aiService.detectFoodByImage('file:///image.jpg')).rejects.toThrow();
    });
  });

  describe('suggestRecipes', () => {
    it('should return recipe suggestions based on ingredients', async () => {
      // Arrange
      const mockRecipes = {
        data: [
          {
            id: '1',
            title: 'Cơm gà xối mỡ',
            ingredients: ['Gà', 'Cơm', 'Dưa leo'],
            calories: 650,
          },
          {
            id: '2',
            title: 'Gà nướng mật ong',
            ingredients: ['Gà', 'Mật ong'],
            calories: 450,
          },
        ],
      };

      (aiApiClient.get as jest.Mock).mockResolvedValue(mockRecipes);

      // Act
      const result = await aiService.suggestRecipes(['gà', 'cơm']);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Cơm gà xối mỡ');
    });

    it('should return empty array when no recipes found', async () => {
      // Arrange
      (aiApiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      // Act
      const result = await aiService.suggestRecipes(['xyz']);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getCookingInstructions', () => {
    it('should generate cooking instructions for recipe', async () => {
      // Arrange
      const mockInstructions = {
        data: {
          steps: [
            'Rửa sạch gà và ướp gia vị',
            'Chiên gà với dầu ăn cho đến khi vàng',
            'Xới cơm ra đĩa, xếp gà lên trên',
          ],
          cookingTime: '30 phút',
          difficulty: 'Dễ',
        },
      };

      (aiApiClient.post as jest.Mock).mockResolvedValue(mockInstructions);

      // Act - getCookingInstructions cần 3 args: recipeName, ingredients, description
      const result = await aiService.getCookingInstructions(
        'Cơm gà xối mỡ',
        [
          { foodName: 'Gà', grams: 200 },
          { foodName: 'Cơm', grams: 300 },
        ],
        'Món cơm gà đặc sản',
      );

      // Assert
      expect(result.steps).toHaveLength(3);
      expect(result.cookingTime).toBe('30 phút');
    });
  });

  describe('getNutritionInsights', () => {
    it('should return personalized nutrition insights', async () => {
      // Arrange
      const mockInsights = {
        data: {
          recommendations: ['Bạn cần ăn thêm protein', 'Giảm carb vào buổi tối'],
          adherenceScore: 75,
        },
      };

      (aiApiClient.get as jest.Mock).mockResolvedValue(mockInsights);

      // Act
      const result = await aiService.getNutritionInsights();

      // Assert
      expect(result).toBeDefined();
    });
  });
});
