/**
 * AppImage - Enhanced image component with lazy loading and placeholder
 * Features:
 * - Blur placeholder while loading
 * - Fade-in animation on load
 * - Error fallback with emoji
 * - Memory + disk caching
 */

import { useState, useCallback } from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleSheet, View, ImageStyle, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface AppImageProps extends Omit<ImageProps, 'style'> {
  style?: ImageStyle | ViewStyle;
  /** Show placeholder while loading */
  showPlaceholder?: boolean;
  /** Fallback emoji when image fails to load */
  fallbackEmoji?: string;
  /** Blur hash for placeholder (base64 blurhash) */
  blurHash?: string;
}

export const AppImage = ({
  style,
  showPlaceholder = true,
  fallbackEmoji = '🍽️',
  blurHash,
  onLoad,
  onError,
  ...props
}: AppImageProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback((e: any) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  }, [onError]);

  const styles = StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    shimmer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    fallback: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    fallbackEmoji: {
      fontSize: 24,
    },
  });

  // If error, show fallback
  if (hasError) {
    return (
      <View style={[styles.container, style as ViewStyle]}>
        <View style={styles.fallback}>
          <ThemedText style={styles.fallbackEmoji}>{fallbackEmoji}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style as ViewStyle]}>
      {/* Placeholder while loading */}
      {showPlaceholder && isLoading && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(200)}
          style={styles.placeholder}
        >
          <View style={styles.shimmer} />
        </Animated.View>
      )}

      {/* Actual Image */}
      <Image
        style={[{ width: '100%', height: '100%' }, style as ImageStyle]}
        transition={250}
        contentFit="cover"
        cachePolicy="memory-disk"
        placeholder={blurHash}
        placeholderContentFit="cover"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </View>
  );
};

export default AppImage;

