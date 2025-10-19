import { act } from "@testing-library/react-native";
import { useStatsStore } from "../src/store/useStatsStore";
import { summaryService } from "../src/services/summaryService";

jest.mock("../src/services/summaryService", () => ({
  summaryService: {
    getWeekSummary: jest.fn(),
  },
}));

describe("useStatsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStatsStore.setState({ weekSummary: null, isLoading: false, error: null });
  });

  it("fetchWeekSummary cap nhat du lieu thanh cong", async () => {
    const mockSummary = { days: [{ date: "2024-01-01", calories: 2000 }] };
    (summaryService.getWeekSummary as jest.Mock).mockResolvedValue(mockSummary);

    await act(async () => {
      await useStatsStore.getState().fetchWeekSummary();
    });

    expect(summaryService.getWeekSummary).toHaveBeenCalledTimes(1);
    expect(useStatsStore.getState().weekSummary).toEqual(mockSummary);
    expect(useStatsStore.getState().isLoading).toBe(false);
    expect(useStatsStore.getState().error).toBeNull();
  });

  it("refreshWeekSummary luu loi khi that bai", async () => {
    (summaryService.getWeekSummary as jest.Mock).mockRejectedValue(new Error("Network error"));

    await expect(useStatsStore.getState().refreshWeekSummary()).rejects.toThrow("Network error");
    expect(useStatsStore.getState().error).toBe("Network error");
  });
});
