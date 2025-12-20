/**
 * RecipeSkeleton - Loading skeleton cho Recipe screens
 * Dùng cho RecipeSuggestionsScreen và RecipeDetailScreen
 */

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';

export const RecipeSkeleton = (): React.ReactElement => {
  const { theme } = useAppTheme();

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        {/* Header */}
        <View style={{ gap: theme.spacing.xs }}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={18} />
        </View>

        {/* Search/Filter Bar */}
        <Skeleton width="100%" height={48} borderRadius={12} />

        {/* Tags/Chips */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={100} height={32} borderRadius={16} />
          <Skeleton width={70} height={32} borderRadius={16} />
        </View>

        {/* Recipe Cards */}
        <View style={{ gap: theme.spacing.md }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: theme.spacing.md,
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                padding: theme.spacing.md,
              }}
            >
              {/* Recipe Image */}
              <Skeleton width={100} height={100} borderRadius={12} />

              {/* Recipe Info */}
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <Skeleton width="80%" height={20} />
                <Skeleton width="60%" height={16} />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                    marginTop: 'auto',
                  }}
                >
                  <Skeleton width={60} height={24} borderRadius={12} />
                  <Skeleton width={60} height={24} borderRadius={12} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
};

export const RecipeDetailSkeleton = (): React.ReactElement => {
  const { theme } = useAppTheme();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        {/* Hero Image */}
        <Skeleton width="100%" height={250} />

        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          {/* Title */}
          <View style={{ gap: theme.spacing.xs }}>
            <Skeleton width="80%" height={28} />
            <Skeleton width="50%" height={18} />
          </View>

          {/* Nutrition Summary */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Skeleton style={{ flex: 1 }} height={70} borderRadius={12} />
            <Skeleton style={{ flex: 1 }} height={70} borderRadius={12} />
            <Skeleton style={{ flex: 1 }} height={70} borderRadius={12} />
          </View>

          {/* Ingredients Section */}
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton width={120} height={24} />
            <Skeleton width="100%" height={40} borderRadius={8} />
            <Skeleton width="100%" height={40} borderRadius={8} />
            <Skeleton width="100%" height={40} borderRadius={8} />
          </View>

          {/* Instructions Section */}
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton width={120} height={24} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </View>
        </View>
      </View>
    </Screen>
  );
};
