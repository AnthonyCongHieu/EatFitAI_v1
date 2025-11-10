import apiClient from './apiClient';

export type HealthStatus = {
  ok: boolean;
  detail?: string;
};

export const healthService = {
  async pingLive(): Promise<HealthStatus> {
    try {
      await apiClient.get('/api/Health/live');
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message };
    }
  },

  async pingReady(): Promise<HealthStatus> {
    try {
      await apiClient.get('/api/Health/ready');
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message };
    }
  },

  async pingRoot(): Promise<HealthStatus> {
    try {
      await apiClient.get('/health');
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message };
    }
  },
};

