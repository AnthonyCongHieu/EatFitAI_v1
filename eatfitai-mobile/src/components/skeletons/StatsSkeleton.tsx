import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';

export const StatsSkeleton = () => {
  const { theme } = useAppTheme();

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        {/* Header */}
        <View style={{ gap: theme.spacing.xs }}>
          <Skeleton width="40%" height={32} />
          <Skeleton width="60%" height={20} />
        </View>

        {/* Date Navigator */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={150} height={24} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>

        {/* Chart Area */}
        <Skeleton width="100%" height={220} borderRadius={16} />

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <Skeleton width="47%" height={100} borderRadius={16} />
          <Skeleton width="47%" height={100} borderRadius={16} />
          <Skeleton width="47%" height={100} borderRadius={16} />
          <Skeleton width="47%" height={100} borderRadius={16} />
        </View>
      </View>
    </Screen>
  );
};
