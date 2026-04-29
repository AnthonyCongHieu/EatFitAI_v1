// Favorites Service - API calls for favorite food items
// Cho phep user luu va quan ly cac mon an yeu thich

import apiClient from './apiClient';
import { sanitizeFoodImageUrl } from '../utils/imageHelpers';
import type { ApiImageVariants } from '../types/api';

export interface FavoriteItem {
  foodItemId: number;
  foodName: string;
  foodNameEn?: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  thumbNail?: string | null;
  imageVariants?: ApiImageVariants | null;
  isActive: boolean;
}

export interface ToggleFavoriteResponse {
  isFavorite: boolean;
}

export interface CheckFavoriteResponse {
  isFavorite: boolean;
}

export const favoritesService = {
  /**
   * Get all favorite foods for current user
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    const response = await apiClient.get('/api/favorites');
    return Array.isArray(response.data)
      ? response.data.map((item) => ({
          ...item,
          thumbNail: sanitizeFoodImageUrl(
            item?.imageVariants?.thumbUrl ?? item?.thumbNail ?? null,
          ),
        }))
      : [];
  },

  /**
   * Toggle favorite status for a food item
   * @param foodItemId - ID of the food item to toggle
   * @returns Whether the item is now a favorite
   */
  async toggleFavorite(foodItemId: number): Promise<boolean> {
    const response = await apiClient.post<ToggleFavoriteResponse>('/api/favorites', {
      foodItemId,
    });
    return response.data?.isFavorite ?? false;
  },

  /**
   * Check if a food item is in favorites
   * @param foodItemId - ID of the food item to check
   * @returns Whether the item is a favorite
   */
  async checkIsFavorite(foodItemId: number): Promise<boolean> {
    try {
      const response = await apiClient.get<CheckFavoriteResponse>(
        `/api/favorites/check/${foodItemId}`,
      );
      return response.data?.isFavorite ?? false;
    } catch {
      return false;
    }
  },

  /**
   * Add a food item to favorites
   * @param foodItemId - ID of the food item to add
   */
  async addFavorite(foodItemId: number): Promise<void> {
    const isFavorite = await this.checkIsFavorite(foodItemId);
    if (!isFavorite) {
      await this.toggleFavorite(foodItemId);
    }
  },

  /**
   * Remove a food item from favorites
   * @param foodItemId - ID of the food item to remove
   */
  async removeFavorite(foodItemId: number): Promise<void> {
    const isFavorite = await this.checkIsFavorite(foodItemId);
    if (isFavorite) {
      await this.toggleFavorite(foodItemId);
    }
  },
};

export default favoritesService;
