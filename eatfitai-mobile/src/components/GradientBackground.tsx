import { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeProvider';

type GradientBackgroundProps = {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success';
  children?: React.ReactNode;
  style?: ViewStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export const GradientBackground = memo(({
  variant = 'primary',
  children,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 }
}: GradientBackgroundProps) => {
  const { theme } = useAppTheme();
  const colors = theme.gradients[variant];

  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
});

export default GradientBackground;
