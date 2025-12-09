import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import { AppCard } from './AppCard';
import Button from '../Button';
import Icon from '../Icon';
import type { MappedFoodItem } from '../../types/ai';

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

  const [grams, setGrams] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    if (item) {
      setGrams('100');
      setCalories(String(item.caloriesPer100g || 0));
      setProtein(String(item.proteinPer100g || 0));
      setCarbs(String(item.carbPer100g || 0));
      setFat(String(item.fatPer100g || 0));
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;

    const gramsNum = parseFloat(grams) || 100;
    const editedItem: MappedFoodItem & { grams: number } = {
      ...item,
      caloriesPer100g: parseFloat(calories) || 0,
      proteinPer100g: parseFloat(protein) || 0,
      carbPer100g: parseFloat(carbs) || 0,
      fatPer100g: parseFloat(fat) || 0,
      grams: gramsNum,
    };

    onSave(editedItem);
  };

  const calculatedCalories =
    ((parseFloat(calories) || 0) * (parseFloat(grams) || 100)) / 100;

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <ThemedText variant="h3" weight="700">
              {item.label}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size="md" color="textSecondary" />
            </Pressable>
          </View>

          <ThemedText
            variant="caption"
            color="textSecondary"
            style={{ marginBottom: theme.spacing.lg }}
          >
            Độ tin cậy: {Math.round(item.confidence * 100)}%
          </ThemedText>

          {/* Amount Input */}
          <View style={styles.inputRow}>
            <ThemedText variant="body" weight="600" style={styles.inputLabel}>
              Khối lượng (g)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <ThemedText
            variant="bodySmall"
            color="textSecondary"
            style={{ marginBottom: theme.spacing.sm }}
          >
            Giá trị dinh dưỡng (trên 100g)
          </ThemedText>

          {/* Nutrition Inputs */}
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Calories
              </ThemedText>
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Protein (g)
              </ThemedText>
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Carbs (g)
              </ThemedText>
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Fat (g)
              </ThemedText>
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Calculated Total */}
          <View style={[styles.totalRow, { backgroundColor: theme.colors.primaryLight }]}>
            <ThemedText variant="body" weight="600">
              Tổng calories
            </ThemedText>
            <ThemedText variant="h3" weight="700" color="primary">
              {Math.round(calculatedCalories)} kcal
            </ThemedText>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button variant="outline" title="Hủy" onPress={onClose} style={{ flex: 1 }} />
            <Button
              variant="primary"
              title="Thêm vào nhật ký"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    flex: 1,
  },
  input: {
    width: 100,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    width: '48%',
  },
  smallInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 4,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
