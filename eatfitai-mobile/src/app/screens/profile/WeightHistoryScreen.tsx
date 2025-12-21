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
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

import { ThemedText } from '../../../components/ThemedText';
import { AppHeader } from '../../../components/ui/AppHeader';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { profileService } from '../../../services/profileService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 16;

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

    // Fetch weight history from real API
    const { data: records, isLoading } = useQuery({
        queryKey: ['weight-history'],
        queryFn: async () => {
            const data = await profileService.getBodyMetricsHistory(30);
            // Map backend data to WeightRecord format
            return data.map((item): WeightRecord => ({
                date: item.measuredDate || new Date().toISOString(),
                weight: item.weightKg || 0,
                note: item.note || undefined,
            }));
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

        const { points, minWeight, maxWeight } = chartData;
        const chartWidth = SCREEN_WIDTH - CHART_PADDING * 4;

        // Create SVG path for line chart
        const linePath = points
            .map((point, i) => {
                const command = i === 0 ? 'M' : 'L';
                return `${command} ${point.x + CHART_PADDING} ${point.y}`;
            })
            .join(' ');

        // Create area path for gradient fill
        const areaPath = `${linePath} L ${points[points.length - 1]!.x + CHART_PADDING} ${CHART_HEIGHT} L ${CHART_PADDING} ${CHART_HEIGHT} Z`;

        // Y-axis labels (weight values)
        const yLabels = [maxWeight, (maxWeight + minWeight) / 2, minWeight].map(
            (val) => Math.round(val * 10) / 10
        );

        return (
            <View style={styles.chartContainer}>
                <View style={{ flexDirection: 'row' }}>
                    {/* Y-axis labels */}
                    <View style={{ width: 40, justifyContent: 'space-between', paddingRight: 8 }}>
                        {yLabels.map((label, i) => (
                            <ThemedText
                                key={i}
                                style={{
                                    fontSize: 10,
                                    color: theme.colors.textSecondary,
                                    textAlign: 'right',
                                }}
                            >
                                {label}
                            </ThemedText>
                        ))}
                    </View>

                    {/* Chart area */}
                    <View style={{ flex: 1 }}>
                        <Svg width={chartWidth + CHART_PADDING * 2} height={CHART_HEIGHT}>
                            {/* Gradient definition */}
                            <Defs>
                                <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <Stop
                                        offset="0"
                                        stopColor={theme.colors.primary}
                                        stopOpacity="0.3"
                                    />
                                    <Stop
                                        offset="1"
                                        stopColor={theme.colors.primary}
                                        stopOpacity="0"
                                    />
                                </LinearGradient>
                            </Defs>

                            {/* Grid lines */}
                            {[0, 0.5, 1].map((ratio, i) => (
                                <Line
                                    key={i}
                                    x1={CHART_PADDING}
                                    y1={CHART_HEIGHT * ratio}
                                    x2={chartWidth + CHART_PADDING}
                                    y2={CHART_HEIGHT * ratio}
                                    stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                                    strokeWidth="1"
                                />
                            ))}

                            {/* Area fill with gradient */}
                            <Path d={areaPath} fill="url(#chartGradient)" />

                            {/* Line path */}
                            <Path
                                d={linePath}
                                stroke={theme.colors.primary}
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Data points */}
                            {points.map((point, i) => (
                                <Circle
                                    key={i}
                                    cx={point.x + CHART_PADDING}
                                    cy={point.y}
                                    r="5"
                                    fill={theme.colors.primary}
                                    stroke={isDark ? '#1a1a1a' : '#fff'}
                                    strokeWidth="2"
                                />
                            ))}
                        </Svg>

                        {/* X-axis labels (dates) */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginTop: 8,
                                paddingHorizontal: CHART_PADDING,
                            }}
                        >
                            {points
                                .filter((_, i) => i === 0 || i === points.length - 1)
                                .map((point, i) => (
                                    <ThemedText
                                        key={i}
                                        style={{
                                            fontSize: 10,
                                            color: theme.colors.textSecondary,
                                        }}
                                    >
                                        {new Date(point.date).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                        })}
                                    </ThemedText>
                                ))}
                        </View>
                    </View>
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
