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
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppNavigator from './src/app/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { healthService } from './src/services/healthService';
import { t } from './src/i18n/vi';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initAnalytics } from './src/services/analytics';
import { initErrorTracking } from './src/services/errorTracking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ CACHING STRATEGY: staleTime 2 phút để giảm API calls thừa
      staleTime: 2 * 60 * 1000,       // 2 phút - data được coi là "fresh", không refetch
      gcTime: 10 * 60 * 1000,         // 10 phút - giữ cache trong memory dù không dùng
      refetchOnWindowFocus: false,    // Không refetch khi focus app lại
      refetchOnReconnect: 'always',   // Refetch khi có lại mạng sau khi mất kết nối
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

  // Ping backend health on startup and notify if unreachable
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Tat splash ngay khi font san sang de tranh nhay man hinh
      SplashScreen.hideAsync().catch(() => {
        // swallow error intentionally
      });
    }
  }, [fontsLoaded]);

  // Nen he thong se duoc cap nhat theo theme trong AppInner

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
