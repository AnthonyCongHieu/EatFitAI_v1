import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  description,
  action,
  style,
}) => {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { paddingVertical: theme.spacing.xxl }, style]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Icon name={icon} size="xl" color="primary" />
        </View>

        <ThemedText variant="h3" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          {title}
        </ThemedText>

        {description && (
          <ThemedText
            variant="body"
            color="textSecondary"
            style={{
              textAlign: 'center',
              marginTop: theme.spacing.sm,
              marginHorizontal: theme.spacing.lg,
            }}
          >
            {description}
          </ThemedText>
        )}

        {action && (
          <View style={{ marginTop: theme.spacing.xl }}>
            {action}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmptyState;
