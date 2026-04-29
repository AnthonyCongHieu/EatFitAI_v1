import type { FoodItemDto } from './index';
import type { ApiImageVariants } from './api';

/** Backend may return optional english name/thumbnail fields */
export type FoodItemDtoExtended = FoodItemDto & {
  foodNameEn?: string | null;
  thumbNail?: string | null;
  imageVariants?: ApiImageVariants | null;
};
