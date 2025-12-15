import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import Icon from '../Icon';

interface InsightBubbleProps {
    icon?: string;
    text: string;
    type?: 'info' | 'success' | 'warning';
    trend?: {
        value: number;
        isPositive?: boolean;
    };
}

/**
 * Insight Bubble - AI-generated tip với icon
 * 2026 trend: Contextual insights, micro-animations
 */
export const InsightBubble: React.FC<InsightBubbleProps> = ({
    icon = '💡',
    text,
    type = 'info',
    trend,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const getBackground = () => {
        switch (type) {
            case 'success':
                return isDark ? 'rgba(72, 187, 120, 0.15)' : 'rgba(72, 187, 120, 0.1)';
            case 'warning':
                return isDark ? 'rgba(237, 137, 54, 0.15)' : 'rgba(237, 137, 54, 0.1)';
            default:
                return isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)';
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success':
                return theme.colors.success + '40';
            case 'warning':
                return theme.colors.warning + '40';
            default:
                return theme.colors.primary + '30';
        }
    };

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            backgroundColor: getBackground(),
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: getBorderColor(),
            gap: theme.spacing.sm,
        },
        iconWrapper: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        textContainer: {
            flex: 1,
        },
        trendContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 4,
            borderRadius: theme.radius.sm,
        },
    });

    return (
        <Animated.View entering={FadeInRight.springify()} style={styles.container}>
            <View style={styles.iconWrapper}>
                <ThemedText style={{ fontSize: 16 }}>{icon}</ThemedText>
            </View>

            <View style={styles.textContainer}>
                <ThemedText variant="bodySmall">
                    {text}
                </ThemedText>
            </View>

            {trend && (
                <View
                    style={[
                        styles.trendContainer,
                        {
                            backgroundColor: trend.isPositive
                                ? theme.colors.success + '20'
                                : theme.colors.danger + '20',
                        },
                    ]}
                >
                    <Icon
                        name={trend.isPositive ? 'trending-up' : 'trending-down'}
                        size="sm"
                        color={trend.isPositive ? 'success' : 'danger'}
                    />
                    <ThemedText
                        variant="caption"
                        weight="600"
                        style={{
                            color: trend.isPositive ? theme.colors.success : theme.colors.danger,
                        }}
                    >
                        {trend.value}%
                    </ThemedText>
                </View>
            )}
        </Animated.View>
    );
};

export default InsightBubble;
