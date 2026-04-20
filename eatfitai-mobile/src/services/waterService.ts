import axios from 'axios';
import apiClient from './apiClient';
import { useAuthStore } from '../store/useAuthStore';

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

  /** Lấy tổng hợp nước uống theo tháng trực tiếp từ Supabase REST */
  async getMonthlyWaterIntake(year: number, month: number): Promise<MonthlyWaterData> {
    const userId = useAuthStore.getState().user?.id;
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Ưu tiên gọi trực tiếp lên Supabase để lấy dữ liệu (vì người dùng không dùng backend local nữa)
    if (userId && url && anonKey) {
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const m = month + 1;
        const y = m > 12 ? year + 1 : year;
        const nextMonthStr = `${y}-${String(m > 12 ? 1 : m).padStart(2, '0')}-01`;

        const { data } = await axios.get(`${url}/rest/v1/WaterIntake`, {
          params: {
            UserId: `eq.${userId}`,
            IntakeDate: `gte.${startDate}`,
            select: 'AmountMl,IntakeDate',
          },
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });

        const validRecords = Array.isArray(data)
          ? data.filter((d: any) => d.IntakeDate < nextMonthStr)
          : [];

        const totalMl = validRecords.reduce((acc, curr) => acc + (curr.AmountMl || 0), 0);
        const daysWithData = validRecords.filter((d: any) => d.AmountMl > 0).length;
        const averageMl = daysWithData > 0 ? totalMl / daysWithData : 0;

        return {
          year,
          month,
          totalMl,
          averageMl,
          daysWithData,
        };
      } catch (err) {
        console.warn('[waterService] Supabase fallback fetch failed:', err);
      }
    }

    // Nếu thất bại hoặc không có config, fallback về gọi API backend (phòng trường hợp sau này deploy code mới cho /monthly)
    try {
      const { data } = await apiClient.get<MonthlyWaterData>('/api/water-intake/monthly', {
        params: { year, month },
      });
      return data;
    } catch {
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
