import 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Custom retry flag used by our refresh-token interceptor */
    _retry?: boolean;
  }

  interface AxiosRequestConfig {
    /** Custom retry flag used by our refresh-token interceptor */
    _retry?: boolean;
  }
}
