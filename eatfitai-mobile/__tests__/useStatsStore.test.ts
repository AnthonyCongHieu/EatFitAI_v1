import { act } from '@testing-library/react-native';
import { useStatsStore } from '../src/store/useStatsStore';
import { summaryService } from '../src/services/summaryService';

jest.mock('../src/services/summaryService', () => ({
  summaryService: {
    getWeekSummary: jest.fn(),
  },
}));

describe('useStatsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStatsStore.setState({
      weekSummary: null,
      isLoading: false,
      error: null,
      weekCache: new Map(),
      weekFetchedAt: new Map(),
    });
  });

  it('fetchWeekSummary cap nhat du lieu thanh cong', async () => {
    const mockSummary = { days: [{ date: '2024-01-01', calories: 2000 }] };
    (summaryService.getWeekSummary as jest.Mock).mockResolvedValue(mockSummary);

    await act(async () => {
      await useStatsStore.getState().fetchWeekSummary();
    });

    expect(summaryService.getWeekSummary).toHaveBeenCalledTimes(1);
    expect(useStatsStore.getState().weekSummary).toEqual(mockSummary);
    expect(useStatsStore.getState().isLoading).toBe(false);
    expect(useStatsStore.getState().error).toBeNull();
  });

  it('initial selectedDate stays on the local calendar week boundary', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 0, 30));
    try {
      jest.resetModules();
      const { useStatsStore: isolatedStore } = require('../src/store/useStatsStore');

      expect(isolatedStore.getState().selectedDate).toBe('2026-03-30');
    } finally {
      jest.useRealTimers();
    }
  });

  it('refreshWeekSummary luu loi khi that bai', async () => {
    (summaryService.getWeekSummary as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    await expect(useStatsStore.getState().refreshWeekSummary()).rejects.toThrow(
      'Network error',
    );
    expect(useStatsStore.getState().error).toBe('Network error');
  });

  it('does not background-refetch a fresh cached week immediately', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T08:00:00Z'));
    try {
      const mockSummary = { days: [{ date: '2026-05-18', calories: 1600 }] };
      (summaryService.getWeekSummary as jest.Mock).mockResolvedValue(mockSummary);

      await act(async () => {
        await useStatsStore.getState().fetchWeekSummary('2026-05-18');
        await useStatsStore.getState().fetchWeekSummary('2026-05-18');
      });

      expect(summaryService.getWeekSummary).toHaveBeenCalledTimes(1);
      expect(useStatsStore.getState().weekSummary).toEqual(mockSummary);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shares an in-flight week summary request for the same week', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    (summaryService.getWeekSummary as jest.Mock).mockReturnValue(request);

    const first = useStatsStore.getState().fetchWeekSummary('2026-05-18');
    const second = useStatsStore.getState().fetchWeekSummary('2026-05-18');

    expect(summaryService.getWeekSummary).toHaveBeenCalledTimes(1);

    const mockSummary = { days: [{ date: '2026-05-18', calories: 1700 }] };
    resolveRequest?.(mockSummary);
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(useStatsStore.getState().weekSummary).toEqual(mockSummary);
  });
});
