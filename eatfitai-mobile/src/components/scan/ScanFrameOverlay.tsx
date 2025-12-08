/**
 * ScanFrameOverlay - Khung quét AI với hiệu ứng góc động
 * Lấy cảm hứng từ Momo QR Scanner
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useAppTheme } from '../../theme/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.75;
const CORNER_SIZE = 40;
const CORNER_THICKNESS = 4;

interface ScanFrameOverlayProps {
    /** Hiển thị animation scanning */
    isScanning?: boolean;
    /** Hiệu ứng khi detect thành công */
    isSuccess?: boolean;
}

export const ScanFrameOverlay: React.FC<ScanFrameOverlayProps> = ({
    isScanning = true,
    isSuccess = false,
}) => {
    const { theme } = useAppTheme();
    const pulseValue = useSharedValue(0);
    const successValue = useSharedValue(0);

    // Pulse animation khi đang scan
    useEffect(() => {
        if (isScanning && !isSuccess) {
            pulseValue.value = withRepeat(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulseValue.value = withTiming(0, { duration: 300 });
        }
    }, [isScanning, isSuccess, pulseValue]);

    // Success glow animation
    useEffect(() => {
        if (isSuccess) {
            successValue.value = withTiming(1, { duration: 300 });
        } else {
            successValue.value = withTiming(0, { duration: 300 });
        }
    }, [isSuccess, successValue]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulseValue.value, [0, 1], [0.6, 1]),
        transform: [{ scale: interpolate(pulseValue.value, [0, 1], [1, 1.02]) }],
    }));

    const successStyle = useAnimatedStyle(() => ({
        borderColor: isSuccess ? theme.colors.success : 'transparent',
        borderWidth: interpolate(successValue.value, [0, 1], [0, 3]),
    }));

    const primaryColor = theme.colors.primary;
    const transparentColor = 'transparent';

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Dimmed overlay với cutout */}
            <View style={styles.dimOverlay}>
                {/* Top dim */}
                <View style={styles.dimTop} />

                {/* Middle row: left dim | frame | right dim */}
                <View style={styles.dimMiddle}>
                    <View style={styles.dimSide} />
                    <View style={[styles.frameCutout, { width: FRAME_SIZE, height: FRAME_SIZE }]} />
                    <View style={styles.dimSide} />
                </View>

                {/* Bottom dim */}
                <View style={styles.dimBottom} />
            </View>

            {/* Frame Container - absolute center */}
            <Animated.View
                style={[
                    styles.frameContainer,
                    { width: FRAME_SIZE, height: FRAME_SIZE },
                    pulseStyle,
                    successStyle,
                ]}
            >
                {/* Top Left Corner */}
                <View style={[styles.corner, styles.topLeft]}>
                    <LinearGradient
                        colors={[primaryColor, transparentColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.cornerHorizontal, { top: 0 }]}
                    />
                    <LinearGradient
                        colors={[primaryColor, transparentColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.cornerVertical, { left: 0 }]}
                    />
                </View>

                {/* Top Right Corner */}
                <View style={[styles.corner, styles.topRight]}>
                    <LinearGradient
                        colors={[transparentColor, primaryColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.cornerHorizontal, { top: 0 }]}
                    />
                    <LinearGradient
                        colors={[primaryColor, transparentColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.cornerVertical, { right: 0 }]}
                    />
                </View>

                {/* Bottom Left Corner */}
                <View style={[styles.corner, styles.bottomLeft]}>
                    <LinearGradient
                        colors={[primaryColor, transparentColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.cornerHorizontal, { bottom: 0 }]}
                    />
                    <LinearGradient
                        colors={[transparentColor, primaryColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.cornerVertical, { left: 0 }]}
                    />
                </View>

                {/* Bottom Right Corner */}
                <View style={[styles.corner, styles.bottomRight]}>
                    <LinearGradient
                        colors={[transparentColor, primaryColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.cornerHorizontal, { bottom: 0 }]}
                    />
                    <LinearGradient
                        colors={[transparentColor, primaryColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.cornerVertical, { right: 0 }]}
                    />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dimOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    dimTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dimMiddle: {
        flexDirection: 'row',
        height: FRAME_SIZE,
    },
    dimSide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dimBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    frameCutout: {
        backgroundColor: 'transparent',
    },
    frameContainer: {
        position: 'absolute',
        borderRadius: 16,
    },
    corner: {
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
    },
    topLeft: {
        top: 0,
        left: 0,
    },
    topRight: {
        top: 0,
        right: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
    },
    cornerHorizontal: {
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_THICKNESS,
        borderRadius: CORNER_THICKNESS / 2,
    },
    cornerVertical: {
        position: 'absolute',
        width: CORNER_THICKNESS,
        height: CORNER_SIZE,
        borderRadius: CORNER_THICKNESS / 2,
    },
});

export default ScanFrameOverlay;
