// AboutScreen — Emerald Nebula Design
// Thông tin ứng dụng: Logo, version, developer info, links

import React from 'react';
import { StyleSheet, View, Linking, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { EN, enStyles } from '../../../theme/emeraldNebula';

/* ─── Reusable MenuRow (Emerald Nebula pattern from ProfileScreen) ─── */
interface MenuRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  labelColor?: string;
  iconColor?: string;
  showChevron?: boolean;
}

const MenuRow = ({
  icon,
  label,
  subtitle,
  onPress,
  labelColor = EN.onSurface,
  iconColor = EN.onSurfaceVariant,
  showChevron = true,
}: MenuRowProps) => (
  <Pressable
    style={({ pressed }) => [enStyles.menuRow, pressed && { opacity: 0.7 }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={enStyles.menuIconWrap}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <ThemedText style={{ fontSize: 15, fontWeight: '500', color: labelColor }} numberOfLines={1}>
        {label}
      </ThemedText>
      {subtitle && (
        <ThemedText style={{ fontSize: 12, color: EN.textMuted, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </ThemedText>
      )}
    </View>
    {showChevron && onPress && (
      <Ionicons name="chevron-forward" size={18} color={EN.onSurfaceVariant} />
    )}
  </Pressable>
);

/* ═══════════════════════════════════════════════
   AboutScreen — Emerald Nebula
   ═══════════════════════════════════════════════ */
const AboutScreen = (): React.ReactElement => {
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

  return (
    <SubScreenLayout title="Về ứng dụng" subtitle="Thông tin và hỗ trợ">
      {/* ─── Logo Section ─── */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={S.logoCard}>
        {/* Gradient glow behind logo */}
        <View style={S.logoGlow}>
          <LinearGradient
            colors={[EN.primary + '30', 'transparent']}
            style={S.logoGlowGradient}
          />
        </View>
        <Image
          source={require('../../../assets/icon.png')}
          style={S.logoImage}
        />
        <ThemedText style={S.appName}>EatFitAI</ThemedText>
        <ThemedText style={S.version}>
          Phiên bản {appVersion} (Build {buildNumber})
        </ThemedText>

        {/* Feature badges */}
        <View style={S.badgeRow}>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>AI-Powered</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Dinh dưỡng</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Việt Nam</ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* ─── Support Menu ─── */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={enStyles.menuGroup}>
        <MenuRow
          icon="mail-outline"
          label="Gửi phản hồi"
          subtitle="Góp ý, báo lỗi"
          iconColor={EN.primary}
          onPress={handleSendFeedback}
        />
        <MenuRow
          icon="star-outline"
          label="Đánh giá ứng dụng"
          subtitle="Trên App Store / Play Store"
          iconColor={EN.amber}
          onPress={() => handleOpenLink('https://apps.apple.com/app/eatfitai')}
        />
        <MenuRow
          icon="document-text-outline"
          label="Điều khoản sử dụng"
          onPress={() => handleOpenLink('https://eatfitai.com/terms')}
        />
        <MenuRow
          icon="lock-closed-outline"
          label="Chính sách bảo mật"
          subtitle="Xem nội dung đầy đủ trong app"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </Animated.View>

      {/* ─── Info Menu ─── */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={enStyles.menuGroup}>
        <MenuRow
          icon="code-slash-outline"
          label="Nhà phát triển"
          subtitle="EatFitAI Team"
          showChevron={false}
        />
        <MenuRow
          icon="globe-outline"
          label="Website"
          subtitle="eatfitai.com"
          iconColor={EN.cyan}
          onPress={() => handleOpenLink('https://eatfitai.com')}
        />
      </Animated.View>

      {/* ─── Footer ─── */}
      <Animated.View entering={FadeInUp.delay(400).duration(400)} style={S.footer}>
        <ThemedText style={S.footerText}>
          © 2026 EatFitAI. All rights reserved.
        </ThemedText>
        <ThemedText style={S.footerText}>Made with 💚 in Vietnam</ThemedText>
      </Animated.View>
    </SubScreenLayout>
  );
};

/* ─── Styles ─── */
const S = StyleSheet.create({
  logoCard: {
    ...enStyles.card,
    alignItems: 'center',
    paddingVertical: 32,
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowGradient: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: EN.primary + '30',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: EN.onSurface,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: 13,
    color: EN.textMuted,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: EN.primaryContainer + '18',
    borderWidth: 1,
    borderColor: EN.primary + '30',
    shadowColor: EN.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: EN.primary,
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: EN.onSurfaceVariant + '50',
    letterSpacing: 0.5,
  },
});

export default AboutScreen;
