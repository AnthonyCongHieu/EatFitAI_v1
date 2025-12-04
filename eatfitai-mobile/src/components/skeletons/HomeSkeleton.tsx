import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';

export const HomeSkeleton = () => {
    const { theme } = useAppTheme();

    return (
        <Screen>
            <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
                {/* Header */}
                <View style={{ gap: theme.spacing.xs }}>
                    <Skeleton width="50%" height={32} />
                    <Skeleton width="70%" height={20} />
                </View>

                {/* Streak Card */}
                <Skeleton width="100%" height={80} borderRadius={16} />

                {/* Hero Card */}
                <Skeleton width="100%" height={200} borderRadius={20} />

                {/* Macros */}
                <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    <Skeleton style={{ flex: 1 }} height={80} borderRadius={12} />
                    <Skeleton style={{ flex: 1 }} height={80} borderRadius={12} />
                    <Skeleton style={{ flex: 1 }} height={80} borderRadius={12} />
                </View>

                {/* Recent Meals Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
                    <Skeleton width={120} height={24} />
                    <Skeleton width={60} height={24} />
                </View>

                {/* List Items */}
                <View style={{ gap: theme.spacing.md }}>
                    <Skeleton width="100%" height={70} borderRadius={12} />
                    <Skeleton width="100%" height={70} borderRadius={12} />
                    <Skeleton width="100%" height={70} borderRadius={12} />
                </View>
            </View>
        </Screen>
    );
};
