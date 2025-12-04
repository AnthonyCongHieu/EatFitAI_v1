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
        theme.colors.info,    // Fat (Blue)
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
                    radius={120}
                    padAngle={2}
                    labels={({ datum }) => datum.y > 0 ? datum.label : ''}
                    style={{
                        labels: { fill: theme.colors.text, fontSize: 14, fontWeight: '600' },
                    }}
                    height={260}
                />
                <View style={styles.centerLabel}>
                    <ThemedText variant="h2" weight="700">{Math.round(total)}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">Tổng</ThemedText>
                </View>
            </View>

            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                    <ThemedText variant="bodySmall">Protein</ThemedText>
                    <ThemedText variant="bodySmall" weight="600">{Math.round((protein / total) * 100)}%</ThemedText>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.warning }]} />
                    <ThemedText variant="bodySmall">Carbs</ThemedText>
                    <ThemedText variant="bodySmall" weight="600">{Math.round((carbs / total) * 100)}%</ThemedText>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.info }]} />
                    <ThemedText variant="bodySmall">Fat</ThemedText>
                    <ThemedText variant="bodySmall" weight="600">{Math.round((fat / total) * 100)}%</ThemedText>
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
        marginBottom: 20,
    },
    centerLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    legendItem: {
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 4,
    },
});
