// AboutScreen: Thông tin về ứng dụng
// Hiển thị version, developer info, links

import React from 'react';
import { ScrollView, StyleSheet, View, Linking, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import { SettingsMenuItem } from '../../../components/ui/SettingsMenuItem';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';

const AboutScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<any>();

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    '1';

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log('Cannot open URL:', url);
    });
  };

  const handleSendFeedback = () => {
    const email = 'support@eatfitai.com';
    const subject = encodeURIComponent('Phản hồi EatFitAI App');
    const body = encodeURIComponent(
      `\n\n---\nApp Version: ${appVersion}\nBuild: ${buildNumber}`,
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    logoSection: {
      ...glass.card,
      alignItems: 'center',
      paddingVertical: 32,
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
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View
        style={{
          paddingTop: 60,
          paddingBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 18 }}>{'<'}</ThemedText>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText variant="h3" weight="700">
              Về ứng dụng
            </ThemedText>
          </View>
        </View>

        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={{ textAlign: 'center', marginTop: 8 }}
        >
          Thông tin và hỗ trợ
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.logoSection}>
          <Image
            source={require('../../../assets/icon.png')}
            style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16 }}
          />
          <ThemedText style={styles.appName}>EatFitAI</ThemedText>
          <ThemedText style={styles.version}>
            Phiên bản {appVersion} (Build {buildNumber})
          </ThemedText>
        </Animated.View>

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
            subtitle="Xem nội dung đầy đủ trong app"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </Animated.View>

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

        <Animated.View entering={FadeInDown.delay(400)} style={styles.footer}>
          <ThemedText style={styles.footerText}>
            © 2024 EatFitAI. All rights reserved.
          </ThemedText>
          <ThemedText style={styles.footerText}>Made with love in Vietnam</ThemedText>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

export default AboutScreen;
