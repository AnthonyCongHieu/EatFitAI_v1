/**
 * LoadingOverlay - Full screen loading overlay with blur effect
 * Used for blocking operations like form submission
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
    /** Use transparent overlay instead of blur on Android for better performance */
    transparent?: boolean;
}

export const LoadingOverlay = ({
    visible,
    message = 'Đang xử lý...',
    transparent = false,
}: LoadingOverlayProps): React.ReactElement | null => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    if (!visible) return null;

    const styles = StyleSheet.create({
        container: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        },
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
        },
        blurOverlay: {
            ...StyleSheet.absoluteFillObject,
        },
        content: {
            backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            padding: theme.spacing.xl,
            borderRadius: theme.radius.xl,
            alignItems: 'center',
            gap: theme.spacing.md,
            ...theme.shadows.lg,
            minWidth: 160,
        },
        message: {
            textAlign: 'center',
            maxWidth: 200,
        },
    });

    const content = (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.container}
        >
            {/* Background overlay */}
            {transparent ? (
                <View style={styles.overlay} />
            ) : (
                <BlurView
                    intensity={isDark ? 40 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.blurOverlay}
                />
            )}

            {/* Loading content */}
            <View style={styles.content}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                {message && (
                    <ThemedText
                        variant="body"
                        color="textSecondary"
                        style={styles.message}
                    >
                        {message}
                    </ThemedText>
                )}
            </View>
        </Animated.View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            {content}
        </Modal>
    );
};

export default LoadingOverlay;
