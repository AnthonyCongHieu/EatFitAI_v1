import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';


interface MacroProgressCardProps {
    protein: number;
    carbs: number;
    fat: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFat?: number;
}

/**
 * MacroProgressCard - Shows daily macro intake with progress bars
 * Design based on reference image with icons and current/target values
 */
export const MacroProgressCard: React.FC<MacroProgressCardProps> = ({
    protein,
    carbs,
    fat,
    targetProtein = 155,
    targetCarbs = 220,
    targetFat = 71,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const macros = [
        {
            label: 'Chất đạm',
            icon: '⚡',
            current: protein,
            target: targetProtein,
            color: '#F43F5E', // red/pink
            bgColor: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)',
        },
        {
            label: 'Đường bột',
            icon: '🌾',
            current: carbs,
            target: targetCarbs,
            color: '#3B82F6', // blue
            bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
        },
        {
            label: 'Chất béo',
            icon: '🟡',
            current: fat,
            target: targetFat,
            color: '#F59E0B', // amber/orange
            bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
        },
    ];

    const styles = StyleSheet.create({
        container: {
            // Match glass.card style - blue tint
            backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
            borderRadius: 24,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
        },
        macroItem: {
            flex: 1,
            alignItems: 'center',
            gap: 8,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        icon: {
            fontSize: 16,
        },
        progressContainer: {
            width: '100%',
            height: 8,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
        },
        progressFill: {
            height: '100%',
            borderRadius: 4,
        },
        targetIndicator: {
            position: 'absolute',
            right: 4,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)',
            borderRadius: 1,
        },
        valueText: {
            fontSize: 18,
            fontWeight: '700',
        },
        targetText: {
            fontSize: 14,
            fontWeight: '400',
            color: theme.colors.textSecondary,
        },
    });

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
            <View style={styles.row}>
                {macros.map((macro, index) => {
                    const progress = Math.min(macro.current / macro.target, 1);

                    return (
                        <View key={index} style={styles.macroItem}>
                            {/* Header with icon and label */}
                            <View style={styles.header}>
                                <ThemedText style={styles.icon}>{macro.icon}</ThemedText>
                                <ThemedText variant="caption" weight="600">
                                    {macro.label}
                                </ThemedText>
                            </View>

                            {/* Progress bar with target indicator */}
                            <View style={styles.progressContainer}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${progress * 100}%`,
                                            backgroundColor: macro.color,
                                        },
                                    ]}
                                />
                                <View style={styles.targetIndicator} />
                            </View>

                            {/* Value display: current/target */}
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <ThemedText style={[styles.valueText, { color: macro.color }]}>
                                    {Math.round(macro.current)}
                                </ThemedText>
                                <ThemedText style={styles.targetText}>
                                    /{macro.target}g
                                </ThemedText>
                            </View>
                        </View>
                    );
                })}
            </View>
        </Animated.View>
    );
};

export default MacroProgressCard;
