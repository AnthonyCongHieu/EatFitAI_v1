// ProfileScreen — Emerald Nebula 3D Design v2
// Hồ sơ: Hero avatar + PRO badge + Metrics strip + Grouped menu actions

import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../components/ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';
import { handleApiErrorWithCustomMessage } from '../../utils/errorHandler';
import type { RootStackParamList } from '../types';
import { t } from '../../i18n/vi';
import { TEST_IDS } from '../../testing/testIds';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette
   ═══════════════════════════════════════════════ */
const P = {
  primary: '#4be277',
  primaryContainer: '#22c55e',
  surface: '#0e1322',
  surfaceContainer: '#1a1f2f',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHigh: '#25293a',
  surfaceContainerHighest: '#2f3445',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  outlineVariant: '#3d4a3d',
  glassBg: 'rgba(37, 41, 58, 0.6)',
  glassBorder: 'rgba(255,255,255,0.05)',
  error: '#ffb4ab',
  errorContainer: 'rgba(147, 0, 10, 0.3)',
};

/* ═══ BMI Helpers ═══ */
const calcBMI = (kg?: number, cm?: number): number | null => {
  if (!kg || !cm || cm < 50) return null;
  return kg / ((cm / 100) ** 2);
};

const bmiColor = (bmi: number): string => {
  if (bmi < 18.5) return '#60a5fa';   // Blue — underweight
  if (bmi < 25) return '#4be277';     // Green — normal
  if (bmi < 30) return '#fbbf24';     // Yellow — overweight
  return '#ef4444';                   // Red — obese
};

/* ═══ Reusable menu row ═══ */
interface MenuRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  labelColor?: string;
  iconBg?: string;
  iconColor?: string;
  showChevron?: boolean;
  chevronColor?: string;
  testID?: string;
}

const MenuRow = ({
  icon,
  label,
  onPress,
  labelColor = P.onSurface,
  iconBg = P.surfaceContainerHighest,
  iconColor = P.onSurfaceVariant,
  showChevron = true,
  chevronColor = P.onSurfaceVariant,
  testID,
}: MenuRowProps) => (
  <Pressable
    style={({ pressed }) => [S.menuRow, pressed && { opacity: 0.7 }]}
    onPress={onPress}
    testID={testID}
  >
    <View style={[S.menuIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <ThemedText style={[S.menuLabel, { color: labelColor }]} numberOfLines={1}>
      {label}
    </ThemedText>
    {showChevron && (
      <Ionicons name="chevron-forward" size={18} color={chevronColor} />
    )}
  </Pressable>
);

/* ═══════════════════════════════════════════════
   ProfileScreen
   ═══════════════════════════════════════════════ */
const ProfileScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading } = useProfileStore((state) => ({
    profile: state.profile,
    fetchProfile: state.fetchProfile,
    isLoading: state.isLoading,
  }));

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfile().catch((error: any) => {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: t('common.profile_title'), text2: t('common.missing_info') },
      });
    });
  }, [fetchProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(t('common.logout'), t('common.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile({ force: true });
    setRefreshing(false);
  }, [fetchProfile]);

  /* ═══ Avatar picker ═══ */
  const pickAvatar = useCallback(async (source: 'library' | 'camera') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập camera');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }
      if (!result.canceled && result.assets[0]?.uri) {
        const url = await profileService.uploadAvatar(result.assets[0].uri);
        await useProfileStore.getState().updateProfile({ avatarUrl: url });
        await fetchProfile({ force: true });
        Toast.show({ type: 'success', text1: 'Cập nhật avatar thành công' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: e?.message || 'Không thể cập nhật avatar' });
    }
  }, [fetchProfile]);

  const handleAvatarPress = useCallback(() => {
    Alert.alert('Đổi ảnh đại diện', 'Chọn nguồn ảnh', [
      { text: 'Chọn ảnh từ thư viện', onPress: () => pickAvatar('library') },
      { text: 'Chụp ảnh', onPress: () => pickAvatar('camera') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [pickAvatar]);

  const handleProPress = useCallback(() => {
    Toast.show({
      type: 'info',
      text1: 'Thông báo',
      text2: 'Tính năng đang phát triển',
    });
  }, []);

  /* Loading */
  if (isLoading && !profile) {
    return (
      <View style={[S.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  const bmi = calcBMI(profile?.weightKg, profile?.heightCm);
  const displayName = profile?.fullName || 'Chưa cập nhật';

  return (
    <View style={[S.container, { paddingTop: insets.top }]} testID={TEST_IDS.profile.screen}>

      {/* ═══ HEADER ═══ */}
      <View style={S.header}>
        <View style={S.headerBtn} />
        <ThemedText style={S.headerTitle}>Hồ sơ</ThemedText>
        <View style={S.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[P.primary]}
            tintColor={P.primary}
          />
        }
      >
        {/* ═══ HERO SECTION ═══ */}
        <Animated.View entering={FadeIn.delay(100).duration(500)} style={S.heroSection}>
          {/* Avatar with gradient ring + glow — tappable → photo picker */}
          <Pressable
            style={S.avatarContainer}
            onPress={handleAvatarPress}
          >
            <LinearGradient
              colors={[P.primary, P.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={S.avatarGradientRing}
            >
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={S.avatarImage} />
              ) : (
                <View style={S.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color={P.primary} />
                </View>
              )}
            </LinearGradient>
            {/* Camera badge */}
            <View style={S.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          {/* Name */}
          <ThemedText style={S.heroName}>{displayName}</ThemedText>

          {/* Member badge */}
          <View style={S.proBadge}>
            <ThemedText style={S.proBadgeText}>Thành viên</ThemedText>
          </View>
        </Animated.View>

        {/* ═══ METRICS STRIP ═══ */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={S.metricsCard}>
          {/* Metallic sheen overlay */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={S.metricCol}>
            <ThemedText style={S.metricLabel}>CÂN NẶNG</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <ThemedText style={S.metricValue}>
                {profile?.weightKg ?? '--'}
              </ThemedText>
              <ThemedText style={S.metricUnit}> kg</ThemedText>
            </View>
          </View>
          <View style={S.metricDivider} />
          <View style={S.metricCol}>
            <ThemedText style={S.metricLabel}>CHIỀU CAO</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <ThemedText style={S.metricValue}>
                {profile?.heightCm ?? '--'}
              </ThemedText>
              <ThemedText style={S.metricUnit}> cm</ThemedText>
            </View>
          </View>
          <View style={S.metricDivider} />
          <View style={S.metricCol}>
            <ThemedText style={S.metricLabel}>BMI</ThemedText>
            {bmi ? (
              <ThemedText style={[
                S.metricBMIValue,
                {
                  color: bmiColor(bmi),
                  textShadowColor: bmiColor(bmi) + '80',
                },
              ]}>
                {bmi.toFixed(1)}
              </ThemedText>
            ) : (
              <ThemedText style={S.metricValue}>--</ThemedText>
            )}
          </View>
        </Animated.View>

        {/* ═══ MENU GROUP 1 — Main actions ═══ */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={S.menuGroup}>
          <MenuRow
            icon="person-outline"
            label="Hồ sơ thể chất"
            onPress={() => navigation.navigate('BodyMetrics' as any)}
            testID={TEST_IDS.profile.bodyMetricsButton}
          />
          <MenuRow
            icon="nutrition-outline"
            label="Cài đặt dinh dưỡng"
            onPress={() => navigation.navigate('NutritionSettings')}
            testID={TEST_IDS.profile.nutritionSettingsButton}
          />
          <MenuRow
            icon="notifications-outline"
            label="Tùy chỉnh thông báo"
            onPress={() => navigation.navigate('NotificationsSettings' as any)}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Bảo mật & Riêng tư"
            onPress={() => navigation.navigate('ChangePassword' as any)}
          />
        </Animated.View>

        {/* ═══ MENU GROUP 2 — About + PRO + Logout ═══ */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={[S.menuGroup, { marginTop: 16 }]}>
          <MenuRow
            icon="information-circle-outline"
            label="Về EatFit AI"
            onPress={() => navigation.navigate('About' as any)}
          />
          <MenuRow
            icon="ribbon-outline"
            label="Quản lý Gói EatFit PRO"
            labelColor={P.primary}
            iconBg={P.primary + '18'}
            iconColor={P.primary}
            chevronColor={P.primary + '80'}
            onPress={handleProPress}
          />
          <MenuRow
            icon="log-out-outline"
            label="Đăng xuất"
            labelColor={P.error}
            iconBg={P.errorContainer}
            iconColor={P.error}
            showChevron={false}
            onPress={handleLogout}
            testID={TEST_IDS.profile.logoutButton}
          />
        </Animated.View>

        {/* ═══ FOOTER ═══ */}
        <Animated.View entering={FadeIn.delay(500)} style={S.footer}>
          <ThemedText style={S.footerText}>
            Phiên bản 1.0.2 — Hệ thống cốt lõi bởi AI
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Emerald Nebula 3D Profile v2
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },

  /* ═══ HEADER ═══ */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: 'rgba(14, 19, 34, 0.8)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: P.primaryContainer,
    letterSpacing: -0.3,
  },

  /* ═══ SCROLL ═══ */
  scrollContent: {
    paddingHorizontal: 24,
  },

  /* ═══ HERO ═══ */
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    marginBottom: 28,
  },
  avatarContainer: {
    marginBottom: 18,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: P.surface,
  },
  avatarGradientRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: P.surface,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: P.surface,
    backgroundColor: P.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '700',
    color: P.onSurface,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: P.primaryContainer + '18',
    borderWidth: 1,
    borderColor: P.primary + '30',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.primary,
    letterSpacing: 0.3,
  },

  /* ═══ METRICS STRIP ═══ */
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: P.glassBg,
    borderTopWidth: 1,
    borderTopColor: P.glassBorder,
    marginBottom: 28,
    overflow: 'hidden',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: P.onSurface,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: P.onSurfaceVariant,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: P.surfaceContainerHighest,
  },
  metricBMIValue: {
    fontSize: 18,
    fontWeight: '700',
    color: P.primary,
    textShadowColor: 'rgba(75, 226, 119, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },


  /* ═══ MENU GROUPS ═══ */
  menuGroup: {
    borderRadius: 16,
    backgroundColor: P.surfaceContainerLow,
    padding: 8,
    gap: 4,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: P.glassBg,
    borderTopWidth: 1,
    borderTopColor: P.glassBorder,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  /* ═══ FOOTER ═══ */
  footer: {
    marginTop: 28,
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: P.onSurfaceVariant + '50',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
