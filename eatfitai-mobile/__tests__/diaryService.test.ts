/**
 * Unit tests cho diaryService
 * Test các function chính: getTodaySummary, getEntriesByDate, deleteEntry, updateEntry
 */

import { diaryService } from '../src/services/diaryService';
import apiClient from '../src/services/apiClient';

// Mock apiClient
jest.mock('../src/services/apiClient', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}));

describe('diaryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTodaySummary', () => {
        it('should fetch today summary successfully', async () => {
            const mockData = {
                totalCalories: 1800,
                totalProtein: 100,
                totalCarbs: 200,
                totalFat: 50,
                targetCalories: 2000,
                meals: [],
            };

            (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

            const result = await diaryService.getTodaySummary();

            expect(apiClient.get).toHaveBeenCalledWith('/api/summary/day', {
                params: expect.objectContaining({
                    date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                }),
            });
            expect(result.totalCalories).toBe(1800);
            expect(result.protein).toBe(100);
            expect(result.carbs).toBe(200);
            expect(result.fat).toBe(50);
        });

        it('should normalize protein/carbs/fat from totalProtein/totalCarbs/totalFat', async () => {
            const mockData = {
                totalCalories: 1500,
                totalProtein: 80,
                totalCarbs: 180,
                totalFat: 45,
                targetCalories: 2000,
                meals: [],
            };

            (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

            const result = await diaryService.getTodaySummary();

            // Verify normalization từ totalProtein -> protein
            expect(result.protein).toBe(80);
            expect(result.carbs).toBe(180);
            expect(result.fat).toBe(45);
        });

        it('should handle API error gracefully', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(diaryService.getTodaySummary()).rejects.toThrow('Network error');
        });
    });

    describe('getEntriesByDate', () => {
        it('should fetch entries by date', async () => {
            const mockEntries = [
                {
                    mealDiaryId: 1,
                    mealTypeId: 2,
                    foodItemName: 'Cơm trắng',
                    grams: 200,
                    calories: 260,
                    protein: 5,
                    carb: 56,
                    fat: 0.5,
                },
                {
                    mealDiaryId: 2,
                    mealTypeId: 2,
                    foodItemName: 'Thịt gà',
                    grams: 150,
                    calories: 250,
                    protein: 35,
                    carb: 0,
                    fat: 12,
                },
            ];

            (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEntries });

            const result = await diaryService.getEntriesByDate('2024-01-15');

            expect(apiClient.get).toHaveBeenCalledWith('/api/meal-diary', {
                params: { date: '2024-01-15' },
            });
            expect(result).toHaveLength(2);
            expect(result[0]!.foodName).toBe('Cơm trắng');
            expect(result[0]!.calories).toBe(260);
        });

        it('should return empty array when no entries found', async () => {
            (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

            const result = await diaryService.getEntriesByDate('2024-01-15');

            expect(result).toEqual([]);
        });

        it('should normalize entry fields correctly', async () => {
            const mockEntry = {
                mealDiaryId: 1,
                mealTypeId: 1, // breakfast
                foodItemName: 'Phở bò',
                grams: 350,
                calories: 420,
                protein: 25,
                carb: 55,
                fat: 10,
                note: 'Ít giá',
                sourceMethod: 'ai_vision',
            };

            (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockEntry] });

            const result = await diaryService.getEntriesByDate('2024-01-15');

            expect(result[0]!.id).toBe('1');
            expect(result[0]!.mealType).toBe(1);
            expect(result[0]!.foodName).toBe('Phở bò');
            expect(result[0]!.note).toBe('Ít giá');
            expect(result[0]!.carbs).toBe(55); // carb -> carbs
            expect(result[0]!.sourceMethod).toBe('ai_vision');
        });
    });

    describe('deleteEntry', () => {
        it('should delete entry successfully', async () => {
            (apiClient.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

            await diaryService.deleteEntry('123');

            expect(apiClient.delete).toHaveBeenCalledWith('/api/meal-diary/123');
        });

        it('should throw error when entry not found', async () => {
            (apiClient.delete as jest.Mock).mockRejectedValue(new Error('Not found'));

            await expect(diaryService.deleteEntry('999')).rejects.toThrow('Not found');
        });
    });

    describe('updateEntry', () => {
        it('should update entry grams successfully', async () => {
            (apiClient.put as jest.Mock).mockResolvedValue({ data: { success: true } });

            await diaryService.updateEntry('123', { grams: 250 });

            expect(apiClient.put).toHaveBeenCalledWith('/api/meal-diary/123', {
                grams: 250,
                note: undefined,
            });
        });

        it('should update entry note successfully', async () => {
            (apiClient.put as jest.Mock).mockResolvedValue({ data: { success: true } });

            await diaryService.updateEntry('123', { note: 'Thêm rau' });

            expect(apiClient.put).toHaveBeenCalledWith('/api/meal-diary/123', {
                grams: undefined,
                note: 'Thêm rau',
            });
        });

        it('should update both grams and note', async () => {
            (apiClient.put as jest.Mock).mockResolvedValue({ data: { success: true } });

            await diaryService.updateEntry('123', { grams: 300, note: 'Ít dầu' });

            expect(apiClient.put).toHaveBeenCalledWith('/api/meal-diary/123', {
                grams: 300,
                note: 'Ít dầu',
            });
        });
    });

    describe('getWeekSummary', () => {
        it('should fetch week summary successfully', async () => {
            const mockData = {
                totalCalories: 12500,
                totalProtein: 700,
                totalCarbs: 1400,
                totalFat: 350,
                meals: [],
            };

            (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });

            const result = await diaryService.getWeekSummary('2024-01-15');

            expect(apiClient.get).toHaveBeenCalledWith('/api/summary/week', {
                params: { date: '2024-01-15' },
            });
            expect(result.totalCalories).toBe(12500);
        });
    });
});
