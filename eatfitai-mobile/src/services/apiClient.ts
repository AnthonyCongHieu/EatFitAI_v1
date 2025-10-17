import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10000,
});

// Thêm interceptor để log lỗi rõ ràng khi call API
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('EatFitAI API error:', error);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
