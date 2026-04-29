// Component hiển thị BMI với visual gauge
// BMI = Weight (kg) / Height (m)^2
// Phân loại: <18.5 Gầy | 18.5-24.9 Bình thường | 25-29.9 Thừa cân | >=30 Béo phì

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface BMIIndicatorProps {
  // Chiều cao (cm)
  heightCm?: number;
  // Cân nặng (kg)
  weightKg?: number;
  // Hiển thị compact (chỉ số + label) hay full (có gauge)
  variant?: 'compact' | 'full';
}

// Tính BMI
const calculateBMI = (heightCm?: number, weightKg?: number): number | null => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};

// Phân loại BMI theo WHO
const getBMICategory = (
  bmi: number,
): {
  label: string;
  color: string;
  labelVi: string;
} => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#22C55E', labelVi: 'Thiếu cân' };
  if (bmi < 25) return { label: 'Normal', color: '#22C55E', labelVi: 'Bình thường' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B', labelVi: 'Thừa cân' };
  return { label: 'Obese', color: '#EF4444', labelVi: 'Béo phì' };
};

// Tính vị trí trên gauge (0-100%)
const getBMIPosition = (bmi: number): number => {
  // Scale từ 15-35 BMI thành 0-100%
  const minBMI = 15;
  const maxBMI = 35;
  const clamped = Math.max(minBMI, Math.min(maxBMI, bmi));
  return ((clamped - minBMI) / (maxBMI - minBMI)) * 100;
};

export const BMIIndicator: React.FC<BMIIndicatorProps> = ({
  heightCm,
  weightKg,
  variant = 'compact',
}) => {
  const { theme } = useAppTheme();

  const bmi = useMemo(() => calculateBMI(heightCm, weightKg), [heightCm, weightKg]);
  const category = useMemo(() => (bmi ? getBMICategory(bmi) : null), [bmi]);
  const position = useMemo(() => (bmi ? getBMIPosition(bmi) : 50), [bmi]);

  // Animation cho indicator position
  const indicatorStyle = useAnimatedStyle(() => ({
    left: withSpring(`${position}%`, { damping: 15 }),
  }));

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bmiValue: {
      fontSize: 18,
      fontWeight: '700',
      color: category?.color || theme.colors.text,
    },
    bmiLabel: {
      fontSize: 13,
      color: category?.color || theme.colors.textSecondary,
      fontWeight: '500',
    },
    // Full variant styles
    fullContainer: {
      width: '100%',
      paddingVertical: 16,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      gap: 4,
    },
    bigValue: {
      fontSize: 36,
      fontWeight: '800',
      color: category?.color || theme.colors.text,
      lineHeight: 44,
      includeFontPadding: false,
    },
    unit: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    categoryBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: category ? `${category.color}20` : 'transparent',
      marginBottom: 20,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '600',
      color: category?.color || theme.colors.text,
    },
    // Gauge
    gaugeContainer: {
      width: '100%',
      height: 8,
      position: 'relative',
      marginBottom: 8,
    },
    gaugeTrack: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    gaugeSegment: {
      flex: 1,
    },
    indicator: {
      position: 'absolute',
      top: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#fff',
      borderWidth: 3,
      borderColor: category?.color || theme.colors.primary,
      marginLeft: -8,
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    gaugeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    gaugeLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
    },
    noData: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  // Không có data
  if (!bmi || !category) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.noData}>Cần nhập chiều cao và cân nặng</ThemedText>
      </View>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.compactContainer}>
        <ThemedText style={styles.bmiValue}>{bmi.toFixed(1)}</ThemedText>
        <ThemedText style={styles.bmiLabel}>({category.labelVi})</ThemedText>
      </Animated.View>
    );
  }

  // Full variant với gauge
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.fullContainer}>
      {/* Giá trị BMI lớn */}
      <View style={styles.valueRow}>
        <ThemedText style={styles.bigValue}>{bmi.toFixed(1)}</ThemedText>
        <ThemedText style={styles.unit}>BMI</ThemedText>
      </View>

      {/* Badge phân loại */}
      <View style={{ alignItems: 'center' }}>
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>{category.labelVi}</ThemedText>
        </View>
      </View>

      {/* Gauge bar */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeTrack}>
          <View style={[styles.gaugeSegment, { backgroundColor: '#22C55E' }]} />
          <View style={[styles.gaugeSegment, { backgroundColor: '#22C55E' }]} />
          <View style={[styles.gaugeSegment, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.gaugeSegment, { backgroundColor: '#EF4444' }]} />
        </View>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      </View>

      {/* Labels */}
      <View style={styles.gaugeLabels}>
        <ThemedText style={styles.gaugeLabel}>15</ThemedText>
        <ThemedText style={styles.gaugeLabel}>18.5</ThemedText>
        <ThemedText style={styles.gaugeLabel}>25</ThemedText>
        <ThemedText style={styles.gaugeLabel}>30</ThemedText>
        <ThemedText style={styles.gaugeLabel}>35</ThemedText>
      </View>
    </Animated.View>
  );
};

export default BMIIndicator;
