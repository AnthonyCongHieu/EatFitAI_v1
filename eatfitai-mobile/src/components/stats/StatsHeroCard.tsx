import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import { SimpleAnimatedCounter } from './AnimatedCounter';

interface StatsHeroCardProps {
    value: number;
    target: number;
    unit?: string;
    label?: string;
    insight?: string;
    icon?: string;
}

/**
 * Stats Hero Card - Big number spotlight với progress ring
 * 2026 trend: Hero metrics, animated progress, insight text
 */
export const StatsHeroCard: React.FC<StatsHeroCardProps> = ({
    value,
    target,
    unit = 'kcal',
    label = 'Hôm nay',
    insight,
    icon = '🔥',
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Tính progress
    const progress = Math.min(value / target, 1);
    const percentage = Math.round(progress * 100);
    const remaining = Math.max(target - value, 0);

    // SVG circle dimensions - LARGER ring
    const size = 180;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    const styles = StyleSheet.create({
        container: {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: isDark
                ? 'rgba(74, 144, 226, 0.08)'
                : 'rgba(59, 130, 246, 0.05)',
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        },
        progressContainer: {
            position: 'relative',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
        },
        centerContent: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
        },
        icon: {
            fontSize: 32,
            marginBottom: 4,
        },
        valueRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        unit: {
            marginLeft: 4,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            marginTop: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        },
        statItem: {
            alignItems: 'center',
        },
    });

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.container}>
            {/* Progress Ring */}
            <View style={styles.progressContainer}>
                <Svg width={size} height={size}>
                    <Defs>
                        <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={theme.colors.primary} />
                            <Stop offset="100%" stopColor={theme.colors.secondary} />
                        </LinearGradient>
                    </Defs>

                    {/* Background circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Progress circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="url(#progressGradient)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${size / 2}, ${size / 2}`}
                    />
                </Svg>

                {/* Center content - shows "Calo còn lại" */}
                <View style={styles.centerContent}>
                    <SimpleAnimatedCounter
                        value={remaining}
                        variant="h1"
                        weight="700"
                        duration={1000}
                    />
                    <ThemedText variant="body" color="textSecondary">
                        Calo còn lại
                    </ThemedText>
                </View>
            </View>

            {/* Stats Row - with icons like reference */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <ThemedText variant="h4" weight="700">{Math.round(target).toLocaleString()}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedText style={{ fontSize: 14 }}>🚩</ThemedText>
                        <ThemedText variant="caption" color="textSecondary">Mục tiêu</ThemedText>
                    </View>
                </View>
                <View style={styles.statItem}>
                    <ThemedText variant="h4" weight="700" color="primary">{Math.round(value).toLocaleString()}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedText style={{ fontSize: 14 }}>🍴</ThemedText>
                        <ThemedText variant="caption" color="textSecondary">Đã nạp</ThemedText>
                    </View>
                </View>
                <View style={styles.statItem}>
                    <ThemedText variant="h4" weight="700" color="success">{percentage}%</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedText style={{ fontSize: 14 }}>🔥</ThemedText>
                        <ThemedText variant="caption" color="textSecondary">Đạt được</ThemedText>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export default StatsHeroCard;
