import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  BeVietnamPro_300Light,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppNavigator from './src/app/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { healthService } from './src/services/healthService';
import { t } from './src/i18n/vi';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initAnalytics } from './src/services/analytics';
import { initErrorTracking } from './src/services/errorTracking';
import { initializeApiClient } from './src/services/apiClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ CACHING STRATEGY: Giảm thiểu API calls thừa
      staleTime: 5 * 60 * 1000,       // 5 phút - coi là fresh, chỉ refetch nếu cực kỳ cần thiết
      gcTime: 30 * 60 * 1000,         // 30 phút - giữ cache lâu hơn trong memory
      refetchOnWindowFocus: false,    // Không refetch khi focus app lại
      refetchOnReconnect: false,      // Không refetch tự động khi có mạng lại (để user tự pull-to-refresh)
      retry: (failureCount, error: any) => {
        // Stop retry on 401 Unauthorized để tránh infinite loop
        // Auth interceptor sẽ tự động logout user
        if (error?.response?.status === 401) {
          if (__DEV__) {
            console.log('[QueryClient] Skipping retry for 401 Unauthorized');
          }
          return false;
        }
        // Default retry logic (max 3 lần)
        return failureCount < 3;
      },
    },
  },
});


// Giu splash toi khi font duoc load day du
void SplashScreen.preventAutoHideAsync();
// Hoan tat phien duyet web cho AuthSession (Google Sign-in)
WebBrowser.maybeCompleteAuthSession();

const AppInner = () => {
  const { theme } = useAppTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => { });
    initErrorTracking().catch(() => { });
    initAnalytics().catch(() => { });
  }, [theme.colors.background]);

  // Background: Initialize API client (IP discovery nếu cần)
  // Chạy background, không block app startup
  useEffect(() => {
    initializeApiClient().catch(() => { });
  }, []);

  // Ping backend health on startup and notify if unreachable
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Đợi 1s để initializeApiClient có thời gian chạy
      await new Promise<void>(resolve => setTimeout(resolve, 1000));

      const res = await healthService.pingRoot();
      if (!cancelled && !res.ok) {
        Toast.show({
          type: 'error',
          text1: t('app.serverConnectionError'),
          text2: t('app.checkApiUrl'),
          visibilityTime: 4000,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={theme.statusBarStyle} />
      {/* Toast toan cuc de hien thong bao */}
      <Toast position="bottom" />
    </>
  );
};

export default function App(): React.ReactElement | null {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_300Light,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  // Fallback: Hide splash sau 5s dù fonts có load hay không
  useEffect(() => {
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Boc SafeArea de tranh che notch */}
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
              <AppInner />
            </ErrorBoundary>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
