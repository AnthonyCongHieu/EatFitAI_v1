import apiClient from './apiClient';
import { addMealItems } from './mealService';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('mealService.addMealItems', () => {
  beforeEach(() => {
    mockedApiClient.post.mockReset();
  });

  it('keeps the single-item endpoint for one item', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} });

    await addMealItems('2026-05-01', 2, [{ foodItemId: 10, grams: 150 }]);

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/meal-diary', {
      eatenDate: '2026-05-01',
      mealTypeId: 2,
      foodItemId: 10,
      grams: 150,
      note: null,
    });
  });

  it('uses the bulk endpoint for multiple items', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} });

    await addMealItems('2026-05-01', 2, [
      { foodItemId: 10, grams: 150 },
      { foodItemId: 11, grams: 80 },
    ]);

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/meal-diary/bulk', {
      items: [
        {
          eatenDate: '2026-05-01',
          mealTypeId: 2,
          foodItemId: 10,
          grams: 150,
          note: null,
        },
        {
          eatenDate: '2026-05-01',
          mealTypeId: 2,
          foodItemId: 11,
          grams: 80,
          note: null,
        },
      ],
    });
  });

  it('falls back to individual inserts when bulk is not supported', async () => {
    mockedApiClient.post
      .mockRejectedValueOnce({ response: { status: 404, data: '' } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: {} });

    await addMealItems('2026-05-01', 2, [
      { foodItemId: 10, grams: 150 },
      { foodItemId: 11, grams: 80 },
    ]);

    expect(mockedApiClient.post).toHaveBeenCalledTimes(3);
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/meal-diary',
      expect.objectContaining({ foodItemId: 10 }),
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      3,
      '/api/meal-diary',
      expect.objectContaining({ foodItemId: 11 }),
    );
  });

  it('does not fall back when bulk returns a business 404', async () => {
    const error = {
      response: {
        status: 404,
        data: { message: 'Không tìm thấy dữ liệu bữa ăn', requestId: 'req-1' },
      },
    };
    mockedApiClient.post.mockRejectedValueOnce(error);

    await expect(
      addMealItems('2026-05-01', 2, [
        { foodItemId: 10, grams: 150 },
        { foodItemId: 999, grams: 80 },
      ]),
    ).rejects.toBe(error);

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
  });
});
