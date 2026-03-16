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
  withSpring,
  withSequence,
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
import { aiService } from '../../../services/aiService';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { AppImage } from '../../../components/ui/AppImage';
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AIScanScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraViewInstance | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [galleryPermission, requestGalleryPermission] =
    ImagePicker.useMediaLibraryPermissions();

  // State
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

  // Ingredient Basket
  const addIngredient = useIngredientBasketStore((s) => s.addIngredient);

  // Animation values
  const captureScale = useSharedValue(1);
  const basketIconScale = useSharedValue(1);

  const hasPermission = permission?.granted === true;

  // Handlers
  const processImage = useCallback(async (uri: string) => {
    setMode('preview');
    setIsProcessing(true);
    setDetectionResult(null);

    // Compress image before processing
    let processedUri = uri;
    try {
      const manipulatedResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      processedUri = manipulatedResult.uri;
      setCapturedUri(processedUri); // Show compressed image in preview
    } catch (compressError) {
      console.warn('Image compression failed, using original:', compressError);
      setCapturedUri(uri);
    }

    try {
      const result = await aiService.detectFoodByImage(processedUri);
      // Filter low confidence results
      const filteredItems = result.items.filter((item) => item.confidence > 0.4);

      if (filteredItems.length === 0) {
        // Keep result even if empty to show empty state, but notify user
        setDetectionResult({
          ...result,
          items: [],
        });
      } else {
        setDetectionResult({
          ...result,
          items: filteredItems,
        });
      }

      setMode('results');
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        server_error: { text1: '\u004c\u1ed7i m\u00e1y ch\u1ee7', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i sau' },
        network_error: { text1: 'Kh\u00f4ng c\u00f3 k\u1ebft n\u1ed1i', text2: 'Ki\u1ec3m tra m\u1ea1ng v\u00e0 th\u1eed l\u1ea1i' },
        unknown: { text1: 'Kh\u00f4ng th\u1ec3 ph\u00e2n t\u00edch \u1ea3nh', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i' },
      });
      setMode('camera');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      handleApiErrorWithCustomMessage(new Error('Camera not ready'), {
        unknown: { text1: 'Camera ch\u01b0a s\u1eb5n s\u00e0ng', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i' },
      });
      return;
    }

    // Haptic feedback when the capture button is pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsCapturing(true);
    captureScale.value = withSpring(0.9, { damping: 10 });

    try {
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
      });

      if (!result?.uri) throw new Error('Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c \u1ea3nh');

      // Haptic success when capture completes
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      captureScale.value = withSpring(1, { damping: 15 });
      await processImage(result.uri);
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Kh\u00f4ng th\u1ec3 ch\u1ee5p \u1ea3nh', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i' },
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
            text1: 'C\u1ea7n quy\u1ec1n truy c\u1eadp th\u01b0 vi\u1ec7n \u1ea3nh',
            text2: 'Vui l\u00f2ng c\u1ea5p quy\u1ec1n trong c\u00e0i \u0111\u1eb7t',
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
        unknown: { text1: 'Kh\u00f4ng th\u1ec3 ch\u1ecdn \u1ea3nh', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i' },
      });
    }
  }, [galleryPermission, requestGalleryPermission, processImage]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setDetectionResult(null);
    setMode('camera');
  }, []);

  const handleAddToDiary = useCallback(() => {
    if (!capturedUri || !detectionResult) {
      handleApiErrorWithCustomMessage(new Error('No data'), {
        unknown: { text1: 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u', text2: 'Vui l\u00f2ng ch\u1ee5p ho\u1eb7c ch\u1ecdn \u1ea3nh' },
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

  // Add an ingredient to the basket
  const handleAddToBasket = useCallback(
    (item: MappedFoodItem) => {
      // Animate basket icon
      basketIconScale.value = withSequence(
        withSpring(1.3, { damping: 10 }),
        withSpring(1, { damping: 15 }),
      );

      // Prefer the Vietnamese foodName from DB, then fall back to translated label
      const displayName = item.foodName || translateIngredient(item.label);
      addIngredient({
        name: displayName,
        confidence: item.confidence,
        imageUri: capturedUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '\u0110\u00e3 th\u00eam v\u00e0o gi\u1ecf',
        text2: displayName,
        visibilityTime: 1500,
      });
    },
    [addIngredient, capturedUri, basketIconScale],
  );

  const handleEditModalSave = useCallback(
    async (editedItem: MappedFoodItem & { grams: number }) => {
      setShowEditModal(false);
      setIsProcessing(true);
      try {
        // Calculate actual values based on grams (for display only, backend will recalculate from foodItem)
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
          text1: '\u0110\u00e3 th\u00eam',
          text2: `${editedItem.label} - ${actualCalories} kcal`,
        });
        await invalidateDiaryQueries(queryClient);

        setEditingItem(null);
      } catch (error) {
        handleApiErrorWithCustomMessage(error, {
          unknown: { text1: 'L\u1ed7i th\u00eam m\u00f3n', text2: 'Vui l\u00f2ng th\u1eed l\u1ea1i' },
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

  // Permission request screen
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
          {'C\u1ea7n quy\u1ec1n camera'}
        </ThemedText>
        <ThemedText
          variant="body"
          color="textSecondary"
          style={{ textAlign: 'center', paddingHorizontal: 32 }}
        >
          {'Cho ph\u00e9p truy c\u1eadp camera \u0111\u1ec3 qu\u00e9t m\u00f3n \u0103n b\u1eb1ng AI'}
        </ThemedText>
        <Button
          variant="primary"
          title="C\u1ea5p quy\u1ec1n camera"
          onPress={requestPermission}
          style={{ marginTop: theme.spacing.xl }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={TEST_IDS.aiScan.screen}>
      {/* Camera Layer - Always rendered to maintain ref, but hidden/paused if needed */}
      {(isCameraMode || mode === 'preview') && (
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      )}

      {/* Preview Image Layer - Visible in preview AND results mode */}
      {(mode === 'preview' || mode === 'results') && capturedUri && (
        <AppImage
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFill as any}
          resizeMode="cover"
        />
      )}

      {/* Scan frame overlay, only visible in camera mode */}
      {isCameraMode && (
        <ScanFrameOverlay isScanning={!isCapturing && !isProcessing} isSuccess={false} />
      )}

      {/* Dark overlay for UI contrast, only when the scan frame is hidden */}
      {!isCameraMode && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
          pointerEvents="none"
        />
      )}

      {/* UI Overlay Layer */}
      <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
        {/* Header (Floating) - Hide in results mode to show full image */}
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

        {/* Processing/Result Message */}
        {isProcessing && (
          <Animated.View entering={FadeInUp} style={styles.processingBadge}>
            <ThemedText variant="body" style={{ color: '#fff' }}>
              {'\u0110ang ph\u00e2n t\u00edch...'}
            </ThemedText>
          </Animated.View>
        )}

        {/* CAMERA MODE */}
        {isCameraMode && (
          <Animated.View entering={FadeInDown} style={styles.bottomControls}>
            {/* Search Button */}
            <Pressable
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
              accessibilityRole="button"
              accessibilityLabel="T\u00ecm ki\u1ebfm m\u00f3n \u0103n"
              accessibilityHint="Chuy\u1ec3n sang m\u00e0n h\u00ecnh t\u00ecm ki\u1ebfm"
            >
              <Icon name="search-outline" size="lg" color="primary" />
            </Pressable>

            {/* Capture button with gradient ring */}
            <AnimatedPressable
              onPress={handleCapture}
              disabled={isCapturing}
              style={[captureButtonStyle, styles.captureButtonOuter]}
              accessibilityRole="button"
              accessibilityLabel="Ch\u1ee5p \u1ea3nh"
              accessibilityHint="Ch\u1ee5p \u1ea3nh m\u00f3n \u0103n \u0111\u1ec3 AI nh\u1eadn di\u1ec7n"
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

            {/* Gallery Button */}
            <Pressable
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
              accessibilityRole="button"
              accessibilityLabel="Ch\u1ecdn t\u1eeb th\u01b0 vi\u1ec7n"
              accessibilityHint="Ch\u1ecdn \u1ea3nh c\u00f3 s\u1eb5n t\u1eeb th\u01b0 vi\u1ec7n"
              testID={TEST_IDS.aiScan.galleryButton}
            >
              <Icon name="images-outline" size="lg" color="primary" />
            </Pressable>
          </Animated.View>
        )}

        {/* VISUAL RESULTS / PREVIEW MODE */}
        {mode === 'results' && detectionResult && (
          <Animated.View
            entering={SlideInRight}
            style={[
              styles.resultsContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View
              style={[styles.resultsHandle, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.resultsHeader}>
              <ThemedText variant="h4" weight="700">
                {'K\u1ebft qu\u1ea3'}
              </ThemedText>
                <Pressable
                  onPress={handleRetake}
                  style={{ padding: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="\u0110\u00f3ng k\u1ebft qu\u1ea3"
                  accessibilityHint="Quay l\u1ea1i ch\u1ebf \u0111\u1ed9 camera"
                  testID={TEST_IDS.aiScan.retakeButton}
                >
                <Icon name="close" size="md" color="text" />
              </Pressable>
            </View>

            <FlatList
              data={detectionResult.items.sort((a, b) => b.confidence - a.confidence).slice(0, 2)}
              keyExtractor={(item, index) => item.label + index}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: index === 0
                        ? (theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)')
                        : theme.colors.card,
                      borderColor: index === 0 ? theme.colors.primary + '50' : theme.colors.border,
                    },
                  ]}
                >
                  {/* Left: Thumbnail */}
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
                    {/* Best match indicator */}
                    {index === 0 && (
                      <View style={{
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        marginLeft: -20,
                        backgroundColor: theme.colors.success,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}>
                        <ThemedText variant="caption" style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                          TOP 1
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Center: Name & Info */}
                  <View style={styles.resultContent}>
                    <ThemedText variant="body" weight="700" numberOfLines={1}>
                      {item.foodName || translateIngredient(item.label)}
                    </ThemedText>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                      {/* Confidence */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}>
                        <View style={{
                          width: 32,
                          height: 3,
                          backgroundColor: theme.colors.border,
                          borderRadius: 2,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}>
                          <View style={{
                            width: `${item.confidence * 100}%`,
                            height: '100%',
                            backgroundColor: item.confidence > 0.7 ? theme.colors.success :
                              item.confidence > 0.5 ? theme.colors.warning : theme.colors.danger,
                          }} />
                        </View>
                        <ThemedText variant="caption" weight="600" style={{ fontSize: 11 }}>
                          {Math.round(item.confidence * 100)}%
                        </ThemedText>
                      </View>

                      {/* Calories */}
                      <ThemedText variant="caption" color="textSecondary" style={{ fontSize: 12 }}>
                        {item.caloriesPer100g ? `${item.caloriesPer100g} kcal` : '--'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Right: Actions */}
                  <View style={styles.resultActions}>
                    <Pressable
                      onPress={() => handleQuickAdd(item)}
                      style={[styles.resultActionBtn, { backgroundColor: theme.colors.primary }]}
                      hitSlop={4}
                      testID={index === 0 ? TEST_IDS.aiScan.quickAddTopResultButton : `ai-scan-quick-add-${index}`}
                    >
                      <Icon name="add" size="md" color="background" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleAddToBasket(item)}
                      style={[styles.resultActionBtn, {
                        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      }]}
                      hitSlop={4}
                    >
                      <Animated.View style={basketIconStyle}>
                        <Icon name="basket-outline" size="sm" color="textSecondary" />
                      </Animated.View>
                    </Pressable>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ThemedText
                    variant="body"
                    color="textSecondary"
                    style={{ textAlign: 'center' }}
                  >
                    {'Kh\u00f4ng t\u00ecm th\u1ea5y m\u00f3n \u0103n n\u00e0o.'}
                    {'\nTh\u1eed ch\u1ee5p l\u1ea1i r\u00f5 h\u01a1n nh\u00e9!'}
                  </ThemedText>
                </View>
              )}
              style={{ flex: 1, maxHeight: Dimensions.get('window').height * 0.5 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            />

            <View style={styles.actionButtons}>
              <Pressable
                onPress={handleRetake}
                style={[styles.compactButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                testID={TEST_IDS.aiScan.retakeButton}
              >
                <Icon name="refresh" size="sm" color="text" />
                <ThemedText variant="bodySmall" weight="600" style={{ marginLeft: 6 }}>{'Ch\u1ee5p l\u1ea1i'}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddToDiary}
                style={[styles.compactButton, { backgroundColor: theme.colors.primary }]}
                testID={TEST_IDS.aiScan.addToDiaryButton}
              >
                <Icon name="add" size="sm" color="background" />
                <ThemedText variant="bodySmall" weight="600" style={{ marginLeft: 6, color: '#fff' }}>{'Th\u00eam'}</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Edit Modal */}
      <AIResultEditModal
        visible={showEditModal}
        item={editingItem}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSave={handleEditModalSave}
      />

      {/* Ingredient basket FAB */}
      <IngredientBasketFab onPress={() => setShowBasketSheet(true)} />

      {/* Ingredient basket sheet */}
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
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  captureButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
    // Keep the shutter button white for strong contrast with the gradient ring
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
    // Use theme colors instead of hardcoded values where possible
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
