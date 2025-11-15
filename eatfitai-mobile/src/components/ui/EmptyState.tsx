import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { Button } from '../Button';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: string;
  action?: React.ReactNode;
};

export const EmptyState = ({
  title,
  description,
  icon,
  action,
}: EmptyStateProps): JSX.Element => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
            <Icon name={icon} size="xl" color="primary" />
          </View>
        )}

        <ThemedText variant="h3" style={styles.title}>
          {title}
        </ThemedText>

        <ThemedText variant="body" color="textSecondary" style={styles.description}>
          {description}
        </ThemedText>

        {action && (
          <View style={styles.actionContainer}>
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
    paddingVertical: 40,
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
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
  },
});

export default EmptyState;