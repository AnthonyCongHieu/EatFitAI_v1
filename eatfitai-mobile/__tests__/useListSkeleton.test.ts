import { useListSkeleton } from "../src/hooks/useListSkeleton";
import { renderHook } from "@testing-library/react-native";

describe("useListSkeleton", () => {
  it("tao danh sach chi so theo do dai", () => {
    const { result } = renderHook(() => useListSkeleton(3));
    expect(result.current()).toEqual([0, 1, 2]);
  });

  it("tra ve mang rong khi length = 0", () => {
    const { result } = renderHook(() => useListSkeleton(0));
    expect(result.current()).toEqual([]);
  });
});
