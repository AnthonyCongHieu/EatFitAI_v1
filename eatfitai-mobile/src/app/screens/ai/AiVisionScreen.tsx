import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
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

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      marginBottom: theme.spacing.sm,
    },
    card: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xxl,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    error: {
      marginBottom: theme.spacing.md,
    },
    resultSection: {
      maxHeight: 320,
    },
    itemRow: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    buttonContainer: {
      marginTop: theme.spacing.lg,
    },
  });

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
    <Screen style={styles.screen}>
      <ScreenHeader
        title="AI Vision Detect"
        subtitle="Chọn ảnh món ăn, AI sẽ nhận diện và map sang FoodItem (nếu có)."
      />

      <AppCard style={styles.card}>
        <View style={styles.buttonRow}>
          <Button title="Chọn ảnh" variant="primary" onPress={pickImage} />
          <Button title="Nhận diện" variant="secondary" onPress={runDetect} disabled={!imageUri || loading} />
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
          <View style={styles.error}>
            <ThemedText variant="bodySmall" color="danger">
              {error}
            </ThemedText>
          </View>
        )}

        {result && (
          <View style={styles.resultSection}>
            <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md }}>
              Kết quả nhận diện
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
                        → Món: {item.foodName ?? '-'} (#{item.foodItemId ?? '-'})
                      </ThemedText>
                      <ThemedText variant="caption" color="textSecondary">
                        100g: {item.caloriesPer100g ?? '-'} kcal | P {item.proteinPer100g ?? '-'} | F {item.fatPer100g ?? '-'} | C {item.carbPer100g ?? '-'}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText variant="bodySmall" color="textSecondary">
                      → Chưa map (nhãn lạ)
                    </ThemedText>
                  )}
                </View>
              )}
            />

            {result.unmappedLabels.length > 0 && (
              <ThemedText variant="bodySmall" style={{ marginTop: theme.spacing.md }}>
                Nhãn chưa map: {result.unmappedLabels.join(', ')}
              </ThemedText>
            )}

            <View style={styles.buttonContainer}>
              <Button
                title={teaching ? 'Đang teach...' : 'Test TeachLabel (foodId = 1)'}
                variant="outline"
                onPress={runTeachLabelTest}
                disabled={
                  teaching || !result || !result.items.some((x) => !x.isMatched) || !imageUri
                }
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Sử dụng các món này trong bữa ăn"
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
      </AppCard>
    </Screen>
  );
};

export default AiVisionScreen;
