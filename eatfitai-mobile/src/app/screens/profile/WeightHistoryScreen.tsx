// WeightHistoryScreen: Lịch sử cân đo với biểu đồ
// Hiển thị chart tiến trình cân nặng theo thời gian

import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
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
      // Map backend data to WeightRecord format and sort by date ascending (oldest first)
      const mapped = data.map(
        (item): WeightRecord => ({
          date: item.measuredDate || new Date().toISOString(),
          weight: item.weightKg || 0,
          note: item.note || undefined,
        }),
      );
      // Sort by date ascending so oldest is first, newest is last
      return mapped.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate chart data with smooth bezier curve
  const chartData = useMemo(() => {
    if (!records?.length) return null;

    const weights = records.map((r) => r.weight);
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const range = maxWeight - minWeight || 1;

    const chartWidth = SCREEN_WIDTH - CHART_PADDING * 6; // More padding
    const verticalPadding = 20; // Padding for top/bottom
    const usableHeight = CHART_HEIGHT - verticalPadding * 2;

    const points = records.map((r, i) => ({
      x: records.length === 1 ? chartWidth / 2 : (i / (records.length - 1)) * chartWidth,
      y:
        verticalPadding +
        (usableHeight - ((r.weight - minWeight) / range) * usableHeight),
      weight: r.weight,
      date: r.date,
    }));

    return {
      points,
      minWeight,
      maxWeight,
    };
  }, [records]);

  // Calculate stats - current is newest (last), starting is oldest (first)
  const stats = useMemo(() => {
    if (!records?.length) return null;

    // records are sorted ascending: [oldest, ..., newest]
    const starting = records[0]!.weight;
    const current = records[records.length - 1]!.weight;
    const diff = current - starting;

    return {
      current,
      starting,
      change: diff,
      changePercent: starting ? ((diff / starting) * 100).toFixed(1) : '0',
      trend: diff < 0 ? 'down' : diff > 0 ? 'up' : 'same',
    };
  }, [records]);

  const styles = StyleSheet.create({
    container: { flex: 1 },
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
      paddingVertical: 20,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.text,
      lineHeight: 40,
    },
    statUnit: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontWeight: '500',
    },
    statChange: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    statDivider: {
      width: 1,
      height: 60,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    // Chart
    chartContainer: {
      height: CHART_HEIGHT + 50,
      paddingTop: 20,
      overflow: 'hidden',
    },
    chartWrapper: {
      overflow: 'hidden',
      borderRadius: 8,
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

  // Custom Header Component
  const renderHeader = () => (
    <View
      style={{
        paddingTop: 60,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      {/* Row: Back button + Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
          <ThemedText variant="h3" weight="700">
            Lịch sử cân đo
          </ThemedText>
        </View>
      </View>

      {/* Subtitle below */}
      <ThemedText
        variant="bodySmall"
        color="textSecondary"
        style={{ textAlign: 'center', marginTop: 8 }}
      >
        Theo dõi tiến trình
      </ThemedText>
    </View>
  );

  const renderChart = () => {
    if (!chartData) return null;

    const { points, minWeight, maxWeight } = chartData;
    const chartWidth = SCREEN_WIDTH - CHART_PADDING * 4;

    // Create smooth bezier curve path
    const createSmoothPath = () => {
      if (points.length === 1) {
        // Single point - draw a circle only
        return '';
      }

      let path = `M ${points[0]!.x + CHART_PADDING} ${points[0]!.y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i]!;
        const p1 = points[i + 1]!;

        // Control point distance
        const tension = 0.3;
        const dx = (p1.x - p0.x) * tension;

        // Create smooth curve using cubic bezier
        const cp1x = p0.x + CHART_PADDING + dx;
        const cp1y = p0.y;
        const cp2x = p1.x + CHART_PADDING - dx;
        const cp2y = p1.y;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x + CHART_PADDING} ${p1.y}`;
      }

      return path;
    };

    const linePath = createSmoothPath();

    // Create area path for gradient fill
    const areaPath = linePath
      ? `${linePath} L ${points[points.length - 1]!.x + CHART_PADDING} ${CHART_HEIGHT} L ${CHART_PADDING} ${CHART_HEIGHT} Z`
      : '';

    // Y-axis labels (weight values)
    const yLabels = [maxWeight, (maxWeight + minWeight) / 2, minWeight].map(
      (val) => Math.round(val * 10) / 10,
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
          <View style={[styles.chartWrapper, { flex: 1 }]}>
            <Svg width={chartWidth + CHART_PADDING * 2} height={CHART_HEIGHT}>
              {/* Gradient definition */}
              <Defs>
                <SvgLinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0" />
                </SvgLinearGradient>
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
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  if (!records?.length) {
    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <ThemedText style={{ fontSize: 48, marginBottom: 16 }}>📊</ThemedText>
          <ThemedText style={styles.emptyText}>
            Chưa có dữ liệu cân đo{'\n'}Bắt đầu ghi lại cân nặng để theo dõi tiến trình
          </ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Card */}
        {stats && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
            <View style={styles.sectionTitle}>
              <ThemedText variant="h3">Thống kê</ThemedText>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <ThemedText style={styles.statValue}>{stats.current}</ThemedText>
                  <ThemedText style={styles.statUnit}> kg</ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>Hiện tại</ThemedText>
              </View>

              <View style={styles.statDivider} />

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
                <ThemedText style={styles.statLabel}>Thay đổi</ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Chart Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.sectionTitle}>
            <ThemedText variant="h3">Biểu đồ tiến trình</ThemedText>
          </View>
          {renderChart()}
        </Animated.View>

        {/* Records List */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
          <View style={styles.sectionTitle}>
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
    </LinearGradient>
  );
};

export default WeightHistoryScreen;
