/**
 * FoodSearchSkeleton - Loading skeleton cho FoodSearch screen
 * Hiển thị khi đang tải kết quả tìm kiếm món ăn
 */

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';
import { GradientBackground } from '../GradientBackground';

export const FoodSearchSkeleton = (): React.ReactElement => {
    const { theme } = useAppTheme();

    // Tạo skeleton cho một food item
    const FoodItemSkeleton = () => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.md,
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.sm,
                gap: theme.spacing.md,
            }}
        >
            {/* Thumbnail */}
            <Skeleton width={56} height={56} borderRadius={12} />

            {/* Content */}
            <View style={{ flex: 1 }}>
                <Skeleton width={140} height={18} />
                <Skeleton width={100} height={14} style={{ marginTop: 6 }} />
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: 6 }}>
                    <Skeleton width={50} height={12} />
                    <Skeleton width={50} height={12} />
                    <Skeleton width={50} height={12} />
                </View>
            </View>

            {/* Action Button */}
            <Skeleton width={40} height={40} borderRadius={20} />
        </View>
    );

    return (
        <GradientBackground>
            <Screen>
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
                    {/* Search Bar */}
                    <Skeleton width="100%" height={48} borderRadius={24} />

                    {/* Category Chips */}
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                        <Skeleton width={80} height={32} borderRadius={16} />
                        <Skeleton width={100} height={32} borderRadius={16} />
                        <Skeleton width={70} height={32} borderRadius={16} />
                    </View>

                    {/* Recent Section Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Skeleton width={120} height={20} />
                        <Skeleton width={60} height={16} />
                    </View>

                    {/* Food Items */}
                    {[1, 2, 3, 4, 5].map((item) => (
                        <FoodItemSkeleton key={item} />
                    ))}
                </View>
            </Screen>
        </GradientBackground>
    );
};

export default FoodSearchSkeleton;
