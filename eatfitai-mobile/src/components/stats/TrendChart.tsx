import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

interface DayData {
    date: string;
    calories: number;
    targetCalories?: number;
}

interface TrendChartProps {
    data: DayData[];
    highlightBest?: boolean;
    onBarPress?: (day: DayData) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Trend Chart - Animated bar chart với gradient
 * 2026 trend: Animated entry, gradient bars, highlight best day
 */
export const TrendChart: React.FC<TrendChartProps> = ({
    data,
    highlightBest = true,
    onBarPress,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Tìm max để scale bars
    const maxCalories = Math.max(...data.map(d => d.calories), 1);
    const bestDayIndex = data.reduce(
        (maxIdx, day, idx, arr) => day.calories > arr[maxIdx]!.calories ? idx : maxIdx,
        0
    );

    const styles = StyleSheet.create({
        container: {
            paddingVertical: theme.spacing.md,
        },
        barsContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: 140,
            paddingHorizontal: theme.spacing.sm,
        },
        barWrapper: {
            flex: 1,
            alignItems: 'center',
            marginHorizontal: 4,
        },
        bar: {
            width: '80%',
            borderRadius: 8,
            minHeight: 4,
        },
        label: {
            marginTop: theme.spacing.xs,
        },
        valueLabel: {
            position: 'absolute',
            top: -20,
            fontSize: 10,
            fontWeight: '600',
        },
        legendRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.lg,
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        },
        legendItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        legendDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
        },
    });

    const getBarColor = (index: number, calories: number, target?: number) => {
        if (highlightBest && index === bestDayIndex) {
            return theme.colors.primary;
        }
        if (target && calories >= target * 0.9) {
            return theme.colors.success;
        }
        if (calories === 0) {
            return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        }
        return theme.colors.chart?.bar || theme.colors.primary + '90';
    };

    const handleBarPress = (day: DayData) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onBarPress?.(day);
    };

    return (
        <View style={styles.container}>
            <View style={styles.barsContainer}>
                {data.map((day, index) => {
                    const height = (day.calories / maxCalories) * 120 + 4;
                    const isBest = highlightBest && index === bestDayIndex && day.calories > 0;

                    return (
                        <Pressable
                            key={day.date}
                            style={({ pressed }) => [
                                styles.barWrapper,
                                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                            ]}
                            onPress={() => handleBarPress(day)}
                        >
                            <Animated.View
                                entering={FadeInUp.delay(index * 80).springify()}
                                style={[
                                    styles.bar,
                                    {
                                        height,
                                        backgroundColor: getBarColor(index, day.calories, day.targetCalories),
                                        // Glow effect for best day
                                        shadowColor: isBest ? theme.colors.primary : 'transparent',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: isBest ? 0.6 : 0,
                                        shadowRadius: 8,
                                        elevation: isBest ? 4 : 0,
                                    },
                                ]}
                            />
                            {/* Day label */}
                            <ThemedText
                                variant="caption"
                                weight={isBest ? '700' : '500'}
                                color={isBest ? 'primary' : 'textSecondary'}
                                style={styles.label}
                            >
                                {WEEKDAYS[index]}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                    <ThemedText variant="caption" color="textSecondary">Đạt mục tiêu</ThemedText>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                    <ThemedText variant="caption" color="textSecondary">Cao nhất</ThemedText>
                </View>
            </View>
        </View>
    );
};

export default TrendChart;
