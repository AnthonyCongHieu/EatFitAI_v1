import React, { useCallback, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { suggestNutrition, applyNutrition } from '../../../services/nutrition';
import type { RootStackParamList } from '../../types';

const NutritionSuggestScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('25');
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('65');
  const [activityLevel, setActivityLevel] = useState('1.38');
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain');

  const [result, setResult] = useState<{ calories: number; protein: number; carb: number; fat: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const onSuggest = useCallback(async () => {
    setLoading(true);
    try {
      const out = await suggestNutrition({
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel: Number(activityLevel),
        goal,
      });
      setResult(out);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Không gợi ý được. Kiểm tra dữ liệu.' });
    } finally {
      setLoading(false);
    }
  }, [sex, age, heightCm, weightKg, activityLevel, goal]);

  const onApply = useCallback(async () => {
    if (!result) return;
    setApplying(true);
    try {
      await applyNutrition(result);
      Toast.show({ type: 'success', text1: 'Đã áp dụng mục tiêu' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Lưu mục tiêu thất bại' });
    } finally {
      setApplying(false);
    }
  }, [navigation, result]);

  const Input = (props: { label: string; value: string; onChangeText: (t: string) => void; keyboardType?: 'default' | 'numeric' }) => (
    <View style={{ marginBottom: 12 }}>
      <ThemedText variant="caption" color="textSecondary" style={{ marginBottom: 4 }}>
        {props.label}
      </ThemedText>
      <TextInput
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? 'default'}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );

  return (
    <Screen contentContainerStyle={{ padding: 16 }}>
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md }}>
          Gợi ý dinh dưỡng
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Button title={sex === 'male' ? 'Nam ✓' : 'Nam'} onPress={() => setSex('male')} variant={sex === 'male' ? 'primary' : 'secondary'} />
          <Button title={sex === 'female' ? 'Nữ ✓' : 'Nữ'} onPress={() => setSex('female')} variant={sex === 'female' ? 'primary' : 'secondary'} />
        </View>

        <Input label="Tuổi" value={age} onChangeText={setAge} keyboardType="numeric" />
        <Input label="Chiều cao (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />
        <Input label="Cân nặng (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />
        <Input label="Hoạt động (1.2,1.38,1.55,1.73,1.9)" value={activityLevel} onChangeText={setActivityLevel} keyboardType="numeric" />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Button title={goal === 'cut' ? 'Giảm mỡ ✓' : 'Giảm mỡ'} onPress={() => setGoal('cut')} variant={goal === 'cut' ? 'primary' : 'secondary'} />
          <Button title={goal === 'maintain' ? 'Giữ ✓' : 'Giữ'} onPress={() => setGoal('maintain')} variant={goal === 'maintain' ? 'primary' : 'secondary'} />
          <Button title={goal === 'bulk' ? 'Tăng cơ ✓' : 'Tăng cơ'} onPress={() => setGoal('bulk')} variant={goal === 'bulk' ? 'primary' : 'secondary'} />
        </View>

        <View style={{ gap: 8 }}>
          <Button title={loading ? 'Đang tính...' : 'Gợi ý'} onPress={onSuggest} loading={loading} />
          {result && (
            <View style={{ marginTop: 12 }}>
              <ThemedText variant="h3">Kết quả</ThemedText>
              <ThemedText>Calories: {result.calories} kcal</ThemedText>
              <ThemedText>Protein: {result.protein} g</ThemedText>
              <ThemedText>Carb: {result.carb} g</ThemedText>
              <ThemedText>Fat: {result.fat} g</ThemedText>
              <View style={{ height: 8 }} />
              <Button title={applying ? 'Đang áp dụng...' : 'Áp dụng'} onPress={onApply} loading={applying} variant="secondary" />
            </View>
          )}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});

export default NutritionSuggestScreen;

