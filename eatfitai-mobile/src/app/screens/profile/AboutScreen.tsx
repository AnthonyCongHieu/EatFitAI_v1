// AboutScreen: Thông tin về ứng dụng
// Hiển thị version, developer info, links

import React from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Linking,
    Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import { AppHeader } from '../../../components/ui/AppHeader';
import { SettingsMenuItem } from '../../../components/ui/SettingsMenuItem';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';

const AboutScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    // Get app version from expo constants
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

    const handleOpenLink = (url: string) => {
        Linking.openURL(url).catch(() => {
            console.log('Cannot open URL:', url);
        });
    };

    const handleSendFeedback = () => {
        const email = 'support@eatfitai.com';
        const subject = encodeURIComponent('Phản hồi EatFitAI App');
        const body = encodeURIComponent(`\n\n---\nApp Version: ${appVersion}\nBuild: ${buildNumber}`);
        Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xl,
            gap: theme.spacing.lg,
        },
        logoSection: {
            alignItems: 'center',
            paddingVertical: 32,
        },
        logoIcon: {
            fontSize: 64,
            marginBottom: 16,
        },
        appName: {
            fontSize: 24,
            fontWeight: '700',
            color: theme.colors.text,
        },
        version: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginTop: 4,
        },
        card: {
            ...glass.card,
            padding: 4,
        },
        footer: {
            alignItems: 'center',
            paddingTop: 24,
        },
        footerText: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textAlign: 'center',
        },
    });

    return (
        <View style={styles.container}>
            <AppHeader
                title="Về ứng dụng"
                subtitle="Thông tin và hỗ trợ"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Logo Section */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.logoSection}>
                    <ThemedText style={styles.logoIcon}>🥗</ThemedText>
                    <ThemedText style={styles.appName}>EatFitAI</ThemedText>
                    <ThemedText style={styles.version}>
                        Phiên bản {appVersion} (Build {buildNumber})
                    </ThemedText>
                </Animated.View>

                {/* Links Section */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <SettingsMenuItem
                        icon="📧"
                        label="Gửi phản hồi"
                        subtitle="Góp ý, báo lỗi"
                        onPress={handleSendFeedback}
                    />
                    <SettingsMenuItem
                        icon="⭐"
                        label="Đánh giá ứng dụng"
                        subtitle="Trên App Store / Play Store"
                        onPress={() => handleOpenLink('https://apps.apple.com/app/eatfitai')}
                    />
                    <SettingsMenuItem
                        icon="📜"
                        label="Điều khoản sử dụng"
                        onPress={() => handleOpenLink('https://eatfitai.com/terms')}
                    />
                    <SettingsMenuItem
                        icon="🔒"
                        label="Chính sách bảo mật"
                        onPress={() => handleOpenLink('https://eatfitai.com/privacy')}
                    />
                </Animated.View>

                {/* Developer Info */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <SettingsMenuItem
                        icon="👨‍💻"
                        label="Nhà phát triển"
                        subtitle="EatFitAI Team"
                        showArrow={false}
                    />
                    <SettingsMenuItem
                        icon="🌐"
                        label="Website"
                        subtitle="eatfitai.com"
                        onPress={() => handleOpenLink('https://eatfitai.com')}
                    />
                </Animated.View>

                {/* Footer */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.footer}>
                    <ThemedText style={styles.footerText}>
                        © 2024 EatFitAI. All rights reserved.
                    </ThemedText>
                    <ThemedText style={styles.footerText}>
                        Made with ❤️ in Vietnam
                    </ThemedText>
                </Animated.View>
            </ScrollView>
        </View>
    );
};

export default AboutScreen;
