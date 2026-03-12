import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionText?: string;
  actionTestID?: string;
};

export const SectionHeader = ({
  title,
  subtitle,
  action,
  actionText = 'Xem tất cả',
  actionTestID,
}: SectionHeaderProps): React.ReactElement => {
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
        <Pressable onPress={action} accessibilityRole="button" testID={actionTestID}>
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
