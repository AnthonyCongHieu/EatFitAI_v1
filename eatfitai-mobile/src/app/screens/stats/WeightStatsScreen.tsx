/**
 * WeightStatsScreen — Thống kê cân nặng chi tiết
 *
 * Hiển thị biểu đồ cân nặng với 2 đường (mục tiêu + thực tế),
 * bộ lọc theo khoảng thời gian (1/6/12 tháng),
 * điều hướng tháng, và 3 thẻ thống kê (ban đầu / hiện tại / thay đổi).
 *
 * BUG FIX: Sử dụng query key ['weight-history'] đồng bộ với WeightCard
 * và WeightUpdateModal để data luôn cập nhật khi user lưu cân nặng mới.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Rect,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../../../components/ThemedText';
import { useEN } from '../../../theme/emeraldNebula';
import { useProfileStore } from '../../../store/useProfileStore';
import { profileService } from '../../../services/profileService';
import MeshBackground from '../../../components/ui/MeshBackground';

/* ─── Hằng số ─── */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 220;
const CHART_PADDING_LEFT = 44;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 16;
const CHART_WIDTH = SCREEN_WIDTH - 72; // card padding 20 + card inner padding 16*2
const PURPLE_PRIMARY = '#a855f7';

/* ─── Kiểu dữ liệu ─── */
interface WeightRecord {
  date: string;
  weight: number;
}

type PeriodFilter = 1 | 6 | 12;

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  1: '1 tháng',
  6: '6 tháng',
  12: '12 tháng',
};

const VIET_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

/* ─── Tạo bezier mượt ─── */
const buildSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`;

  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]!;
    const next = points[i + 1]!;
    const cpX = (curr.x + next.x) / 2;
    d += ` C${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
  }
  return d;
};

/* ─── Phân tích chuỗi ngày để tránh lỗi Hermes Date Parsing ─── */
const parseDateString = (dateStr: string): Date => {
  const cleaned = dateStr.split('T')[0] || '';
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const day = parseInt(parts[2]!, 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) return fallback;
  return new Date();
};

/* ─── Định dạng ngày cho Tooltip (DD-MM-YYYY) ─── */
const formatTooltipDate = (dateStr: string): string => {
  const d = parseDateString(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/* ─── Định dạng hiển thị cân nặng ẩn .0 ─── */
const formatWeight = (val: number): string => parseFloat(val.toFixed(1)).toString();

/* ─── Số ngày trong tháng ─── */
const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/* ═══════════════════════════════════════════════
   Component chính
   ═══════════════════════════════════════════════ */
const WeightStatsScreen = (): React.ReactElement => {
  const EN = useEN();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile } = useProfileStore();
  const targetWeight = profile?.targetWeightKg;

  // State
  const now = new Date();
  const [period, setPeriod] = useState<PeriodFilter>(1);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  
  // *** CRITICAL: Sử dụng query key có prefix ['weight-history'] để invalidate đồng bộ ***
  const { data: allRecords, isLoading } = useQuery<WeightRecord[]>({
    queryKey: ['weight-history', 'stats', 365],
    queryFn: async () => {
      const data = await profileService.getBodyMetricsHistory(365);
      
      // Map và gán originalIndex để làm khóa phụ khi sort.
      // Chúng ta KHÔNG khử trùng theo ngày để giữ lại toàn bộ lịch sử đo (kể cả đo nhiều lần trong ngày khi test).
      const mapped = data
        .filter((m) => m.weightKg != null && m.measuredDate)
        .map((m, idx): WeightRecord & { originalIndex: number } => ({
          date: m.measuredDate!,
          weight: m.weightKg!,
          originalIndex: idx,
        }));

      // Sắp xếp tăng dần theo thời gian (cũ nhất đứng đầu, mới nhất đứng cuối)
      return mapped
        .sort((a, b) => {
          const dateDiff = parseDateString(a.date).getTime() - parseDateString(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          // Nếu trùng ngày đo, bản ghi có originalIndex lớn hơn (được trả về sau bởi API - tức là cũ hơn) sẽ đứng trước.
          // Bản ghi có originalIndex nhỏ hơn (được trả về trước bởi API - tức là mới hơn) sẽ đứng sau.
          return b.originalIndex - a.originalIndex;
        })
        .map(({ date, weight }): WeightRecord => ({ date, weight }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Lọc dữ liệu theo khoảng thời gian + tháng đã chọn
  const filteredRecords = useMemo(() => {
    if (!allRecords?.length) return [];

    if (period === 1) {
      // Lọc theo tháng/năm đã chọn
      return allRecords.filter((r) => {
        const d = parseDateString(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }

    // Lọc theo period (6 hoặc 12 tháng)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - period);
    return allRecords.filter((r) => parseDateString(r.date) >= cutoffDate);
  }, [allRecords, period, selectedMonth, selectedYear]);

  // *** FIX: Tính stats chính xác — lấy từ toàn bộ lịch sử ***
  const stats = useMemo(() => {
    if (!allRecords?.length) return null;

    // "Ban đầu" = bản ghi cũ nhất (đầu tiên sau khi sort chronologically)
    const starting = allRecords[0]!.weight;
    // "Hiện tại" = bản ghi mới nhất (cuối cùng sau khi sort chronologically)  
    const current = allRecords[allRecords.length - 1]!.weight;
    // "Thay đổi" = hiện tại - ban đầu
    const change = current - starting;

    return { starting, current, change };
  }, [allRecords]);

  // Tính chart data
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return null;

    // Khử trùng theo ngày cho biểu đồ:
    // Nếu có nhiều bản ghi trong cùng một ngày, ta chỉ giữ lại bản ghi mới nhất (sau cùng)
    // để làm dấu chấm hiển thị cuối cùng của ngày đó.
    const seenDates = new Set<string>();
    const chartRecords: WeightRecord[] = [];
    
    // filteredRecords đã được sort từ cũ nhất đến mới nhất,
    // ta duyệt từ cuối về đầu để lấy bản ghi mới nhất cho mỗi ngày.
    for (let i = filteredRecords.length - 1; i >= 0; i--) {
      const r = filteredRecords[i]!;
      const dStr = parseDateString(r.date).toDateString();
      if (!seenDates.has(dStr)) {
        seenDates.add(dStr);
        chartRecords.push(r);
      }
    }
    chartRecords.reverse(); // Đảo lại để về thứ tự thời gian tăng dần

    const weights = chartRecords.map((r) => r.weight);
    const allWeights = targetWeight ? [...weights, targetWeight] : weights;
    const minWeight = Math.min(...allWeights) - 1;
    const maxWeight = Math.max(...allWeights) + 1;
    const range = maxWeight - minWeight || 1;

    const usableWidth = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
    const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

    // Xác định thời gian bắt đầu và kết thúc của period để làm thang đo trục X
    let startDate: Date;
    let endDate: Date;

    if (period === 1) {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - period);
    }

    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const totalDuration = endTime - startTime || 1;

    const points = chartRecords.map((r) => {
      const d = parseDateString(r.date);
      const t = d.getTime();
      
      // Giới hạn t nằm trong khoảng [startTime, endTime] để tránh tràn đồ thị
      const clampedT = Math.max(startTime, Math.min(endTime, t));
      const ratio = (clampedT - startTime) / totalDuration;
      const x = CHART_PADDING_LEFT + ratio * usableWidth;
      const y = CHART_PADDING_TOP + (1 - (r.weight - minWeight) / range) * usableHeight;

      return {
        x,
        y,
        weight: r.weight,
        date: r.date,
      };
    });

    // Đường mục tiêu Y
    const targetY = targetWeight
      ? CHART_PADDING_TOP + (1 - (targetWeight - minWeight) / range) * usableHeight
      : null;

    // Y-axis labels (5 giá trị đều)
    const yLabelCount = 5;
    const yLabels: { value: number; y: number }[] = [];
    for (let i = 0; i < yLabelCount; i++) {
      const val = maxWeight - (i / (yLabelCount - 1)) * (maxWeight - minWeight);
      const y = CHART_PADDING_TOP + (i / (yLabelCount - 1)) * usableHeight;
      yLabels.push({ value: Math.round(val), y });
    }

    // X-axis labels phù hợp với khoảng thời gian
    const xLabels: { label: string; x: number }[] = [];
    if (period === 1) {
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      [1, 5, 10, 15, 20, 25, daysInMonth].forEach((day) => {
        xLabels.push({
          label: day.toString().padStart(2, '0'),
          x: CHART_PADDING_LEFT + ((day - 1) / (daysInMonth - 1)) * usableWidth,
        });
      });
    } else {
      // Cho 6 hoặc 12 tháng, vẽ nhãn các tháng ở khoảng chia đều
      const labelCount = 6;
      for (let i = 0; i < labelCount; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + Math.round((i / (labelCount - 1)) * period));
        xLabels.push({
          label: `T${d.getMonth() + 1}`,
          x: CHART_PADDING_LEFT + (i / (labelCount - 1)) * usableWidth,
        });
      }
    }

    return { points, targetY, yLabels, xLabels, minWeight, maxWeight };
  }, [filteredRecords, targetWeight, selectedMonth, selectedYear, period]);

  // Điều hướng tháng
  const goToPrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth((prev) => {
      if (prev === 0) {
        setSelectedYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    if (isCurrentMonth) return;

    setSelectedMonth((prev) => {
      if (prev === 11) {
        setSelectedYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, [selectedMonth, selectedYear, now]);

  const handlePeriodChange = useCallback((p: PeriodFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(p);
  }, []);

  // Reset selected point when filter changes
  useEffect(() => {
    setSelectedPointIndex(null);
  }, [period, selectedMonth, selectedYear, filteredRecords]);

  /* ─── Chart rendering ─── */
  const renderChart = () => {
    if (!chartData) {
      return (
        <View style={styles.emptyChart}>
          <ThemedText style={[styles.emptyChartText, { color: EN.textMuted }]}>
            Chưa có dữ liệu cho khoảng thời gian này
          </ThemedText>
        </View>
      );
    }

    const { points, targetY, yLabels, xLabels } = chartData;
    const smoothPath = buildSmoothPath(points);
    const svgWidth = CHART_WIDTH;

    const selectedPt = selectedPointIndex !== null ? points[selectedPointIndex] : null;

    return (
      <View style={{ position: 'relative' }}>
        <Svg width={svgWidth} height={CHART_HEIGHT + 30}>
          {/* Vùng bấm nền trong suốt để ẩn tooltip khi nhấn ra ngoài các chấm */}
          <Rect
            x={0}
            y={0}
            width={svgWidth}
            height={CHART_HEIGHT + 30}
            fill="transparent"
            onPress={() => setSelectedPointIndex(null)}
          />

          {/* Grid lines ngang */}
          {yLabels.map((label, i) => (
            <Line
              key={`grid-${i}`}
              x1={CHART_PADDING_LEFT}
              y1={label.y}
              x2={svgWidth - CHART_PADDING_RIGHT}
              y2={label.y}
              stroke={EN.outline}
              strokeWidth={1}
            />
          ))}

          {/* Đường mục tiêu (trắng, thẳng ngang, open circles) */}
          {targetY != null && (
            <>
              <Line
                x1={CHART_PADDING_LEFT}
                y1={targetY}
                x2={svgWidth - CHART_PADDING_RIGHT}
                y2={targetY}
                stroke={EN.onSurface}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Circle
                cx={CHART_PADDING_LEFT}
                cy={targetY}
                r={5}
                fill={EN.bg}
                stroke={EN.onSurface}
                strokeWidth={2}
              />
              <Circle
                cx={svgWidth - CHART_PADDING_RIGHT}
                cy={targetY}
                r={5}
                fill={EN.bg}
                stroke={EN.onSurface}
                strokeWidth={2}
              />
            </>
          )}

          {/* Đường chỉ định dọc khi chọn điểm */}
          {selectedPt && (
            <Line
              x1={selectedPt.x}
              y1={CHART_PADDING_TOP}
              x2={selectedPt.x}
              y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={1.5}
            />
          )}

          {/* Gradient cho đường dữ liệu */}
          <Defs>
            <SvgLinearGradient id="dataGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={EN.primary} stopOpacity="0.5" />
              <Stop offset="1" stopColor={EN.primary} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {/* Đường dữ liệu ghi nhận (tím, bezier) */}
          {points.length >= 2 && (
            <Path
              d={smoothPath}
              stroke="url(#dataGrad)"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Điểm dữ liệu (filled purple circles) */}
          {points.map((pt, idx) => {
            const isSelected = selectedPointIndex === idx;

            return (
              <G key={`interactive-dot-${idx}`}>
                {/* Dấu chấm hiển thị */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 5}
                  fill={EN.primary}
                  stroke={isSelected ? '#FFF' : EN.bg}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
                
                {/* Vùng hitbox lớn hơn để chạm bấm dễ hơn */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={22}
                  fill="transparent"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPointIndex(idx);
                  }}
                />
              </G>
            );
          })}
        </Svg>

        {/* Y-axis labels */}
        <View style={styles.yAxisContainer}>
          {yLabels.map((label, i) => (
            <ThemedText
              key={`y-${i}`}
              style={[
                styles.yAxisLabel,
                { color: EN.textMuted, top: label.y - 7 },
              ]}
            >
              {label.value}
            </ThemedText>
          ))}
        </View>

        {/* X-axis labels */}
        <View style={[styles.xAxisContainer, { paddingLeft: CHART_PADDING_LEFT }]}>
          {xLabels.map((label, i) => (
            <ThemedText
              key={`x-${i}`}
              style={[styles.xAxisLabel, { color: EN.textMuted }]}
            >
              {label.label}
            </ThemedText>
          ))}
        </View>

        {/* Tooltip Overlay */}
        {selectedPt && (
          <View
            style={[
              styles.tooltipContainer,
              {
                left: selectedPt.x > svgWidth / 2 
                  ? selectedPt.x - 110 // Ở bên trái điểm
                  : selectedPt.x + 15,  // Ở bên phải điểm
                top: selectedPt.y - 25,
                backgroundColor: '#1E2330', // Nền tối giống mẫu
                borderColor: 'rgba(255, 255, 255, 0.25)',
              },
            ]}
          >
            <ThemedText style={styles.tooltipWeight}>
              {formatWeight(selectedPt.weight)} kg
            </ThemedText>
            <ThemedText style={styles.tooltipDate}>
              {formatTooltipDate(selectedPt.date)}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: EN.bg }]}>
        <MeshBackground />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={EN.primary} />
          <ThemedText style={[styles.loadingText, { color: EN.textMuted }]}>
            Đang tải dữ liệu...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: EN.bg }]}>
      <MeshBackground />

      {/* ══════════ Header ══════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={EN.onSurface} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: EN.onSurface }]}>
          Thống kê cân nặng
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════ Period Filter Tabs ══════════ */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={[styles.periodRow, { backgroundColor: EN.surfaceLow }]}>
            {([1, 6, 12] as PeriodFilter[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => handlePeriodChange(p)}
                style={[
                  styles.periodTab,
                  period === p && [styles.periodTabActive, { backgroundColor: EN.surfaceHighest }],
                ]}
              >
                <ThemedText
                  style={[
                    styles.periodTabText,
                    { color: period === p ? EN.onSurface : EN.textMuted },
                  ]}
                >
                  {PERIOD_LABELS[p]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ══════════ Month Navigator ══════════ */}
        {period === 1 && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View style={styles.monthNav}>
              <Pressable
                onPress={goToPrevMonth}
                hitSlop={12}
                style={[styles.monthNavBtn, { backgroundColor: EN.surfaceHighest }]}
              >
                <Ionicons name="chevron-back" size={18} color={EN.onSurface} />
              </Pressable>
              <ThemedText style={[styles.monthNavText, { color: EN.onSurface }]}>
                {VIET_MONTHS[selectedMonth]}
                {selectedYear !== now.getFullYear() ? `, ${selectedYear}` : ''}
              </ThemedText>
              <Pressable
                onPress={goToNextMonth}
                hitSlop={12}
                style={[
                  styles.monthNavBtn,
                  { backgroundColor: EN.surfaceHighest },
                  selectedMonth === now.getMonth() && selectedYear === now.getFullYear() && { opacity: 0.3 },
                ]}
              >
                <Ionicons name="chevron-forward" size={18} color={EN.onSurface} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* ══════════ Biểu đồ cân nặng ══════════ */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={[styles.chartCard, { borderColor: EN.outline }]}>
            <ThemedText style={[styles.chartTitle, { color: EN.onSurface }]}>
              Biểu đồ cân nặng
            </ThemedText>

            {renderChart()}

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendIndicatorContainer}>
                  <View style={[styles.legendLine, { backgroundColor: EN.onSurface }]} />
                  <View style={[styles.legendCircle, { borderColor: EN.onSurface, position: 'absolute' }]} />
                </View>
                <ThemedText style={[styles.legendText, { color: EN.textMuted }]}>
                  Đường mục tiêu
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendIndicatorContainer}>
                  <View style={[styles.legendLine, { backgroundColor: EN.primary }]} />
                  <View style={[styles.legendCircleFilled, { backgroundColor: EN.primary, borderColor: EN.bg, position: 'absolute' }]} />
                </View>
                <ThemedText style={[styles.legendText, { color: EN.textMuted }]}>
                  Dữ liệu ghi nhận
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ══════════ Stats Cards ══════════ */}
        {stats && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <View style={styles.statsRow}>
              {/* Ban đầu */}
              <View style={[styles.statCard, { backgroundColor: EN.surfaceLow, borderColor: EN.outline }]}>
                <ThemedText style={[styles.statLabel, { color: EN.textMuted }]}>
                  BAN ĐẦU
                </ThemedText>
                <View style={styles.statValueRow}>
                  <ThemedText style={[styles.statValue, { color: EN.onSurface }]}>
                    {formatWeight(stats.starting)}
                  </ThemedText>
                  <ThemedText style={[styles.statUnit, { color: EN.textMuted }]}>
                    {' '}kg
                  </ThemedText>
                </View>
              </View>

              {/* Hiện tại */}
              <View style={[styles.statCard, { backgroundColor: EN.surfaceLow, borderColor: EN.outline }]}>
                <ThemedText style={[styles.statLabel, { color: EN.textMuted }]}>
                  HIỆN TẠI
                </ThemedText>
                <View style={styles.statValueRow}>
                  <ThemedText style={[styles.statValue, { color: EN.onSurface }]}>
                    {formatWeight(stats.current)}
                  </ThemedText>
                  <ThemedText style={[styles.statUnit, { color: EN.textMuted }]}>
                    {' '}kg
                  </ThemedText>
                </View>
              </View>

              {/* Thay đổi */}
              <View style={[styles.statCard, { backgroundColor: EN.surfaceLow, borderColor: EN.outline }]}>
                <ThemedText style={[styles.statLabel, { color: EN.textMuted }]}>
                  THAY ĐỔI
                </ThemedText>
                <View style={styles.statValueRow}>
                  <ThemedText
                    style={[
                      styles.statValue,
                      {
                        color: stats.change < 0
                          ? EN.primary
                          : stats.change > 0
                            ? EN.danger
                            : EN.onSurface,
                      },
                    ]}
                  >
                    {stats.change > 0 ? '+' : ''}{formatWeight(stats.change)}
                  </ThemedText>
                  <ThemedText style={[styles.statUnit, { color: EN.textMuted }]}>
                    {' '}kg
                  </ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },

  /* ── Period Filter ── */
  periodRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodTabActive: {
    borderRadius: 12,
  },
  periodTabText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },

  /* ── Month Nav ── */
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    minWidth: 100,
    textAlign: 'center',
  },

  /* ── Chart Card ── */
  chartCard: {
    backgroundColor: 'rgba(27, 35, 55, 0.72)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    marginBottom: 12,
  },

  /* ── Y-axis ── */
  yAxisContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CHART_PADDING_LEFT - 8,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
    fontFamily: 'BeVietnamPro_500Medium',
    textAlign: 'right',
    width: CHART_PADDING_LEFT - 12,
  },

  /* ── X-axis ── */
  xAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: CHART_PADDING_RIGHT,
    marginTop: 4,
  },
  xAxisLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_500Medium',
  },

  /* ── Empty ── */
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
    fontStyle: 'italic',
  },

  /* ── Legend ── */
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
   legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendIndicatorContainer: {
    width: 24,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  legendCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: '#1E2330', // Đồng bộ với màu nền hoặc trong suốt
  },
  legendCircleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  legendLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
  },

  /* ── Stats Cards ── */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 30,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
  },

  /* ── Tooltip ── */
  tooltipContainer: {
    position: 'absolute',
    width: 100,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  tooltipWeight: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  tooltipDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_500Medium',
    marginTop: 2,
  },
});

export default WeightStatsScreen;
