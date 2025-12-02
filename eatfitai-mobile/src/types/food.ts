import type { FoodItemDto } from './index';

/** Backend may return optional english name/thumbnail fields */
export type FoodItemDtoExtended = FoodItemDto & {
  foodNameEn?: string | null;
  thumbNail?: string | null;
};
