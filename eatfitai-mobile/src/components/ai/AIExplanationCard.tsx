import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import Icon from '../Icon';

interface AIExplanationCardProps {
  explanation?: string | null;
  style?: any;
}

export const AIExplanationCard = ({ explanation, style }: AIExplanationCardProps) => {
  const { theme } = useAppTheme();

  if (!explanation) return null;

  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: theme.colors.primary + '30',
        },
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Icon name="sparkles" size={20} color={theme.colors.warning} />
      </View>
      <View style={styles.content}>
        <ThemedText
          variant="caption"
          style={{ color: theme.colors.textSecondary, marginBottom: 4 }}
        >
          Gợi ý từ AI
        </ThemedText>
        <ThemedText
          variant="bodySmall"
          style={{ color: theme.colors.text, lineHeight: 20 }}
        >
          {explanation}
        </ThemedText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});

