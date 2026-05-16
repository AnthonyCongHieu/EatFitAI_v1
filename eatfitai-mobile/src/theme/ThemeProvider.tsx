import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppTheme, darkTheme, lightTheme, toNavigationTheme } from './themes';

const THEME_STORAGE_KEY = '@eatfitai_theme_mode';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: AppTheme;
  navigationTheme: ReturnType<typeof toNavigationTheme>;
  mode: AppTheme['mode'];
  /** Preference lưu bởi user: 'light' | 'dark' | 'system' */
  preference: ThemePreference;
  toggleTheme: () => void;
  setThemePreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactElement => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Resolve actual mode from preference
  const mode = useMemo<AppTheme['mode']>(() => {
    if (preference === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return preference;
  }, [preference, systemScheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light';
    setThemePreference(next);
  }, [mode, setThemePreference]);

  const theme = useMemo<AppTheme>(() => {
    return mode === 'dark' ? darkTheme : lightTheme;
  }, [mode]);

  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      navigationTheme,
      mode,
      preference,
      toggleTheme,
      setThemePreference,
    }),
    [theme, navigationTheme, mode, preference, toggleTheme, setThemePreference],
  );

  // Don't render until preference is loaded to prevent flash
  if (!loaded) return <></>;

  return (
    // Chia sẻ theme cho toàn app để đổi sáng/tối tức thì
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider.');
  }

  return context;
};

export const useOptionalAppTheme = (): ThemeContextValue | undefined =>
  useContext(ThemeContext);
