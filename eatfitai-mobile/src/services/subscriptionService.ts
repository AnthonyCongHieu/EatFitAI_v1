import apiClient from './apiClient';

export type SubscriptionStatus = {
  planCode: string;
  status: string;
  isPremium: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  expiresAt?: string | null;
};

export const subscriptionService = {
  async getCurrent(): Promise<SubscriptionStatus> {
    const response = await apiClient.get<SubscriptionStatus>('/api/subscription/me');
    return response.data;
  },
};
