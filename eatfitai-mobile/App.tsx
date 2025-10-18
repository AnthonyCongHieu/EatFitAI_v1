import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';

import AppNavigator from './src/app/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

// Giữ splash tới khi font được load đầy đủ
void SplashScreen.preventAutoHideAsync();
// Hoàn tất phiên duyệt web cho AuthSession (Google Sign-in)
WebBrowser.maybeCompleteAuthSession();

const AppInner = () => {
  const { theme } = useAppTheme();

  return (
    <>
      <AppNavigator />
      <StatusBar style={theme.statusBarStyle} />
    </>
  );
};

export default function App(): JSX.Element | null {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Ẩn splash ngay khi font sẵn sàng để tránh nháy trắng
      SplashScreen.hideAsync().catch(() => {
        // swallow error intentionally
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Bọc SafeArea để không bị che notch */}
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
