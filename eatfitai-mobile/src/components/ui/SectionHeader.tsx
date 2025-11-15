import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionText?: string;
};

export const SectionHeader = ({
  title,
  subtitle,
  action,
  actionText = 'Xem tất cả',
}: SectionHeaderProps): JSX.Element => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText variant="h4" weight="600">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action && (
        <Pressable onPress={action} accessibilityRole="button">
          <ThemedText color="primary" weight="600">
            {actionText}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
});

export default SectionHeader;