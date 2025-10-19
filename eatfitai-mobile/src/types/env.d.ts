// Khai báo tối thiểu để TS không cảnh báo khi dùng process.env trong môi trường Expo

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_BASE_URL?: string;
      EXPO_PUBLIC_API_PORT?: string;
      EXPO_PUBLIC_API_SCHEME?: 'http' | 'https';
    }
  }

  // process env chỉ cần dạng tối thiểu
  // (Expo sẽ thay thế biến EXPO_PUBLIC_ tại runtime)
  // eslint-disable-next-line no-var
  var process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
