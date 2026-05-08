import AsyncStorage from '@react-native-async-storage/async-storage';

const FOOD_QUEUE_KEY = '@eatfitai_food_write_queue';
const MAX_QUEUE_SIZE = 50;

export type QueuedFoodWrite = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload?: unknown;
  createdAt: string;
};

export const readFoodWriteQueue = async (): Promise<QueuedFoodWrite[]> => {
  const raw = await AsyncStorage.getItem(FOOD_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedFoodWrite[]) : [];
  } catch {
    return [];
  }
};

export const enqueueFoodWrite = async (
  item: Omit<QueuedFoodWrite, 'id' | 'createdAt'>,
): Promise<QueuedFoodWrite> => {
  const queued: QueuedFoodWrite = {
    ...item,
    id: `food-write-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const queue = [...(await readFoodWriteQueue()), queued].slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(FOOD_QUEUE_KEY, JSON.stringify(queue));
  return queued;
};

export const clearFoodWriteQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(FOOD_QUEUE_KEY);
};
