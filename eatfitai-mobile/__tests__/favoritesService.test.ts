import apiClient from '../src/services/apiClient';
import { favoritesService } from '../src/services/favoritesService';

jest.mock('../src/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('favoritesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses imageVariants.thumbUrl for favorite thumbnails', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [
        {
          foodItemId: 42,
          foodName: 'Banana',
          thumbNail: 'legacy-banana.jpg',
          imageVariants: {
            thumbUrl: 'https://media.example.com/food-images/v2/thumb/42.webp',
            mediumUrl: 'https://media.example.com/food-images/v2/medium/42.webp',
          },
          isActive: true,
        },
      ],
    });

    const favorites = await favoritesService.getFavorites();

    expect(favorites[0]?.thumbNail).toBe(
      'https://media.example.com/food-images/v2/thumb/42.webp',
    );
  });
});
