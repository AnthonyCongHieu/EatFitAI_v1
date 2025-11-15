import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { ThemedText } from '../../../components/ThemedText';
import FoodItemPicker from '../../components/FoodItemPicker';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import type { VisionDetectResult, MappedFoodItem } from '../../../types/ai';
import { aiService } from '../../../services/aiService';
import { mealService } from '../../../services/mealService';
import { useDiaryStore } from '../../../store/useDiaryStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddMealFromVision'>;

type LocalItem = {
  id: string;
  source: MappedFoodItem;
  grams: string;
  selected: boolean;
};

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AddMealFromVisionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);

  const { imageUri, result: initialResult } = route.params;

  const [visionResult, setVisionResult] = useState<VisionDetectResult>(initialResult);
  const [items, setItems] = useState<LocalItem[]>(() =>
    initialResult.items.map((item, index) => ({
      id: `${index}-${item.label}`,
      source: item,
      grams: '100',
      selected: item.isMatched,
    })),
  );
  const [mealType, setMealType] = useState<MealTypeId>(MEAL_TYPES.LUNCH);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTeaching, setIsTeaching] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [labelToMap, setLabelToMap] = useState<string | null>(null);

  const validSelectedItems = useMemo(
    () =>
      items.filter((x) => x.selected && x.source.isMatched && x.source.foodItemId != null && !Number.isNaN(Number(x.grams)) && Number(x.grams) > 0),
    [items],
  );

  const handleChangeGrams = useCallback((id: string, value: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, grams: value } : it)));
  }, []);

  const handleToggleSelected = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  }, []);

  const handleOpenMap = useCallback((item: LocalItem) => {
    setLabelToMap(item.source.label);
    setPickerVisible(true);
  }, []);

  const handleSelectFoodForLabel = useCallback(
    async (food: { id: string }) => {
      if (!labelToMap) return;
      setIsTeaching(true);
      try {
        await aiService.teachLabel({
          label: labelToMap,
          foodItemId: Number(food.id),
          minConfidence: 0.5,
        });

        const refreshed = await aiService.detectFoodByImage(imageUri);
        setVisionResult(refreshed);
        // Merge lai voi local state de giu grams / selected
        setItems((prev) =>
          refreshed.items.map((item, index) => {
            const existing = prev.find((x) => x.source.label === item.label);
            return {
              id: existing?.id ?? `${index}-${item.label}`,
              source: item,
              grams: existing?.grams ?? '100',
              selected: existing?.selected ?? item.isMatched,
            };
          }),
        );
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.warn('Teach label failed', error);
      } finally {
        setIsTeaching(false);
        setLabelToMap(null);
      }
    },
    [imageUri, labelToMap],
  );

  const handleSubmit = useCallback(async () => {
    if (validSelectedItems.length === 0) {
      Toast.show({ type: 'info', text1: 'Chua chon mon nao', text2: 'Vui long chon it nhat 1 mon de them vao bua an' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = validSelectedItems.map((it) => ({
        foodItemId: Number(it.source.foodItemId),
        grams: Number(it.grams),
      }));
      await mealService.addMealItems(todayDate(), mealType, payload);
      Toast.show({ type: 'success', text1: 'Da them tu AI Vision', text2: 'Nhat ky bua an da duoc cap nhat' });
      await refreshSummary().catch(() => {});
      navigation.goBack();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Them bua an that bai', text2: 'Vui long thu lai hoac kiem tra ket noi' });
    } finally {
      setIsSubmitting(false);
    }
  }, [mealType, navigation, refreshSummary, validSelectedItems]);

  const renderItem = ({ item }: { item: LocalItem }) => (
    <Card padding="md" shadow="none" key={item.id} style={{ marginBottom: theme.spacing.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="body" weight="600">
            {item.source.foodName ?? 'Mon an'}{' '}
            <ThemedText variant="bodySmall" color="textSecondary">
              ({item.source.label})
            </ThemedText>
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Conf: {(item.source.confidence * 100).toFixed(1)}%
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            100g: {item.source.caloriesPer100g ?? '--'} kcal | P {item.source.proteinPer100g ?? '--'} | F{' '}
            {item.source.fatPer100g ?? '--'} | C {item.source.carbPer100g ?? '--'}
          </ThemedText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <ThemedTextInput
            label="Gram"
            keyboardType="numeric"
            value={item.grams}
            onChangeText={(value) => handleChangeGrams(item.id, value)}
          />
        </View>
        <View style={{ width: 120 }}>
          <Button
            variant={item.selected ? 'primary' : 'outline'}
            title={item.selected ? 'Se them' : 'Bo qua'}
            size="sm"
            onPress={() => handleToggleSelected(item.id)}
          />
        </View>
      </View>

      {!item.source.isMatched && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button
            variant="outline"
            size="sm"
            title={isTeaching && labelToMap === item.source.label ? 'Dang map...' : 'Map ngay'}
            disabled={isTeaching}
            onPress={() => handleOpenMap(item)}
          />
        </View>
      )}
    </Card>
  );

  return (
    <Screen contentContainerStyle={styles.container}>
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          Them bua an tu AI Vision
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
          Chinh sua gram va chon nhung mon ban muon them vao bua an.
        </ThemedText>

        <ThemedText variant="bodySmall" weight="600">
          Chon bua an
        </ThemedText>
        <View style={[styles.mealRow, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }]}>
          {[MEAL_TYPES.BREAKFAST, MEAL_TYPES.LUNCH, MEAL_TYPES.DINNER, MEAL_TYPES.SNACK].map((type) => (
            <Button
              key={type}
              size="sm"
              variant={mealType === type ? 'primary' : 'outline'}
              title={MEAL_TYPE_LABELS[type]}
              onPress={() => setMealType(type)}
            />
          ))}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />

        <View style={{ marginTop: theme.spacing.lg }}>
          <Button
            variant="primary"
            title={isSubmitting ? 'Dang them...' : 'Them vao MealDiary'}
            onPress={handleSubmit}
            disabled={isSubmitting || validSelectedItems.length === 0}
          />
        </View>
      </Card>

      <FoodItemPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectFoodForLabel}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 8 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

export default AddMealFromVisionScreen;

