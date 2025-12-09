/**
 * Ingredient Basket Store - Lưu trữ nguyên liệu đã quét
 * Sử dụng Zustand để quản lý state của giỏ nguyên liệu
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScannedIngredient {
  id: string;
  name: string;
  confidence: number;
  addedAt: Date;
  imageUri?: string;
}

interface IngredientBasketState {
  // State
  ingredients: ScannedIngredient[];

  // Actions
  addIngredient: (ingredient: Omit<ScannedIngredient, 'id' | 'addedAt'>) => void;
  removeIngredient: (id: string) => void;
  clearBasket: () => void;
  hasIngredient: (name: string) => boolean;

  // Derived
  getIngredientNames: () => string[];
  getCount: () => number;
}

export const useIngredientBasketStore = create<IngredientBasketState>()(
  persist(
    (set, get) => ({
      ingredients: [],

      addIngredient: (ingredient) => {
        const newIngredient: ScannedIngredient = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: ingredient.name,
          confidence: ingredient.confidence,
          imageUri: ingredient.imageUri,
          addedAt: new Date(),
        };

        // Không thêm trùng
        if (get().hasIngredient(ingredient.name)) {
          return;
        }

        set((state) => ({
          ingredients: [...state.ingredients, newIngredient],
        }));
      },

      removeIngredient: (id) => {
        set((state) => ({
          ingredients: state.ingredients.filter((ing) => ing.id !== id),
        }));
      },

      clearBasket: () => {
        set({ ingredients: [] });
      },

      hasIngredient: (name) => {
        return get().ingredients.some(
          (ing) => ing.name.toLowerCase() === name.toLowerCase(),
        );
      },

      getIngredientNames: () => {
        return get().ingredients.map((ing) => ing.name);
      },

      getCount: () => {
        return get().ingredients.length;
      },
    }),
    {
      name: 'ingredient-basket-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Serialize Date objects
      partialize: (state) => ({
        ingredients: state.ingredients.map((ing) => ({
          ...ing,
          addedAt: ing.addedAt instanceof Date ? ing.addedAt.toISOString() : ing.addedAt,
        })),
      }),
    },
  ),
);

export default useIngredientBasketStore;
