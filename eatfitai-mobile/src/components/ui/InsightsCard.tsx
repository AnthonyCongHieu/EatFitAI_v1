import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ThemedText } from '../ThemedText';
import { AppCard } from './AppCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { aiService } from '../../services/aiService';

export const InsightsCard = () => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const { data, isLoading, error } = useQuery({
    queryKey: ['nutrition-insights'],
    queryFn: () => aiService.getNutritionInsights({ analysisDays: 7 }),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) return null; // Don't show loading state on home to avoid clutter
  if (error || !data) return null;

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      // Glassmorphism với primary tint
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
      borderWidth: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    insightItem: {
      marginBottom: theme.spacing.xs,
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
  });

  // Extract top 2 recommendations
  const recommendations = data.recommendations?.slice(0, 2) || [];

  if (recommendations.length === 0) return null;

  return (
    <AppCard style={styles.container}>
      <View style={styles.header}>
        <ThemedText variant="h4" color="primary">
          ✨ Gợi ý AI
        </ThemedText>
      </View>

      {recommendations.map((rec, index) => (
        <View key={index} style={styles.insightItem}>
          <ThemedText variant="bodySmall">💡</ThemedText>
          <ThemedText variant="bodySmall" style={{ flex: 1 }}>
            {rec.message}
          </ThemedText>
        </View>
      ))}

      <ThemedText
        variant="caption"
        color="textSecondary"
        style={{ marginTop: theme.spacing.xs, textAlign: 'right' }}
      >
        Dựa trên 7 ngày qua
      </ThemedText>
    </AppCard>
  );
};
