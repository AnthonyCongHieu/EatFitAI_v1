/**
 * Unit tests cho diaryStore (Zustand)
 * Test meal diary state management
 */

import { create } from 'zustand';

// Types cho diary entries
interface DiaryEntry {
    id: string;
    mealType: number;
    foodName: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
}

interface DiarySummary {
    totalCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    targetCalories: number;
}

interface DiaryState {
    entries: DiaryEntry[];
    todaySummary: DiarySummary | null;
    isLoading: boolean;
    selectedDate: string;
    addEntry: (entry: DiaryEntry) => void;
    removeEntry: (id: string) => void;
    updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
    setTodaySummary: (summary: DiarySummary) => void;
    setSelectedDate: (date: string) => void;
    clearEntries: () => void;
}

// Helper để lấy ngày hôm nay
const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0] ?? '';
};

// Mock implementation của diaryStore để test
const createDiaryStore = () =>
    create<DiaryState>((set) => ({
        entries: [],
        todaySummary: null,
        isLoading: false,
        selectedDate: getTodayDate(),
        addEntry: (entry: DiaryEntry) => {
            set((state) => ({ entries: [...state.entries, entry] }));
        },
        removeEntry: (id: string) => {
            set((state) => ({
                entries: state.entries.filter((e) => e.id !== id),
            }));
        },
        updateEntry: (id: string, updates: Partial<DiaryEntry>) => {
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === id ? { ...e, ...updates } : e,
                ),
            }));
        },
        setTodaySummary: (summary: DiarySummary) => {
            set({ todaySummary: summary });
        },
        setSelectedDate: (date: string) => {
            set({ selectedDate: date });
        },
        clearEntries: () => {
            set({ entries: [] });
        },
    }));

describe('diaryStore', () => {
    let useDiaryStore: ReturnType<typeof createDiaryStore>;

    beforeEach(() => {
        useDiaryStore = createDiaryStore();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = useDiaryStore.getState();

            expect(state.entries).toEqual([]);
            expect(state.todaySummary).toBeNull();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('addEntry', () => {
        it('should add new entry to entries array', () => {
            // Arrange
            const newEntry: DiaryEntry = {
                id: '1',
                mealType: 2,
                foodName: 'Cơm trắng',
                grams: 200,
                calories: 260,
                protein: 5.4,
                carbs: 56,
                fat: 0.6,
                date: '2024-01-15',
            };

            // Act
            useDiaryStore.getState().addEntry(newEntry);
            const state = useDiaryStore.getState();

            // Assert
            expect(state.entries).toHaveLength(1);
            expect(state.entries[0]?.foodName).toBe('Cơm trắng');
        });

        it('should add multiple entries', () => {
            // Arrange & Act
            useDiaryStore.getState().addEntry({
                id: '1',
                mealType: 1,
                foodName: 'Phở bò',
                grams: 350,
                calories: 420,
                protein: 25,
                carbs: 55,
                fat: 10,
                date: '2024-01-15',
            });
            useDiaryStore.getState().addEntry({
                id: '2',
                mealType: 2,
                foodName: 'Cơm gà',
                grams: 300,
                calories: 500,
                protein: 35,
                carbs: 45,
                fat: 15,
                date: '2024-01-15',
            });
            const state = useDiaryStore.getState();

            // Assert
            expect(state.entries).toHaveLength(2);
        });
    });

    describe('removeEntry', () => {
        it('should remove entry by id', () => {
            // Arrange - Add entries first
            useDiaryStore.getState().addEntry({
                id: '1',
                mealType: 1,
                foodName: 'Phở',
                grams: 350,
                calories: 420,
                protein: 25,
                carbs: 55,
                fat: 10,
                date: '2024-01-15',
            });
            useDiaryStore.getState().addEntry({
                id: '2',
                mealType: 2,
                foodName: 'Cơm',
                grams: 200,
                calories: 260,
                protein: 5,
                carbs: 56,
                fat: 0.6,
                date: '2024-01-15',
            });

            // Act
            useDiaryStore.getState().removeEntry('1');
            const state = useDiaryStore.getState();

            // Assert
            expect(state.entries).toHaveLength(1);
            expect(state.entries[0]?.id).toBe('2');
        });

        it('should do nothing when removing non-existent entry', () => {
            // Arrange
            useDiaryStore.getState().addEntry({
                id: '1',
                mealType: 1,
                foodName: 'Phở',
                grams: 350,
                calories: 420,
                protein: 25,
                carbs: 55,
                fat: 10,
                date: '2024-01-15',
            });

            // Act
            useDiaryStore.getState().removeEntry('999');
            const state = useDiaryStore.getState();

            // Assert - Entry vẫn còn
            expect(state.entries).toHaveLength(1);
        });
    });

    describe('updateEntry', () => {
        it('should update entry fields', () => {
            // Arrange
            useDiaryStore.getState().addEntry({
                id: '1',
                mealType: 1,
                foodName: 'Phở',
                grams: 350,
                calories: 420,
                protein: 25,
                carbs: 55,
                fat: 10,
                date: '2024-01-15',
            });

            // Act - Update grams và calories
            useDiaryStore.getState().updateEntry('1', { grams: 500, calories: 600 });
            const state = useDiaryStore.getState();
            const entry = state.entries[0];

            // Assert
            expect(entry?.grams).toBe(500);
            expect(entry?.calories).toBe(600);
            expect(entry?.foodName).toBe('Phở'); // Unchanged
        });
    });

    describe('setTodaySummary', () => {
        it('should set today summary', () => {
            // Arrange
            const summary: DiarySummary = {
                totalCalories: 1800,
                protein: 100,
                carbs: 200,
                fat: 60,
                targetCalories: 2000,
            };

            // Act
            useDiaryStore.getState().setTodaySummary(summary);
            const state = useDiaryStore.getState();

            // Assert
            expect(state.todaySummary).not.toBeNull();
            expect(state.todaySummary?.totalCalories).toBe(1800);
            expect(state.todaySummary?.targetCalories).toBe(2000);
        });
    });

    describe('setSelectedDate', () => {
        it('should update selected date', () => {
            // Act
            useDiaryStore.getState().setSelectedDate('2024-01-20');
            const state = useDiaryStore.getState();

            // Assert
            expect(state.selectedDate).toBe('2024-01-20');
        });
    });

    describe('clearEntries', () => {
        it('should clear all entries', () => {
            // Arrange
            useDiaryStore.getState().addEntry({
                id: '1',
                mealType: 1,
                foodName: 'Phở',
                grams: 350,
                calories: 420,
                protein: 25,
                carbs: 55,
                fat: 10,
                date: '2024-01-15',
            });

            // Act
            useDiaryStore.getState().clearEntries();
            const state = useDiaryStore.getState();

            // Assert
            expect(state.entries).toHaveLength(0);
        });
    });
});
