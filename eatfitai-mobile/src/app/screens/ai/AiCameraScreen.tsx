// AI Camera: Chụp ảnh -> nhận diện nguyên liệu -> gợi ý công thức
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md }}>
          Cần cấp quyền camera
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={{ marginBottom: theme.spacing.xl }}>
          Ứng dụng cần quyền truy cập camera để chụp ảnh nguyên liệu
        </ThemedText>
        <Button variant="primary" onPress={requestPermission} title="Cấp quyền camera" />
      </View>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      {!capturedUri ? (
        <Card padding="none" shadow="md">
          <View style={styles.cameraWrapper}>
            <CameraView ref={(ref) => (cameraRef.current = ref)} style={styles.camera} facing="back" />
            <View style={styles.captureContainer}>
              <Button
                variant="primary"
                size="lg"
                loading={isCapturing}
                disabled={isCapturing}
                onPress={handleCapture}
                title={isCapturing ? 'Đang chụp...' : 'Chụp ảnh'}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card padding="lg" shadow="md">
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Ảnh đã chụp
          </ThemedText>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          <View style={{ marginTop: theme.spacing.md }}>
            <Button variant="outline" onPress={handleRetake} title="Chụp lại" />
          </View>
        </Card>
      )}

      {capturedBase64 ? (
        <Card padding="lg" shadow="md">
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Danh sách nguyên liệu
          </ThemedText>
          {isDetecting ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
                Đang phân tích ảnh...
              </ThemedText>
            </View>
          ) : ingredients.length === 0 ? (
            <ThemedText variant="body" color="textSecondary">
              Chưa có nguyên liệu. Vui lòng chụp lại.
            </ThemedText>
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
                      backgroundColor: selectedIngredients[item.name] ? theme.colors.primaryLight : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" weight="600">{item.name}</ThemedText>
                    {item.confidence != null ? (
                      <ThemedText variant="caption" color="textSecondary">
                        Độ tin cậy: {Math.round(item.confidence * 100)}%
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText variant="bodySmall" color={selectedIngredients[item.name] ? 'primary' : 'textSecondary'}>
                    {selectedIngredients[item.name] ? '✓ Đã chọn' : 'Chọn'}
                  </ThemedText>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
            />
          )}

          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              variant="primary"
              loading={isSuggesting}
              disabled={isSuggesting || ingredients.length === 0}
              onPress={handleSuggestRecipes}
              title={isSuggesting ? 'Đang gợi ý...' : 'Gợi ý công thức'}
            />
          </View>
        </Card>
      ) : null}

      {recipes.length > 0 ? (
        <Card padding="lg" shadow="md">
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Công thức từ AI
          </ThemedText>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={[styles.recipeCard, { backgroundColor: theme.colors.primaryLight }]}>
              <ThemedText variant="h4" style={{ marginBottom: theme.spacing.xs }}>
                {recipe.title}
              </ThemedText>
              {recipe.description ? (
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.sm }}>
                  {recipe.description}
                </ThemedText>
              ) : null}
              <View style={[styles.nutritionRow, { marginBottom: theme.spacing.sm }]}>
                <ThemedText variant="caption" color="primary" weight="600">
                  {recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : '-- kcal'}
                </ThemedText>
                <ThemedText variant="caption" color="primary" weight="600">
                  P: {recipe.protein != null ? `${Math.round(recipe.protein)}g` : '--g'}
                </ThemedText>
                <ThemedText variant="caption" color="primary" weight="600">
                  C: {recipe.carbs != null ? `${Math.round(recipe.carbs)}g` : '--g'}
                </ThemedText>
                <ThemedText variant="caption" color="primary" weight="600">
                  F: {recipe.fat != null ? `${Math.round(recipe.fat)}g` : '--g'}
                </ThemedText>
              </View>
              {recipe.ingredients ? (
                <ThemedText variant="bodySmall" color="textSecondary">
                  Nguyên liệu: {recipe.ingredients.join(', ')}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  cameraWrapper: { borderRadius: 16, overflow: 'hidden', position: 'relative', aspectRatio: 3 / 4 },
  camera: { flex: 1 },
  captureContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  previewImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12 },
  ingredientRow: { borderWidth: 1.5, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipeCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  nutritionRow: { flexDirection: 'row', gap: 12 },
});

export default AiCameraScreen;

