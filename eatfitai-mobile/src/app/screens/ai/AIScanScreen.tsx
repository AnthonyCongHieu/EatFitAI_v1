import React, { useCallback, useRef, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
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
import { aiService } from '../../../services/aiService';
import { mealService } from '../../../services/mealService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { AppImage } from '../../../components/ui/AppImage';
import { AIResultEditModal } from '../../../components/ui/AIResultEditModal';
import type { RootStackParamList } from '../../types';
import type { MappedFoodItem } from '../../../types/ai';
import { glassStyles } from '../../../components/ui/GlassCard';
import { ScanFrameOverlay } from '../../../components/scan/ScanFrameOverlay';
import { IngredientBasketFab } from '../../../components/scan/IngredientBasketFab';
import { IngredientBasketSheet } from '../../../components/scan/IngredientBasketSheet';
import { useIngredientBasketStore } from '../../../store/useIngredientBasketStore';
import { translateIngredient } from '../../../utils/translate';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CameraViewInstance = InstanceType<typeof CameraView>;

type ScanMode = 'camera' | 'preview' | 'results';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AIScanScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
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

  const hasPermission = permission?.granted === true;

  // Handlers
  const processImage = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    setMode('preview');
    setIsProcessing(true);
    setDetectionResult(null);

    try {
      const result = await aiService.detectFoodByImage(uri);
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
        server_error: { text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' },
        network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng và thử lại' },
        unknown: { text1: 'Không thể phân tích ảnh', text2: 'Vui lòng thử lại' },
      });
      setMode('camera');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      handleApiErrorWithCustomMessage(new Error('Camera not ready'), {
        unknown: { text1: 'Camera chưa sẵn sàng', text2: 'Vui lòng thử lại' },
      });
      return;
    }

    // Haptic feedback khi bấm nút chụp
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsCapturing(true);
    captureScale.value = withSpring(0.9, { damping: 10 });

    try {
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
      });

      if (!result?.uri) throw new Error('Không đọc được ảnh');

      // Haptic success khi chụp thành công
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      captureScale.value = withSpring(1, { damping: 15 });
      await processImage(result.uri);
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể chụp ảnh', text2: 'Vui lòng thử lại' },
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
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể chọn ảnh', text2: 'Vui lòng thử lại' },
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
        unknown: { text1: 'Chưa có dữ liệu', text2: 'Vui lòng chụp hoặc chọn ảnh' },
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

  // Thêm nguyên liệu vào giỏ (IMP-02)
  const handleAddToBasket = useCallback(
    (item: MappedFoodItem) => {
      // Ưu tiên foodName (tiếng Việt từ DB), fallback dịch từ label
      const displayName = item.foodName || translateIngredient(item.label);
      addIngredient({
        name: displayName,
        confidence: item.confidence,
        imageUri: capturedUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Đã thêm vào giỏ',
        text2: displayName,
        visibilityTime: 1500,
      });
    },
    [addIngredient, capturedUri],
  );

  const handleEditModalSave = useCallback(
    async (editedItem: MappedFoodItem & { grams: number }) => {
      setShowEditModal(false);
      setIsProcessing(true);
      try {
        const date = new Date().toISOString().split('T')[0]!;
        const hour = new Date().getHours();
        let mealType = 2; // Lunch default
        if (hour < 10)
          mealType = 1; // Breakfast
        else if (hour > 15) mealType = 3; // Dinner

        // Calculate actual values based on grams (for display only, backend will recalculate from foodItem)
        const ratio = editedItem.grams / 100;
        const actualCalories = Math.round((editedItem.caloriesPer100g || 0) * ratio);

        await mealService.addMealItems(date, mealType, [
          {
            foodItemId: Number(editedItem.foodItemId || 0),
            grams: editedItem.grams,
          },
        ]);

        Toast.show({
          type: 'success',
          text1: 'Đã thêm',
          text2: `${editedItem.label} - ${actualCalories} kcal`,
        });

        setEditingItem(null);
      } catch (error) {
        handleApiErrorWithCustomMessage(error, {
          unknown: { text1: 'Lỗi thêm món', text2: 'Vui lòng thử lại' },
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
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
          Cần quyền camera
        </ThemedText>
        <ThemedText
          variant="body"
          color="textSecondary"
          style={{ textAlign: 'center', paddingHorizontal: 32 }}
        >
          Cho phép truy cập camera để quét món ăn bằng AI
        </ThemedText>
        <Button
          variant="primary"
          title="Cấp quyền camera"
          onPress={requestPermission}
          style={{ marginTop: theme.spacing.xl }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      {/* Scan Frame Overlay - Chỉ hiển thị trong camera mode */}
      {isCameraMode && (
        <ScanFrameOverlay isScanning={!isCapturing && !isProcessing} isSuccess={false} />
      )}

      {/* Dark Overlay for UI contrast - Chỉ khi không có scan frame */}
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
              Đang phân tích...
            </ThemedText>
          </Animated.View>
        )}

        {/* CAMERA MODE */}
        {isCameraMode && (
          <Animated.View entering={FadeInDown} style={styles.bottomControls}>
            {/* Search Wrapper */}
            <Pressable
              style={[glass.card, styles.sideButton]}
              onPress={() => navigation.navigate('FoodSearch')}
            >
              <Icon name="search-outline" size="lg" color="text" />
            </Pressable>

            {/* Capture Button với Gradient Ring */}
            <AnimatedPressable
              onPress={handleCapture}
              disabled={isCapturing}
              style={[captureButtonStyle, styles.captureButtonOuter]}
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

            {/* Gallery Wrapper */}
            <Pressable style={[glass.card, styles.sideButton]} onPress={handlePickImage}>
              <Icon name="images-outline" size="lg" color="text" />
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
                Kết quả ({detectionResult.items.length})
              </ThemedText>
              <Pressable onPress={handleRetake} style={{ padding: 8 }}>
                <Icon name="close" size="md" color="text" />
              </Pressable>
            </View>

            <FlatList
              data={detectionResult.items}
              keyExtractor={(item, index) => item.label + index}
              renderItem={({ item }) => (
                <View
                  style={[styles.resultRow, { borderBottomColor: theme.colors.border }]}
                >
                  {/* Thumbnail */}
                  {item.thumbNail ? (
                    <AppImage
                      source={{ uri: item.thumbNail }}
                      style={{ width: 48, height: 48, borderRadius: 12, marginRight: 12 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: theme.colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Icon name="leaf-outline" size="md" color="textSecondary" />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" weight="600">
                      {translateIngredient(item.label)}
                    </ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      {item.caloriesPer100g
                        ? `${item.caloriesPer100g} kcal/100g`
                        : 'Nguyên liệu'}
                    </ThemedText>
                  </View>

                  {/* Thêm vào giỏ nguyên liệu */}
                  <Pressable
                    onPress={() => handleAddToBasket(item)}
                    style={{ padding: 8, marginRight: 4 }}
                    hitSlop={8}
                  >
                    <Icon name="basket-outline" size="lg" color="secondary" />
                  </Pressable>

                  {/* Thêm trực tiếp vào nhật ký */}
                  <Pressable
                    onPress={() => handleQuickAdd(item)}
                    style={{ padding: 8 }}
                    hitSlop={8}
                  >
                    <Icon name="add-circle" size="xl" color="primary" />
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ThemedText
                    variant="body"
                    color="textSecondary"
                    style={{ textAlign: 'center' }}
                  >
                    Không tìm thấy món ăn nào.
                    {'\n'}Thử chụp lại rõ hơn nhé! 📸
                  </ThemedText>
                </View>
              )}
              style={{ flex: 1, maxHeight: Dimensions.get('window').height * 0.5 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            />

            <View style={styles.actionButtons}>
              <Button
                variant="outline"
                title="Chụp lại"
                onPress={handleRetake}
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                title="Thêm tất cả"
                onPress={handleAddToDiary}
                style={{ flex: 1 }}
              />
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

      {/* Ingredient Basket FAB - Floating button hiển thị số nguyên liệu */}
      <IngredientBasketFab onPress={() => setShowBasketSheet(true)} />

      {/* Ingredient Basket Sheet - Danh sách nguyên liệu đã quét */}
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
    // Giữ màu trắng cố định cho nút chụp vì cần tương phản với gradient ring
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
    // Sử dụng theme color thay vì hardcode - sẽ được override inline với theme.colors.card
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});

export default AIScanScreen;
