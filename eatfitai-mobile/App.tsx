import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogBox, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BeVietnamPro_300Light,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MochiPreviewScreen from './src/app/screens/dev/MochiPreviewScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { E2E_AUTOMATION_ENABLED } from './src/config/automation';
import { t } from './src/i18n/vi';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { toastConfig } from './src/config/toastConfig';

type WebPreviewStackParamList = {
  MochiPreview: undefined;
};
type MobileControlGateComponent = React.ComponentType<React.PropsWithChildren>;

let AppNavigatorComponent: React.ComponentType | null = null;
let MobileControlGateComponentRef: MobileControlGateComponent | null = null;
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const getAppNavigator = (): React.ComponentType => {
  if (AppNavigatorComponent) {
    return AppNavigatorComponent;
  }

  const LoadedAppNavigator = require('./src/app/navigation/AppNavigator')
    .default as React.ComponentType;
  AppNavigatorComponent = LoadedAppNavigator;
  return LoadedAppNavigator;
};

const getMobileControlGate = (): MobileControlGateComponent => {
  if (MobileControlGateComponentRef) {
    return MobileControlGateComponentRef;
  }

  const LoadedMobileControlGate = require('./src/components/MobileControlGate')
    .default as MobileControlGateComponent;
  MobileControlGateComponentRef = LoadedMobileControlGate;
  return LoadedMobileControlGate;
};
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

const WebPreviewStack = createNativeStackNavigator<WebPreviewStackParamList>();
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
const getWebPreviewMode = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('preview');
};

const DEV_LOGBOX_IGNORES = [
  '[expo-av]: Expo AV has been deprecated and will be removed in SDK 54.',
  '[Reanimated] Reduced motion setting is enabled on this device.',
  '[EatFitAI]',
  '[Onboarding]',
  '[useAuthStore]',
  '[GoogleAuth]',
  '[InsightsCard]',
  '[AI Insights]',
  'Image compression failed, using original:',
  'EatFitAI API warning:',
];

void SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

if (__DEV__) {
  if (E2E_AUTOMATION_ENABLED) {
    LogBox.ignoreAllLogs();
  } else {
    LogBox.ignoreLogs(DEV_LOGBOX_IGNORES);
  }
}

const MochiWebPreviewNavigator = (): React.ReactElement => {
  const { navigationTheme, theme } = useAppTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <WebPreviewStack.Navigator
        initialRouteName="MochiPreview"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <WebPreviewStack.Screen name="MochiPreview">
          {() => <MochiPreviewScreen uiOnly />}
        </WebPreviewStack.Screen>
      </WebPreviewStack.Navigator>
    </NavigationContainer>
  );
};

const MainAppNavigator = (): React.ReactElement => {
  const AppNavigator = getAppNavigator();
  const MobileControlGate = getMobileControlGate();

  return (
    <MobileControlGate>
      <AppNavigator />
    </MobileControlGate>
  );
};

const AppInner = () => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webPreviewMode = getWebPreviewMode();
  const isMochiWebPreview = webPreviewMode === 'mochi';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
    if (isMochiWebPreview) {
      return;
    }

    import('./src/services/errorTracking')
      .then(({ initErrorTracking }) => initErrorTracking())
      .catch(() => {});
    import('./src/services/analytics')
      .then(({ initAnalytics }) => initAnalytics())
      .catch(() => {});
    import('./src/services/notificationService')
      .then(({ initializeNotifications }) => initializeNotifications())
      .catch(() => {});
  }, [isMochiWebPreview, theme.colors.background]);

  useEffect(() => {
    if (isMochiWebPreview) {
      return;
    }

    import('./src/services/apiClient')
      .then(({ initializeApiClient }) => initializeApiClient())
      .catch(() => {});
  }, [isMochiWebPreview]);

  useEffect(() => {
    if (E2E_AUTOMATION_ENABLED || isMochiWebPreview) {
      return;
    }

    let cancelled = false;

    (async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 750));

      const { healthService } = await import('./src/services/healthService');
      const res = await healthService.warmUpBackend({
        maxAttempts: 3,
        delayMs: 4000,
        timeoutMs: 15000,
      });
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
  }, [isMochiWebPreview]);

  return (
    <>
      {isMochiWebPreview ? (
        <View style={styles.webPreviewShell}>
          <View style={styles.webPreviewFrame}>
            <MochiWebPreviewNavigator />
          </View>
        </View>
      ) : (
        <MainAppNavigator />
      )}
      <StatusBar style={theme.statusBarStyle} />
      <Toast position="top" topOffset={insets.top + 10} config={toastConfig} />
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
  webPreviewFrame: {
    flex: 1,
    maxWidth: 430,
    overflow: 'hidden',
    width: '100%',
  },
  webPreviewShell: {
    alignItems: 'center',
    backgroundColor: '#070B14',
    flex: 1,
    width: '100%',
  },
});
