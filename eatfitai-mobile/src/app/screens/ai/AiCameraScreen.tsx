// Man hinh AI Camera: chup anh -> nhan dien nguyen lieu -> goi y cong thuc
// Chu thich bang tieng Viet khong dau

import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import { ThemedText } from '../../../components/ThemedText';
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
      Toast.show({ type: 'error', text1: 'Camera chua san sang' });
      return;
    }
    setIsCapturing(true);
    setIsDetecting(true);
    setIngredients([]);
    setRecipes([]);
    setSelectedIngredients({});

    try {
      const result = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (!result || !result.uri) {
        throw new Error('Khong doc duoc du lieu anh');
      }

      setCapturedUri(result.uri ?? null);
      setCapturedBase64(result.base64 ?? null);

      if (!result.base64) {
        throw new Error('Khong doc duoc du lieu anh');
      }

      const detected = await aiService.detectIngredients(result.base64);
      setIngredients(detected);
      setSelectedIngredients(
        detected.reduce<Record<string, boolean>>((acc, item) => {
          acc[item.name] = true;
          return acc;
        }, {}),
      );
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Khong the phan tich anh' });
    } finally {
      setIsCapturing(false);
      setIsDetecting(false);
    }
  }, []);

  const handleSuggestRecipes = useCallback(async () => {
    const activeIngredients = ingredients
      .filter((item) => selectedIngredients[item.name])
      .map((item) => item.name);

    if (activeIngredients.length === 0) {
      Toast.show({ type: 'info', text1: 'Chon it nhat 1 nguyen lieu' });
      return;
    }

    setIsSuggesting(true);
    setRecipes([]);
    try {
      const suggested = await aiService.suggestRecipes(activeIngredients);
      setRecipes(suggested);
      if (suggested.length === 0) {
        Toast.show({ type: 'info', text1: 'AI chua co goi y phu hop' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Goi y cong thuc that bai' });
    } finally {
      setIsSuggesting(false);
    }
  }, [ingredients, selectedIngredients]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ThemedText variant="title">Can cap quyen camera</ThemedText>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <ThemedText style={styles.permissionText}>Cap quyen</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!capturedUri ? (
        <View style={styles.cameraWrapper}>
          <CameraView ref={(ref) => (cameraRef.current = ref)} style={styles.camera} facing="back" />
          <Pressable
            style={[styles.captureButton, { backgroundColor: theme.colors.primary, opacity: isCapturing ? 0.6 : 1 }]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <ThemedText style={styles.captureText}>{isCapturing ? 'Dang chup...' : 'Chup anh'}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.previewCard, { backgroundColor: theme.colors.card }]}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          <Pressable style={styles.retakeButton} onPress={handleRetake}>
            <ThemedText style={styles.retakeText}>Chup lai</ThemedText>
          </Pressable>
        </View>
      )}

      {capturedBase64 ? (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="subtitle">Danh sach nguyen lieu</ThemedText>
          {isDetecting ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
              <ThemedText style={styles.infoText}>Dang phan tich anh...</ThemedText>
            </View>
          ) : ingredients.length === 0 ? (
            <ThemedText style={styles.infoText}>Chua co nguyen lieu. Vui long chup lai.</ThemedText>
          ) : (
            <FlatList
              data={ingredients}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable
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
                        Do tin cay: {Math.round(item.confidence * 100)}%
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText>{selectedIngredients[item.name] ? 'Bo chon' : 'Chon'}</ThemedText>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          <Pressable
            style={[styles.suggestButton, { backgroundColor: theme.colors.primary, opacity: isSuggesting ? 0.6 : 1 }]}
            disabled={isSuggesting || ingredients.length === 0}
            onPress={handleSuggestRecipes}
          >
            <ThemedText style={styles.suggestText}>
              {isSuggesting ? 'Dang goi y...' : 'Goi y cong thuc'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {recipes.length > 0 ? (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="subtitle">Cong thuc tu AI</ThemedText>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.recipeCard}>
              <ThemedText style={styles.recipeTitle}>{recipe.title}</ThemedText>
              {recipe.description ? <ThemedText style={styles.infoText}>{recipe.description}</ThemedText> : null}
              <ThemedText style={styles.infoText}>
                {recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : '-- kcal'} ·
                {recipe.protein != null ? ` ${Math.round(recipe.protein)}g P` : ' --g P'} ·
                {recipe.carbs != null ? ` ${Math.round(recipe.carbs)}g C` : ' --g C'} ·
                {recipe.fat != null ? ` ${Math.round(recipe.fat)}g F` : ' --g F'}
              </ThemedText>
              {recipe.ingredients ? (
                <ThemedText style={styles.infoText}>Nguyen lieu: {recipe.ingredients.join(', ')}</ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  cameraWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  captureText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  retakeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0F4F3',
  },
  retakeText: {
    fontFamily: 'Inter_600SemiBold',
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  ingredientRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontFamily: 'Inter_600SemiBold',
  },
  ingredientMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  separator: {
    height: 12,
  },
  suggestButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  suggestText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  infoText: {
    opacity: 0.8,
  },
  recipeCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F7F9F8',
    gap: 6,
  },
  recipeTitle: {
    fontFamily: 'Inter_600SemiBold',
  },
  permissionButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0A8F62',
  },
  permissionText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default AiCameraScreen;
