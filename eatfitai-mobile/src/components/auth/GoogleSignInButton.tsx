/**
 * Google Sign-in Button Component
 * Beautiful Google Sign-in button for login screen
 * 
 * SETUP: Requires @react-native-google-signin/google-signin
 */

import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { googleAuthService, GoogleAuthResult } from '../../services/googleAuthService';

interface GoogleSignInButtonProps {
    onSuccess: (result: GoogleAuthResult) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    style?: any;
}

export const GoogleSignInButton = ({
    onSuccess,
    onError,
    disabled = false,
    style,
}: GoogleSignInButtonProps): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const [isLoading, setIsLoading] = useState(false);

    // Animation
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const handlePress = async () => {
        if (disabled || isLoading) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);

        try {
            // Configure if not already
            await googleAuthService.configure();

            // Check Play Services
            const hasPlayServices = await googleAuthService.hasPlayServices();
            if (!hasPlayServices) {
                onError?.('Google Play Services không khả dụng');
                return;
            }

            // Sign in
            const result = await googleAuthService.signIn();

            if (result.success) {
                console.log('[GoogleButton] Success:', result.user?.email);
                onSuccess(result);
            } else {
                console.warn('[GoogleButton] Failed:', result.error);
                onError?.(result.error || 'Đăng nhập thất bại');
            }
        } catch (error: any) {
            console.error('[GoogleButton] Error:', error);
            onError?.(error?.message || 'Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            width: '100%',
        },
        button: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            gap: 12,
            ...theme.shadows.md,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        icon: {
            width: 24,
            height: 24,
        },
        text: {
            fontSize: 16,
            fontWeight: '600',
            color: '#1F2937', // Dark gray for contrast on white
        },
    });

    // Google logo SVG path (simplified as text for now)
    const GoogleIcon = () => (
        <View style={styles.icon}>
            <ThemedText style={{ fontSize: 20 }}>🔵</ThemedText>
        </View>
    );

    return (
        <Animated.View style={[styles.container, animatedStyle, style]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || isLoading}
                style={[
                    styles.button,
                    (disabled || isLoading) && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập bằng Google"
                accessibilityState={{ disabled: disabled || isLoading }}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                    <>
                        <GoogleIcon />
                        <ThemedText style={styles.text}>
                            Tiếp tục với Google
                        </ThemedText>
                    </>
                )}
            </Pressable>
        </Animated.View>
    );
};

export default GoogleSignInButton;
