// GoalSettingsScreen: Cài đặt mức độ vận động
// Emerald Nebula 3D — only Activity Level selection

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import MeshBackground from '../../../components/ui/MeshBackground';
import { useProfileStore } from '../../../store/useProfileStore';
import {
  showSuccess,
  handleApiErrorWithCustomMessage,
} from '../../../utils/errorHandler';
import { useEN } from '../../../theme/emeraldNebula';

/* ═══ Emerald Nebula Palette ═══ */
const P_STATIC = {
  primary: '#4be277',
  surface: '#05070d',
  surfaceContainerHigh: '#252b3f',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#b7c4d9',
  glassBorder: 'rgba(255,255,255,0.08)',
};
const P = P_STATIC;

// Activity level options
const ACTIVITY_OPTIONS = [
  {
    id: 1,
    label: 'Ít vận động',
    icon: '🪑',
    description: 'Ngồi nhiều, ít đi lại',
  },
  {
    id: 2,
    label: 'Nhẹ nhàng',
    icon: '🚶',
    description: 'Đi bộ 1-3 ngày/tuần',
  },
  {
    id: 3,
    label: 'Trung bình',
    icon: '🏃',
    description: 'Tập thể dục 3-5 ngày/tuần',
  },
  {
    id: 4,
    label: 'Năng động',
    icon: '💪',
    description: 'Tập luyện 6-7 ngày/tuần',
  },
  {
    id: 5,
    label: 'Rất năng động',
    icon: '🏋️',
    description: 'Tập luyện cường độ cao hàng ngày',
  },
] as const;

const GoalSettingsScreen = (): React.ReactElement => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const P = { ...P_STATIC, ...useEN() };

  const { profile, updateProfile, isSaving } = useProfileStore((state) => ({
    profile: state.profile,
    updateProfile: state.updateProfile,
    isSaving: state.isSaving,
  }));

  const [selectedActivity, setSelectedActivity] = useState<number>(3);

  // Load current values
  useEffect(() => {
    if (profile) {
      setSelectedActivity(profile.activityLevelId || 3);
    }
  }, [profile]);

  const onSubmit = async () => {
    try {
      await updateProfile({
        activityLevelId: selectedActivity,
      });
      showSuccess('profile_updated');
      navigation.goBack();
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Lỗi', text2: 'Không thể lưu thông tin' },
      });
    }
  };

  return (
    <View style={[S.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <MeshBackground />
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={P.onSurface} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Cường độ vận động</ThemedText>
        <View style={S.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section title */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <ThemedText style={S.sectionTitle}>Mức độ vận động</ThemedText>
          <ThemedText style={S.sectionSubtitle}>
            Chọn mức độ hoạt động phù hợp với bạn
          </ThemedText>
        </Animated.View>

        {/* Activity options */}
        <View style={S.optionsGrid}>
          {ACTIVITY_OPTIONS.map((activity, index) => {
            const isSelected = selectedActivity === activity.id;

            return (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(100 + index * 60).duration(350)}
              >
                <Pressable
                  onPress={() => setSelectedActivity(activity.id)}
                  style={({ pressed }) => [
                    S.optionCard,
                    isSelected && S.optionCardSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                >
                  <ThemedText style={S.optionIcon}>{activity.icon}</ThemedText>
                  <View style={S.optionContent}>
                    <ThemedText
                      style={[
                        S.optionLabel,
                        isSelected && { color: P.primary },
                      ]}
                    >
                      {activity.label}
                    </ThemedText>
                    <ThemedText style={S.optionDesc}>
                      {activity.description}
                    </ThemedText>
                  </View>
                  {isSelected && (
                    <View style={S.checkMark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Save Button */}
      <Animated.View entering={FadeInUp.delay(500).duration(400)} style={S.bottomArea}>
        <Pressable
          style={({ pressed }) => [
            S.saveBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            isSaving && { opacity: 0.6 },
          ]}
          onPress={onSubmit}
          disabled={isSaving}
        >
          <ThemedText style={S.saveBtnText}>
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
};

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: 'transparent',
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
    color: P.onSurface,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P.onSurfaceVariant,
    marginBottom: 20,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: P.surfaceContainerHigh,
  },
  optionCardSelected: {
    borderColor: P.primary,
    backgroundColor: P.primary + '10',
  },
  optionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.onSurface,
  },
  optionDesc: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
    color: P.onSurfaceVariant,
    marginTop: 3,
  },
  checkMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: P.primary,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#003915',
  },
});

export default GoalSettingsScreen;
