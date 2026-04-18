/**
 * IngredientBasketSheet - Bottom Sheet hiển thị danh sách nguyên liệu
 * Cho phép xóa nguyên liệu và gợi ý công thức
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BottomSheet } from '../BottomSheet';
import { ThemedText } from '../ThemedText';
import { Button } from '../Button';
import Icon from '../Icon';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useIngredientBasketStore,
  ScannedIngredient,
} from '../../store/useIngredientBasketStore';
import { aiService } from '../../services/aiService';
import type { RootStackParamList } from '../../app/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface IngredientBasketSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const IngredientBasketSheet: React.FC<IngredientBasketSheetProps> = ({
  visible,
  onClose,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const ingredients = useIngredientBasketStore((s) => s.ingredients);
  const removeIngredient = useIngredientBasketStore((s) => s.removeIngredient);
  const clearBasket = useIngredientBasketStore((s) => s.clearBasket);
  const getIngredientNames = useIngredientBasketStore((s) => s.getIngredientNames);

  const [isLoading, setIsLoading] = useState(false);

  const handleRemove = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      removeIngredient(id);
    },
    [removeIngredient],
  );

  const handleClear = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearBasket();
    onClose();
  }, [clearBasket, onClose]);

  const handleSuggestRecipes = useCallback(async () => {
    const names = getIngredientNames();
    if (names.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'Chưa có nguyên liệu',
        text2: 'Quét thêm nguyên liệu để gợi ý công thức',
      });
      return;
    }

    setIsLoading(true);
    try {
      const recipes = await aiService.suggestRecipes(names);

      if (recipes.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Không tìm thấy công thức',
          text2: 'Thử thêm nguyên liệu khác',
        });
        return;
      }

      // Navigate to recipe list with suggested recipes
      onClose();
      navigation.navigate('RecipeSuggestions', {
        ingredients: names,
        recipes: recipes,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi gợi ý công thức',
        text2: 'Vui lòng thử lại',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getIngredientNames, navigation, onClose]);

  const renderIngredient = useCallback(
    ({ item }: { item: ScannedIngredient }) => (
      <Animated.View
        entering={FadeInRight.duration(200)}
        exiting={FadeOutLeft.duration(200)}
        style={styles.ingredientCardWrap}
      >
        <View style={styles.ingredientCard}>
          <View style={styles.iconBg}>
            <Icon name="restaurant-outline" size="sm" color="text" />
          </View>
          
          <View style={styles.ingredientInfo}>
            <ThemedText style={styles.ingredientName} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText style={styles.ingredientConf}>
              {Math.round(item.confidence * 100)}% Độ tin cậy
            </ThemedText>
          </View>

          <Pressable
            onPress={() => handleRemove(item.id)}
            style={styles.removeBtn}
            hitSlop={8}
          >
            <Icon name="close" size="xs" color="textSecondary" />
          </Pressable>
        </View>
      </Animated.View>
    ),
    [handleRemove],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Giỏ nguyên liệu (${ingredients.length})`}
      height="auto"
    >
      <View style={styles.container}>
        {ingredients.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name="basket-outline" size="xl" color="primary" />
            </View>
            <ThemedText style={styles.emptyTitle}>Giỏ nguyên liệu trống</ThemedText>
            <ThemedText style={styles.emptyDesc}>
              Hãy bắt đầu quét để lưu nguyên liệu vào đây!
            </ThemedText>
          </View>
        ) : (
          <View>
            <FlatList
              data={ingredients}
              keyExtractor={(item) => item.id}
              renderItem={renderIngredient}
              contentContainerStyle={styles.list}
              style={{ maxHeight: 350 }}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.actions}>
              <Pressable style={styles.clearBtn} onPress={handleClear}>
                <ThemedText style={styles.clearBtnText}>Xóa tất cả</ThemedText>
              </Pressable>

              <Pressable
                style={styles.suggestBtn}
                onPress={handleSuggestRecipes}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#4be277', '#3DB860']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.suggestBtnGrad}
                >
                  {isLoading ? (
                    <ThemedText style={styles.suggestBtnText}>Đang xử lý...</ThemedText>
                  ) : (
                    <>
                      <Icon name="sparkles" size="sm" color="background" />
                      <ThemedText style={styles.suggestBtnText}>Gợi ý công thức</ThemedText>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24, // Added bottom padding to ensure safe area visibility
  },
  list: {
    paddingBottom: 16,
    gap: 12,
  },
  ingredientCardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#161b2b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 4,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(75, 226, 119, 0.1)',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dee1f7',
    marginBottom: 2,
  },
  ingredientConf: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4be277',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(75, 226, 119, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dee1f7',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#bccbb9',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dee1f7',
  },
  suggestBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  suggestBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003915',
  },
});

export default IngredientBasketSheet;
