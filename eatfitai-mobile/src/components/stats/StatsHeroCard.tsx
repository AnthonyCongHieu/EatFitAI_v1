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

    // SVG circle dimensions
    const size = 140;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    const styles = StyleSheet.create({
        container: {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: isDark
                ? 'rgba(40, 40, 60, 0.8)'
                : 'rgba(255, 255, 255, 0.9)',
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            // Glass effect
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
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
            fontSize: 28,
            marginBottom: 4,
        },
        valueRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        unit: {
            marginLeft: 4,
        },
        labelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: theme.spacing.md,
            gap: theme.spacing.sm,
        },
        progressBar: {
            flex: 1,
            height: 6,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: 3,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: 3,
        },
        insightContainer: {
            marginTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            borderRadius: theme.radius.md,
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

                {/* Center content */}
                <View style={styles.centerContent}>
                    <ThemedText style={styles.icon}>{icon}</ThemedText>
                    <View style={styles.valueRow}>
                        <SimpleAnimatedCounter
                            value={value}
                            variant="h2"
                            weight="700"
                            duration={1000}
                        />
                        <ThemedText variant="body" color="textSecondary" style={styles.unit}>
                            {unit}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* Label + percentage */}
            <View style={styles.labelRow}>
                <ThemedText variant="body" color="textSecondary">
                    {label}
                </ThemedText>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: `${percentage}%`,
                                backgroundColor: progress >= 1
                                    ? theme.colors.success
                                    : progress >= 0.8
                                        ? theme.colors.primary
                                        : theme.colors.warning,
                            },
                        ]}
                    />
                </View>
                <ThemedText variant="bodySmall" weight="600" color="primary">
                    {percentage}%
                </ThemedText>
            </View>

            {/* AI Insight */}
            {insight && (
                <View style={styles.insightContainer}>
                    <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
                        💡 {insight}
                    </ThemedText>
                </View>
            )}
        </Animated.View>
    );
};

export default StatsHeroCard;
