import { act } from '@testing-library/react-native';
import { useDiaryStore } from '../src/store/useDiaryStore';
import { diaryService } from '../src/services/diaryService';

jest.mock('../src/services/diaryService', () => ({
  diaryService: {
    getDayCombined: jest.fn(),
    getTodayCombined: jest.fn(),
    deleteEntry: jest.fn(),
  },
}));

describe('useDiaryStore fetchSummary performance guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T08:00:00Z'));
    useDiaryStore.setState({
      summary: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not refetch the same fresh day summary immediately after a successful load', async () => {
    const summary = { date: '2026-05-21', meals: [], totalCalories: 320 };
    (diaryService.getTodayCombined as jest.Mock).mockResolvedValue(summary);

    await act(async () => {
      await useDiaryStore.getState().fetchSummary();
      await useDiaryStore.getState().fetchSummary();
    });

    expect(diaryService.getTodayCombined).toHaveBeenCalledTimes(1);
    expect(useDiaryStore.getState().summary).toEqual(summary);
  });

  it('shares an in-flight request for the same explicit date', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    (diaryService.getDayCombined as jest.Mock).mockReturnValue(request);

    const first = useDiaryStore.getState().fetchSummary('2026-05-20');
    const second = useDiaryStore.getState().fetchSummary('2026-05-20');

    expect(diaryService.getDayCombined).toHaveBeenCalledTimes(1);

    const summary = { date: '2026-05-20', meals: [], totalCalories: 480 };
    resolveRequest?.(summary);
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(useDiaryStore.getState().summary).toEqual(summary);
  });
});
