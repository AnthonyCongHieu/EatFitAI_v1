import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

interface DayData {
    date: string;
    calories: number;
}

interface CalendarHeatmapProps {
    year: number;
    month: number; // 0-11
    data: DayData[];
    onDayPress?: (date: string, calories: number) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Calendar Heatmap - GitHub-style calendar với tap interaction
 * 2026 trend: Minimalist, color intensity for data density
 */
export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
    year,
    month,
    data,
    onDayPress,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Create data map for quick lookup
    const dataMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        data.forEach(d => {
            map[d.date] = d.calories;
        });
        return map;
    }, [data]);

    // Get days for the month
    const days = React.useMemo(() => {
        const result: (Date | null)[] = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Padding for first week
        const startPadding = (firstDay.getDay() + 6) % 7;
        for (let i = 0; i < startPadding; i++) {
            result.push(null);
        }

        // Days of month
        for (let d = 1; d <= lastDay.getDate(); d++) {
            result.push(new Date(year, month, d));
        }

        return result;
    }, [year, month]);

    // Find max calories for intensity
    const maxCalories = React.useMemo(() => {
        return Math.max(...data.map(d => d.calories), 2000);
    }, [data]);

    const getHeatColor = (calories: number) => {
        if (calories === 0) {
            return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
        }
        const intensity = Math.min(calories / maxCalories, 1);
        if (intensity < 0.25) return theme.colors.success + '30';
        if (intensity < 0.5) return theme.colors.success + '60';
        if (intensity < 0.75) return theme.colors.success + '90';
        if (intensity < 1) return theme.colors.success;
        return theme.colors.warning; // Exceeded
    };

    const handleDayPress = (date: Date, calories: number) => {
        if (calories > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDayPress?.(date.toISOString().split('T')[0]!, calories);
        }
    };

    const styles = StyleSheet.create({
        container: {
            padding: theme.spacing.md,
        },
        weekdayRow: {
            flexDirection: 'row',
            marginBottom: theme.spacing.sm,
        },
        weekdayCell: {
            width: '14.28%',
            alignItems: 'center',
        },
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        cell: {
            width: '14.28%',
            aspectRatio: 1,
            padding: 2,
        },
        dayInner: {
            flex: 1,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        legend: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        },
        legendItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        legendDot: {
            width: 12,
            height: 12,
            borderRadius: 4,
        },
    });

    return (
        <Animated.View entering={FadeIn} style={styles.container}>
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
                {WEEKDAYS.map(day => (
                    <View key={day} style={styles.weekdayCell}>
                        <ThemedText variant="caption" color="textSecondary" weight="600">
                            {day}
                        </ThemedText>
                    </View>
                ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
                {days.map((date, index) => {
                    if (!date) {
                        return <View key={`empty-${index}`} style={styles.cell} />;
                    }

                    const dateStr = date.toISOString().split('T')[0]!;
                    const calories = dataMap[dateStr] || 0;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <Pressable
                            key={dateStr}
                            style={({ pressed }) => [
                                styles.cell,
                                pressed && calories > 0 && { transform: [{ scale: 0.9 }] },
                            ]}
                            onPress={() => handleDayPress(date, calories)}
                        >
                            <View
                                style={[
                                    styles.dayInner,
                                    { backgroundColor: getHeatColor(calories) },
                                    isToday && {
                                        borderWidth: 2,
                                        borderColor: theme.colors.primary,
                                    },
                                ]}
                            >
                                <ThemedText
                                    variant="caption"
                                    weight={calories > 0 ? '600' : '400'}
                                    color={calories > 0 ? undefined : 'textSecondary'}
                                >
                                    {date.getDate()}
                                </ThemedText>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} />
                    <ThemedText variant="caption" color="textSecondary">Chưa có</ThemedText>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success + '60' }]} />
                    <ThemedText variant="caption" color="textSecondary">Ít</ThemedText>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                    <ThemedText variant="caption" color="textSecondary">Nhiều</ThemedText>
                </View>
            </View>
        </Animated.View>
    );
};

export default CalendarHeatmap;
