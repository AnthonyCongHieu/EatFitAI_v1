import React, { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, isAiOfflineError } from '../../../services/aiService';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { AppImage } from '../../../components/ui/AppImage';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { AIResultEditModal } from '../../../components/ui/AIResultEditModal';
import type { RootStackParamList } from '../../types';
import type { MappedFoodItem } from '../../../types/ai';
import { ScanFrameOverlay } from '../../../components/scan/ScanFrameOverlay';
import { IngredientBasketFab } from '../../../components/scan/IngredientBasketFab';
import { IngredientBasketSheet } from '../../../components/scan/IngredientBasketSheet';
import { useIngredientBasketStore } from '../../../store/useIngredientBasketStore';
import { translateIngredient } from '../../../utils/translate';
import { TEST_IDS } from '../../../testing/testIds';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CameraViewInstance = InstanceType<typeof CameraView>;
type ScanMode = 'camera' | 'preview' | 'results';
type ScanResultNotice = {
  title: string;
  description: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AIScanScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraViewInstance | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [galleryPermission, requestGalleryPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const [mode, setMode] = useState<ScanMode>('camera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<{
    items: MappedFoodItem[];
    unmappedLabels: string[];
  } | null>(null);
  const [editingItem, setEditingItem] = useState<MappedFoodItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBasketSheet, setShowBasketSheet] = useState(false);
  const [resultNotice, setResultNotice] = useState<ScanResultNotice | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const addIngredient = useIngredientBasketStore((s) => s.addIngredient);

  const captureScale = useSharedValue(1);
  const basketIconScale = useSharedValue(1);

  const hasPermission = permission?.granted === true;

  const processImage = useCallback(async (uri: string) => {
    setMode('preview');
    setIsProcessing(true);
    setDetectionResult(null);
    setResultNotice(null);

    let processedUri = uri;
    try {
      const manipulatedResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      processedUri = manipulatedResult.uri;
      setCapturedUri(processedUri);
    } catch (compressError) {
      console.warn('Image compression failed, using original:', compressError);
      setCapturedUri(uri);
    }

    try {
      const result = await aiService.detectFoodByImage(processedUri);
      const filteredItems = result.items.filter((item) => item.confidence > 0.4);

      setDetectionResult({
        ...result,
        items: filteredItems,
      });
      setResultNotice(
        filteredItems.length === 0
          ? {
              title: 'Chua tim thay mon an phu hop',
              description: 'Thu chup lai ro hon hoac dung tim kiem thu cong.',
            }
          : null,
      );
      setMode('results');
    } catch (error) {
      if (isAiOfflineError(error)) {
        setDetectionResult({ items: [], unmappedLabels: [] });
        setResultNotice({
          title: 'AI tam offline',
          description: 'Ban van co the tim mon thu cong hoac thu lai sau.',
        });
        setMode('results');
      } else {
        handleApiErrorWithCustomMessage(error, {
          server_error: { text1: 'Loi may chu', text2: 'Vui long thu lai sau' },
          network_error: { text1: 'Khong co ket noi', text2: 'Kiem tra mang va thu lai' },
          unknown: { text1: 'Khong the phan tich anh', text2: 'Vui long thu lai' },
        });
        setMode('camera');
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      handleApiErrorWithCustomMessage(new Error('Camera not ready'), {
        unknown: { text1: 'Camera chua san sang', text2: 'Vui long thu lai' },
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);
    captureScale.value = withSpring(0.9, { damping: 10 });

    try {
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
      });

      if (!result?.uri) throw new Error('Khong doc duoc anh');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      captureScale.value = withSpring(1, { damping: 15 });
      await processImage(result.uri);
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Khong the chup anh', text2: 'Vui long thu lai' },
      });
      captureScale.value = withSpring(1, { damping: 15 });
    } finally {
      setIsCapturing(false);
    }
  }, [captureScale, processImage]);

  const handlePickImage = useCallback(async () => {
    if (!galleryPermission?.granted) {
      const result = await requestGalleryPermission();
      if (!result.granted) {
        handleApiErrorWithCustomMessage(new Error('Permission denied'), {
          unknown: {
            text1: 'Can quyen truy cap thu vien anh',
            text2: 'Vui long cap quyen trong cai dat',
          },
        });
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Khong the chon anh', text2: 'Vui long thu lai' },
      });
    }
  }, [galleryPermission, processImage, requestGalleryPermission]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setDetectionResult(null);
    setResultNotice(null);
    setMode('camera');
  }, []);

  const handleAddToDiary = useCallback(() => {
    if (!capturedUri || !detectionResult) {
      handleApiErrorWithCustomMessage(new Error('No data'), {
        unknown: { text1: 'Chua co du lieu', text2: 'Vui long chup hoac chon anh' },
      });
      return;
    }

    navigation.navigate('AddMealFromVision', {
      imageUri: capturedUri,
      result: detectionResult,
    });
  }, [capturedUri, detectionResult, navigation]);

  const handleQuickAdd = useCallback((item: MappedFoodItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  }, []);

  const handleAddToBasket = useCallback(
    (item: MappedFoodItem) => {
      basketIconScale.value = withSequence(
        withSpring(1.3, { damping: 10 }),
        withSpring(1, { damping: 15 }),
      );

      const displayName = item.foodName || translateIngredient(item.label);
      addIngredient({
        name: displayName,
        confidence: item.confidence,
        imageUri: capturedUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Da them vao gio',
        text2: displayName,
        visibilityTime: 1500,
      });
    },
    [addIngredient, basketIconScale, capturedUri],
  );

  const handleEditModalSave = useCallback(
    async (editedItem: MappedFoodItem & { grams: number }) => {
      setShowEditModal(false);
      setIsProcessing(true);
      try {
        const ratio = editedItem.grams / 100;
        const actualCalories = Math.round((editedItem.caloriesPer100g || 0) * ratio);

        await addItemsToTodayDiary([
          {
            foodItemId: Number(editedItem.foodItemId || 0),
            grams: editedItem.grams,
          },
        ]);

        Toast.show({
          type: 'success',
          text1: 'Da them',
          text2: `${editedItem.label} - ${actualCalories} kcal`,
        });
        await invalidateDiaryQueries(queryClient);
        setEditingItem(null);
      } catch (error) {
        handleApiErrorWithCustomMessage(error, {
          unknown: { text1: 'Loi them mon', text2: 'Vui long thu lai' },
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [queryClient],
  );

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const basketIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: basketIconScale.value }],
  }));

  const isCameraMode = mode === 'camera';
  const topResults = detectionResult
    ? [...detectionResult.items].sort((a, b) => b.confidence - a.confidence).slice(0, 2)
    : [];
  const quickSaveItem = topResults.find(
    (item) => typeof item.foodItemId === 'number' && Number(item.foodItemId) > 0,
  );
  const hasDetectedItems = topResults.length > 0;

  const handleQuickSave = useCallback(async () => {
    if (!quickSaveItem?.foodItemId) {
      if (topResults[0]) {
        handleQuickAdd(topResults[0]);
      }
      return;
    }

    setIsQuickSaving(true);
    try {
      await addItemsToTodayDiary([
        {
          foodItemId: Number(quickSaveItem.foodItemId),
          grams: 100,
        },
      ]);

      Toast.show({
        type: 'success',
        text1: 'Luu nhanh thanh cong',
        text2: `${quickSaveItem.foodName || translateIngredient(quickSaveItem.label)} - 100g`,
      });
      await invalidateDiaryQueries(queryClient);
      handleRetake();
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Khong the luu nhanh', text2: 'Vui long thu lai hoac chinh tay' },
      });
    } finally {
      setIsQuickSaving(false);
    }
  }, [handleQuickAdd, handleRetake, queryClient, quickSaveItem, topResults]);

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Icon name="camera-outline" size="xl" color="muted" />
        </Animated.View>
        <ThemedText
          variant="h3"
          style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}
        >
          {'Can quyen camera'}
        </ThemedText>
        <ThemedText
          variant="body"
          color="textSecondary"
          style={{ textAlign: 'center', paddingHorizontal: 32 }}
        >
          {'Cho phep truy cap camera de quet mon an bang AI'}
        </ThemedText>
        <Button
          variant="primary"
          title="Cap quyen camera"
          onPress={requestPermission}
          style={{ marginTop: theme.spacing.xl }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={TEST_IDS.aiScan.screen}>
      {(isCameraMode || mode === 'preview') && (
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      )}

      {(mode === 'preview' || mode === 'results') && capturedUri && (
        <AppImage
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFill as any}
          resizeMode="cover"
        />
      )}

      {isCameraMode && (
        <ScanFrameOverlay isScanning={!isCapturing && !isProcessing} isSuccess={false} />
      )}

      {!isCameraMode && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
          pointerEvents="none"
        />
      )}

      <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
        {mode !== 'results' && (
          <View style={styles.headerFloating}>
            <ThemedText
              variant="h3"
              weight="700"
              style={{
                color: '#fff',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowRadius: 4,
              }}
            >
              AI Scan
            </ThemedText>
            {isProcessing && <ActivityIndicator color="#fff" />}
          </View>
        )}

        <View style={styles.spacer} />

        {isProcessing && (
          <Animated.View entering={FadeInUp} style={styles.processingBadge}>
            <ThemedText variant="body" style={{ color: '#fff' }}>
              {'Dang phan tich...'}
            </ThemedText>
          </Animated.View>
        )}

        {isCameraMode && (
          <Animated.View entering={FadeInDown} style={styles.cameraActionGroup}>
            <Button
              title="Chon tu thu vien"
              onPress={handlePickImage}
              variant="secondary"
              size="sm"
              fullWidth={false}
              icon="images-outline"
              accessibilityLabel="Chon tu thu vien"
              accessibilityHint="Chon anh co san tu thu vien"
              testID={TEST_IDS.aiScan.galleryButton}
              style={styles.galleryCtaButton}
            />

            <Animated.View style={styles.bottomControls}>
              <AnimatedPressable
                style={[
                  styles.sideButton,
                  {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  },
                ]}
                onPress={() => navigation.navigate('FoodSearch')}
                hitSlop={16}
                accessible
                collapsable={false}
                importantForAccessibility="yes"
                accessibilityRole="button"
                accessibilityLabel="Tim kiem mon an"
                accessibilityHint="Chuyen sang man hinh tim kiem"
              >
                <Icon name="search-outline" size="lg" color="primary" />
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleCapture}
                disabled={isCapturing}
                style={[captureButtonStyle, styles.captureButtonOuter]}
                accessibilityRole="button"
                accessibilityLabel="Chup anh"
                accessibilityHint="Chup anh mon an de AI nhan dien"
                accessibilityState={{ disabled: isCapturing }}
                testID={TEST_IDS.aiScan.captureButton}
              >
                <LinearGradient
                  colors={[
                    theme.colors.primary,
                    theme.colors.secondary,
                    theme.colors.primary,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.captureGradientRing}
                >
                  <View style={[styles.captureInnerLarge, { backgroundColor: '#fff' }]} />
                </LinearGradient>
              </AnimatedPressable>

              <AnimatedPressable
                style={[
                  styles.sideButton,
                  {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  },
                ]}
                onPress={handlePickImage}
                hitSlop={16}
                accessible
                collapsable={false}
                importantForAccessibility="yes"
                accessibilityRole="button"
                accessibilityLabel="Chon tu thu vien"
                accessibilityHint="Chon anh co san tu thu vien"
              >
                <Icon name="images-outline" size="lg" color="primary" />
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>
        )}

        {mode === 'results' && detectionResult && (
          <Animated.View
            entering={SlideInRight}
            style={[styles.resultsContainer, { backgroundColor: theme.colors.background }]}
          >
            <View style={[styles.resultsHandle, { backgroundColor: theme.colors.border }]} />
            <View style={styles.resultsHeader}>
              <ThemedText variant="h4" weight="700">
                {'Ket qua'}
              </ThemedText>
              <Pressable
                onPress={handleRetake}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dong ket qua"
                accessibilityHint="Quay lai che do camera"
                testID={TEST_IDS.aiScan.retakeButton}
              >
                <Icon name="close" size="md" color="text" />
              </Pressable>
            </View>

            <FlatList
              data={topResults}
              keyExtractor={(item, index) => item.label + index}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor:
                        index === 0
                          ? theme.mode === 'dark'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.08)'
                          : theme.colors.card,
                      borderColor:
                        index === 0 ? theme.colors.primary + '50' : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.resultThumbnail}>
                    {item.thumbNail ? (
                      <AppImage
                        source={{ uri: item.thumbNail }}
                        style={{ width: 56, height: 56, borderRadius: 12 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          backgroundColor: theme.colors.background,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Icon name="leaf-outline" size="lg" color="textSecondary" />
                      </View>
                    )}
                    {index === 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: -4,
                          left: '50%',
                          marginLeft: -20,
                          backgroundColor: theme.colors.success,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <ThemedText
                          variant="caption"
                          style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}
                        >
                          TOP 1
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.resultContent}>
                    <ThemedText variant="body" weight="700" numberOfLines={1}>
                      {item.foodName || translateIngredient(item.label)}
                    </ThemedText>

                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor:
                            theme.mode === 'dark'
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.05)',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 3,
                            backgroundColor: theme.colors.border,
                            borderRadius: 2,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          <View
                            style={{
                              width: `${item.confidence * 100}%`,
                              height: '100%',
                              backgroundColor:
                                item.confidence > 0.7
                                  ? theme.colors.success
                                  : item.confidence > 0.5
                                    ? theme.colors.warning
                                    : theme.colors.danger,
                            }}
                          />
                        </View>
                        <ThemedText variant="caption" weight="600" style={{ fontSize: 11 }}>
                          {Math.round(item.confidence * 100)}%
                        </ThemedText>
                      </View>

                      <ThemedText
                        variant="caption"
                        color="textSecondary"
                        style={{ fontSize: 12 }}
                      >
                        {item.caloriesPer100g ? `${item.caloriesPer100g} kcal` : '--'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.resultActions}>
                    <Pressable
                      onPress={() => handleQuickAdd(item)}
                      style={[styles.resultActionBtn, { backgroundColor: theme.colors.primary }]}
                      hitSlop={4}
                      testID={
                        index === 0
                          ? TEST_IDS.aiScan.quickAddTopResultButton
                          : `ai-scan-quick-add-${index}`
                      }
                    >
                      <Icon name="add" size="md" color="background" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleAddToBasket(item)}
                      style={[
                        styles.resultActionBtn,
                        {
                          backgroundColor:
                            theme.mode === 'dark'
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                      hitSlop={4}
                    >
                      <Animated.View style={basketIconStyle}>
                        <Icon name="basket-outline" size="sm" color="textSecondary" />
                      </Animated.View>
                    </Pressable>
                  </View>
                </View>
              )}
              ListEmptyComponent={() =>
                resultNotice ? (
                  <AnimatedEmptyState
                    title={resultNotice.title}
                    description={resultNotice.description}
                    compact
                    primaryAction={{
                      label: 'Tim thu cong',
                      onPress: () => navigation.navigate('FoodSearch'),
                    }}
                    secondaryAction={{
                      label: 'Chup lai',
                      onPress: handleRetake,
                    }}
                  />
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ThemedText
                      variant="body"
                      color="textSecondary"
                      style={{ textAlign: 'center' }}
                    >
                      {'Khong tim thay mon an nao.'}
                      {'\nThu chup lai ro hon nhe!'}
                    </ThemedText>
                  </View>
                )
              }
              style={{ flex: 1, maxHeight: Dimensions.get('window').height * 0.5 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            />

            <View style={styles.actionButtons}>
              <Pressable
                onPress={handleRetake}
                style={[styles.compactButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                testID={TEST_IDS.aiScan.retakeButton}
              >
                <Icon name="refresh" size="sm" color="text" />
                <ThemedText variant="bodySmall" weight="600" style={{ marginLeft: 6 }}>
                  {'Chup lai'}
                </ThemedText>
              </Pressable>
              {hasDetectedItems ? (
                <>
                  <Pressable
                    onPress={handleQuickSave}
                    disabled={isQuickSaving}
                    style={[styles.compactButton, { backgroundColor: theme.colors.primary, opacity: isQuickSaving ? 0.7 : 1 }]}
                    testID={TEST_IDS.aiScan.quickAddButton}
                  >
                    {isQuickSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="flash" size="sm" color="background" />
                        <ThemedText
                          variant="bodySmall"
                          weight="600"
                          style={{ marginLeft: 6, color: '#fff' }}
                        >
                          {quickSaveItem ? 'Luu nhanh' : 'Sua top 1'}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleAddToDiary}
                    style={[styles.compactButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                    testID={TEST_IDS.aiScan.addToDiaryButton}
                  >
                    <Icon name="options-outline" size="sm" color="text" />
                    <ThemedText variant="bodySmall" weight="600" style={{ marginLeft: 6 }}>
                      {'Sua truoc khi luu'}
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => navigation.navigate('FoodSearch')}
                  style={[styles.compactButton, { backgroundColor: theme.colors.primary }]}
                >
                  <Icon name="search-outline" size="sm" color="background" />
                  <ThemedText
                    variant="bodySmall"
                    weight="600"
                    style={{ marginLeft: 6, color: '#fff' }}
                  >
                    {'Tim thu cong'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      <AIResultEditModal
        visible={showEditModal}
        item={editingItem}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSave={handleEditModalSave}
      />

      <IngredientBasketFab onPress={() => setShowBasketSheet(true)} />

      <IngredientBasketSheet
        visible={showBasketSheet}
        onClose={() => setShowBasketSheet(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  uiOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerFloating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  processingBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  cameraActionGroup: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  galleryCtaButton: {
    alignSelf: 'center',
    minWidth: 190,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 0,
  },
  captureButtonOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureGradientRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  captureInnerLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  resultThumbnail: {
    position: 'relative',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
    marginRight: 8,
  },
  resultActions: {
    flexDirection: 'column',
    gap: 6,
  },
  resultActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});

export default AIScanScreen;

