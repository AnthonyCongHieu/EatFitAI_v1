import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

export interface WaterIntakeData {
  date: string;
  amountMl: number;
  targetMl: number;
}

const formatDateForApi = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const WATER_TARGET_KEY = '@eatfitai_water_target_ml';

export const waterService = {
  /** Lấy lượng nước uống theo ngày */
  async getWaterIntake(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : formatDateForApi(new Date());
    const { data } = await apiClient.get<WaterIntakeData>('/api/water-intake', {
      params: { date: dateStr },
    });
    // Override targetMl with user's custom target if set
    const customTarget = await this.getCustomWaterTarget();
    if (customTarget !== null) {
      data.targetMl = customTarget;
    }
    return data;
  },

  /** Thêm 200ml nước */
  async addWater(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : undefined;
    const { data } = await apiClient.post<WaterIntakeData>('/api/water-intake/add', {
      date: dateStr,
    });
    const customTarget = await this.getCustomWaterTarget();
    if (customTarget !== null) {
      data.targetMl = customTarget;
    }
    return data;
  },

  /** Bớt 200ml nước */
  async subtractWater(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : undefined;
    const { data } = await apiClient.post<WaterIntakeData>('/api/water-intake/subtract', {
      date: dateStr,
    });
    const customTarget = await this.getCustomWaterTarget();
    if (customTarget !== null) {
      data.targetMl = customTarget;
    }
    return data;
  },

  /** Lấy tổng hợp nước uống theo tháng từ backend */
  async getMonthlyWaterIntake(year: number, month: number): Promise<MonthlyWaterData> {
    try {
      const { data } = await apiClient.get<MonthlyWaterData>('/api/water-intake/monthly', {
        params: { year, month },
      });
      return data;
    } catch (error) {
      logger.warn('[waterService] Monthly water fetch failed', error);
      return { year, month, totalMl: 0, averageMl: 0, daysWithData: 0 };
    }
  },

  /** Lấy mục tiêu nước tùy chỉnh (local) */
  async getCustomWaterTarget(): Promise<number | null> {
    try {
      const val = await AsyncStorage.getItem(WATER_TARGET_KEY);
      return val !== null ? Number(val) : null;
    } catch {
      return null;
    }
  },

  /** Lưu mục tiêu nước tùy chỉnh (local) — truyền null để reset về mặc định */
  async setCustomWaterTarget(ml: number | null): Promise<void> {
    try {
      if (ml === null) {
        await AsyncStorage.removeItem(WATER_TARGET_KEY);
      } else {
        await AsyncStorage.setItem(WATER_TARGET_KEY, String(ml));
      }
    } catch (e) {
      logger.warn('[waterService] setCustomWaterTarget failed', e);
    }
  },
};

export interface MonthlyWaterData {
  year: number;
  month: number;
  totalMl: number;
  averageMl: number;
  daysWithData: number;
}

