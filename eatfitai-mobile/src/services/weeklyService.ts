/**
 * Weekly Check-in Service
 * API calls for weekly tracking feature
 */

import apiClient from './apiClient';

export interface WeeklyCheckInData {
    weeklyCheckInId: number;
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    weightKg: number;
    weightChange?: number;
    avgCalories?: number;
    targetCalories?: number;
    avgProtein?: number;
    avgCarbs?: number;
    avgFat?: number;
    daysLogged: number;
    goal: 'lose' | 'maintain' | 'gain';
    aiSuggestion?: string;
    isOnTrack: boolean;
    suggestedCalories?: number;
    notes?: string;
    createdAt: string;
}

export interface WeeklyStats {
    daysLogged: number;
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
}

export interface CurrentWeekResponse {
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    hasCheckedIn: boolean;
    checkIn?: WeeklyCheckInData;
    previousWeight?: number;
    weeklyStats: WeeklyStats;
    targetCalories?: number;
}

export interface WeeklySummary {
    totalWeeks: number;
    startingWeight?: number;
    currentWeight?: number;
    totalWeightChange?: number;
    avgWeeklyChange?: number;
    onTrackPercentage: number;
    streak: number;
}

export interface WeeklyHistoryResponse {
    items: WeeklyCheckInData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CheckInRequest {
    weightKg: number;
    goal?: string;
    notes?: string;
}

class WeeklyService {
    /**
     * Get current week's check-in status and info
     */
    async getCurrentWeek(): Promise<CurrentWeekResponse> {
        const { data } = await apiClient.get<CurrentWeekResponse>('/api/weeklycheckin/current');
        return data;
    }

    /**
     * Submit a weekly check-in
     */
    async submitCheckIn(request: CheckInRequest): Promise<{
        message: string;
        checkIn: {
            weeklyCheckInId: number;
            weekNumber: number;
            weightKg: number;
            weightChange?: number;
            isOnTrack: boolean;
            aiSuggestion?: string;
            suggestedCalories?: number;
        };
    }> {
        const { data } = await apiClient.post('/api/weeklycheckin', request);
        return data;
    }

    /**
     * Get check-in history
     */
    async getHistory(page = 1, pageSize = 10): Promise<WeeklyHistoryResponse> {
        const { data } = await apiClient.get<WeeklyHistoryResponse>('/api/weeklycheckin/history', {
            params: { page, pageSize },
        });
        return data;
    }

    /**
     * Get summary statistics
     */
    async getSummary(): Promise<WeeklySummary> {
        const { data } = await apiClient.get<WeeklySummary>('/api/weeklycheckin/summary');
        return data;
    }
}

export const weeklyService = new WeeklyService();
