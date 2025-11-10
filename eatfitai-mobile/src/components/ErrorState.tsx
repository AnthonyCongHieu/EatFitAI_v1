import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';
import { t } from '../i18n/vi';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: string;
  style?: any;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = t('common.error'),
  description = t('common.tryAgainLater'),
  onRetry,
  icon = 'warning',
  style,
}) => {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { paddingVertical: theme.spacing.xxl }, style]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.danger ? `${theme.colors.danger}20` : '#ffebee' }]}>
          <Icon name={icon} size="xl" color="danger" />
        </View>

        <ThemedText variant="h3" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          {title}
        </ThemedText>

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

        {onRetry && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              variant="primary"
              title={t('common.retry')}
              onPress={onRetry}
            />
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

export default ErrorState;
