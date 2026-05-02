import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import { trackEvent } from '../../../services/analytics';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { AiStatusBadge } from '../../../components/ai/AiStatusBadge';
import { aiService, isAiOfflineError } from '../../../services/aiService';
import { useAiStatus } from '../../../hooks/useAiStatus';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { AppImage } from '../../../components/ui/AppImage';
import type { RootStackParamList } from '../../types';
import type { MappedFoodItem } from '../../../types/ai';
import { getAiFeatureAvailability } from '../../../utils/aiAvailability';
import { foodService } from '../../../services/foodService';
import { IngredientBasketFab } from '../../../components/scan/IngredientBasketFab';
import { IngredientBasketSheet } from '../../../components/scan/IngredientBasketSheet';
import { useIngredientBasketStore } from '../../../store/useIngredientBasketStore';
import { translateIngredient } from '../../../utils/translate';
import { TEST_IDS } from '../../../testing/testIds';
import {
  clampVisionGrams,
  getDefaultVisionGrams,
  getVisionQuickPortions,
  shouldAllowVisionQuickSave,
} from '../../../utils/visionReview';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CameraViewInstance = InstanceType<typeof CameraView>;
type ScanMode = 'camera' | 'preview' | 'results';
type CaptureLane = 'ai' | 'barcode';
type ScanResultNotice = {
  title: string;
  description: string;
};

const SCAN_IMAGE_UPLOAD_WIDTH = 1024;
const SCAN_IMAGE_UPLOAD_QUALITY = 0.85;
const AI_PROCESSING_MESSAGES = [
  'Đang tối ưu ảnh...',
  'AI đang nhận diện món ăn...',
  'Đang ghép món với dữ liệu dinh dưỡng...',
];
const isUsableVisionItem = (item: MappedFoodItem): boolean =>
  Boolean(item.isMatched || item.foodItemId || item.foodName) || item.confidence > 0.4;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SW } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette
   ═══════════════════════════════════════════════ */
const P = {
  primary: '#4be277',
  primaryDim: '#3DB860',
  surface: '#0e1322',
  surfaceContainer: '#1a1f2f',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHigh: '#25293a',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  outlineVariant: '#3d4a3d',
  glass: 'rgba(22, 27, 43, 0.6)',
  glassBorder: 'rgba(255,255,255,0.06)',
  glow: 'rgba(75, 226, 119, 0.15)',
};

const SCANNER_SIZE = SW * 0.72;

const AIScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraViewInstance | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [galleryPermission, requestGalleryPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const [mode, setMode] = useState<ScanMode>('camera');
  const [captureLane, setCaptureLane] = useState<CaptureLane>('ai');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<{
    items: MappedFoodItem[];
    unmappedLabels: string[];
  } | null>(null);
  const [showBasketSheet, setShowBasketSheet] = useState(false);
  const [resultNotice, setResultNotice] = useState<ScanResultNotice | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const { data: aiStatus, isLoading: isAiStatusLoading } = useAiStatus();

  // Gram state for results drawer
  const [resultGrams, setResultGrams] = useState(100);
  const [showGramModal, setShowGramModal] = useState(false);
  const [gramInputValue, setGramInputValue] = useState('100');

  const addIngredient = useIngredientBasketStore((s) => s.addIngredient);
  const barcodeLockRef = useRef(false);

  const captureScale = useSharedValue(1);
  const scanLineY = useSharedValue(0);

  // Inline processing banner state
  const [showProcessingBanner, setShowProcessingBanner] = useState(false);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);

  const hasPermission = permission?.granted === true;
  const visionAvailability = getAiFeatureAvailability(aiStatus, 'vision');
  const isBarcodeMode = captureLane === 'barcode';

  /* ── Scanning line animation ── */
  useEffect(() => {
    if (mode === 'camera' && !isCapturing && !isProcessing) {
      scanLineY.value = withRepeat(
        withTiming(SCANNER_SIZE, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      scanLineY.value = withTiming(0, { duration: 300 });
    }
  }, [mode, isCapturing, isProcessing, scanLineY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  /* ── Hide processing banner when results arrive ── */
  useEffect(() => {
    if (mode === 'results' || mode === 'camera') {
      setShowProcessingBanner(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isProcessing || mode !== 'preview') {
      setProcessingMessageIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setProcessingMessageIndex((current) =>
        Math.min(current + 1, AI_PROCESSING_MESSAGES.length - 1),
      );
    }, 1800);

    return () => clearInterval(timer);
  }, [isProcessing, mode]);

  /* ── All business-logic handlers ── */

  const notifyVisionUnavailable = useCallback(() => {
    Toast.show({
      type: 'info',
      text1: visionAvailability.title,
      text2:
        visionAvailability.message ??
        'Bạn vẫn có thể tìm món thủ công trong lúc chờ AI sẵn sàng.',
    });
  }, [visionAvailability.message, visionAvailability.title]);

  const guardVisionAiReady = useCallback(
    (source: 'camera' | 'gallery') => {
      if (visionAvailability.canUseAi) {
        return true;
      }

      notifyVisionUnavailable();
      trackEvent('ai_scan_blocked', {
        flow: 'ai_scan',
        step: 'detect',
        status: 'degraded_attempt',
        metadata: {
          source,
          availabilityState: visionAvailability.state,
          reason: visionAvailability.title,
        },
      });
      return true;
    },
    [
      notifyVisionUnavailable,
      visionAvailability.canUseAi,
      visionAvailability.state,
      visionAvailability.title,
    ],
  );

  const processImage = useCallback(async (uri: string, source: 'camera' | 'gallery') => {
    if (!guardVisionAiReady(source)) {
      return;
    }

    setMode('preview');
    setIsProcessing(true);
    setShowProcessingBanner(true);
    setProcessingMessageIndex(0);
    setDetectionResult(null);
    setResultNotice(null);
    trackEvent('ai_scan_start', {
      flow: 'ai_scan',
      step: 'detect',
      status: 'submitted',
      metadata: { source },
    });

    let processedUri = uri;
    try {
      const manipulatedResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: SCAN_IMAGE_UPLOAD_WIDTH } }],
        {
          compress: SCAN_IMAGE_UPLOAD_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
      processedUri = manipulatedResult.uri;
      setCapturedUri(processedUri);
    } catch (compressError) {
      console.warn('Image compression failed, using original:', compressError);
      setCapturedUri(uri);
    }

    try {
      const result = await aiService.detectFoodByImage(processedUri);
      const filteredItems = result.items.filter(isUsableVisionItem);

      setDetectionResult({
        ...result,
        items: filteredItems,
      });
      setResultNotice(
        filteredItems.length === 0
          ? {
              title: 'Chưa tìm thấy món ăn phù hợp',
              description: 'Thử chụp lại rõ hơn hoặc dùng tìm kiếm thủ công.',
            }
          : null,
      );
      const topDetectedItem = [...filteredItems].sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      setResultGrams(getDefaultVisionGrams(topDetectedItem));
      setMode('results');
      trackEvent('ai_scan_result', {
        flow: 'ai_scan',
        step: 'detect',
        status: filteredItems.length > 0 ? 'success' : 'empty',
        metadata: {
          source,
          itemCount: filteredItems.length,
          unmappedCount: result.unmappedLabels.length,
        },
      });
    } catch (error) {
      if (isAiOfflineError(error)) {
        setDetectionResult({ items: [], unmappedLabels: [] });
        setResultNotice({
          title: 'AI tạm offline',
          description: 'Bạn vẫn có thể tìm món thủ công hoặc thử lại sau.',
        });
        setMode('results');
        trackEvent('ai_scan_result', {
          category: 'error',
          flow: 'ai_scan',
          step: 'detect',
          status: 'failure',
          metadata: {
            source,
            reason: 'ai_offline',
          },
        });
      } else {
        trackEvent('ai_scan_result', {
          category: 'error',
          flow: 'ai_scan',
          step: 'detect',
          status: 'failure',
          metadata: {
            source,
            message: (error as { message?: string } | null)?.message,
          },
        });
        handleApiErrorWithCustomMessage(error, {
          server_error: { text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' },
          network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng và thử lại' },
          unknown: { text1: 'Không thể phân tích ảnh', text2: 'Vui lòng thử lại' },
        });
        setMode('camera');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [guardVisionAiReady]);

  const handleCaptureInternal = useCallback(async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);

    try {
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: SCAN_IMAGE_UPLOAD_QUALITY,
      });

      if (!result?.uri) throw new Error('Không đọc được ảnh');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await processImage(result.uri, 'camera');
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể chụp ảnh', text2: 'Vui lòng thử lại' },
      });
    } finally {
      setIsCapturing(false);
    }
  }, [processImage]);

  const handleCapture = useCallback(async () => {
    if (!guardVisionAiReady('camera')) {
      return;
    }

    if (!cameraRef.current) {
      handleApiErrorWithCustomMessage(new Error('Camera not ready'), {
        unknown: { text1: 'Camera chưa sẵn sàng', text2: 'Vui lòng thử lại' },
      });
      return;
    }

    captureScale.value = withSpring(0.9, { damping: 10 });
    await handleCaptureInternal();
    captureScale.value = withSpring(1, { damping: 15 });
  }, [captureScale, guardVisionAiReady, handleCaptureInternal]);

  const handlePickImage = useCallback(async () => {
    if (!guardVisionAiReady('gallery')) {
      return;
    }

    if (!galleryPermission?.granted) {
      const result = await requestGalleryPermission();
      if (!result.granted) {
        handleApiErrorWithCustomMessage(new Error('Permission denied'), {
          unknown: {
            text1: 'Cần quyền truy cập thư viện ảnh',
            text2: 'Vui lòng cấp quyền trong cài đặt',
          },
        });
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: SCAN_IMAGE_UPLOAD_QUALITY,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await processImage(result.assets[0].uri, 'gallery');
      }
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể chọn ảnh', text2: 'Vui lòng thử lại' },
      });
    }
  }, [galleryPermission, guardVisionAiReady, processImage, requestGalleryPermission]);

  const handleBarcodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      const barcode = scanningResult.data?.trim();
      if (!barcode || barcodeLockRef.current || !isBarcodeMode || mode !== 'camera') {
        return;
      }

      barcodeLockRef.current = true;
      setIsProcessing(true);
      trackEvent('barcode_scan_start', {
        flow: 'ai_scan',
        step: 'barcode_scan',
        status: 'submitted',
        metadata: {
          barcode,
          type: scanningResult.type,
        },
      });

      try {
        const foodDetail = await foodService.lookupByBarcode(barcode);
        if (!foodDetail) {
          trackEvent('barcode_scan_result', {
            category: 'error',
            flow: 'ai_scan',
            step: 'barcode_scan',
            status: 'not_found',
            metadata: { barcode },
          });
          Toast.show({
            type: 'info',
            text1: 'Chưa có món cho mã vạch này',
            text2: 'Đang chuyển sang tìm kiếm thủ công...',
          });
          // Navigate to search screen pre-filled with barcode
          navigation.navigate('FoodSearch', { initialQuery: barcode });
          return;
        }

        trackEvent('barcode_scan_result', {
          flow: 'ai_scan',
          step: 'barcode_scan',
          status: 'success',
          metadata: {
            barcode,
            foodId: foodDetail.id,
            foodName: foodDetail.name,
          },
        });
        Toast.show({
          type: 'success',
          text1: (foodDetail as any)?._fromProvider
            ? '🌐 Đã tìm thấy từ OpenFoodFacts'
            : '✅ Đã nhận diện mã vạch',
          text2: foodDetail.name,
        });
        navigation.navigate('FoodDetail', {
          foodId: foodDetail.id,
          source: 'catalog',
        });
      } catch (error) {
        trackEvent('barcode_scan_result', {
          category: 'error',
          flow: 'ai_scan',
          step: 'barcode_scan',
          status: 'failure',
          metadata: {
            barcode,
            message: (error as { message?: string } | null)?.message,
          },
        });
        handleApiErrorWithCustomMessage(error, {
          unknown: {
            text1: 'Không thể tra mã vạch',
            text2: 'Vui lòng thử lại sau hoặc tìm thủ công.',
          },
        });
      } finally {
        setIsProcessing(false);
        // Release lock after a longer debounce to prevent rapid re-scans
        // during slow network (cold start can take 30-60s)
        setTimeout(() => {
          barcodeLockRef.current = false;
        }, 2500);
      }
    },
    [isBarcodeMode, mode, navigation],
  );

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setDetectionResult(null);
    setResultNotice(null);
    setResultGrams(100);
    setMode('camera');
  }, []);

  const handleAddToDiary = useCallback(async () => {
    if (!capturedUri || !detectionResult) return;

    const topItem = [...detectionResult.items]
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (!topItem || !shouldAllowVisionQuickSave(detectionResult)) {
      navigation.navigate('AddMealFromVision', {
        imageUri: capturedUri,
        result: detectionResult,
      });
      return;
    }

    try {
      const userFoodItemId = Number(topItem.userFoodItemId);
      await addItemsToTodayDiary([
        topItem.source === 'user' || userFoodItemId > 0
          ? {
              source: 'user',
              userFoodItemId,
              grams: resultGrams,
            }
          : {
              source: 'catalog',
              foodItemId: Number(topItem.foodItemId),
              grams: resultGrams,
            },
      ]);

      const ratio = resultGrams / 100;
      const actualCal = Math.round((topItem.caloriesPer100g || 0) * ratio);
      Toast.show({
        type: 'success',
        text1: 'Đã thêm vào nhật ký',
        text2: `${topItem.foodName || translateIngredient(topItem.label)} - ${resultGrams}g (${actualCal} kcal)`,
      });
      trackEvent('ai_scan_save_success', {
        flow: 'ai_scan',
        step: 'save',
        status: 'success',
        metadata: {
          foodItemId: topItem.foodItemId,
          label: topItem.label,
          grams: resultGrams,
          calories: actualCal,
        },
      });
      await invalidateDiaryQueries(queryClient);
      handleRetake();
    } catch (error) {
      trackEvent('ai_scan_save_failure', {
        category: 'error',
        flow: 'ai_scan',
        step: 'save',
        status: 'failure',
        metadata: {
          foodItemId: topItem.foodItemId,
          label: topItem.label,
          grams: resultGrams,
          message: (error as { message?: string } | null)?.message,
        },
      });
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Lỗi', text2: 'Không thể thêm vào nhật ký' },
      });
    }
  }, [capturedUri, detectionResult, handleRetake, navigation, queryClient, resultGrams]);

  const handleAddToBasket = useCallback(
    (item: MappedFoodItem) => {
      const displayName = item.foodName || translateIngredient(item.label);
      addIngredient({
        name: displayName,
        confidence: item.confidence,
        imageUri: capturedUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '🧺 Đã thêm vào giỏ',
        text2: displayName,
        visibilityTime: 1500,
      });
    },
    [addIngredient, capturedUri],
  );

  const handleGramModalConfirm = useCallback(() => {
    const parsed = parseInt(gramInputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setResultGrams(clampVisionGrams(parsed));
    }
    setShowGramModal(false);
  }, [gramInputValue]);

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const isCameraMode = mode === 'camera';
  const topResults = detectionResult
    ? [...detectionResult.items].sort((a, b) => b.confidence - a.confidence).slice(0, 2)
    : [];
  const hasDetectedItems = topResults.length > 0;
  const topItem = topResults[0] ?? null;
  const quickPortions = getVisionQuickPortions(topItem);
  const processingText = AI_PROCESSING_MESSAGES[processingMessageIndex];

  // Compute macros based on current grams
  const ratio = resultGrams / 100;
  const computedCal = topItem ? Math.round((topItem.caloriesPer100g ?? 0) * ratio) : 0;
  const computedProtein = topItem ? Math.round((topItem.proteinPer100g ?? 0) * ratio) : 0;
  const computedCarbs = topItem ? Math.round((topItem.carbPer100g ?? 0) * ratio) : 0;
  const computedFat = topItem ? Math.round((topItem.fatPer100g ?? 0) * ratio) : 0;

  /* ═══════════════════════════════════════════════
     Permission screens
     ═══════════════════════════════════════════════ */
  if (!permission) {
    return (
      <View style={[S.center, { backgroundColor: P.surface }]}>
        <ActivityIndicator color={P.primary} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[S.center, { backgroundColor: P.surface }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Icon name="camera-outline" size="xl" color="muted" />
        </Animated.View>
        <ThemedText
          variant="h3"
          style={{ marginTop: 24, marginBottom: 8, color: P.onSurface }}
        >
          {'Cần quyền camera'}
        </ThemedText>
        <ThemedText
          variant="body"
          style={{ textAlign: 'center', paddingHorizontal: 32, color: P.onSurfaceVariant }}
        >
          {'Cho phép truy cập camera để quét món ăn bằng AI'}
        </ThemedText>
        <Button
          variant="primary"
          title="Cấp quyền camera"
          onPress={requestPermission}
          style={{ marginTop: 32 }}
        />
      </View>
    );
  }

  /* ═══════════════════════════════════════════════
     Main UI
     ═══════════════════════════════════════════════ */
  return (
    <View style={S.container} testID={TEST_IDS.aiScan.screen}>
      {/* ── Camera / Preview layer ── */}
      {(isCameraMode || mode === 'preview') && (
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashOn}
          onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
        />
      )}

      {(mode === 'preview' || mode === 'results') && capturedUri && (
        <AppImage
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFill as any}
          resizeMode="cover"
        />
      )}

      {/* Dimming overlay */}
      {!isCameraMode && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
          pointerEvents="none"
        />
      )}

      <SafeAreaView style={S.uiOverlay} pointerEvents="box-none">
        {/* ═══ FLOATING GLASS HEADER ═══ */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={S.headerWrap}>
          <View style={S.glassPill}>
            <Pressable
              style={S.headerBtn}
              onPress={() => navigation.goBack()}
              hitSlop={12}
            >
              <Icon name="close" size="md" color="text" />
            </Pressable>
            <ThemedText style={S.headerTitle}>AI Food Scanner</ThemedText>
            <Pressable
              style={S.headerBtn}
              onPress={() => setFlashOn((v) => !v)}
              hitSlop={12}
            >
              <Icon
                name={flashOn ? 'flash' : 'flash-outline'}
                size="md"
                color={flashOn ? 'primary' : 'text'}
              />
            </Pressable>
          </View>

          {/* Help pill */}
          {isCameraMode && (
            <Animated.View entering={FadeIn.delay(300)} style={S.helpPillWrap}>
              <View style={S.helpPill}>
                <Icon name="sparkles" size="xs" color="primary" />
                <ThemedText style={S.helpPillText}>
                  {isBarcodeMode
                    ? 'ĐƯA MÃ VẠCH VÀO KHUNG ĐỂ TRA CỨU'
                    : 'HƯỚNG CAMERA VÀO MÓN ĂN ĐỂ NHẬN DIỆN'}
                </ThemedText>
              </View>
            </Animated.View>
          )}

          {isCameraMode && (
            <Animated.View entering={FadeIn.delay(360)} style={S.helpPillWrap}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: 'rgba(14, 19, 34, 0.72)',
                  borderRadius: 18,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Pressable
                  onPress={() => setCaptureLane('ai')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor:
                      captureLane === 'ai' ? 'rgba(75, 226, 119, 0.18)' : 'transparent',
                  }}
                >
                  <ThemedText style={S.helpPillText}>AI scan</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setCaptureLane('barcode')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor:
                      captureLane === 'barcode'
                        ? 'rgba(75, 226, 119, 0.18)'
                        : 'transparent',
                  }}
                >
                  <ThemedText style={S.helpPillText}>Barcode</ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Inline processing banner */}
          {showProcessingBanner && (mode === 'preview') && (
            <Animated.View entering={FadeIn.duration(300)} style={S.inlineBanner}>
              <ActivityIndicator size="small" color={P.primary} />
              <ThemedText style={S.inlineBannerText}>
                {processingText}
              </ThemedText>
            </Animated.View>
          )}

          {/* AI status badge (camera mode only) */}
          {isCameraMode && (
            <View style={S.statusBadgeWrap}>
              <AiStatusBadge
                status={aiStatus}
                loading={isAiStatusLoading}
                compact
                testID={TEST_IDS.aiScan.statusBadge}
              />
              {!isBarcodeMode && !visionAvailability.canUseAi && (
                <ThemedText style={S.aiAvailabilityHint}>
                  {visionAvailability.message ??
                    'Bạn vẫn có thể tìm món thủ công trong lúc chờ AI sẵn sàng.'}
                </ThemedText>
              )}
            </View>
          )}
        </Animated.View>

        {/* ═══ CENTER: Scanner Frame ═══ */}
        {isCameraMode && (
          <View style={S.scannerCenter}>
            <View style={S.scannerFrame}>
              {/* 4 bracket corners */}
              <View style={[S.bracket, S.bracketTL]} />
              <View style={[S.bracket, S.bracketTR]} />
              <View style={[S.bracket, S.bracketBL]} />
              <View style={[S.bracket, S.bracketBR]} />

              {/* Scanning line */}
              <Animated.View style={[S.scanLine, scanLineStyle]}>
                <LinearGradient
                  colors={['transparent', P.primary, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.scanLineGradient}
                />
              </Animated.View>
            </View>

            {/* Processing indicator */}
            {isProcessing && (
              <Animated.View entering={FadeIn} style={S.processingPill}>
                <ActivityIndicator size="small" color={P.primary} />
                <ThemedText style={S.processingText}>{processingText}</ThemedText>
              </Animated.View>
            )}

            {/* Hold steady indicator */}
            {!isProcessing && !isCapturing && (
              <Animated.View entering={FadeIn} style={S.holdSteadyWrap}>
                <View style={S.holdDot} />
                <ThemedText style={S.holdText}>Giữ yên...</ThemedText>
              </Animated.View>
            )}
          </View>
        )}

        {/* Notice: Image only, no floating bubbles */}
        {mode === 'results' && topItem && (
          <View style={S.scannerCenter} />
        )}

        <View style={S.spacer} />

        {/* ═══ CAMERA CONTROLS ═══ */}
        {isCameraMode && (
          <Animated.View entering={FadeInDown.delay(200)} style={S.cameraControls}>
            {/* Gallery pick CTA */}
            {!isBarcodeMode ? (
              <Pressable
                style={S.galleryPill}
                onPress={handlePickImage}
                testID={TEST_IDS.aiScan.galleryButton}
              >
                <Icon name="images-outline" size="sm" color="text" />
                <ThemedText style={S.galleryPillText}>Chọn từ thư viện</ThemedText>
              </Pressable>
            ) : (
              <View style={S.galleryPill}>
                <Icon name="barcode-outline" size="sm" color="text" />
                <ThemedText style={S.galleryPillText}>Quét tự động khi thấy mã vạch</ThemedText>
              </View>
            )}

            {/* Bottom row: Capture */}
            <View style={S.bottomRow}>
              {!isBarcodeMode ? (
                <AnimatedPressable
                  onPress={handleCapture}
                  disabled={isCapturing}
                  style={[captureButtonStyle, S.captureOuter]}
                  testID={TEST_IDS.aiScan.captureButton}
                >
                  <LinearGradient
                    colors={[P.primary, P.primaryDim, P.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={S.captureGradient}
                  >
                    <View style={S.captureInner} />
                  </LinearGradient>
                </AnimatedPressable>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 999,
                    backgroundColor: 'rgba(14, 19, 34, 0.72)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <ThemedText style={S.galleryPillText}>
                    {isProcessing ? 'Đang tra cứu mã vạch...' : 'Giữ mã vạch trong khung'}
                  </ThemedText>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ═══ RESULTS BOTTOM DRAWER ═══ */}
        {mode === 'results' && detectionResult && (
          <Animated.View
            entering={SlideInUp.duration(300)}
            style={S.drawer}
          >
            {/* Drag handle */}
            <View style={S.drawerHandle} />

            {hasDetectedItems && topItem ? (
              <View style={S.drawerContent}>
                {/* Title row */}
                <View style={S.drawerTitleRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={S.drawerFoodName} numberOfLines={2}>
                      {topItem.foodName || translateIngredient(topItem.label)}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                      <ThemedText style={S.drawerKcal}>
                        {computedCal} kcal
                      </ThemedText>
                      <ThemedText style={S.drawerServing}> / {resultGrams}g</ThemedText>
                    </View>
                  </View>

                  {/* Quantity control: - / grams / + */}
                  <View style={S.qtyControl}>
                    <Pressable
                      style={S.qtyBtnMinus}
                      onPress={() => setResultGrams((g) => clampVisionGrams(g - 25))}
                    >
                      <Icon name="remove" size="sm" color="text" />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setGramInputValue(String(resultGrams));
                        setShowGramModal(true);
                      }}
                    >
                      <ThemedText style={S.qtyText}>{resultGrams}g</ThemedText>
                    </Pressable>
                    <Pressable
                      style={S.qtyBtnPlus}
                      onPress={() => setResultGrams((g) => clampVisionGrams(g + 25))}
                    >
                      <Icon name="add" size="sm" color="background" />
                    </Pressable>
                  </View>
                </View>

                <View style={S.quickPortionRow}>
                  {quickPortions.map((portion) => {
                    const selected = portion.grams === resultGrams;
                    return (
                      <Pressable
                        key={`${portion.label}-${portion.grams}`}
                        onPress={() => setResultGrams(portion.grams)}
                        style={[
                          S.quickPortionChip,
                          selected ? S.quickPortionChipActive : null,
                        ]}
                      >
                        <ThemedText
                          style={[
                            S.quickPortionText,
                            selected ? S.quickPortionTextActive : null,
                          ]}
                        >
                          {portion.label} · {portion.grams}g
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Macro visualization */}
                <View style={S.macroRow}>
                  <View style={S.macroCard}>
                    <ThemedText style={S.macroLabel}>PROTEIN</ThemedText>
                    <View style={S.macroValRow}>
                      <ThemedText style={S.macroVal}>{computedProtein}g</ThemedText>
                      <View style={S.macroBarTrack}>
                        <View
                          style={[
                            S.macroBarFill,
                            {
                              width: `${Math.min(100, (computedProtein / 50) * 100)}%`,
                              backgroundColor: P.primary,
                              shadowColor: P.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={S.macroCard}>
                    <ThemedText style={S.macroLabel}>CARBS</ThemedText>
                    <View style={S.macroValRow}>
                      <ThemedText style={S.macroVal}>{computedCarbs}g</ThemedText>
                      <View style={S.macroBarTrack}>
                        <View
                          style={[
                            S.macroBarFill,
                            {
                              width: `${Math.min(100, (computedCarbs / 80) * 100)}%`,
                              backgroundColor: '#22d3ee',
                              shadowColor: '#22d3ee',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={S.macroCard}>
                    <ThemedText style={S.macroLabel}>FAT</ThemedText>
                    <View style={S.macroValRow}>
                      <ThemedText style={S.macroVal}>{computedFat}g</ThemedText>
                      <View style={S.macroBarTrack}>
                        <View
                          style={[
                            S.macroBarFill,
                            {
                              width: `${Math.min(100, (computedFat / 40) * 100)}%`,
                              backgroundColor: '#fbbf24',
                              shadowColor: '#fbbf24',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action buttons row */}
                <View style={S.actionBtnRow}>
                  {/* Retake button — no icon */}
                  <Pressable
                    onPress={handleRetake}
                    style={S.retakeBtn}
                    testID={TEST_IDS.aiScan.retakeButton}
                  >
                    <ThemedText style={S.retakeBtnText}>Chụp lại</ThemedText>
                  </Pressable>

                  {/* Add to diary */}
                  <Pressable
                    onPress={handleAddToDiary}
                    style={S.addBtn}
                    testID={TEST_IDS.aiScan.addToDiaryButton}
                  >
                    <LinearGradient
                      colors={[P.primary, P.primaryDim]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={S.addBtnGradient}
                    >
                      <ThemedText style={S.addBtnText}>Thêm vào Nhật ký</ThemedText>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Bottom links row */}
                <View style={S.bottomLinksRow}>
                  {/* Add to basket — bordered, no icon */}
                  <Pressable
                    style={S.basketBtn}
                    onPress={() => topItem && handleAddToBasket(topItem)}
                  >
                    <ThemedText style={S.basketBtnText}>Thêm vào giỏ</ThemedText>
                  </Pressable>

                  {/* Search manually */}
                  <View style={S.searchManualRow}>
                    <ThemedText style={S.searchManualTextNormal}>Không đúng?</ThemedText>
                    <Pressable onPress={() => navigation.navigate('FoodSearch')}>
                      <ThemedText style={S.searchManualTextLink}> Tìm thủ công</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              /* No results / offline state — custom dark theme */
              <View style={S.drawerContent}>
                <View style={S.noResultsWrap}>
                  <ThemedText style={S.noResultsTitle}>
                    {resultNotice?.title ?? 'Chưa nhận diện được'}
                  </ThemedText>
                  <ThemedText style={S.noResultsDesc}>
                    {resultNotice?.description ?? 'Thử chụp lại rõ hơn nhé!'}
                  </ThemedText>

                  {/* Primary: Search manually */}
                  <Pressable
                    style={S.noResultsPrimaryBtn}
                    onPress={() => navigation.navigate('FoodSearch')}
                  >
                    <LinearGradient
                      colors={[P.primary, P.primaryDim]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={S.noResultsPrimaryGrad}
                    >
                      <ThemedText style={S.noResultsPrimaryText}>Tìm thủ công</ThemedText>
                    </LinearGradient>
                  </Pressable>

                  {/* Secondary: Retake */}
                  <Pressable style={S.noResultsSecondaryBtn} onPress={handleRetake}>
                    <ThemedText style={S.noResultsSecondaryText}>Chụp lại</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ═══ Gram Input Modal ═══ */}
      <Modal
        visible={showGramModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGramModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={S.modalOverlay}
        >
          <Pressable style={S.modalOverlay} onPress={() => setShowGramModal(false)}>
            <Pressable
              style={S.gramModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText style={S.gramModalTitle}>Nhập khối lượng</ThemedText>
              <ThemedText style={S.gramModalSubtitle}>gram</ThemedText>

              <View style={S.gramInputWrap}>
                <TextInput
                  style={S.gramInput}
                  value={gramInputValue}
                  onChangeText={setGramInputValue}
                  keyboardType="number-pad"
                  autoFocus
                  selectTextOnFocus
                  maxLength={4}
                  placeholderTextColor={P.onSurfaceVariant}
                />
              </View>

              {/* Preview macros */}
              {topItem && (() => {
                const previewGrams = parseInt(gramInputValue, 10) || 0;
                const pr = previewGrams / 100;
                return (
                  <View style={S.gramPreviewRow}>
                    <View style={S.gramPreviewItem}>
                      <ThemedText style={[S.gramPreviewVal, { color: P.primary }]}>
                        {Math.round((topItem.caloriesPer100g ?? 0) * pr)}
                      </ThemedText>
                      <ThemedText style={S.gramPreviewLabel}>kcal</ThemedText>
                    </View>
                    <View style={S.gramPreviewItem}>
                      <ThemedText style={S.gramPreviewVal}>
                        {Math.round((topItem.proteinPer100g ?? 0) * pr)}g
                      </ThemedText>
                      <ThemedText style={S.gramPreviewLabel}>Protein</ThemedText>
                    </View>
                    <View style={S.gramPreviewItem}>
                      <ThemedText style={S.gramPreviewVal}>
                        {Math.round((topItem.carbPer100g ?? 0) * pr)}g
                      </ThemedText>
                      <ThemedText style={S.gramPreviewLabel}>Carbs</ThemedText>
                    </View>
                    <View style={S.gramPreviewItem}>
                      <ThemedText style={S.gramPreviewVal}>
                        {Math.round((topItem.fatPer100g ?? 0) * pr)}g
                      </ThemedText>
                      <ThemedText style={S.gramPreviewLabel}>Fat</ThemedText>
                    </View>
                  </View>
                );
              })()}

              <View style={S.gramModalBtns}>
                <Pressable
                  style={S.gramCancelBtn}
                  onPress={() => setShowGramModal(false)}
                >
                  <ThemedText style={S.gramCancelBtnText}>Hủy</ThemedText>
                </Pressable>
                <Pressable
                  style={S.gramConfirmBtn}
                  onPress={handleGramModalConfirm}
                >
                  <LinearGradient
                    colors={[P.primary, P.primaryDim]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={S.gramConfirmBtnGrad}
                  >
                    <ThemedText style={S.gramConfirmBtnText}>Xác nhận</ThemedText>
                  </LinearGradient>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Basket FAB */}
      <IngredientBasketFab onPress={() => setShowBasketSheet(true)} />

      <IngredientBasketSheet
        visible={showBasketSheet}
        onClose={() => setShowBasketSheet(false)}
      />
    </View>
  );
};

/* ═══════════════════════════════════════════════
   STYLES — Emerald Nebula 3D Design
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
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
  spacer: {
    flex: 1,
  },

  /* ═══ GLASS HEADER ═══ */
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.glass,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: P.glassBorder,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.onSurface,
    letterSpacing: -0.3,
  },
  helpPillWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.glass,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  helpPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusBadgeWrap: {
    paddingHorizontal: 4,
    marginTop: 10,
    alignItems: 'center',
  },
  aiAvailabilityHint: {
    marginTop: 8,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    lineHeight: 17,
  },

  /* ═══ SCANNER FRAME ═══ */
  scannerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  bracket: {
    position: 'absolute',
    width: 48,
    height: 48,
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: P.primary,
    borderTopLeftRadius: 12,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: P.primary,
    borderTopRightRadius: 12,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: P.primary,
    borderBottomLeftRadius: 12,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: P.primary,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    top: 0,
  },
  scanLineGradient: {
    width: '100%',
    height: 2,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 5,
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    backgroundColor: P.glass,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurface,
  },
  inlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    backgroundColor: P.glass,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.glassBorder,
    marginTop: 12,
  },
  inlineBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurface,
  },
  holdSteadyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  holdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P.primary,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  holdText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  /* ═══ FLOATING LABELS ═══ */
  floatingLabel: {
    position: 'absolute',
    top: -52,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.glass,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75,226,119,0.3)',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  floatingLabelEmoji: {
    fontSize: 16,
  },
  floatingLabelName: {
    fontSize: 14,
    fontWeight: '700',
    color: P.onSurface,
    maxWidth: 160,
  },
  floatingLabelConf: {
    fontSize: 12,
    fontWeight: '700',
    color: P.primary,
  },

  /* Macro bubbles */
  macroBubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: P.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  macroBubbleKcal: {
    width: 64,
    height: 64,
    right: -32,
    top: 48,
    borderColor: 'rgba(75,226,119,0.2)',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 4,
  },
  macroBubbleP: {
    width: 48,
    height: 48,
    left: -24,
    bottom: 64,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  macroBubbleC: {
    width: 48,
    height: 48,
    left: 40,
    bottom: -24,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  macroBubbleF: {
    width: 48,
    height: 48,
    right: 40,
    bottom: -24,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  macroBubbleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  macroBubbleValuePrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: P.primary,
  },
  macroBubbleLabelSm: {
    fontSize: 8,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  macroBubbleValueSm: {
    fontSize: 12,
    fontWeight: '700',
    color: P.onSurface,
  },

  /* ═══ CAMERA CONTROLS ═══ */
  cameraControls: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 14,
  },
  galleryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: P.glass,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  galleryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurface,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
  },
  captureOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
  },

  /* ═══ RESULTS DRAWER ═══ */
  drawer: {
    backgroundColor: 'rgba(22, 27, 43, 0.92)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  drawerHandle: {
    width: 48,
    height: 4,
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  drawerContent: {
    gap: 0,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  drawerFoodName: {
    fontSize: 22,
    fontWeight: '800',
    color: P.onSurface,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  drawerKcal: {
    fontSize: 20,
    fontWeight: '700',
    color: P.primary,
  },
  drawerServing: {
    fontSize: 13,
    fontWeight: '400',
    color: P.onSurfaceVariant,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginLeft: 12,
  },
  qtyBtnMinus: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: P.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.onSurface,
    paddingHorizontal: 10,
    textDecorationLine: 'underline',
    textDecorationColor: P.onSurfaceVariant,
  },
  qtyBtnPlus: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPortionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickPortionChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: P.surfaceContainerLow,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  quickPortionChipActive: {
    borderColor: P.primary,
    backgroundColor: 'rgba(75, 226, 119, 0.16)',
  },
  quickPortionText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.onSurfaceVariant,
  },
  quickPortionTextActive: {
    color: P.primary,
  },

  /* Macro cards */
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  macroCard: {
    flex: 1,
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  macroValRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '700',
    color: P.onSurface,
  },
  macroBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 3,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 99,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Action buttons */
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: P.surfaceContainerLow,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.onSurface,
  },
  addBtn: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  addBtnGradient: {
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003915',
    letterSpacing: -0.3,
  },
  bottomLinksRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 16,
  },
  basketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.primary,
  },
  basketBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.primary,
  },
  searchManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchManualTextNormal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  searchManualTextLink: {
    fontSize: 13,
    fontWeight: '600',
    color: P.primary,
  },

  /* ═══ NO RESULTS / OFFLINE STATE ═══ */
  noResultsWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: P.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  noResultsPrimaryBtn: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  noResultsPrimaryGrad: {
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  noResultsPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003915',
    letterSpacing: -0.3,
  },
  noResultsSecondaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: P.surfaceContainerLow,
  },
  noResultsSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.primary,
  },

  /* ═══ GRAM INPUT MODAL ═══ */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  gramModalCard: {
    width: SW - 64,
    backgroundColor: P.surfaceContainer,
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  gramModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.onSurface,
    marginBottom: 4,
  },
  gramModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: P.onSurfaceVariant,
    marginBottom: 20,
  },
  gramInputWrap: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: P.primary + '30',
  },
  gramInput: {
    fontSize: 28,
    fontWeight: '700',
    color: P.onSurface,
    textAlign: 'center',
  },
  gramPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  gramPreviewItem: {
    alignItems: 'center',
  },
  gramPreviewVal: {
    fontSize: 16,
    fontWeight: '700',
    color: P.onSurface,
  },
  gramPreviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginTop: 2,
  },
  gramModalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  gramCancelBtn: {
    flex: 1,
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gramCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.onSurface,
  },
  gramConfirmBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gramConfirmBtnGrad: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  gramConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003915',
  },
});

export default AIScanScreen;
