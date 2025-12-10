import { useCallback } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
} from 'react-native-reanimated';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import type { RootStackParamList } from '../../types';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

/**
 * WelcomeScreen - Màn hình chào mừng đầu tiên khi mở app
 * Hiển thị branding, tagline và các options để đăng nhập/đăng ký
 */
const WelcomeScreen = ({ navigation }: Props): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const handleLogin = useCallback(() => {
        navigation.navigate('Login');
    }, [navigation]);

    const handleRegister = useCallback(() => {
        navigation.navigate('Register');
    }, [navigation]);

    return (
        <View style={styles.container}>
            {/* Gradient Background */}
            <LinearGradient
                colors={
                    isDark
                        ? [theme.colors.background, theme.colors.primary + '15', theme.colors.background]
                        : ['#E8F5E9', '#C8E6C9', '#A5D6A7']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative circles */}
            <Animated.View
                entering={ZoomIn.delay(200).duration(800)}
                style={[
                    styles.decorCircle,
                    {
                        top: -height * 0.1,
                        right: -width * 0.2,
                        backgroundColor: theme.colors.primary + '20',
                    },
                ]}
            />
            <Animated.View
                entering={ZoomIn.delay(400).duration(800)}
                style={[
                    styles.decorCircle,
                    {
                        bottom: height * 0.15,
                        left: -width * 0.15,
                        backgroundColor: theme.colors.primary + '15',
                        width: width * 0.5,
                        height: width * 0.5,
                    },
                ]}
            />

            {/* Content - Scrollable */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Animated.View
                        entering={ZoomIn.delay(100).springify()}
                        style={[
                            styles.iconContainer,
                            { backgroundColor: theme.colors.primary + '25' },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconInner,
                                { backgroundColor: theme.colors.primary },
                            ]}
                        >
                            <Ionicons name="nutrition" size={48} color="#FFFFFF" />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                        <ThemedText
                            variant="h1"
                            style={[styles.title, { color: theme.colors.text }]}
                        >
                            EatFit AI
                        </ThemedText>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                        <ThemedText
                            variant="body"
                            color="textSecondary"
                            style={styles.tagline}
                        >
                            Trợ lý dinh dưỡng thông minh{'\n'}được hỗ trợ bởi AI
                        </ThemedText>
                    </Animated.View>
                </View>

                {/* Features Preview */}
                <Animated.View
                    entering={FadeInDown.delay(500).duration(600)}
                    style={styles.featuresSection}
                >
                    <FeatureItem
                        icon="scan-outline"
                        text="Nhận diện thực phẩm bằng AI"
                        theme={theme}
                    />
                    <FeatureItem
                        icon="analytics-outline"
                        text="Theo dõi dinh dưỡng hàng ngày"
                        theme={theme}
                    />
                    <FeatureItem
                        icon="restaurant-outline"
                        text="Gợi ý công thức phù hợp"
                        theme={theme}
                    />
                </Animated.View>

                {/* Buttons Section */}
                <Animated.View
                    entering={FadeInUp.delay(600).duration(600)}
                    style={styles.buttonsSection}
                >
                    {/* Call to action text */}
                    <ThemedText
                        variant="bodySmall"
                        color="textSecondary"
                        style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}
                    >
                        Sẵn sàng bắt đầu hành trình sức khỏe?
                    </ThemedText>

                    {/* Primary: Đăng ký */}
                    <Button
                        variant="primary"
                        title="Tạo tài khoản mới"
                        onPress={handleRegister}
                        fullWidth
                        size="lg"
                        icon="rocket-outline"
                        iconPosition="left"
                    />

                    {/* Divider */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginVertical: theme.spacing.lg,
                            gap: theme.spacing.md,
                        }}
                    >
                        <View
                            style={{
                                flex: 1,
                                height: 1,
                                backgroundColor: theme.colors.border,
                            }}
                        />
                        <ThemedText variant="caption" color="textSecondary">
                            hoặc
                        </ThemedText>
                        <View
                            style={{
                                flex: 1,
                                height: 1,
                                backgroundColor: theme.colors.border,
                            }}
                        />
                    </View>

                    {/* Secondary: Đăng nhập */}
                    <Button
                        variant="outline"
                        title="Đăng nhập tài khoản"
                        onPress={handleLogin}
                        fullWidth
                        size="lg"
                        icon="log-in-outline"
                        iconPosition="left"
                    />

                    {/* Footer hint */}
                    <ThemedText
                        variant="caption"
                        color="textSecondary"
                        style={{ textAlign: 'center', marginTop: theme.spacing.lg, opacity: 0.7 }}
                    >
                        Miễn phí mãi mãi • Không cần thẻ tín dụng
                    </ThemedText>
                </Animated.View>
            </ScrollView>
        </View>
    );
};

// Feature item component
const FeatureItem = ({
    icon,
    text,
    theme,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    theme: any;
}) => (
    <View style={styles.featureItem}>
        <View
            style={[
                styles.featureIcon,
                { backgroundColor: theme.colors.primary + '15' },
            ]}
        >
            <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <ThemedText variant="bodySmall" style={{ flex: 1 }}>
            {text}
        </ThemedText>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 32,
        paddingTop: height * 0.08,
        paddingBottom: 40,
        justifyContent: 'space-between',
        minHeight: height,
    },
    heroSection: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    iconInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    tagline: {
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    featuresSection: {
        gap: 16,
        paddingVertical: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsSection: {
        paddingTop: 16,
    },
    decorCircle: {
        position: 'absolute',
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
    },
});

export default WelcomeScreen;
