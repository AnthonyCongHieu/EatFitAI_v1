import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Image, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeIn } from 'react-native-reanimated';

import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import type { VisionDetectResult } from '../../../types/ai';
import { aiService } from '../../../services/aiService';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const AiVisionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<VisionDetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      scanLineY.value = withRepeat(
        withTiming(200, { duration: 1500, easing: Easing.linear }),
        -1,
        true
      );
    } else {
      scanLineY.value = 0;
    }
  }, [loading]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
    imageContainer: {
      width: '100%',
      height: 200,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md, // Fixed: use theme.radius.md instead of theme.borderRadius.md
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 10,
    }
  });

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
        <View style={styles.imageContainer}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} />
              {loading && <Animated.View style={[styles.scanLine, scanLineStyle]} />}
            </>
          ) : (
            <ThemedText color="textSecondary">Chưa chọn ảnh</ThemedText>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Button title="Chọn ảnh" variant="primary" onPress={pickImage} />
          <Button title="Nhận diện" variant="secondary" onPress={runDetect} disabled={!imageUri || loading} />
          <Button title="Lịch sử" variant="outline" onPress={() => navigation.navigate('VisionHistory')} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
              Đang phân tích hình ảnh...
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
          <Animated.View entering={FadeIn.duration(500)} style={styles.resultSection}>
            <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md }}>
              Kết quả nhận diện
            </ThemedText>
            <View>
              {result.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
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
              ))}
            </View>

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

            <View style={styles.buttonContainer}>
              <Button
                title="Gợi ý món ăn từ nguyên liệu này"
                variant="secondary"
                onPress={() => {
                  if (!result) return;
                  const ingredients = [
                    ...result.items.map(i => i.isMatched && i.foodName ? i.foodName : i.label),
                    ...result.unmappedLabels
                  ];
                  // Remove duplicates and empty strings
                  const uniqueIngredients = [...new Set(ingredients)].filter(Boolean);
                  navigation.navigate('RecipeSuggestions', { ingredients: uniqueIngredients });
                }}
                disabled={!result || (result.items.length === 0 && result.unmappedLabels.length === 0)}
              />
            </View>
          </Animated.View>
        )}
      </AppCard>
    </Screen>
  );
};

export default AiVisionScreen;
