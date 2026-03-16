declare module 'expo-image-manipulator' {
  export const SaveFormat: {
    JPEG: 'jpeg';
    PNG: 'png';
    WEBP: 'webp';
  };

  export function manipulateAsync(
    uri: string,
    actions?: { resize?: { width?: number; height?: number } }[],
    options?: {
      compress?: number;
      format?: 'jpeg' | 'png' | 'webp';
      base64?: boolean;
    },
  ): Promise<{
    uri: string;
    width?: number;
    height?: number;
    base64?: string;
  }>;
}
