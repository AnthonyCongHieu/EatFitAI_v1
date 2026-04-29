// Khai bao toi thieu de TS khong canh bao khi dung process.env trong moi truong Expo

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_BASE_URL?: string;
      EXPO_PUBLIC_API_PORT?: string;
      EXPO_PUBLIC_API_SCHEME?: 'http' | 'https';
      EXPO_PUBLIC_API_FALLBACK_HOST?: string;
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
      EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS?: 'true' | 'false';
      EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN?: 'true' | 'false';
      EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL?: string;
      EXPO_PUBLIC_MEDIA_BUDGET_MODE?: string;
      EXPO_PUBLIC_DEBUG_LOGS?: 'true' | 'false';
    }
  }

  const process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};

declare module 'expo-linear-gradient' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    locations?: number[] | null;
    start?: { x: number; y: number } | [number, number];
    end?: { x: number; y: number } | [number, number];
  }

  export class LinearGradient extends React.Component<LinearGradientProps> {}
}
