/**
 * AnimatedEmptyState - Enhanced empty state with animated illustrations
 * Provides engaging, actionable empty states for better UX
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { useAppTheme } from '../../theme/ThemeProvider';

export type EmptyStateVariant =
    | 'no-food'
    | 'no-search-results'
    | 'no-favorites'
    | 'no-history'
    | 'no-achievements'
    | 'error'
    | 'offline'
    | 'custom';

interface AnimatedEmptyStateProps {
    /** Predefined variant for common empty states */
    variant?: EmptyStateVariant;
    /** Custom emoji for display */
    emoji?: string;
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Primary action button */
    primaryAction?: {
        label: string;
        onPress: () => void;
        icon?: string;
    };
    /** Secondary action button */
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
    /** Container style */
    style?: ViewStyle;
    /** Compact mode for smaller spaces */
    compact?: boolean;
}

export const AnimatedEmptyState = ({
    variant: _variant = 'custom',
    emoji: _emoji,
    title,
    description,
    primaryAction,
    secondaryAction,
    style,
    compact = false,
}: AnimatedEmptyStateProps): React.ReactElement => {
    const { theme } = useAppTheme();

    // Animation values
    const scale = useSharedValue(1);

    useEffect(() => {
        // Subtle pulse for the container
        scale.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2000 }),
                withTiming(1, { duration: 2000 }),
            ),
            -1,
            true,
        );
    }, []);

    const containerAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const styles = StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: compact ? theme.spacing.xl : 60,
            paddingBottom: compact ? theme.spacing.xl : theme.spacing.xxl,
            paddingHorizontal: theme.spacing.lg,
        },
        emojiContainer: {
            width: compact ? 80 : 100,
            height: compact ? 80 : 100,
            borderRadius: compact ? 40 : 50,
            backgroundColor: theme.colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
        },
        emoji: {
            fontSize: compact ? 36 : 44,
        },
        textContainer: {
            alignItems: 'center',
            maxWidth: 300,
        },
        title: {
            textAlign: 'center',
            marginBottom: theme.spacing.sm,
        },
        description: {
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
        },
        actionsContainer: {
            gap: theme.spacing.md,
            alignItems: 'center',
            width: '100%',
        },
        secondaryButton: {
            padding: theme.spacing.sm,
        },
    });

    return (
        <Animated.View
            entering={FadeInUp.springify()}
            style={[styles.container, containerAnimStyle, style]}
        >
            {/* Text Content - no emoji */}
            <View style={styles.textContainer}>
                <ThemedText variant="h3" weight="600" style={styles.title}>
                    {title}
                </ThemedText>

                {description && (
                    <ThemedText variant="body" color="textSecondary" style={styles.description}>
                        {description}
                    </ThemedText>
                )}
            </View>

            {/* Actions */}
            {(primaryAction || secondaryAction) && (
                <View style={styles.actionsContainer}>
                    {primaryAction && (
                        <Button
                            title={primaryAction.label}
                            onPress={primaryAction.onPress}
                            icon={primaryAction.icon}
                            variant="primary"
                            fullWidth
                        />
                    )}
                    {secondaryAction && (
                        <Button
                            title={secondaryAction.label}
                            onPress={secondaryAction.onPress}
                            variant="ghost"
                            style={styles.secondaryButton}
                        />
                    )}
                </View>
            )}
        </Animated.View>
    );
};

export default AnimatedEmptyState;
