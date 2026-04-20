// DietaryRestrictionsScreen - Emerald Nebula 3D UI

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import { useUserPreferenceStore } from '../../../store/useUserPreferenceStore';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Ăn chay' },
  { id: 'vegan', label: 'Thuần chay' },
  { id: 'halal', label: 'Halal (Không heo)' },
  { id: 'no-pork', label: 'Không ăn heo' },
  { id: 'no-beef', label: 'Không ăn bò' },
  { id: 'low-carb', label: 'Ít tinh bột' },
  { id: 'high-protein', label: 'Giàu protein' },
];

const ALLERGY_OPTIONS = [
  { id: 'seafood', label: 'Hải sản' },
  { id: 'peanut', label: 'Đậu phộng' },
  { id: 'dairy', label: 'Sữa/Phô mai' },
  { id: 'egg', label: 'Trứng' },
  { id: 'wheat', label: 'Lúa mì (Gluten)' },
  { id: 'soy', label: 'Đậu nành' },
];

/* ═══ Palette ═══ */
const P = {
  primary: '#4be277',
  surface: '#0e1322',
  surfaceContainerHigh: '#25293a',
  surfaceContainerLowest: '#090e1c',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  onPrimary: '#003915',
  glassBorder: 'rgba(255,255,255,0.05)',
  chipBg: 'rgba(255,255,255,0.08)',
};

export const DietaryRestrictionsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { preferences, fetchPreferences, updatePreferences, isLoading } =
    useUserPreferenceStore();

  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setSelectedDiet(preferences.dietaryRestrictions || []);
      setSelectedAllergies(preferences.allergies || []);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences({
        ...preferences,
        dietaryRestrictions: selectedDiet,
        allergies: selectedAllergies,
        preferredMealsPerDay: preferences?.preferredMealsPerDay || 3,
        preferredCuisine: preferences?.preferredCuisine || null,
      });
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đã lưu thiết lập ăn uống',
        visibilityTime: 2000,
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể lưu thay đổi',
      });
    }
  };

  const toggleSelection = (
    id: string,
    list: string[],
    setList: (val: string[]) => void,
  ) => {
    if (list.includes(id)) {
      setList(list.filter((i) => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  if (isLoading && !preferences) {
    return (
      <View style={[S.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* ═══ Header ═══ */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Pressable style={S.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={P.onSurface} />
          </Pressable>
          <ThemedText style={S.headerTitle}>Chế độ ăn & Dị ứng</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        {/* ═══ Chế độ ăn ═══ */}
        <Animated.View entering={FadeInDown.delay(100)} style={S.card}>
          <View style={S.sectionTitleRow}>
            <ThemedText style={S.sectionTitle}>Chế độ ăn</ThemedText>
            <Ionicons name="leaf-outline" size={20} color={P.onSurfaceVariant} />
          </View>
          <ThemedText style={S.subtitle}>
            Chọn các hạn chế hoặc chế độ ăn bạn đang theo đuổi.
          </ThemedText>
          <View style={S.chipsContainer}>
            {DIETARY_OPTIONS.map((opt) => {
              const isSelected = selectedDiet.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  style={[S.chip, isSelected && S.chipActive]}
                  onPress={() => toggleSelection(opt.id, selectedDiet, setSelectedDiet)}
                >
                  <ThemedText style={[S.chipText, isSelected && S.chipTextActive]}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ═══ Dị ứng thực phẩm ═══ */}
        <Animated.View entering={FadeInDown.delay(200)} style={S.card}>
          <View style={S.sectionTitleRow}>
            <ThemedText style={S.sectionTitle}>Dị ứng thực phẩm</ThemedText>
            <Ionicons name="warning-outline" size={20} color={P.onSurfaceVariant} />
          </View>
          <ThemedText style={S.subtitle}>
            Hệ thống sẽ cảnh báo hoặc loại bỏ các món chứa thành phần này.
          </ThemedText>
          <View style={S.chipsContainer}>
            {ALLERGY_OPTIONS.map((opt) => {
              const isSelected = selectedAllergies.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  style={[S.chip, isSelected && S.chipActive]}
                  onPress={() => toggleSelection(opt.id, selectedAllergies, setSelectedAllergies)}
                >
                  <ThemedText style={[S.chipText, isSelected && S.chipTextActive]}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ═══ Fixed Bottom Button ═══ */}
      <Animated.View entering={FadeInUp.delay(300)} style={S.bottomArea}>
        <Pressable
          style={({ pressed }) => [S.saveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={P.onPrimary} />
          ) : (
            <ThemedText style={S.saveBtnText}>Lưu thay đổi</ThemedText>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: P.surfaceContainerLowest + '90',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: P.onSurface, letterSpacing: -0.5 },
  
  content: { padding: 20, gap: 20, paddingBottom: 120, paddingTop: 16 },
  
  card: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: P.onSurface },
  subtitle: { fontSize: 14, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant, marginBottom: 20, lineHeight: 22 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: P.chipBg,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  chipActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
    shadowColor: P.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  chipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: P.onSurfaceVariant },
  chipTextActive: { color: P.onPrimary, fontFamily: 'Inter_700Bold' },

  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: P.surfaceContainerLowest + 'F0',
    borderTopWidth: 1,
    borderColor: P.glassBorder,
  },
  saveBtn: {
    backgroundColor: P.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: P.onPrimary,
  },
});

export default DietaryRestrictionsScreen;
