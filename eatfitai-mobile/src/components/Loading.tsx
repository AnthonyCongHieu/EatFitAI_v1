import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type LoadingProps = {
  message?: string;
  fullHeight?: boolean;
};

export const Loading = ({ message, fullHeight = false }: LoadingProps): React.ReactElement => {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, fullHeight && styles.fullHeight]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? (
        <ThemedText
          variant="body"
          color="textSecondary"
          style={{ marginTop: theme.spacing.md }}
        >
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  fullHeight: {
    flex: 1,
  },
});

export default Loading;
