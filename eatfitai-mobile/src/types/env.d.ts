// Khai bao toi thieu de TS khong canh bao khi dung process.env trong moi truong Expo

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_BASE_URL?: string;
      EXPO_PUBLIC_API_PORT?: string;
      EXPO_PUBLIC_API_SCHEME?: 'http' | 'https';
    }
  }

  const process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
