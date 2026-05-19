// ProfileScreen — Emerald Nebula 3D Design v2
// Hồ sơ: Hero avatar + PRO badge + Metrics strip + Grouped menu actions

import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MeshBackground from '../../components/ui/MeshBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../components/ThemedText';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';
import { subscriptionService } from '../../services/subscriptionService';
import { handleApiErrorWithCustomMessage } from '../../utils/errorHandler';
import MoChiInlineNotice from '../../features/mochi/MoChiInlineNotice';
import MoChiScreenState from '../../features/mochi/MoChiScreenState';
import { useMoChiTutorial } from '../../features/mochi/tutorial/MoChiTutorialContext';
import type { RootStackParamList } from '../types';
import type { AppTabsParamList } from '../navigation/AppTabs';
import { t } from '../../i18n/vi';
import { TEST_IDS } from '../../testing/testIds';
import { useEN } from '../../theme/emeraldNebula';
import { useAppTheme } from '../../theme/ThemeProvider';
import {
  getProfileCompletionDestination,
  hasProfileCompletionGaps,
} from './profile/profileCompletion';

const P_STATIC = {
  bg: '#05070d',
  surface: '#05070d',
  surfaceLow: '#0f1625',
  surfaceContainerLow: '#0f1625',
  surfaceContainer: '#1a1f2f',
  surfaceContainerHigh: '#252b3f',
  surfaceContainerHighest: '#2f364b',
  primary: '#4be277',
  primaryContainer: '#22c55e',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#b7c4d9',
  glassBg: 'rgba(26,31,47,0.78)',
  glassBorder: 'rgba(255,255,255,0.08)',
  error: '#ff8c8c',
  errorContainer: 'rgba(147, 0, 10, 0.3)',
};

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'ProfileTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette — resolved dynamically via useEN()
   ═══════════════════════════════════════════════ */

/* ═══ BMI Helpers ═══ */
const calcBMI = (kg?: number, cm?: number): number | null => {
  if (!kg || !cm || cm < 50) return null;
  return kg / ((cm / 100) ** 2);
};

const bmiColor = (bmi: number): string => {
  if (bmi < 18.5) return '#32d7f0';   // Teal - underweight
  if (bmi < 25) return '#4be277';     // Emerald - normal
  if (bmi < 30) return '#f7c052';     // Amber - overweight
  return '#ff8c8c';                   // Red - obese
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
  rightElement?: React.ReactNode;
}

const MenuRow = ({
  icon,
  label,
  onPress,
  labelColor,
  iconBg,
  iconColor,
  showChevron = true,
  chevronColor,
  testID,
  rightElement,
}: MenuRowProps) => {
  const palette = useEN();
  const resolvedLabelColor = labelColor ?? palette.onSurface;
  const resolvedIconColor = iconColor ?? palette.onSurfaceVariant;
  const resolvedChevronColor = chevronColor ?? palette.onSurfaceVariant;

  return (
    <Pressable
      style={({ pressed }) => [
        S.menuRow,
        {
          backgroundColor: palette.glassBg,
          borderTopColor: palette.glassBorder,
        },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      testID={testID}
    >
      <View style={[S.menuIconWrap, { backgroundColor: iconBg ?? palette.surfaceHighest }]}>
        <Ionicons name={icon as any} size={20} color={resolvedIconColor} />
      </View>
      <ThemedText style={[S.menuLabel, { color: resolvedLabelColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
      {rightElement ? (
        rightElement
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={resolvedChevronColor} />
      ) : null}
    </Pressable>
  );
};

/* ═══════════════════════════════════════════════
   ProfileScreen
   ═══════════════════════════════════════════════ */
const ProfileScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const P = useEN();
  const { mode, toggleTheme } = useAppTheme();
  const { startTutorial } = useMoChiTutorial();

  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading } = useProfileStore((state) => ({
    profile: state.profile,
    fetchProfile: state.fetchProfile,
    isLoading: state.isLoading,
  }));

  const [refreshing, setRefreshing] = useState(false);
  const [isDarkLocal, setIsDarkLocal] = useState(mode === 'dark');

  useEffect(() => {
    setIsDarkLocal(mode === 'dark');
  }, [mode]);

  const handleToggleTheme = useCallback((newVal: boolean) => {
    setIsDarkLocal(newVal);
    // Defer global theme update to prevent JS thread from blocking the native switch animation
    setTimeout(() => { toggleTheme(); }, 350);
  }, [toggleTheme]);

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const { data: subscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: subscriptionService.getCurrent,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    fetchProfile().catch((error: any) => {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: t('common.profile_title'), text2: t('common.missing_info') },
      });
    });
  }, [fetchProfile]);

  const handleLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
    void logout();
  }, [logout]);

  const handleMoChiTutorialPress = useCallback(() => {
    navigation.navigate('HomeTab');
    setTimeout(() => startTutorial({ source: 'manual' }), 220);
  }, [navigation, startTutorial]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile({ force: true }),
      refetchSubscription(),
    ]);
    setRefreshing(false);
  }, [fetchProfile, refetchSubscription]);

  /* ═══ Avatar picker ═══ */
  const pickAvatar = useCallback(async (source: 'library' | 'camera') => {
    try {
      setIsAvatarUploading(true);
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
    } finally {
      setIsAvatarUploading(false);
    }
  }, [fetchProfile]);

  const handleAvatarPress = useCallback(() => {
    setAvatarMenuOpen(true);
  }, []);

  const handlePickAvatarSource = useCallback((source: 'library' | 'camera') => {
    setAvatarMenuOpen(false);
    void pickAvatar(source);
  }, [pickAvatar]);

  const handleProPress = useCallback(() => {
    const isPremium = subscription?.isPremium ?? false;
    Toast.show({
      type: isPremium ? 'success' : 'info',
      text1: isPremium ? 'Premium đang hoạt động' : 'Tài khoản Free',
      text2: isPremium
        ? 'Bạn đã có quyền dùng các tính năng Premium.'
        : 'Gói nâng cấp sẽ xuất hiện khi EatFitAI mở bán.',
    });
  }, [subscription?.isPremium]);

  const handleCompleteProfilePress = useCallback(() => {
    const destination = getProfileCompletionDestination(profile);
    if (!destination) {
      return;
    }

    if (destination.route === 'Onboarding') {
      navigation.navigate(destination.route as any, destination.params as any);
      return;
    }

    navigation.navigate(destination.route as any);
  }, [navigation, profile]);

  /* Loading */
  if (isLoading && !profile) {
    return (
      <View style={[S.container, { justifyContent: 'center', paddingHorizontal: 20 }]}>
        <MoChiScreenState
          mochiEvent="profile_incomplete"
          title="Đang tải hồ sơ"
          message="MoChi đang lấy thông tin cơ thể và mục tiêu của bạn."
          showSpinner
          variant="screen"
        />
      </View>
    );
  }

  const bmi = calcBMI(profile?.weightKg, profile?.heightCm);
  const displayName = profile?.fullName || 'Chưa cập nhật';
  const isPremium = subscription?.isPremium ?? false;
  const memberLabel = isPremium ? 'Premium' : 'Free';
  const premiumRowLabel = isPremium ? 'EatFitAI Premium đang hoạt động' : 'Nâng cấp EatFitAI Premium';
  const hasProfileGaps = hasProfileCompletionGaps(profile);

  return (
    <View style={[S.container, { paddingTop: insets.top, backgroundColor: P.bg }]} testID={TEST_IDS.profile.screen}>
      <MeshBackground />
      {/* ═══ HEADER ═══ */}
      <View style={S.header}>
        <View style={S.headerBtn} />
        <ThemedText style={[S.headerTitle, { color: P.onSurface }]}>Hồ sơ</ThemedText>
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
            testID={TEST_IDS.profile.avatarButton}
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
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
              {isAvatarUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>

          {/* Name */}
          <ThemedText style={[S.heroName, { color: P.onSurface }]}>{displayName}</ThemedText>

          {/* Member badge */}
          <View style={[S.proBadge, { backgroundColor: P.surfaceHigh }]}>
            <ThemedText style={[S.proBadgeText, { color: P.primary }]}>Thành viên {memberLabel}</ThemedText>
          </View>
        </Animated.View>

        {/* ═══ METRICS STRIP ═══ */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={[S.metricsCard, { backgroundColor: P.glassBg, borderTopColor: P.glassBorder }]}>
          {/* Metallic sheen overlay */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={S.metricCol}>
            <ThemedText style={[S.metricLabel, { color: P.onSurfaceVariant }]}>CÂN NẶNG</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <ThemedText style={[S.metricValue, { color: P.onSurface }]}>
                {profile?.weightKg ?? '--'}
              </ThemedText>
              <ThemedText style={[S.metricUnit, { color: P.onSurfaceVariant }]}> kg</ThemedText>
            </View>
          </View>
          <View style={S.metricDivider} />
          <View style={S.metricCol}>
            <ThemedText style={[S.metricLabel, { color: P.onSurfaceVariant }]}>CHIỀU CAO</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <ThemedText style={[S.metricValue, { color: P.onSurface }]}>
                {profile?.heightCm ?? '--'}
              </ThemedText>
              <ThemedText style={[S.metricUnit, { color: P.onSurfaceVariant }]}> cm</ThemedText>
            </View>
          </View>
          <View style={S.metricDivider} />
          <View style={S.metricCol}>
            <ThemedText style={[S.metricLabel, { color: P.onSurfaceVariant }]}>BMI</ThemedText>
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
              <ThemedText style={[S.metricValue, { color: P.onSurface }]}>--</ThemedText>
            )}
          </View>
        </Animated.View>

        {hasProfileGaps && (
          <Pressable
            onPress={handleCompleteProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Hoàn thiện hồ sơ"
          >
            <Animated.View entering={FadeInUp.delay(260).duration(400)} style={S.profileNotice}>
              <MoChiInlineNotice
                mochiEvent="profile_incomplete"
                title="MoChi cần thêm dữ liệu"
                message="Bổ sung cân nặng, chiều cao và mục tiêu để MoChi tính gợi ý sát hơn."
                ctaLabel="Hoàn thiện hồ sơ"
                compact
              />
            </Animated.View>
          </Pressable>
        )}

        {/* ═══ MENU GROUP 1 — Main actions ═══ */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={[S.menuGroup, { backgroundColor: P.surfaceLow }]}>
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

        {/* ═══ MENU GROUP 2 — About + PRO + Theme ═══ */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={[S.menuGroup, { backgroundColor: P.surfaceLow }]}>

          <MenuRow
            icon="images-outline"
            label="Phòng MoChi"
            onPress={() => navigation.navigate('MoChiPoseGallery')}
          />
          <MenuRow
            icon="help-circle-outline"
            label="Xem hướng dẫn MoChi"
            onPress={handleMoChiTutorialPress}
            testID={TEST_IDS.profile.mochiTutorialButton}
          />
          <MenuRow
            icon="information-circle-outline"
            label="Về EatFit AI"
            onPress={() => navigation.navigate('About' as any)}
            iconBg={P.surfaceHighest}
            iconColor={P.onSurfaceVariant}
            labelColor={P.onSurface}
            chevronColor={P.onSurfaceVariant}
          />
          <MenuRow
            icon="ribbon-outline"
            label={premiumRowLabel}
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

      <Modal
        visible={avatarMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenuOpen(false)}
      >
        <View style={S.actionOverlay}>
          <Pressable
            style={S.actionBackdrop}
            onPress={() => setAvatarMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Đóng tuỳ chọn ảnh đại diện"
          />
          <Animated.View
            entering={ZoomIn.duration(180)}
            style={[S.accountSheet, S.avatarActionsSheet, { paddingBottom: 16 }]}
            testID={TEST_IDS.profile.avatarActionsSheet}
          >
            <View style={S.sheetHandle} />
            <View style={S.sheetHeader}>
              <View style={S.sheetAvatar}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={S.sheetAvatarImage} />
                ) : (
                  <Ionicons name="person" size={22} color={P.primary} />
                )}
              </View>
              <View style={S.sheetTitleWrap}>
                <ThemedText style={S.sheetTitle} numberOfLines={1}>Ảnh đại diện</ThemedText>
                <ThemedText style={S.sheetSubtitle} numberOfLines={1}>
                  Cập nhật hình đại diện tài khoản
                </ThemedText>
              </View>
            </View>

            <View style={S.sheetActions}>
              <Pressable
                style={({ pressed }) => [
                  S.sheetAction,
                  isAvatarUploading && S.sheetActionDisabled,
                  pressed && !isAvatarUploading && { opacity: 0.76 },
                ]}
                onPress={() => handlePickAvatarSource('library')}
                disabled={isAvatarUploading}
                testID={TEST_IDS.profile.uploadAvatarLibraryButton}
                accessibilityRole="button"
              >
                <View style={S.sheetActionIcon}>
                  <Ionicons name="image-outline" size={20} color={P.primary} />
                </View>
                <ThemedText style={S.sheetActionLabel}>Chọn ảnh từ thư viện</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={P.onSurfaceVariant} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  S.sheetAction,
                  isAvatarUploading && S.sheetActionDisabled,
                  pressed && !isAvatarUploading && { opacity: 0.76 },
                ]}
                onPress={() => handlePickAvatarSource('camera')}
                disabled={isAvatarUploading}
                testID={TEST_IDS.profile.uploadAvatarCameraButton}
                accessibilityRole="button"
              >
                <View style={S.sheetActionIcon}>
                  <Ionicons name="camera-outline" size={20} color={P.primary} />
                </View>
                <ThemedText style={S.sheetActionLabel}>Chụp ảnh mới</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={P.onSurfaceVariant} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={logoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmOpen(false)}
      >
        <View style={S.confirmOverlay}>
          <Pressable
            style={S.confirmBackdrop}
            onPress={() => setLogoutConfirmOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Hủy đăng xuất"
          />
          <Animated.View entering={FadeInUp.duration(180)} style={S.logoutSheet}>
            <View style={S.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={24} color={P.error} />
            </View>
            <ThemedText style={S.logoutTitle}>Đăng xuất khỏi EatFitAI?</ThemedText>
            <ThemedText style={S.logoutBody}>
              Bạn sẽ cần đăng nhập lại để đồng bộ nhật ký, mục tiêu và dữ liệu cá nhân.
            </ThemedText>
            <View style={S.logoutActions}>
              <Pressable
                style={({ pressed }) => [S.logoutCancelBtn, pressed && { opacity: 0.76 }]}
                onPress={() => setLogoutConfirmOpen(false)}
              >
                <ThemedText style={S.logoutCancelText}>Hủy</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [S.logoutConfirmBtn, pressed && { opacity: 0.76 }]}
                onPress={handleConfirmLogout}
                testID={`${TEST_IDS.profile.logoutButton}-confirm`}
              >
                <ThemedText style={S.logoutConfirmText}>Đăng xuất</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Emerald Nebula 3D Profile v2
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ═══ HEADER (matches StatsScreen appBar) ═══ */
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
    letterSpacing: -0.2,
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
    shadowColor: P_STATIC.primary,
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
    backgroundColor: P_STATIC.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: P_STATIC.surface,
  },
  actionOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  accountSheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: P_STATIC.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(75,226,119,0.18)',
    paddingTop: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  avatarActionsSheet: {
    borderColor: 'rgba(75,226,119,0.24)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  sheetAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: P_STATIC.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: P_STATIC.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: P_STATIC.onSurfaceVariant,
  },
  sheetActions: {
    gap: 8,
  },
  sheetAction: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  sheetActionDisabled: {
    opacity: 0.54,
  },
  sheetActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: P_STATIC.primary + '16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P_STATIC.onSurface,
  },
  sheetDangerAction: {
    backgroundColor: P_STATIC.errorContainer,
    borderColor: 'rgba(255,180,171,0.16)',
  },
  sheetDangerIcon: {
    backgroundColor: 'rgba(255,180,171,0.12)',
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  logoutSheet: {
    borderRadius: 24,
    backgroundColor: P_STATIC.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.18)',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  logoutIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: P_STATIC.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoutTitle: {
    fontSize: 19,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutBody: {
    fontSize: 14,
    lineHeight: 20,
    color: P_STATIC.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 18,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(226,232,240,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: P_STATIC.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  logoutConfirmText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.error,
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
    borderColor: P_STATIC.surface,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: P_STATIC.surface,
    backgroundColor: P_STATIC.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
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
    backgroundColor: P_STATIC.primaryContainer + '18',
    borderWidth: 1,
    borderColor: P_STATIC.primary + '30',
    shadowColor: P_STATIC.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  proBadgeText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P_STATIC.primary,
    letterSpacing: 0.3,
  },

  /* ═══ METRICS STRIP ═══ */
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: P_STATIC.glassBg,
    borderTopWidth: 1,
    borderTopColor: P_STATIC.glassBorder,
    marginBottom: 28,
    overflow: 'hidden',
  },
  profileNotice: {
    marginTop: -12,
    marginBottom: 24,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurfaceVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  metricUnit: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
    color: P_STATIC.onSurfaceVariant,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: P_STATIC.surfaceContainerHighest,
  },
  metricBMIValue: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
    textShadowColor: 'rgba(75, 226, 119, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },


  /* ═══ MENU GROUPS ═══ */
  menuGroup: {
    borderRadius: 16,
    backgroundColor: P_STATIC.surfaceContainerLow,
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
    backgroundColor: P_STATIC.glassBg,
    borderTopWidth: 1,
    borderTopColor: P_STATIC.glassBorder,
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
    fontFamily: 'BeVietnamPro_500Medium',
  },

  /* ═══ FOOTER ═══ */
  footer: {
    marginTop: 28,
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant + '50',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
