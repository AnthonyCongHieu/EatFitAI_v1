import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import type { MappedFoodItem } from '../../types/ai';
import { translateIngredient } from '../../utils/translate';

interface AIResultEditModalProps {
  visible: boolean;
  item: MappedFoodItem | null;
  onClose: () => void;
  onSave: (editedItem: MappedFoodItem & { grams: number }) => void;
}

export const AIResultEditModal: React.FC<AIResultEditModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const [grams, setGrams] = useState('100');

  useEffect(() => {
    if (item) {
      setGrams('100');
    }
  }, [item]);

  // Auto-calculate nutrition based on grams
  const calculatedNutrition = useMemo(() => {
    const gramsNum = parseFloat(grams) || 100;
    const ratio = gramsNum / 100;
    return {
      calories: Math.round((item?.caloriesPer100g || 0) * ratio),
      protein: Math.round((item?.proteinPer100g || 0) * ratio * 10) / 10,
      carbs: Math.round((item?.carbPer100g || 0) * ratio * 10) / 10,
      fat: Math.round((item?.fatPer100g || 0) * ratio * 10) / 10,
    };
  }, [grams, item]);

  const handleSave = () => {
    if (!item) return;

    const gramsNum = parseFloat(grams) || 100;
    const editedItem: MappedFoodItem & { grams: number } = {
      ...item,
      grams: gramsNum,
    };

    onSave(editedItem);
  };

  if (!item) return null;

  const displayName = item.foodName || translateIngredient(item.label);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="h3" weight="700" numberOfLines={1}>
                {displayName}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Độ tin cậy: {Math.round(item.confidence * 100)}%
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              ]}
            >
              <Icon name="close" size="sm" color="textSecondary" />
            </Pressable>
          </View>

          {/* Grams Input - Prominent */}
          <View
            style={[
              styles.gramsCard,
              {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'rgba(59, 130, 246, 0.08)',
                borderColor: theme.colors.primary + '30',
              },
            ]}
          >
            <View>
              <ThemedText variant="bodySmall" weight="600" color="primary">
                Khối lượng
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                gram
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.gramsInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.primary,
                },
              ]}
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
              returnKeyType="done"
              placeholder="100"
              placeholderTextColor={theme.colors.textSecondary}
              selectTextOnFocus
            />
          </View>

          {/* Nutrition Display - Clean horizontal layout */}
          <View
            style={[
              styles.nutritionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Calories */}
            <View style={styles.nutritionItem}>
              <ThemedText variant="h3" weight="700" style={{ color: '#EF4444' }}>
                {calculatedNutrition.calories}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                kcal
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Protein */}
            <View style={styles.nutritionItem}>
              <ThemedText variant="body" weight="700" style={{ color: '#3B82F6' }}>
                {calculatedNutrition.protein}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Protein
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Carbs */}
            <View style={styles.nutritionItem}>
              <ThemedText variant="body" weight="700" style={{ color: '#F59E0B' }}>
                {calculatedNutrition.carbs}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Carbs
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Fat */}
            <View style={styles.nutritionItem}>
              <ThemedText variant="body" weight="700" style={{ color: '#EC4899' }}>
                {calculatedNutrition.fat}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Fat
              </ThemedText>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={[
                styles.actionButton,
                { borderColor: theme.colors.border, borderWidth: 1 },
              ]}
            >
              <ThemedText variant="body" weight="600">
                Hủy
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.actionButton}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Icon name="add" size="sm" color="background" />
                <ThemedText
                  variant="body"
                  weight="600"
                  style={{ color: '#fff', marginLeft: 6 }}
                >
                  Thêm
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gramsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  gramsInput: {
    width: 100,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  nutritionCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '100%',
    marginHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
