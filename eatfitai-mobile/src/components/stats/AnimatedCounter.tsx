import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';

// Animated Text component
const AnimatedThemedText = Animated.createAnimatedComponent(ThemedText);

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body';
    weight?: '400' | '500' | '600' | '700';
    color?: string;
    formatNumber?: boolean;
}

/**
 * Animated counter - số chạy từ 0 đến value khi mount
 * Sử dụng cho hero metrics trong Stats screen
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 800,
    prefix = '',
    suffix = '',
    decimals = 0,
    variant = 'h2',
    weight = '700',
    color,
    formatNumber = true,
}) => {
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        // Reset và animate khi value thay đổi
        animatedValue.value = 0;
        animatedValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.cubic),
        });
    }, [value, duration]);

    // Sử dụng AnimatedProps để cập nhật text
    const animatedProps = useAnimatedProps(() => {
        const currentValue = animatedValue.value;
        const formattedValue = decimals > 0
            ? currentValue.toFixed(decimals)
            : Math.round(currentValue);

        // Format với dấu phẩy hàng nghìn
        const displayValue = formatNumber
            ? Number(formattedValue).toLocaleString('vi-VN')
            : String(formattedValue);

        return {
            text: `${prefix}${displayValue}${suffix}`,
            // @ts-ignore - animated text needs this
            children: `${prefix}${displayValue}${suffix}`,
        };
    });

    // Render với animatedProps
    return (
        <AnimatedThemedText
            variant={variant}
            weight={weight}
            style={color ? { color } : undefined}
            animatedProps={animatedProps}
        >
            {`${prefix}${formatNumber ? value.toLocaleString('vi-VN') : value}${suffix}`}
        </AnimatedThemedText>
    );
};

// Simple version không dùng animated props (stable hơn)
export const SimpleAnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 800,
    prefix = '',
    suffix = '',
    decimals = 0,
    variant = 'h2',
    weight = '700',
    color,
    formatNumber = true,
}) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    useEffect(() => {
        // Animate từ 0 đến value
        const startTime = Date.now();
        const startValue = 0;
        const endValue = value;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: cubic out
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startValue + (endValue - startValue) * eased;

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }, [value, duration]);

    const formattedValue = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue);

    const display = formatNumber
        ? Number(formattedValue).toLocaleString('vi-VN')
        : String(formattedValue);

    return (
        <ThemedText variant={variant} weight={weight} style={color ? { color } : undefined}>
            {`${prefix}${display}${suffix}`}
        </ThemedText>
    );
};

export default SimpleAnimatedCounter;
