import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../config/env';

export type RefreshApiClient = Pick<AxiosInstance, 'post'>;

export const createRefreshClient = (): RefreshApiClient => axios.create({ baseURL: API_BASE_URL, timeout: 10000 });