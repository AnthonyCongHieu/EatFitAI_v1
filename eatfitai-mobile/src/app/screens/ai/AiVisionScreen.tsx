import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import type { VisionDetectResult } from '../../../types/ai';
import { aiService } from '../../../services/aiService';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AiVisionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<VisionDetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (): Promise<void> => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      setError(null);
    }
  };

  const runDetect = async (): Promise<void> => {
    if (!imageUri) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.detectFoodByImage(imageUri);
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? 'Loi goi VisionDetect');
    } finally {
      setLoading(false);
    }
  };

  const runTeachLabelTest = async (): Promise<void> => {
    if (!imageUri || !result) return;
    const unmapped = result.items.find((x) => !x.isMatched);
    if (!unmapped) {
      setError('Khong co nhan nao chua map de teach');
      return;
    }

    setTeaching(true);
    setError(null);
    try {
      await aiService.teachLabel({
        label: unmapped.label,
        foodItemId: 1,
        minConfidence: 0.5,
      });

      const refreshed = await aiService.detectFoodByImage(imageUri);
      setResult(refreshed);
    } catch (e: any) {
      setError(e?.message ?? 'Loi goi TeachLabel');
    } finally {
      setTeaching(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.sm }}>
          AI Vision Detect
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
          Chon anh mon an, AI se nhan dien va map sang FoodItem (neu co).
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Button title="Chon anh" variant="primary" onPress={pickImage} />
          <Button title="Nhan dien" variant="secondary" onPress={runDetect} disabled={!imageUri || loading} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
              Dang goi AI Vision...
            </ThemedText>
          </View>
        )}

        {error && (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <ThemedText variant="bodySmall" style={{ color: theme.colors.error }}>
              {error}
            </ThemedText>
          </View>
        )}

        {result && (
          <View style={{ maxHeight: 320 }}>
            <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Ket qua nhan dien
            </ThemedText>
            <FlatList
              data={result.items}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <ThemedText variant="body">
                    • Label: {item.label} ({(item.confidence * 100).toFixed(1)}%)
                  </ThemedText>
                  {item.isMatched ? (
                    <>
                      <ThemedText variant="bodySmall">
                        → Mon: {item.foodName ?? '-'} (#{item.foodItemId ?? '-'})
                      </ThemedText>
                      <ThemedText variant="bodySmall" color="textSecondary">
                        100g: {item.caloriesPer100g ?? '-'} kcal | P {item.proteinPer100g ?? '-'} | F {item.fatPer100g ?? '-'} | C {item.carbPer100g ?? '-'}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText variant="bodySmall" color="textSecondary">
                      → Chua map (nhan la)
                    </ThemedText>
                  )}
                </View>
              )}
            />

            {result.unmappedLabels.length > 0 && (
              <ThemedText variant="bodySmall" style={{ marginTop: theme.spacing.sm }}>
                Nhan chua map: {result.unmappedLabels.join(', ')}
              </ThemedText>
            )}

            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                title={teaching ? 'Dang teach...' : 'Test TeachLabel (foodId = 1)'}
                variant="outline"
                onPress={runTeachLabelTest}
                disabled={
                  teaching || !result || !result.items.some((x) => !x.isMatched) || !imageUri
                }
              />
            </View>

            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                title="Su dung cac mon nay trong bua an"
                variant="primary"
                onPress={() => {
                  if (!imageUri || !result) return;
                  navigation.navigate('AddMealFromVision', { imageUri, result });
                }}
                disabled={!imageUri || !result || result.items.length === 0}
              />
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  itemRow: { paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
});

export default AiVisionScreen;
