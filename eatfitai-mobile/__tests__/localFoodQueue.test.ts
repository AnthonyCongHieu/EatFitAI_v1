import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearFoodWriteQueue,
  enqueueFoodWrite,
  readFoodWriteQueue,
} from '../src/services/localFoodQueue';

describe('localFoodQueue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearFoodWriteQueue();
  });

  it('persists queued food writes for offline recovery', async () => {
    await enqueueFoodWrite({
      endpoint: '/api/meal-diary',
      method: 'POST',
      payload: { foodItemId: 1, grams: 100 },
    });

    const raw = await AsyncStorage.getItem('@eatfitai_food_write_queue');
    expect(raw).toContain('/api/meal-diary');

    const queue = await readFoodWriteQueue();
    expect(queue[0]).toMatchObject({
      endpoint: '/api/meal-diary',
      method: 'POST',
      payload: { foodItemId: 1, grams: 100 },
    });
  });
});
