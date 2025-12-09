/**
 * AvatarDisplay - Component hiển thị avatar với initial hoặc image
 * Dùng cho ProfileScreen và các màn hình hiển thị user info
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface AvatarDisplayProps {
  // Tên để lấy initial letter
  name?: string | null;
  // URL của avatar image (nếu có)
  imageUrl?: string | null;
  // Email hoặc subtitle hiển thị dưới avatar
  subtitle?: string | null;
  // Kích thước avatar (default: 80)
  size?: number;
  // Hiển thị subtitle hay không
  showSubtitle?: boolean;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  name,
  imageUrl,
  subtitle,
  size = 80,
  showSubtitle = true,
}) => {
  const { theme } = useAppTheme();

  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          accessibilityLabel={`Avatar của ${name || 'người dùng'}`}
        />
      ) : (
        <View
          style={[
            styles.initialContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.primaryLight,
            },
          ]}
          accessibilityLabel={`Avatar chữ cái ${initial}`}
        >
          <ThemedText variant="h1" color="primary" style={{ fontSize: size * 0.4 }}>
            {initial}
          </ThemedText>
        </View>
      )}

      {showSubtitle && subtitle && (
        <ThemedText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    resizeMode: 'cover',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 8,
  },
});

export default AvatarDisplay;
