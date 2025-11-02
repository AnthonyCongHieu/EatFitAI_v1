import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

export const postRefreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await refreshClient.post('/api/auth/refresh', { refreshToken });
  return response.data as RefreshTokenResponse;
};
