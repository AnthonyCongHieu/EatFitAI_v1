// BodyMetricsScreen — "Hồ sơ thể chất"
// Emerald Nebula 3D: Basic info card + Weight goals section

import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Text,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import { useProfileStore } from '../../../store/useProfileStore';
import { useDiaryStore } from '../../../store/useDiaryStore';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette
   ═══════════════════════════════════════════════ */
const P = {
  primary: '#4be277',
  primaryContainer: '#22c55e',
  surface: '#0e1322',
  surfaceContainerHigh: '#25293a',
  surfaceContainerHighest: '#2f3445',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  glassBorder: 'rgba(255,255,255,0.05)',
};

/* ═══ Helpers ═══ */
const getGoalLabel = (goal?: string): string => {
  switch (goal) {
    case 'lose': return 'Giảm cân';
    case 'maintain': return 'Giữ cân';
    case 'gain': return 'Tăng cân';
    default: return 'Chưa đặt';
  }
};

const getActivityLabel = (levelId?: number): string => {
  switch (levelId) {
    case 1: return 'Ít vận động';
    case 2: return 'Nhẹ nhàng';
    case 3: return 'Trung bình';
    case 4: return 'Năng động';
    case 5: return 'Rất năng động';
    default: return 'Chưa đặt';
  }
};

const getGenderLabel = (g?: string): string => {
  switch (g) {
    case 'male': return 'Nam';
    case 'female': return 'Nữ';
    default: return '--';
  }
};



const getEstimatedCompletion = (
  currentKg?: number,
  targetKg?: number,
  goal?: string,
  weeklyRate?: number,
): string => {
  if (!currentKg || !targetKg || !goal) return '--';
  const diff = Math.abs(targetKg - currentKg);
  if (diff < 0.5) return 'Đã đạt mục tiêu 🎉';
  const rate = weeklyRate || (goal === 'lose' ? 0.5 : goal === 'gain' ? 0.3 : 0);
  if (rate === 0) return '--';
  const weeks = diff / rate;
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + weeks * 7);
  return completionDate.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/* ═══ Info Row ═══ */
interface InfoRowProps {
  label: string;
  value: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

const InfoRow = ({ label, value, onPress, showChevron = false, isLast = false }: InfoRowProps) => (
  <Pressable
    style={({ pressed }) => [
      S.infoRow,
      !isLast && S.infoRowBorder,
      pressed && onPress && { opacity: 0.7 },
    ]}
    onPress={onPress}
    disabled={!onPress}
  >
    <ThemedText style={S.infoRowLabel} numberOfLines={1}>{label}</ThemedText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <ThemedText style={S.infoRowValue} numberOfLines={1}>{value}</ThemedText>
      {showChevron && onPress && (
        <Ionicons name="chevron-forward" size={18} color={P.onSurfaceVariant + '60'} />
      )}
    </View>
  </Pressable>
);

/* ═══════════════════════════════════════════════
   BodyMetricsScreen — "Hồ sơ thể chất"
   ═══════════════════════════════════════════════ */
const BodyMetricsScreen = (): React.ReactElement => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  
  // Instantly load summary from store instead of waiting for API call to prevent layout blinks
  const summary = useDiaryStore((s) => s.summary);

  useEffect(() => {
    if (isFocused) {
      // Refresh profile data when screen comes into focus
      fetchProfile({ force: true });
    }
  }, [isFocused, fetchProfile]);

  // Fallback: Estimated target calo (Harris-Benedict) only if backend doesn't provide one
  const estimatedCalo = useMemo(() => {
    if (summary?.targetCalories && summary.targetCalories > 0) {
      return summary.targetCalories;
    }
    if (!profile?.weightKg || !profile?.heightCm || !profile?.age) return null;
    const isMale = profile.gender === 'male';
    let bmr: number;
    if (isMale) {
      bmr = 88.362 + (13.397 * profile.weightKg) + (4.799 * profile.heightCm) - (5.677 * profile.age);
    } else {
      bmr = 447.593 + (9.247 * profile.weightKg) + (3.098 * profile.heightCm) - (4.330 * profile.age);
    }
    const factor = profile.activityFactor || 1.55;
    let tdee = bmr * factor;
    if (profile.goal === 'lose') tdee -= 500;
    if (profile.goal === 'gain') tdee += 300;
    return Math.round(tdee);
  }, [profile, summary?.targetCalories]);

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* ═══ HEADER ═══ */}
      <View style={S.header}>
        <Pressable style={S.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={P.onSurface} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Hồ sơ thể chất</ThemedText>
        <View style={S.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ SECTION 1: Thông tin cơ bản ═══ */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={S.sectionHeader}>
            <ThemedText style={S.sectionTitle}>Thông tin cơ bản</ThemedText>
            <Pressable
              onPress={() => navigation.navigate('BasicInfo')}
              hitSlop={12}
            >
              <Ionicons name="pencil" size={20} color={P.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={S.card}>
            {/* Nickname */}
            <View style={S.nicknameBlock}>
              <ThemedText style={S.fieldLabel}>NICKNAME</ThemedText>
              <Text style={S.nicknameValue} numberOfLines={1}>
                {profile?.fullName || 'Chưa đặt'}
              </Text>
            </View>

            <View style={S.cardDivider} />

            {/* Gender | Age | Height row */}
            <View style={S.tripleRow}>
              <View style={S.tripleCol}>
                <ThemedText style={S.fieldLabel}>GIỚI TÍNH</ThemedText>
                <ThemedText style={S.tripleValue}>
                  {getGenderLabel(profile?.gender)}
                </ThemedText>
              </View>
              <View style={S.tripleCol}>
                <ThemedText style={S.fieldLabel}>TUỔI</ThemedText>
                <ThemedText style={S.tripleValue}>
                  {profile?.age ?? '--'}
                </ThemedText>
              </View>
              <View style={S.tripleCol}>
                <ThemedText style={S.fieldLabel}>CHIỀU CAO</ThemedText>
                <ThemedText style={S.tripleValue}>
                  {profile?.heightCm ? `${profile.heightCm} cm` : '--'}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ═══ SECTION 2: Mục tiêu cân nặng ═══ */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={S.sectionHeader}>
            <ThemedText style={S.sectionTitle}>Mục tiêu cân nặng</ThemedText>
            <Pressable hitSlop={12}>
              <Ionicons name="information-circle-outline" size={22} color={P.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={S.card}>
            {/* Goal row — current → target */}
            <View style={[S.infoRow, S.infoRowBorder]}>
              <ThemedText style={S.goalLabel} numberOfLines={1}>
                {getGoalLabel(profile?.goal)}
              </ThemedText>
              <View style={S.goalWeightRow}>
                <ThemedText style={S.goalWeight} numberOfLines={1}>
                  {profile?.weightKg ?? '--'} kg
                </ThemedText>
                <Ionicons name="play-forward" size={14} color={P.onSurfaceVariant} />
                <ThemedText style={[S.goalWeight, { color: P.primary }]} numberOfLines={1}>
                  {profile?.targetWeightKg ?? '--'} kg
                </ThemedText>
              </View>
            </View>


            {/* Cường độ vận động → GoalSettings */}
            <InfoRow
              label="Cường độ vận động"
              value={getActivityLabel(profile?.activityLevelId)}
              onPress={() => navigation.navigate('GoalSettings')}
              showChevron
            />

            {/* Calo mục tiêu */}
            <InfoRow
              label="Calo mục tiêu"
              value={estimatedCalo ? `${estimatedCalo} calo` : '--'}
            />

            {/* Dự kiến hoàn thành */}
            <InfoRow
              label="Dự kiến hoàn thành"
              value={getEstimatedCompletion(
                profile?.weightKg,
                profile?.targetWeightKg,
                profile?.goal,
                (profile as any)?.weeklyWeightRateKg,
              )}
              isLast
            />
          </View>
        </Animated.View>

        {/* ═══ BOTTOM BUTTON ═══ */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Pressable
            style={({ pressed }) => [S.ctaBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => navigation.navigate('Onboarding', { initialStep: 1 } as any)}
          >
            <ThemedText style={S.ctaBtnText}>Thiết lập mục tiêu mới</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Emerald Nebula Hồ sơ thể chất
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.onSurface,
    letterSpacing: -0.3,
  },

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 20,
    gap: 28,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: P.onSurface,
  },

  /* Card */
  card: {
    borderRadius: 16,
    backgroundColor: P.surfaceContainerHigh,
    paddingHorizontal: 20,
    paddingVertical: 18,
    // Remove overflow hidden to prevent text clipping
  },
  cardDivider: {
    height: 1,
    backgroundColor: P.glassBorder,
    marginVertical: 16,
  },

  /* Nickname */
  nicknameBlock: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.onSurfaceVariant + '80',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  nicknameValue: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: P.onSurface,
  },

  /* Triple row */
  tripleRow: {
    flexDirection: 'row',
  },
  tripleCol: {
    flex: 1,
  },
  tripleValue: {
    fontSize: 22,
    fontWeight: '600',
    color: P.onSurface,
  },

  /* Goal row */
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: P.onSurface,
    flexShrink: 1,
  },
  goalWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginLeft: 12,
  },
  goalWeight: {
    fontSize: 15,
    fontWeight: '700',
    color: P.onSurface,
  },

  /* Info row */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: P.glassBorder,
  },
  infoRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: P.onSurfaceVariant,
    flexShrink: 1,
  },
  infoRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: P.onSurface,
    flexShrink: 0,
    marginLeft: 8,
  },

  /* CTA button */
  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: P.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: P.primary + '30',
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: P.primary,
  },
});

export default BodyMetricsScreen;
