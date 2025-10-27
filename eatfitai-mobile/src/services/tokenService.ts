import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export type RefreshTokenResponse = {
  MaAccessToken: string;
  MaRefreshToken?: string;
  ThoiGianHetHanAccessToken?: string;
  ThoiGianHetHanRefreshToken?: string;
};

const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

export const postRefreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await refreshClient.post('/api/auth/refresh', { MaRefreshToken: refreshToken });
  return response.data as RefreshTokenResponse;
};
