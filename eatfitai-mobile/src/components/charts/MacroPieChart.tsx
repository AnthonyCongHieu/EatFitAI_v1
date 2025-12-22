import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryPie, VictoryLabel } from 'victory-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import { AppCard } from '../ui/AppCard';

interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

export const MacroPieChart: React.FC<MacroPieChartProps> = ({ protein, carbs, fat }) => {
  const { theme } = useAppTheme();

  const total = protein + carbs + fat;
  const data = [
    { x: 'Protein', y: protein, label: `${Math.round(protein)}g` },
    { x: 'Carbs', y: carbs, label: `${Math.round(carbs)}g` },
    { x: 'Fat', y: fat, label: `${Math.round(fat)}g` },
  ];

  // Colors matching the theme
  const colorScale = [
    theme.colors.success, // Protein (Green)
    theme.colors.warning, // Carbs (Yellow/Orange)
    theme.colors.info, // Fat (Blue)
  ];

  if (total === 0) {
    return (
      <AppCard>
        <View style={styles.emptyContainer}>
          <ThemedText color="textSecondary">Chưa có dữ liệu dinh dưỡng</ThemedText>
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <View style={styles.header}>
        <ThemedText variant="h3">Tỷ lệ Macro</ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <VictoryPie
          data={data}
          colorScale={colorScale}
          innerRadius={70}
          radius={100}
          padAngle={2}
          labels={({ datum }) => (datum.y > 0 ? datum.label : '')}
          labelRadius={120}
          style={{
            labels: { fill: theme.colors.text, fontSize: 14, fontWeight: '600' },
          }}
          width={300}
          height={300}
          padding={{ top: 40, bottom: 40, left: 40, right: 40 }}
        />
        <View style={styles.centerLabel}>
          <ThemedText variant="h2" weight="700">
            {Math.round(total)}g
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            Tổng
          </ThemedText>
        </View>
      </View>

      {/* Improved Legend - Solid colors để fix 2 màu trên Android */}
      <View style={styles.legendContainer}>
        {/* Protein */}
        <View
          style={[
            styles.legendCard,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#1A3028' : '#E8F5E9',
              borderColor:
                theme.mode === 'dark' ? '#2A4A3A' : '#C8E6C9',
            },
          ]}
        >
          <View style={styles.legendHeader}>
            <ThemedText style={{ fontSize: 16 }}>🥩</ThemedText>
            <ThemedText variant="bodySmall" weight="600">
              Protein
            </ThemedText>
          </View>
          <ThemedText variant="h4" weight="700" style={{ color: theme.colors.success }}>
            {Math.round((protein / total) * 100)}%
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {Math.round(protein)}g
          </ThemedText>
        </View>

        {/* Carbs */}
        <View
          style={[
            styles.legendCard,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#2A2818' : '#FFF8E1',
              borderColor:
                theme.mode === 'dark' ? '#4A4828' : '#FFE0B2',
            },
          ]}
        >
          <View style={styles.legendHeader}>
            <ThemedText style={{ fontSize: 16 }}>🍞</ThemedText>
            <ThemedText variant="bodySmall" weight="600">
              Carbs
            </ThemedText>
          </View>
          <ThemedText variant="h4" weight="700" style={{ color: theme.colors.warning }}>
            {Math.round((carbs / total) * 100)}%
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {Math.round(carbs)}g
          </ThemedText>
        </View>

        {/* Fat */}
        <View
          style={[
            styles.legendCard,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#1A2540' : '#E3F2FD',
              borderColor:
                theme.mode === 'dark' ? '#2A3F68' : '#BBDEFB',
            },
          ]}
        >
          <View style={styles.legendHeader}>
            <ThemedText style={{ fontSize: 16 }}>🧈</ThemedText>
            <ThemedText variant="bodySmall" weight="600">
              Fat
            </ThemedText>
          </View>
          <ThemedText variant="h4" weight="700" style={{ color: theme.colors.info }}>
            {Math.round((fat / total) * 100)}%
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {Math.round(fat)}g
          </ThemedText>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 10,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
  },
  legendCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
});
