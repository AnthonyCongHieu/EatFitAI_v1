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

import { AppTheme, darkTheme, lightTheme, toNavigationTheme } from './themes';

type ThemeContextValue = {
  theme: AppTheme;
  navigationTheme: ReturnType<typeof toNavigationTheme>;
  mode: AppTheme['mode'];
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<AppTheme['mode']>(systemScheme ?? 'light');

  useEffect(() => {
    if (systemScheme) {
      setMode(systemScheme);
    }
  }, [systemScheme]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo<AppTheme>(() => {
    return mode === 'dark' ? darkTheme : lightTheme;
  }, [mode]);

  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      navigationTheme,
      mode,
      toggleTheme,
    }),
    [theme, navigationTheme, mode, toggleTheme],
  );

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
