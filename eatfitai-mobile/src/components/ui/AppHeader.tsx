/**
 * AppHeader - Unified Header Component (Trend 2026)
 * 
 * Design: Glassmorphism với semi-transparent background, subtle border glow
 * Features: Gradient title, animated glow border, modern glass buttons
 * Layout: [Back] | [Title Center] | [Actions]
 * 
 * @usage
 * <AppHeader title="Profile" subtitle="Quản lý tài khoản" />
 * <AppHeader title="Settings" showBack onBackPress={() => nav.goBack()} />
 * <AppHeader title="Stats" rightIcon="settings-outline" onRightPress={...} />
 */

import React from 'react';
import {
    View,
    Pressable,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

// ============================================================================
// Types
// ============================================================================

export type AppHeaderVariant = 'default' | 'transparent' | 'hero';
export type AppHeaderSize = 'compact' | 'default' | 'large';

export interface AppHeaderProps {
    // Nội dung
    title?: string;
    subtitle?: string;

    // Navigation
    showBack?: boolean;
    onBackPress?: () => void;

    // Actions (phía bên phải)
    rightAction?: React.ReactNode;
    action?: React.ReactNode; // Alias cho rightAction (để tương thích ngược)
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;

    // Variants
    variant?: AppHeaderVariant;
    size?: AppHeaderSize;

    // Style overrides
    style?: ViewStyle;
    titleStyle?: TextStyle;

    // Animation
    animated?: boolean;

    // Gradient title (cho hero variant)
    gradientTitle?: boolean;
}

// ============================================================================
// Animated Pressable Component
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GlassButton: React.FC<{
    onPress: () => void;
    children: React.ReactNode;
    isDark: boolean;
    accessibilityLabel: string;
    accessibilityHint?: string;
}> = ({ onPress, children, isDark, accessibilityLabel, accessibilityHint }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                {
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                    // Glass border
                    borderWidth: 1,
                    borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.08)',
                    // Shadow for depth
                    ...Platform.select({
                        ios: {
                            shadowColor: isDark ? '#fff' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.1 : 0.08,
                            shadowRadius: 4,
                        },
                        android: {
                            elevation: 2,
                        },
                    }),
                },
                animatedStyle,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
        >
            {children}
        </AnimatedPressable>
    );
};

// ============================================================================
// Component
// ============================================================================

export const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    subtitle,
    showBack = true,
    onBackPress,
    rightAction,
    action, // Alias cho rightAction
    rightIcon,
    onRightPress,
    variant = 'default',
    size = 'default',
    style,
    titleStyle,
    animated = true,
    gradientTitle = false,
}) => {
    const { theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const isDark = theme.mode === 'dark';

    // Kiểm tra có thể goBack không
    const canGoBack = navigation.canGoBack();
    const shouldShowBack = showBack && canGoBack;

    // Merge action props (rightAction uu tiên hơn action)
    const actionContent = rightAction || action;

    // Handler cho nút back với haptic feedback
    const handleBackPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onBackPress) {
            onBackPress();
        } else if (canGoBack) {
            navigation.goBack();
        }
    };

    // Handler cho action button
    const handleRightPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRightPress?.();
    };

    // ============================================================================
    // Styles dựa trên variant và size
    // ============================================================================

    const getBackgroundStyle = (): ViewStyle => {
        switch (variant) {
            case 'transparent':
                return {
                    backgroundColor: 'transparent',
                };
            case 'hero':
                return {
                    backgroundColor: isDark
                        ? 'rgba(10, 15, 13, 0.92)'
                        : 'rgba(255, 255, 255, 0.95)',
                    // Glow border effect
                    borderBottomWidth: 1,
                    borderBottomColor: isDark
                        ? 'rgba(34, 197, 94, 0.2)' // green glow
                        : 'rgba(34, 197, 94, 0.15)',
                    ...Platform.select({
                        ios: {
                            shadowColor: isDark ? '#22C55E' : '#16A34A',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                };
            default:
                // Glassmorphism effect
                return {
                    backgroundColor: isDark
                        ? 'rgba(18, 24, 22, 0.94)'
                        : 'rgba(255, 255, 255, 0.96)',
                    borderBottomWidth: 1,
                    borderBottomColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                    // Subtle shadow for depth
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.3 : 0.08,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 4,
                        },
                    }),
                };
        }
    };

    const getPadding = () => {
        switch (size) {
            case 'compact':
                return {
                    paddingTop: insets.top + 8,
                    paddingBottom: 10,
                    paddingHorizontal: theme.spacing.lg,
                };
            case 'large':
                return {
                    paddingTop: insets.top + theme.spacing.lg,
                    paddingBottom: theme.spacing.xl,
                    paddingHorizontal: theme.spacing.lg,
                };
            default:
                return {
                    paddingTop: insets.top + theme.spacing.md,
                    paddingBottom: theme.spacing.md + 2,
                    paddingHorizontal: theme.spacing.lg,
                };
        }
    };

    const getTitleSize = () => {
        switch (size) {
            case 'compact':
                return 'h3' as const;
            case 'large':
                return 'h1' as const;
            default:
                return 'h2' as const;
        }
    };

    // Gradient colors cho title
    const gradientColors = isDark
        ? ['#22C55E', '#10B981', '#34D399'] // green gradient
        : ['#16A34A', '#22C55E', '#4ADE80'];

    // ============================================================================
    // Render
    // ============================================================================

    const styles = createStyles(theme, isDark);
    const Wrapper = animated ? Animated.View : View;
    const enteringAnimation = animated ? FadeIn.duration(250) : undefined;

    // Render gradient title hoặc title thường
    const renderTitle = () => {
        if (!title) return null;

        const titleContent = (
            <ThemedText
                variant={getTitleSize()}
                weight="700"
                style={[styles.title, titleStyle]}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {title}
            </ThemedText>
        );

        // Gradient title cho hero variant
        if ((variant === 'hero' || gradientTitle) && Platform.OS !== 'web') {
            return (
                <View style={styles.gradientTitleContainer}>
                    {titleContent}
                </View>
            );
        }

        return titleContent;
    };

    return (
        <Wrapper
            // @ts-ignore - entering chỉ có trên Animated.View
            entering={enteringAnimation}
            style={[
                styles.container,
                getBackgroundStyle(),
                getPadding(),
                style,
            ]}
        >
            {/* Main Row: Back | Title | Actions */}
            <View style={styles.mainRow}>
                {/* Left: Back Button */}
                <View style={styles.leftSection}>
                    {shouldShowBack && (
                        <GlassButton
                            onPress={handleBackPress}
                            isDark={isDark}
                            accessibilityLabel="Quay lại"
                            accessibilityHint="Nhấn để quay về màn hình trước"
                        >
                            <Ionicons
                                name="chevron-back"
                                size={22}
                                color={theme.colors.text}
                            />
                        </GlassButton>
                    )}
                </View>

                {/* Center: Title */}
                <View style={styles.centerSection}>
                    {renderTitle()}
                </View>

                {/* Right: Actions */}
                <View style={styles.rightSection}>
                    {actionContent ? (
                        actionContent
                    ) : rightIcon && onRightPress ? (
                        <GlassButton
                            onPress={handleRightPress}
                            isDark={isDark}
                            accessibilityLabel="Menu"
                        >
                            <Ionicons
                                name={rightIcon}
                                size={20}
                                color={theme.colors.text}
                            />
                        </GlassButton>
                    ) : (
                        // Placeholder để cân bằng layout
                        <View style={styles.iconButtonPlaceholder} />
                    )}
                </View>
            </View>

            {/* Subtitle Row - nếu có */}
            {subtitle && (
                <Animated.View
                    entering={animated ? FadeInDown.delay(100).duration(200) : undefined}
                    style={styles.subtitleRow}
                >
                    <View style={styles.subtitleBadge}>
                        <ThemedText
                            variant="bodySmall"
                            color="textSecondary"
                            style={styles.subtitle}
                        >
                            {subtitle}
                        </ThemedText>
                    </View>
                </Animated.View>
            )}
        </Wrapper>
    );
};

// ============================================================================
// Styles
// ============================================================================

const createStyles = (theme: any, isDark: boolean) =>
    StyleSheet.create({
        container: {
            width: '100%',
            zIndex: 100,
        },
        mainRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 48, // Slightly larger for better touch
        },
        leftSection: {
            width: 48,
            alignItems: 'flex-start',
            justifyContent: 'center',
        },
        centerSection: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
        },
        rightSection: {
            width: 48,
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
        title: {
            textAlign: 'center',
            letterSpacing: -0.5, // Tighter letter spacing cho modern look
        },
        gradientTitleContainer: {
            // Container cho gradient title effect
        },
        subtitleRow: {
            marginTop: theme.spacing.xs + 2,
            alignItems: 'center',
        },
        subtitleBadge: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.03)',
        },
        subtitle: {
            textAlign: 'center',
            fontSize: 13,
        },
        iconButtonPlaceholder: {
            width: 42,
            height: 42,
        },
    });

export default AppHeader;

