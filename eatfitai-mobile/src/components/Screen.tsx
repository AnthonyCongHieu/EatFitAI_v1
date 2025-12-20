import type { ReactElement, ReactNode } from 'react';
import type {
  RefreshControlProps,
  ScrollViewProps,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { ScrollView, View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../theme/ThemeProvider';

type ScreenProps = {
  children: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  style?: ScrollViewProps['style'] & ViewProps['style'];
  refreshControl?: ReactElement<RefreshControlProps>;
  scroll?: boolean;
  // Tùy chọn padding - mặc định true cho tất cả màn hình
  useSafeArea?: boolean;
  // Padding ngang mặc định
  horizontalPadding?: boolean;
  // Header có sẵn (bỏ padding top)
  hasHeader?: boolean;
  // Sử dụng gradient background - mặc định true
  useGradient?: boolean;
};

export const Screen = ({
  children,
  contentContainerStyle,
  style,
  refreshControl,
  scroll = true,
  useSafeArea = true,
  horizontalPadding = true,
  hasHeader = false,
  useGradient = true,
}: ScreenProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Tính padding dựa vào safe area
  const paddingTop =
    useSafeArea && !hasHeader
      ? Math.max(
        insets.top,
        Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
      )
      : 0;
  const paddingBottom = useSafeArea ? Math.max(insets.bottom, 16) : 0;
  const paddingHorizontal = horizontalPadding ? theme.spacing.lg : 0;

  // Container style chung
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  };

  // Content style với padding và bo góc
  const contentStyle: ViewStyle = {
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    flexGrow: 1,
  };

  // Wrapper component - dùng LinearGradient nếu useGradient = true
  const BackgroundWrapper = useGradient
    ? ({ children: wrapperChildren, wrapperStyle }: { children: ReactNode; wrapperStyle?: ViewStyle }) => (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, wrapperStyle]}
      >
        {wrapperChildren}
      </LinearGradient>
    )
    : ({ children: wrapperChildren, wrapperStyle }: { children: ReactNode; wrapperStyle?: ViewStyle }) => (
      <View style={[containerStyle, wrapperStyle]}>{wrapperChildren}</View>
    );

  if (scroll) {
    return (
      <BackgroundWrapper wrapperStyle={style as ViewStyle}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[contentStyle, contentContainerStyle]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper wrapperStyle={style as ViewStyle}>
      <View style={contentStyle}>{children}</View>
    </BackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});

export default Screen;
