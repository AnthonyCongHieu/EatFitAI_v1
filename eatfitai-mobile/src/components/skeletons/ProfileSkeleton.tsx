/**
 * ProfileSkeleton - Loading skeleton cho Profile screen
 * Hiển thị khi đang tải thông tin profile người dùng
 */

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';

export const ProfileSkeleton = (): React.ReactElement => {
  const { theme } = useAppTheme();

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xl }}>
        {/* Avatar & Name Section */}
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Skeleton width={100} height={100} borderRadius={50} />
          <Skeleton width={150} height={24} />
          <Skeleton width={100} height={16} />
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={50} height={28} />
            <Skeleton width={60} height={14} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={50} height={28} />
            <Skeleton width={60} height={14} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={50} height={28} />
            <Skeleton width={60} height={14} />
          </View>
        </View>

        {/* Personal Info Card */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Skeleton width={120} height={20} />

          {/* Form Fields */}
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton width={80} height={14} />
            <Skeleton width="100%" height={44} borderRadius={8} />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Skeleton width={80} height={14} />
              <Skeleton width="100%" height={44} borderRadius={8} />
            </View>
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Skeleton width={80} height={14} />
              <Skeleton width="100%" height={44} borderRadius={8} />
            </View>
          </View>
        </View>

        {/* AI Nutrition Card */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Skeleton width={180} height={20} />
          <Skeleton width="100%" height={16} />
          <Skeleton width="100%" height={48} borderRadius={12} />
        </View>

        {/* Action Buttons */}
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton width="100%" height={48} borderRadius={12} />
          <Skeleton width="100%" height={48} borderRadius={12} />
        </View>
      </View>
    </Screen>
  );
};
