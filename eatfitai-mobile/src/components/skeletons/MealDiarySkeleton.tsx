/**
 * MealDiarySkeleton - Loading skeleton cho MealDiary screen
 * Hiển thị khi đang tải danh sách nhật ký bữa ăn
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import Screen from '../Screen';
import { GradientBackground } from '../GradientBackground';

export const MealDiarySkeleton = (): React.ReactElement => {
    const { theme } = useAppTheme();

    // Tạo skeleton cho một meal section
    const MealSectionSkeleton = () => (
        <View
            style={{
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.md,
                gap: theme.spacing.md,
            }}
        >
            {/* Meal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1 }}>
                    <Skeleton width={100} height={18} />
                    <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
                </View>
                <Skeleton width={50} height={24} />
            </View>

            {/* Food Items */}
            {[1, 2].map((item) => (
                <View
                    key={item}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: theme.spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        gap: theme.spacing.md,
                    }}
                >
                    <Skeleton width={48} height={48} borderRadius={12} />
                    <View style={{ flex: 1 }}>
                        <Skeleton width={120} height={16} />
                        <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
                    </View>
                    <Skeleton width={40} height={16} />
                </View>
            ))}
        </View>
    );

    return (
        <GradientBackground>
            <Screen>
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
                    {/* Date Selector */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: theme.spacing.md }}
                    >
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                            <Skeleton
                                key={day}
                                width={50}
                                height={70}
                                borderRadius={16}
                                style={{ marginRight: theme.spacing.sm }}
                            />
                        ))}
                    </ScrollView>

                    {/* Summary Card */}
                    <View
                        style={{
                            backgroundColor: theme.colors.glass?.background || theme.colors.card,
                            borderRadius: theme.radius.xl,
                            padding: theme.spacing.lg,
                            alignItems: 'center',
                            gap: theme.spacing.md,
                        }}
                    >
                        <Skeleton width={150} height={36} />
                        <Skeleton width={100} height={16} />
                        <Skeleton width="80%" height={8} borderRadius={4} />
                    </View>

                    {/* Meal Sections */}
                    <MealSectionSkeleton />
                    <MealSectionSkeleton />
                </View>
            </Screen>
        </GradientBackground>
    );
};

export default MealDiarySkeleton;
