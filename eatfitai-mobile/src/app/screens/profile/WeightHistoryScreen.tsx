// WeightHistoryScreen: Lịch sử cân đo với biểu đồ
// Hiển thị chart tiến trình cân nặng theo thời gian

import React, { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '../../../components/ThemedText';
import { AppHeader } from '../../../components/ui/AppHeader';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 16;

// Mock data for now - will be replaced with real API
interface WeightRecord {
    date: string;
    weight: number;
    note?: string;
}

const WeightHistoryScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    // Fetch weight history
    // TODO: Add API endpoint for weight history
    const { data: records, isLoading } = useQuery({
        queryKey: ['weight-history'],
        queryFn: async () => {
            // Mock data for now
            const mockData: WeightRecord[] = [
                { date: '2024-12-01', weight: 68.5 },
                { date: '2024-12-05', weight: 68.2 },
                { date: '2024-12-10', weight: 67.8 },
                { date: '2024-12-15', weight: 67.5 },
                { date: '2024-12-18', weight: 67.2 },
            ];
            return mockData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Calculate chart data
    const chartData = useMemo(() => {
        if (!records?.length) return null;

        const weights = records.map((r) => r.weight);
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;
        const range = maxWeight - minWeight;

        return {
            points: records.map((r, i) => ({
                x: (i / (records.length - 1)) * (SCREEN_WIDTH - CHART_PADDING * 4),
                y: CHART_HEIGHT - ((r.weight - minWeight) / range) * CHART_HEIGHT,
                weight: r.weight,
                date: r.date,
            })),
            minWeight,
            maxWeight,
        };
    }, [records]);

    // Calculate stats
    const stats = useMemo(() => {
        if (!records?.length) return null;

        const first = records[0]!.weight;
        const last = records[records.length - 1]!.weight;
        const diff = last - first;

        return {
            current: last,
            change: diff,
            changePercent: ((diff / first) * 100).toFixed(1),
            trend: diff < 0 ? 'down' : diff > 0 ? 'up' : 'same',
        };
    }, [records]);

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xl,
            gap: theme.spacing.lg,
        },
        card: {
            ...glass.card,
            padding: 20,
        },
        sectionTitle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
        },
        // Stats
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 16,
        },
        statItem: {
            alignItems: 'center',
        },
        statValue: {
            fontSize: 24,
            fontWeight: '700',
            color: theme.colors.text,
        },
        statLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 4,
        },
        statChange: {
            fontSize: 14,
            fontWeight: '600',
        },
        // Chart
        chartContainer: {
            height: CHART_HEIGHT + 40,
            paddingTop: 20,
        },
        chartPoint: {
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.colors.primary,
            borderWidth: 2,
            borderColor: isDark ? '#1a1a1a' : '#fff',
        },
        // Records list
        recordItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        recordDate: {
            flex: 1,
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        recordWeight: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
        },
        emptyText: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            textAlign: 'center',
        },
    });

    const renderChart = () => {
        if (!chartData) return null;

        return (
            <View style={styles.chartContainer}>
                {/* Simple line chart using View elements */}
                <View style={{ position: 'relative', height: CHART_HEIGHT }}>
                    {chartData.points.map((point, i) => (
                        <View
                            key={i}
                            style={[
                                styles.chartPoint,
                                {
                                    left: point.x + CHART_PADDING - 6,
                                    top: point.y - 6,
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <AppHeader
                    title="Lịch sử cân đo"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </View>
        );
    }

    if (!records?.length) {
        return (
            <View style={styles.container}>
                <AppHeader
                    title="Lịch sử cân đo"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.emptyContainer}>
                    <ThemedText style={{ fontSize: 48, marginBottom: 16 }}>📊</ThemedText>
                    <ThemedText style={styles.emptyText}>
                        Chưa có dữ liệu cân đo{'\n'}Bắt đầu ghi lại cân nặng để theo dõi tiến trình
                    </ThemedText>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader
                title="Lịch sử cân đo"
                subtitle="Theo dõi tiến trình"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Card */}
                {stats && (
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <ThemedText style={styles.statValue}>{stats.current}</ThemedText>
                                <ThemedText style={styles.statLabel}>kg hiện tại</ThemedText>
                            </View>
                            <View style={styles.statItem}>
                                <ThemedText
                                    style={[
                                        styles.statChange,
                                        {
                                            color:
                                                stats.trend === 'down'
                                                    ? theme.colors.success
                                                    : stats.trend === 'up'
                                                        ? theme.colors.danger
                                                        : theme.colors.text,
                                        },
                                    ]}
                                >
                                    {stats.change > 0 ? '+' : ''}
                                    {stats.change.toFixed(1)} kg
                                </ThemedText>
                                <ThemedText style={styles.statLabel}>thay đổi</ThemedText>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Chart Card */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <View style={styles.sectionTitle}>
                        <ThemedText style={{ fontSize: 20 }}>📈</ThemedText>
                        <ThemedText variant="h3">Biểu đồ tiến trình</ThemedText>
                    </View>
                    {renderChart()}
                </Animated.View>

                {/* Records List */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <View style={styles.sectionTitle}>
                        <ThemedText style={{ fontSize: 20 }}>📋</ThemedText>
                        <ThemedText variant="h3">Lịch sử ghi chép</ThemedText>
                    </View>

                    {records.map((record, i) => (
                        <View key={i} style={styles.recordItem}>
                            <ThemedText style={styles.recordDate}>
                                {new Date(record.date).toLocaleDateString('vi-VN')}
                            </ThemedText>
                            <ThemedText style={styles.recordWeight}>{record.weight} kg</ThemedText>
                        </View>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
};

export default WeightHistoryScreen;
