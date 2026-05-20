import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { showAppToast } from '../../../utils/showAppToast';

import Button from '../../../components/Button';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { ThemedText } from '../../../components/ThemedText';
import { foodService } from '../../../services/foodService';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { handleApiError } from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CommonMeals'>;

const CommonMealsScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();

  const commonMealsQuery = useQuery({
    queryKey: ['common-meals'],
    queryFn: () => foodService.getCommonMeals(),
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      commonMealsQuery.refetch().catch(() => undefined);
    }, [commonMealsQuery]),
  );

  const handleDelete = useCallback(
    (templateId: string, templateName: string) => {
      Alert.alert(
        'Xóa tổ hợp món',
        `Bạn có chắc muốn xóa "${templateName}" không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                await foodService.deleteCommonMeal(templateId);
                await queryClient.invalidateQueries({ queryKey: ['common-meals'] });
                await commonMealsQuery.refetch();
                showAppToast({
                  type: 'success',
                  text1: 'Đã xóa tổ hợp món',
                  text2: templateName,
                });
              } catch (error) {
                handleApiError(error);
              }
            },
          },
        ],
      );
    },
    [commonMealsQuery, queryClient],
  );

  return (
    <SubScreenLayout
      title="Tổ hợp món thường dùng"
      subtitle="Quản lý tổ hợp món để thêm nhanh vào nhật ký"
    >
      {commonMealsQuery.isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
          <ThemedText variant="bodySmall" color="textSecondary">
            Đang tải tổ hợp món...
          </ThemedText>
        </View>
      ) : commonMealsQuery.data && commonMealsQuery.data.length > 0 ? (
        <View style={styles.list}>
          {commonMealsQuery.data.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => navigation.navigate('CommonMealTemplate', { templateId: template.id })}
              style={[
                styles.card,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText weight="700">{template.name}</ThemedText>
                  {template.description ? (
                    <ThemedText variant="bodySmall" color="textSecondary">
                      {template.description}
                    </ThemedText>
                  ) : null}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleDelete(template.id, template.name)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </Pressable>
              </View>

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ThemedText variant="bodySmall" color="textSecondary">
                    {template.ingredientCount} món
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">
                    {Math.round(template.defaultGrams)}g
                  </ThemedText>
                </View>

                <ThemedText variant="bodySmall" weight="600" style={{ color: theme.colors.primary }}>
                  {Math.round(template.calories ?? 0)} kcal
                </ThemedText>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />
                    <ThemedText variant="bodySmall" color="textSecondary">P: {Math.round(template.protein ?? 0)}g</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f7c052' }} />
                    <ThemedText variant="bodySmall" color="textSecondary">C: {Math.round(template.carbs ?? 0)}g</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fb7185' }} />
                    <ThemedText variant="bodySmall" color="textSecondary">F: {Math.round(template.fat ?? 0)}g</ThemedText>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
          <View style={{ marginTop: 8 }}>
            <Button
              fullWidth={true}
              icon="add-outline"
              onPress={() => navigation.navigate('CommonMealTemplate')}
              size="md"
              title="Tạo tổ hợp mới"
            />
          </View>
        </View>
      ) : (
        <View style={[styles.emptyState, { borderColor: theme.colors.border }]}>
          <ThemedText variant="body" weight="700" align="center">
            Chưa có tổ hợp món nào
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" align="center">
            Tạo tổ hợp đầu tiên để lưu lại những món bạn hay ăn cùng nhau.
          </ThemedText>
          <Button
            fullWidth={false}
            onPress={() => navigation.navigate('CommonMealTemplate')}
            size="sm"
            title="Tạo tổ hợp đầu tiên"
          />
        </View>
      )}
    </SubScreenLayout>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
});

export default CommonMealsScreen;
