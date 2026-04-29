import apiClient from './apiClient';
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

export const waterService = {
  /** Lấy lượng nước uống theo ngày */
  async getWaterIntake(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : formatDateForApi(new Date());
    const { data } = await apiClient.get<WaterIntakeData>('/api/water-intake', {
      params: { date: dateStr },
    });
    return data;
  },

  /** Thêm 200ml nước */
  async addWater(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : undefined;
    const { data } = await apiClient.post<WaterIntakeData>('/api/water-intake/add', {
      date: dateStr,
    });
    return data;
  },

  /** Bớt 200ml nước */
  async subtractWater(date?: Date): Promise<WaterIntakeData> {
    const dateStr = date ? formatDateForApi(date) : undefined;
    const { data } = await apiClient.post<WaterIntakeData>('/api/water-intake/subtract', {
      date: dateStr,
    });
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
};

export interface MonthlyWaterData {
  year: number;
  month: number;
  totalMl: number;
  averageMl: number;
  daysWithData: number;
}
