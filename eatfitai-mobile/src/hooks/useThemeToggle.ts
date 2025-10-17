import { useAppTheme } from '../theme/ThemeProvider';

export const useThemeToggle = (): (() => void) => {
  const { toggleTheme } = useAppTheme();
  return toggleTheme;
};
