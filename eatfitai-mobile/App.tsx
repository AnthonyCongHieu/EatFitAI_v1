import 'react-native-gesture-handler';
import { useEffect } from 'react';
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
  Inter_700Bold 
} from '@expo-google-fonts/inter';

import AppNavigator from './src/app/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { healthService } from './src/services/healthService';

// Giu splash toi khi font duoc load day du
void SplashScreen.preventAutoHideAsync();
// Hoan tat phien duyet web cho AuthSession (Google Sign-in)
WebBrowser.maybeCompleteAuthSession();

const AppInner = () => {
  const { theme } = useAppTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme.colors.background]);

  // Ping backend health on startup and notify if unreachable
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await healthService.pingRoot();
      if (!cancelled && !res.ok) {
        Toast.show({
          type: 'error',
          text1: 'Không kết nối được máy chủ',
          text2: 'Vui lòng kiểm tra API_BASE_URL hoặc mạng LAN',
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

export default function App(): JSX.Element | null {
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
          <AppInner />
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
