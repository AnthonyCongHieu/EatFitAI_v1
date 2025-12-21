// ProfileScreen v5: Redesigned with menu-based layout
// Xu huong 2026: Progressive Disclosure, Glassmorphism, Menu Navigation

import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../components/ThemedText';
import { AppHeader } from '../../components/ui/AppHeader';
import { SettingsMenuItem } from '../../components/ui/SettingsMenuItem';
import { SettingsSection } from '../../components/ui/SettingsSection';
import { BMIIndicator } from '../../components/ui/BMIIndicator';
import { glassStyles } from '../../components/ui/GlassCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { handleApiErrorWithCustomMessage } from '../../utils/errorHandler';
import type { RootStackParamList } from '../types';
import { t } from '../../i18n/vi';
import Button from '../../components/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Map goal to Vietnamese label
const getGoalLabel = (goal?: string): string => {
  switch (goal) {
    case 'lose': return 'Giảm cân';
    case 'maintain': return 'Giữ cân';
    case 'gain': return 'Tăng cân';
    default: return 'Chưa đặt';
  }
};

// Map activity level ID to label
const getActivityLabel = (levelId?: number): string => {
  switch (levelId) {
    case 1: return 'Ít vận động';
    case 2: return 'Nhẹ nhàng';
    case 3: return 'Trung bình';
    case 4: return 'Tích cực';
    case 5: return 'Rất tích cực';
    default: return 'Chưa đặt';
  }
};

const ProfileScreen = (): React.ReactElement => {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();

  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading } = useProfileStore((state) => ({
    profile: state.profile,
    fetchProfile: state.fetchProfile,
    isLoading: state.isLoading,
  }));

  // Dark mode toggle state
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  useEffect(() => {
    fetchProfile().catch((error: any) => {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: t('common.profile_title'), text2: t('common.missing_info') },
      });
    });
  }, [fetchProfile]);

  // Sync dark mode state with theme
  useEffect(() => {
    setDarkModeEnabled(isDark);
  }, [isDark]);

  // Handle dark mode toggle
  const handleDarkModeToggle = useCallback((value: boolean) => {
    setDarkModeEnabled(value);
    toggleTheme();
  }, [toggleTheme]);

  // Handle logout
  const handleLogout = useCallback(() => {
    Alert.alert(t('common.logout'), t('common.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      paddingBottom: 50,
    },
    // Hero Section - matching calorie chart card style
    heroCard: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderRadius: 24,
      marginBottom: 24,
      backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
    avatarContainer: {
      marginBottom: 16,
    },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    bmiSection: {
      marginTop: 8,
    },
    editButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    // Streak badge
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
      marginTop: 12,
    },
    streakText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#F97316',
    },
    // Logout
    logoutSection: {
      marginTop: 12,
    },
  });

  if (isLoading && !profile) {
    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Custom Header - matching StatsScreen */}
      <View style={{ alignItems: 'center', paddingTop: 70, paddingBottom: theme.spacing.lg }}>
        <ThemedText variant="h2" weight="700">
          👤 Hồ sơ
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">
          Thông tin cá nhân của bạn
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section - Matching Reference Image */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroCard}>
          {/* Name - Centered */}
          <ThemedText variant="h2" weight="700" style={{ textAlign: 'center' }}>
            {profile?.fullName || 'Chưa cập nhật'}
          </ThemedText>

          {/* Join Date - Subtitle */}
          <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 6 }}>
            {profile?.createdAt
              ? `Đã tham gia từ ${new Date(profile.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : 'Thành viên mới'}
          </ThemedText>

          {/* Stats Row - 3 columns with dividers */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
            marginBottom: 20,
            paddingVertical: 16,
            paddingHorizontal: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: 16,
          }}>
            {/* Age */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>🎂</ThemedText>
              <ThemedText variant="h4" weight="700">
                {profile?.age ? `${profile.age} tuổi` : '--'}
              </ThemedText>
            </View>

            {/* Divider */}
            <View style={{ width: 1, height: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />

            {/* Height */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>📏</ThemedText>
              <ThemedText variant="h4" weight="700">
                {profile?.heightCm ? `${profile.heightCm} cm` : '--'}
              </ThemedText>
            </View>

            {/* Divider */}
            <View style={{ width: 1, height: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />

            {/* Weight */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>⚖️</ThemedText>
              <ThemedText variant="h4" weight="700">
                {profile?.weightKg ? `${profile.weightKg} kg` : '--'}
              </ThemedText>
            </View>
          </View>

          {/* Edit Profile Button */}
          <Pressable
            style={({ pressed }) => [
              {
                width: '100%',
                paddingVertical: 16,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }
            ]}
            onPress={() => navigation.navigate('EditProfile' as any)}
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa hồ sơ"
          >
            <ThemedText variant="body" weight="600">
              Chỉnh sửa hồ sơ
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Health Profile Section */}
        <SettingsSection title="Hồ sơ sức khỏe" delay={100}>
          <SettingsMenuItem
            icon="📏"
            label="Số đo cơ thể"
            subtitle={
              profile?.heightCm && profile?.weightKg
                ? `${profile.heightCm}cm • ${profile.weightKg}kg`
                : 'Chưa cập nhật'
            }
            onPress={() => navigation.navigate('BodyMetrics' as any)}
          />
          <SettingsMenuItem
            icon="🎯"
            label="Mục tiêu & Hoạt động"
            subtitle={`${getGoalLabel(profile?.goal)} • ${getActivityLabel(profile?.activityLevelId)}`}
            onPress={() => navigation.navigate('GoalSettings' as any)}
          />
          <SettingsMenuItem
            icon="🥗"
            label="Chế độ ăn & Dị ứng"
            subtitle="Vegetarian, No-pork, Allergies..."
            onPress={() => navigation.navigate('DietaryRestrictions' as any)}
          />
          <SettingsMenuItem
            icon="📈"
            label="Lịch sử cân đo"
            subtitle="Xem biểu đồ tiến trình"
            onPress={() => navigation.navigate('WeightHistory' as any)}
          />
          <SettingsMenuItem
            icon="🏆"
            label="Thành tích"
            subtitle="Xem badges và streaks"
            onPress={() => navigation.navigate('Achievements')}
          />
        </SettingsSection>

        {/* Nutrition Section */}
        <SettingsSection title="Dinh dưỡng" delay={200}>
          <SettingsMenuItem
            icon="⚙️"
            label="Mục tiêu dinh dưỡng"
            subtitle="Calories, protein, carbs, fat"
            onPress={() => navigation.navigate('NutritionSettings')}
          />
          <SettingsMenuItem
            icon="💡"
            label="AI Insights"
            subtitle="Phân tích và gợi ý"
            onPress={() => navigation.navigate('NutritionInsights')}
          />
        </SettingsSection>

        {/* App Settings Section */}
        <SettingsSection title="Cài đặt" delay={300}>
          <SettingsMenuItem
            icon="🌙"
            label="Giao diện tối"
            showArrow={false}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={handleDarkModeToggle}
                trackColor={{
                  false: 'rgba(0,0,0,0.1)',
                  true: theme.colors.primary,
                }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsMenuItem
            icon="🔔"
            label="Thông báo"
            subtitle="Nhắc nhở bữa ăn"
            onPress={() => navigation.navigate('NotificationsSettings' as any)}
          />
          <SettingsMenuItem
            icon="🔐"
            label="Đổi mật khẩu"
            onPress={() => navigation.navigate('ChangePassword' as any)}
          />
          <SettingsMenuItem
            icon="ℹ️"
            label="Về ứng dụng"
            subtitle="Phiên bản, phản hồi"
            onPress={() => navigation.navigate('About' as any)}
          />
        </SettingsSection>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.logoutSection}>
          <Button
            title={t('common.logout')}
            variant="ghost"
            onPress={handleLogout}
          />
        </Animated.View>
      </ScrollView>
    </LinearGradient >
  );
};

export default ProfileScreen;
