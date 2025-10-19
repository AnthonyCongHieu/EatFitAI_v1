// AI Camera: Chụp ảnh -> nhận diện nguyên liệu -> gợi ý công thức
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type IngredientItem, type SuggestedRecipe } from '../../../services/aiService';

type CameraViewInstance = InstanceType<typeof CameraView>;

const AiCameraScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const cameraRef = useRef<CameraViewInstance | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, boolean>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);

  const hasPermission = permission?.granted === true;

  const handleToggleIngredient = useCallback((name: string) => {
    setSelectedIngredients((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setCapturedBase64(null);
    setIngredients([]);
    setSelectedIngredients({});
    setRecipes([]);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      Toast.show({ type: 'error', text1: 'Camera chưa sẵn sàng' });
      return;
    }
    setIsCapturing(true);
    setIsDetecting(true);
    setIngredients([]);
    setRecipes([]);
    setSelectedIngredients({});

    try {
      const result = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (!result || !result.uri || !result.base64) throw new Error('Không đọc được dữ liệu ảnh');

      setCapturedUri(result.uri);
      setCapturedBase64(result.base64);

      const detected = await aiService.detectIngredients(result.base64);
      setIngredients(detected);
      setSelectedIngredients(detected.reduce<Record<string, boolean>>((acc, item) => ({ ...acc, [item.name]: true }), {}));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Không thể phân tích ảnh' });
    } finally {
      setIsCapturing(false);
      setIsDetecting(false);
    }
  }, []);

  const handleSuggestRecipes = useCallback(async () => {
    const activeIngredients = ingredients.filter((i) => selectedIngredients[i.name]).map((i) => i.name);
    if (activeIngredients.length === 0) {
      Toast.show({ type: 'info', text1: 'Chọn ít nhất 1 nguyên liệu' });
      return;
    }
    setIsSuggesting(true);
    setRecipes([]);
    try {
      const suggested = await aiService.suggestRecipes(activeIngredients);
      setRecipes(suggested);
      if (suggested.length === 0) Toast.show({ type: 'info', text1: 'AI chưa có gợi ý phù hợp' });
    } catch {
      Toast.show({ type: 'error', text1: 'Gợi ý công thức thất bại' });
    } finally {
      setIsSuggesting(false);
    }
  }, [ingredients, selectedIngredients]);

  if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ThemedText variant="title">Cần cấp quyền camera</ThemedText>
        <Pressable style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]} onPress={requestPermission}>
          <ThemedText style={styles.permissionText}>Cấp quyền</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      {!capturedUri ? (
        <View style={styles.cameraWrapper}>
          <CameraView ref={(ref) => (cameraRef.current = ref)} style={styles.camera} facing="back" />
          <Pressable
            style={[styles.captureButton, { backgroundColor: theme.colors.primary, opacity: isCapturing ? 0.6 : 1 }]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <ThemedText style={styles.captureText}>{isCapturing ? 'Đang chụp...' : 'Chụp ảnh'}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.previewCard, { backgroundColor: theme.colors.card }]}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          <Pressable style={[styles.retakeButton, { backgroundColor: theme.colors.background }]} onPress={handleRetake}>
            <ThemedText style={styles.retakeText}>Chụp lại</ThemedText>
          </Pressable>
        </View>
      )}

      {capturedBase64 ? (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="subtitle">Danh sách nguyên liệu</ThemedText>
          {isDetecting ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
              <ThemedText style={styles.infoText}>Đang phân tích ảnh...</ThemedText>
            </View>
          ) : ingredients.length === 0 ? (
            <ThemedText style={styles.infoText}>Chưa có nguyên liệu. Vui lòng chụp lại.</ThemedText>
          ) : (
            <FlatList
              data={ingredients}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Nguyên liệu ${item.name}`}
                  hitSlop={8}
                  onPress={() => handleToggleIngredient(item.name)}
                  style={[
                    styles.ingredientRow,
                    {
                      borderColor: selectedIngredients[item.name] ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedIngredients[item.name] ? 'rgba(10,143,98,0.1)' : 'transparent',
                    },
                  ]}
                >
                  <View>
                    <ThemedText style={styles.ingredientName}>{item.name}</ThemedText>
                    {item.confidence != null ? (
                      <ThemedText style={styles.ingredientMeta}>
                        Độ tin cậy: {Math.round(item.confidence * 100)}%
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText>{selectedIngredients[item.name] ? 'Bỏ chọn' : 'Chọn'}</ThemedText>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gợi ý công thức"
            style={[styles.suggestButton, { backgroundColor: theme.colors.primary, opacity: isSuggesting ? 0.6 : 1 }]}
            disabled={isSuggesting || ingredients.length === 0}
            onPress={handleSuggestRecipes}
          >
            <ThemedText style={styles.suggestText}>
              {isSuggesting ? 'Đang gợi ý...' : 'Gợi ý công thức'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {recipes.length > 0 ? (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="subtitle">Công thức từ AI</ThemedText>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={[styles.recipeCard, { backgroundColor: theme.colors.background }]}>
              <ThemedText style={styles.recipeTitle}>{recipe.title}</ThemedText>
              {recipe.description ? <ThemedText style={styles.infoText}>{recipe.description}</ThemedText> : null}
              <ThemedText style={styles.infoText}>
                {recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : '-- kcal'} ·
                {recipe.protein != null ? ` ${Math.round(recipe.protein)}g P` : ' --g P'} ·
                {recipe.carbs != null ? ` ${Math.round(recipe.carbs)}g C` : ' --g C'} ·
                {recipe.fat != null ? ` ${Math.round(recipe.fat)}g F` : ' --g F'}
              </ThemedText>
              {recipe.ingredients ? (
                <ThemedText style={styles.infoText}>Nguyên liệu: {recipe.ingredients.join(', ')}</ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  cameraWrapper: { borderRadius: 16, overflow: 'hidden', position: 'relative', aspectRatio: 3 / 4 },
  camera: { flex: 1 },
  captureButton: { position: 'absolute', bottom: 16, alignSelf: 'center', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  captureText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  previewCard: { borderRadius: 16, padding: 16, gap: 12 },
  previewImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12 },
  retakeButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  retakeText: { fontFamily: 'Inter_600SemiBold' },
  resultCard: { borderRadius: 16, padding: 16, gap: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  ingredientRow: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredientName: { fontFamily: 'Inter_600SemiBold' },
  ingredientMeta: { fontSize: 13, opacity: 0.7 },
  separator: { height: 12 },
  suggestButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  suggestText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  infoText: { opacity: 0.8 },
  recipeCard: { borderRadius: 12, padding: 12, gap: 6 },
  recipeTitle: { fontFamily: 'Inter_600SemiBold' },
  permissionButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  permissionText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});

export default AiCameraScreen;

