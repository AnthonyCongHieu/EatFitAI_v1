import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme/ThemeProvider';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // Cho phép override gradient colors nếu cần
  colors?: readonly [string, string, string] | readonly [string, string];
}

/**
 * GradientBackground - Component nền gradient đẹp
 * Sử dụng: Wrap toàn bộ screen hoặc section cần gradient background
 *
 * Gradient sẽ tự động theo theme (light/dark mode)
 */
export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  colors,
}) => {
  const { theme } = useAppTheme();

  // Sử dụng colors từ props hoặc từ theme
  const gradientColors = colors || theme.colors.backgroundGradient;

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default GradientBackground;
