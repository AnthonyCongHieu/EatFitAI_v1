import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BeVietnamPro_300Light,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import Toast from 'react-native-toast-message';

import AppNavigator from './src/app/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { t } from './src/i18n/vi';
import { initAnalytics } from './src/services/analytics';
import { initializeApiClient } from './src/services/apiClient';
import { initErrorTracking } from './src/services/errorTracking';
import { healthService } from './src/services/healthService';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 401) {
            if (__DEV__) {
              console.log('[QueryClient] Skipping retry for 401 Unauthorized');
            }
            return false;
          }

          return failureCount < 3;
        },
      },
    },
  });

const queryClient = createQueryClient();

void SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

const AppInner = () => {
  const { theme } = useAppTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
    initErrorTracking().catch(() => {});
    initAnalytics().catch(() => {});
  }, [theme.colors.background]);

  useEffect(() => {
    initializeApiClient().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

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
      <Toast position="bottom" />
    </>
  );
};

export default function App(): React.ReactElement | null {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_300Light,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);
  const canRenderApp = fontsLoaded || !!fontError || fontLoadTimedOut;
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        console.warn('[App] Font loading timed out. Rendering with fallback fonts.');
        setFontLoadTimedOut(true);
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  const hideSplashScreen = useCallback(async () => {
    if (!canRenderApp || splashHiddenRef.current) {
      return;
    }

    splashHiddenRef.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch {
      splashHiddenRef.current = false;
    }
  }, [canRenderApp]);

  useEffect(() => {
    if (!canRenderApp) {
      return;
    }

    void hideSplashScreen();
  }, [canRenderApp, hideSplashScreen]);

  if (!canRenderApp) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={() => void hideSplashScreen()}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary
              onRetry={() => {
                queryClient.clear();
              }}
            >
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
