import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useUserPreferenceStore } from '../../../store/useUserPreferenceStore';
import { SelectionChip } from '../../../components/ui/SelectionChip';

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

export const DietaryRestrictionsScreen = () => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation();

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
      Alert.alert('Thành công', 'Đã lưu thay đổi');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi');
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

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 24, paddingBottom: 100 },
    card: {
      ...glass.card,
      padding: 20,
    },
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  });

  if (isLoading && !preferences) {
    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.container, { justifyContent: 'center' }]}
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
      {/* Custom Header - Back button + Title on same row */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* Row: Back button + Title */}
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
            <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText variant="h3" weight="700">
              Chế độ ăn & Dị ứng
            </ThemedText>
          </View>
        </View>

        {/* Subtitle below */}
        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={{ textAlign: 'center', marginTop: 8 }}
        >
          Thiết lập hạn chế thực phẩm
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Chế độ ăn */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
          <View style={styles.sectionTitle}>
            <ThemedText variant="h3">Chế độ ăn</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Chọn các hạn chế hoặc chế độ ăn bạn đang theo đuổi.
          </ThemedText>
          <View style={styles.chipsContainer}>
            {DIETARY_OPTIONS.map((opt) => (
              <SelectionChip
                key={opt.id}
                label={opt.label}
                selected={selectedDiet.includes(opt.id)}
                onPress={() => toggleSelection(opt.id, selectedDiet, setSelectedDiet)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Dị ứng thực phẩm */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.sectionTitle}>
            <ThemedText variant="h3">Dị ứng thực phẩm</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Chúng tôi sẽ cảnh báo hoặc loại bỏ các món chứa thành phần này.
          </ThemedText>
          <View style={styles.chipsContainer}>
            {ALLERGY_OPTIONS.map((opt) => (
              <SelectionChip
                key={opt.id}
                label={opt.label}
                selected={selectedAllergies.includes(opt.id)}
                onPress={() =>
                  toggleSelection(opt.id, selectedAllergies, setSelectedAllergies)
                }
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Button
            title="Lưu thay đổi"
            onPress={handleSave}
            loading={isLoading}
            variant="primary"
          />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

export default DietaryRestrictionsScreen;
