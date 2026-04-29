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
import Toast from 'react-native-toast-message';

import Button from '../../../components/Button';
import Screen from '../../../components/Screen';
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
        'Xóa món thường dùng',
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
                Toast.show({
                  type: 'success',
                  text1: 'Đã xóa món thường dùng',
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
    <Screen contentContainerStyle={styles.content} hasHeader useGradient={false}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText variant="h3" weight="700">
            Món thường dùng
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Quản lý các mẫu bữa ăn để thêm nhanh vào nhật ký.
          </ThemedText>
        </View>
      </View>

      <Button
        fullWidth={false}
        icon="add-outline"
        onPress={() => navigation.navigate('CommonMealTemplate')}
        size="sm"
        title="Tạo mẫu mới"
      />

      {commonMealsQuery.isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
          <ThemedText variant="bodySmall" color="textSecondary">
            Đang tải món thường dùng...
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

              <View style={styles.metaRow}>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {template.ingredientCount} nguyên liệu
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {Math.round(template.defaultGrams)}g
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {Math.round(template.calories ?? 0)} kcal
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { borderColor: theme.colors.border }]}>
          <ThemedText variant="body" weight="700" align="center">
            Chưa có món thường dùng nào
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" align="center">
            Tạo mẫu đầu tiên để biến các bữa ăn lặp lại thành thao tác thêm nhanh một chạm.
          </ThemedText>
          <Button
            fullWidth={false}
            onPress={() => navigation.navigate('CommonMealTemplate')}
            size="sm"
            title="Tạo món đầu tiên"
          />
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
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
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
