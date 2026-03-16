export const useListSkeleton = (length: number) => {
  return (): number[] => {
    if (length <= 0) {
      return [];
    }

    return Array.from({ length }, (_, index) => index);
  };
};
