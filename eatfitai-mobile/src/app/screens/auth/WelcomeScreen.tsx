import { useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Pressable,
    Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    Easing,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import type { RootStackParamList } from '../../types';
import { TEST_IDS } from '../../../testing/testIds';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

const { width, height } = Dimensions.get('window');

/* ─── Emerald Nebula color palette (matching HTML template) ─── */
const COLORS = {
    bgTop: '#09111F',
    bgMid: '#132844',
    bgBottom: '#08101C',
    emerald: '#4BE277',
    emeraldDark: '#22C55E',
    emeraldGlow: 'rgba(75, 226, 119, 0.35)',
    emeraldGlowSoft: 'rgba(75, 226, 119, 0.08)',
    glassBg: 'rgba(25, 35, 58, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#DEE1F7',
    textSecondary: 'rgba(148, 163, 184, 0.85)',
    textMuted: 'rgba(100, 116, 139, 0.6)',
    divider: 'rgba(61, 74, 61, 0.30)',
    outlineBorder: 'rgba(61, 74, 61, 0.5)',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

/* ─── Floating Particle Component ─── */
const FloatingParticle = ({
    size,
    x,
    y,
    delay,
    duration,
}: {
    size: number;
    x: number;
    y: number;
    delay: number;
    duration: number;
}) => {
    const animY = useSharedValue(0);
    const animOpacity = useSharedValue(0.3);

    useEffect(() => {
        animY.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(-18, { duration: duration, easing: Easing.inOut(Easing.ease) }),
                    withTiming(18, { duration: duration, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                true,
            ),
        );
        animOpacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0.6, { duration: duration * 0.8 }),
                    withTiming(0.2, { duration: duration * 0.8 }),
                ),
                -1,
                true,
            ),
        );
    }, []);

    const particleStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: animY.value }],
        opacity: animOpacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: '#FFFFFF',
                    left: x,
                    top: y,
                },
                particleStyle,
            ]}
        />
    );
};

/* ─── Google Logo SVG ─── */
const GoogleLogo = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <Path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <Path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
        />
        <Path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </Svg>
);

/**
 * WelcomeScreen - Authentication Gateway
 * Emerald Nebula design with 3D parallax interaction
 */
const WelcomeScreen = ({ navigation }: Props): React.ReactElement => {
    const { theme } = useAppTheme();
    const insets = useSafeAreaInsets();

    /* ─── Glow pulse animation ─── */
    const glowPulse = useSharedValue(1);
    useEffect(() => {
        glowPulse.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            true,
        );
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowPulse.value }],
        opacity: interpolate(glowPulse.value, [1, 1.15], [0.6, 1], Extrapolation.CLAMP),
    }));

    /* ─── Navigation handlers ─── */
    const handleGoogleLogin = useCallback(() => {
        navigation.navigate('Login');
    }, [navigation]);

    const handleEmailLogin = useCallback(() => {
        navigation.navigate('Login');
    }, [navigation]);

    const handleRegister = useCallback(() => {
        navigation.navigate('Register');
    }, [navigation]);

    const handleBackToIntro = useCallback(() => {
        navigation.replace('IntroCarousel');
    }, [navigation]);

    const cardWidth = Math.min(width - 48, 380);
    const cardHeight = height * 0.82;

    return (
        <View style={styles.container}>
            {/* ─── Deep Navy Gradient Background ─── */}
            <LinearGradient
                colors={[COLORS.bgTop, COLORS.bgMid, COLORS.bgBottom]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* ─── Decorative Background ─── */}
            <View style={styles.bgDecorContainer} pointerEvents="none">

                {/* Floating Particles */}
                <FloatingParticle size={4} x={width * 0.15} y={height * 0.2} delay={0} duration={3000} />
                <FloatingParticle size={6} x={width * 0.85} y={height * 0.28} delay={500} duration={3500} />
                <FloatingParticle size={3} x={width * 0.8} y={height * 0.45} delay={800} duration={2800} />
                <FloatingParticle size={4} x={width * 0.05} y={height * 0.55} delay={1200} duration={3200} />
                <FloatingParticle size={5} x={width * 0.5} y={height * 0.12} delay={300} duration={4000} />
                <FloatingParticle size={3} x={width * 0.35} y={height * 0.72} delay={600} duration={3600} />
            </View>

            {/* ─── Close / Back Button ─── */}
            <Pressable
                onPress={handleBackToIntro}
                accessibilityRole="button"
                accessibilityLabel="Quay lại màn hình giới thiệu"
                style={[
                    styles.closeButton,
                    { top: insets.top + 12, right: 20 },
                ]}
            >
                <Ionicons name="close" size={26} color={COLORS.textPrimary} />
            </Pressable>

            {/* ─── Main Content with 3D Tilt ─── */}
            <ScrollView
                testID={TEST_IDS.auth.welcomeScreen}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                <View style={styles.cardWrapper}>
                    <Tilt3DCard
                        maxTilt={5}
                        perspective={1200}
                        width={cardWidth}
                        height={cardHeight}
                        showReflection={false}
                        reflectionColor="rgba(75, 226, 119, 0.04)"
                        style={[styles.tiltCard, { width: cardWidth }]}
                    >
                        {/* ══════════ HERO SECTION ══════════ */}
                        <ParallaxLayer depth={0.8} style={styles.heroSection}>
                            {/* Emerald Glow Orb behind logo */}
                            <Animated.View style={[styles.emeraldGlowOrb, glowStyle]} />

                            {/* Logo Icon */}
                            <Animated.View entering={ZoomIn.delay(100).springify()}>
                                <View style={styles.logoContainer}>
                                    <LinearGradient
                                        colors={[COLORS.emerald, COLORS.emeraldDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.logoGradient}
                                    >
                                        <Ionicons name="nutrition" size={48} color="#003915" />
                                    </LinearGradient>
                                </View>
                            </Animated.View>

                            {/* Brand Name */}
                            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                                <ThemedText
                                    variant="h1"
                                    style={styles.brandTitle}
                                >
                                    EatFit AI
                                </ThemedText>
                            </Animated.View>
                        </ParallaxLayer>

                        {/* ══════════ TAGLINE ══════════ */}
                        <ParallaxLayer depth={0.4} style={styles.taglineWrapper}>
                            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                                <ThemedText
                                    variant="body"
                                    style={styles.tagline}
                                >
                                    Bắt đầu hành trình sức khỏe của bạn
                                </ThemedText>
                            </Animated.View>
                        </ParallaxLayer>

                        {/* ══════════ AUTH BUTTONS ══════════ */}
                        <ParallaxLayer depth={0.2} style={styles.buttonsSection}>
                            <Animated.View
                                entering={FadeInUp.delay(600).duration(600)}
                                style={styles.buttonsInner}
                            >
                                {/* Google Button — Glass */}
                                <Pressable
                                    onPress={handleGoogleLogin}
                                    style={({ pressed }) => [
                                        styles.glassButton,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    testID={TEST_IDS.auth.welcomeLoginButton}
                                >
                                    <View style={styles.googleIconWrap}>
                                        <GoogleLogo />
                                    </View>
                                    <ThemedText variant="body" style={styles.glassButtonText}>
                                        Tiếp tục với Google
                                    </ThemedText>
                                </Pressable>

                                {/* Divider */}
                                <View style={styles.dividerRow}>
                                    <View style={styles.dividerLine} />
                                    <ThemedText variant="caption" style={styles.dividerText}>
                                        HOẶC
                                    </ThemedText>
                                    <View style={styles.dividerLine} />
                                </View>

                                {/* Email Button — Outline */}
                                <Pressable
                                    onPress={handleEmailLogin}
                                    style={({ pressed }) => [
                                        styles.outlineButton,
                                        pressed && styles.buttonPressed,
                                    ]}
                                >
                                    <Ionicons
                                        name="mail"
                                        size={20}
                                        color={COLORS.emerald}
                                        style={{ marginRight: 10 }}
                                    />
                                    <ThemedText variant="body" style={styles.outlineButtonText}>
                                        Tiếp tục với Email
                                    </ThemedText>
                                </Pressable>
                            </Animated.View>
                        </ParallaxLayer>

                        {/* ══════════ FOOTER ══════════ */}
                        <ParallaxLayer depth={0} style={styles.footerSection}>
                            <Animated.View
                                entering={FadeInUp.delay(800).duration(600)}
                                style={styles.footerInner}
                            >
                                {/* Register link */}
                                <View style={styles.registerRow}>
                                    <ThemedText variant="body" style={styles.footerBody}>
                                        Chưa có tài khoản?{' '}
                                    </ThemedText>
                                    <Pressable onPress={handleRegister} testID={TEST_IDS.auth.welcomeRegisterButton}>
                                        <ThemedText
                                            variant="body"
                                            style={styles.registerLink}
                                        >
                                            Đăng ký ngay
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        </ParallaxLayer>
                    </Tilt3DCard>
                </View>
            </ScrollView>
        </View>
    );
};

/* ════════════════════════════════════════════ */
/*                   STYLES                    */
/* ════════════════════════════════════════════ */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    /* ─── Background Decoration ─── */
    bgDecorContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },

    /* ─── Close Button ─── */
    closeButton: {
        position: 'absolute',
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },

    /* ─── Scroll & Card ─── */
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tiltCard: {
        alignItems: 'center',
        paddingVertical: 16,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 64,
    },
    emeraldGlowOrb: {
        position: 'absolute',
        top: -2,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.emeraldGlow,
    },
    logoContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        overflow: 'hidden',
        shadowColor: COLORS.emerald,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    logoGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: COLORS.emerald,
        textAlign: 'center',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(75, 226, 119, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },

    /* ─── Tagline ─── */
    taglineWrapper: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 16,
    },
    tagline: {
        color: COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },

    /* ─── Auth Buttons ─── */
    buttonsSection: {
        width: '100%',
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    buttonsInner: {
        gap: 0,
    },

    /* Glass Button (Google) */
    glassButton: {
        height: 56,
        borderRadius: 9999,
        backgroundColor: COLORS.glassBg,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        overflow: 'hidden',
    },
    glassButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    googleIconWrap: {
        position: 'absolute',
        left: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Outline Button (Email) */
    outlineButton: {
        height: 56,
        borderRadius: 9999,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.outlineBorder,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    outlineButtonText: {
        color: COLORS.emerald,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonPressed: {
        transform: [{ scale: 0.96 }],
        opacity: 0.85,
    },

    /* Divider */
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        gap: 16,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.divider,
    },
    dividerText: {
        color: COLORS.textMuted,
        fontSize: 11,
        letterSpacing: 2,
        fontWeight: '500',
    },

    /* ─── Footer ─── */
    footerSection: {
        width: '100%',
        paddingHorizontal: 24,
    },
    footerInner: {
        alignItems: 'center',
        gap: 12,
    },
    registerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerBody: {
        color: COLORS.textPrimary,
        fontSize: 15,
        opacity: 0.8,
    },
    registerLink: {
        color: COLORS.emerald,
        fontWeight: '700',
        fontSize: 15,
    },
});

export default WelcomeScreen;
