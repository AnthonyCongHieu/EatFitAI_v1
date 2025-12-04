// AIScanScreen - Unified AI scanning experience
// Merges Camera + AI features into a single, streamlined screen

import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
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

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import VoiceInput from '../../../components/VoiceInput';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import { mealService } from '../../../services/mealService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { AppImage } from '../../../components/ui/AppImage';
import { AIResultEditModal } from '../../../components/ui/AIResultEditModal';
import type { RootStackParamList } from '../../types';
import type { MappedFoodItem } from '../../../types/ai';
import { glassStyles } from '../../../components/ui/GlassCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CameraViewInstance = InstanceType<typeof CameraView>;

interface RecentScan {
    id: string;
    name: string;
    calories: number;
    timestamp: Date;
    imageUri?: string;
}

type ScanMode = 'camera' | 'preview' | 'results';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AIScanScreen: React.FC = () => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation<NavigationProp>();
    const cameraRef = useRef<CameraViewInstance | null>(null);

    const [permission, requestPermission] = useCameraPermissions();
    const [galleryPermission, requestGalleryPermission] = ImagePicker.useMediaLibraryPermissions();

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

    // Animation values
    const captureScale = useSharedValue(1);

    // Mock recent scans (in real app, this would come from local storage or API)
    const recentScans: RecentScan[] = useMemo(() => [], []);

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
            const filteredItems = result.items.filter(item => item.confidence > 0.4);

            if (filteredItems.length === 0) {
                Toast.show({
                    type: 'info',
                    text1: 'Không tìm thấy món ăn rõ ràng',
                    text2: 'Hãy thử chụp lại gần hơn hoặc góc khác',
                });
                // Still show raw results if nothing passes filter, or just show empty?
                // Let's show raw results but warn user
                setDetectionResult(result);
            } else {
                setDetectionResult({
                    ...result,
                    items: filteredItems
                });
            }

            setMode('results');
        } catch (error) {
            handleApiErrorWithCustomMessage(error, {
                server_error: {
                    text1: 'Lỗi máy chủ',
                    text2: 'Vui lòng thử lại sau',
                },
                network_error: {
                    text1: 'Không có kết nối',
                    text2: 'Kiểm tra mạng và thử lại',
                },
                unknown: {
                    text1: 'Không thể phân tích ảnh',
                    text2: 'Vui lòng thử lại',
                },
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

        setIsCapturing(true);
        captureScale.value = withSpring(0.9, { damping: 10 });

        try {
            const result = await cameraRef.current.takePictureAsync({
                base64: false,
                quality: 0.7,
            });

            if (!result?.uri) throw new Error('Không đọc được ảnh');

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
                    unknown: { text1: 'Cần quyền truy cập thư viện ảnh', text2: 'Vui lòng cấp quyền trong cài đặt' },
                });
                return;
            }
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // User requested to disable cropping
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

    const handleVoiceResult = useCallback((text: string) => {
        // Navigate to food search with voice input
        navigation.navigate('FoodSearch', { query: text } as never);
    }, [navigation]);

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
        // Open edit modal for the item
        setEditingItem(item);
        setShowEditModal(true);
    }, []);

    const handleEditModalSave = useCallback(async (editedItem: MappedFoodItem & { grams: number }) => {
        setShowEditModal(false);
        setIsProcessing(true);
        try {
            const date = new Date().toISOString().split('T')[0]!;
            const hour = new Date().getHours();
            let mealType = 2; // Lunch default
            if (hour < 10) mealType = 1; // Breakfast
            else if (hour > 15) mealType = 3; // Dinner

            // Calculate actual values based on grams (for display only, backend will recalculate from foodItem)
            const ratio = editedItem.grams / 100;
            const actualCalories = Math.round((editedItem.caloriesPer100g || 0) * ratio);

            await mealService.addMealItems(date, mealType, [{
                foodItemId: Number(editedItem.foodItemId || 0),
                grams: editedItem.grams,
            }]);

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
    }, []);

    const handleQuickAddAll = useCallback(async () => {
        if (!detectionResult || !detectionResult.items.length) return;

        setIsProcessing(true);
        try {
            const date = new Date().toISOString().split('T')[0]!;
            // Default to current time's meal type or ask user. For quick add, let's guess based on time.
            const hour = new Date().getHours();
            let mealType = 2; // Lunch default
            if (hour < 10) mealType = 1; // Breakfast
            else if (hour > 15) mealType = 3; // Dinner

            const items = detectionResult.items
                .filter(item => item.foodItemId != null)
                .map((item) => ({
                    foodItemId: Number(item.foodItemId),
                    grams: 100, // Default 100g for quick add
                }));

            if (items.length === 0) return;

            await mealService.addMealItems(date, mealType, items);

            Toast.show({
                type: 'success',
                text1: 'Đã thêm nhanh',
                text2: `Đã thêm ${items.length} món vào nhật ký`,
            });

            // Reset state
            setCapturedUri(null);
            setDetectionResult(null);
            setMode('camera');
        } catch (error) {
            handleApiErrorWithCustomMessage(error, {
                unknown: { text1: 'Lỗi thêm nhanh', text2: 'Vui lòng thử lại' },
            });
        } finally {
            setIsProcessing(false);
        }
    }, [detectionResult]);

    const canQuickAdd = useMemo(() => {
        if (!detectionResult?.items.length) return false;
        // Only allow quick add if all items have high confidence
        return detectionResult.items.every(item => item.confidence > 0.8);
    }, [detectionResult]);

    const captureButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: captureScale.value }],
    }));

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
                <ThemedText variant="h3" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
                    Cần quyền camera
                </ThemedText>
                <ThemedText variant="body" color="textSecondary" style={{ textAlign: 'center', paddingHorizontal: 32 }}>
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScreenHeader
                title="AI Scan"
                subtitle="Chụp hoặc chọn ảnh món ăn"
            />

            <Screen contentContainerStyle={styles.content}>
                {/* Camera / Preview Section */}
                <Animated.View entering={FadeInUp.springify()} style={styles.cameraSection}>
                    <AppCard padding="none" shadow="lg">
                        <View style={styles.cameraWrapper}>
                            {mode === 'camera' ? (
                                <CameraView
                                    ref={(ref) => { cameraRef.current = ref; }}
                                    style={styles.camera}
                                    facing="back"
                                />
                            ) : (
                                <AppImage source={{ uri: capturedUri ?? '' }} style={styles.preview} />
                            )}

                            {/* Processing Overlay */}
                            {isProcessing && (
                                <View style={styles.processingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <ThemedText variant="body" style={{ color: '#fff', marginTop: 12 }}>
                                        Đang phân tích...
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    </AppCard>
                </Animated.View>

                {/* Action Buttons */}
                {mode === 'camera' && (
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionRow}>
                        <Pressable
                            onPress={handlePickImage}
                            style={[styles.secondaryButton, { backgroundColor: theme.colors.card, ...theme.shadows.sm }]}
                            accessibilityRole="button"
                            accessibilityLabel="Chọn ảnh từ thư viện"
                        >
                            <Icon name="images-outline" size="md" color="text" />
                            <ThemedText variant="bodySmall">Thư viện</ThemedText>
                        </Pressable>

                        <AnimatedPressable
                            onPress={handleCapture}
                            disabled={isCapturing}
                            style={[captureButtonStyle, styles.captureButton, { backgroundColor: theme.colors.primary }]}
                            accessibilityRole="button"
                            accessibilityLabel="Chụp ảnh"
                        >
                            <View style={[styles.captureInner, { borderColor: '#fff' }]}>
                                {isCapturing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Icon name="camera" size="lg" color="card" />
                                )}
                            </View>
                        </AnimatedPressable>

                        <Pressable
                            onPress={() => navigation.navigate('FoodSearch')}
                            style={[styles.secondaryButton, { backgroundColor: theme.colors.card, ...theme.shadows.sm }]}
                            accessibilityRole="button"
                            accessibilityLabel="Tìm kiếm món ăn"
                        >
                            <Icon name="search-outline" size="md" color="text" />
                            <ThemedText variant="bodySmall">Tìm kiếm</ThemedText>
                        </Pressable>
                    </Animated.View>
                )}

                {/* Preview mode buttons */}
                {mode === 'preview' && !isProcessing && (
                    <Animated.View entering={FadeIn} style={styles.previewActions}>
                        <Button variant="outline" title="Chụp lại" onPress={handleRetake} />
                    </Animated.View>
                )}

                {/* Results Section */}
                {mode === 'results' && detectionResult && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.resultsSection}>
                        <AppCard>
                            <View style={styles.resultsHeader}>
                                <ThemedText variant="h4" weight="600">
                                    Món ăn nhận diện được
                                </ThemedText>
                                <ThemedText variant="caption" color="textSecondary">
                                    {detectionResult.items.length} món
                                </ThemedText>
                            </View>

                            {detectionResult.items.map((item, index) => (
                                <Animated.View
                                    key={item.foodItemId}
                                    entering={FadeInDown.delay(index * 100).springify()}
                                >
                                    <Pressable
                                        onPress={() => handleQuickAdd(item)}
                                        style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                        accessibilityRole="button"
                                    >
                                        <View style={styles.resultInfo}>
                                            <ThemedText variant="body" weight="600">{item.label}</ThemedText>
                                            <View style={styles.resultMeta}>
                                                <ThemedText variant="caption" color="textSecondary">
                                                    {Math.round(item.confidence * 100)}% tin cậy
                                                </ThemedText>
                                                {item.caloriesPer100g && (
                                                    <ThemedText variant="caption" color="primary">
                                                        {item.caloriesPer100g} kcal/100g
                                                    </ThemedText>
                                                )}
                                            </View>
                                        </View>
                                        <Icon name="add-circle-outline" size="md" color="primary" />
                                    </Pressable>
                                </Animated.View>
                            ))}

                            <View style={styles.resultActions}>
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

                            {canQuickAdd && (
                                <Button
                                    variant="ghost"
                                    title="⚡ Thêm nhanh ngay (100g)"
                                    onPress={handleQuickAddAll}
                                    style={{ marginTop: 8 }}
                                />
                            )}
                        </AppCard>
                    </Animated.View>
                )}

                {/* Voice Input Section */}
                {mode === 'camera' && (
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <AppCard>
                            <ThemedText variant="h4" weight="600" style={{ marginBottom: theme.spacing.md }}>
                                Hoặc nói tên món ăn
                            </ThemedText>
                            <VoiceInput
                                onResult={handleVoiceResult}
                                placeholder="Nhấn giữ để nói..."
                            />
                        </AppCard>
                    </Animated.View>
                )}

                {/* Recent Scans (if any) */}
                {mode === 'camera' && recentScans.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(400).springify()}>
                        <AppCard title="Gần đây">
                            <FlatList
                                horizontal
                                data={recentScans}
                                keyExtractor={(item) => item.id}
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <Pressable style={[styles.recentItem, { backgroundColor: theme.colors.background }]}>
                                        <ThemedText variant="bodySmall" weight="600">{item.name}</ThemedText>
                                        <ThemedText variant="caption" color="textSecondary">{item.calories} kcal</ThemedText>
                                    </Pressable>
                                )}
                                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                            />
                        </AppCard>
                    </Animated.View>
                )}
            </Screen>

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
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    cameraSection: {
        marginBottom: 8,
    },
    cameraWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        aspectRatio: 4 / 3,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    preview: {
        flex: 1,
        resizeMode: 'cover',
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 8,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 16,
        gap: 4,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewActions: {
        flexDirection: 'row',
        gap: 12,
    },
    resultsSection: {
        gap: 16,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    resultInfo: {
        flex: 1,
        gap: 4,
    },
    resultMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    resultActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    recentItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 80,
    },
});

export default AIScanScreen;
