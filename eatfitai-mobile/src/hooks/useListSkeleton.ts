import { useCallback } from "react";

export const useListSkeleton = (length: number) => {
  return useCallback(() => Array.from({ length }, (_, index) => index), [length]);
};
