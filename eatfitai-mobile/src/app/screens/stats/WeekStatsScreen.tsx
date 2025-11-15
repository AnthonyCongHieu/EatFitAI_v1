import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View, Pressable } from "react-native";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { VictoryArea, VictoryChart, VictoryTheme, VictoryTooltip, VictoryAxis } from "victory-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "../../../components/ThemedText";
import Screen from "../../../components/Screen";
import { AppCard } from "../../../components/ui/AppCard";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { useStatsStore } from "../../../store/useStatsStore";
import { summaryService } from "../../../services/summaryService";

const WeekStatsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    loadingBox: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    },
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
    },
  });
  const weekSummary = useStatsStore((state) => state.weekSummary);
  const isLoading = useStatsStore((state) => state.isLoading);
  const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);
  const refreshWeekSummary = useStatsStore((state) => state.refreshWeekSummary);
  const error = useStatsStore((state) => state.error);

  // Animation states
  const [highlightedCard, setHighlightedCard] = useState<number | null>(null);
  const cardScale = useSharedValue(1);
  const tooltipOpacity = useSharedValue(0);

  useEffect(() => {
    fetchWeekSummary().catch((error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        Toast.show({ type: 'error', text1: 'Phiên đăng nhập đã hết hạn', text2: 'Vui lòng đăng nhập lại' });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
      } else {
        Toast.show({ type: 'error', text1: 'Không thể tải thống kê', text2: 'Kéo xuống để thử lại' });
      }
    });
  }, [fetchWeekSummary]);

  useEffect(() => {
    if (error) {
      Toast.show({ type: "error", text1: "Không thể tải thống kê, vui lòng thử lại" });
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    refreshWeekSummary().catch((error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        Toast.show({ type: 'error', text1: 'Phiên đăng nhập đã hết hạn', text2: 'Vui lòng đăng nhập lại' });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
      } else {
        Toast.show({ type: 'error', text1: 'Tải lại thất bại', text2: 'Kéo xuống để thử lại' });
      }
    });
  }, [refreshWeekSummary]);

  const handleCardPress = useCallback((index: number) => {
    setHighlightedCard(highlightedCard === index ? null : index);
    cardScale.value = withSpring(highlightedCard === index ? 1 : 1.02, { damping: 15, stiffness: 300 });
  }, [highlightedCard, cardScale]);

  const chartData = useMemo(() => {
    return (weekSummary?.days ?? []).map((day) => ({
      x: new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short" }),
      y: day.calories,
      target: day.targetCalories ?? undefined,
    }));
  }, [weekSummary]);

  const targetLine = useMemo(() => {
    return chartData
      .filter((day) => typeof day.target === "number")
      .map((day) => ({ x: day.x, y: day.target as number }));
  }, [chartData]);

  return (
    <Screen
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
    >
      <ScreenHeader
        title="Thống kê tuần"
        subtitle="Xem tiến độ dinh dưỡng 7 ngày qua"
      />

      <AppCard>
        <SectionHeader title="Thống kê 7 ngày" subtitle="So sánh calo tiêu thụ với mục tiêu hằng ngày" />

        {isLoading && !weekSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              Đang tải...
            </ThemedText>
          </View>
        ) : chartData.length === 0 ? (
          <ThemedText variant="body" color="textSecondary" style={{ textAlign: 'center', paddingVertical: theme.spacing.xl }}>
            Chưa có dữ liệu
          </ThemedText>
        ) : (
          <VictoryChart
            height={280}
            theme={VictoryTheme.material}
            padding={{ top: 40, bottom: 60, left: 60, right: 32 }}
            domainPadding={{ x: 20, y: [10, 20] }}
            style={{ background: { fill: theme.colors.background } }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: theme.colors.border },
                tickLabels: { fill: theme.colors.textSecondary, fontSize: 12 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: theme.colors.border },
                tickLabels: { fill: theme.colors.textSecondary, fontSize: 12 },
                grid: { stroke: theme.colors.border, strokeDasharray: '4,4', opacity: 0.4 },
              }}
            />
            <VictoryArea
              data={chartData}
              x="x"
              y="y"
              interpolation="monotoneX"
              style={{ data: { fill: theme.colors.primary, fillOpacity: 0.3, stroke: theme.colors.primary, strokeWidth: 2 } }}
              labels={({ datum }) => `${datum.y} kcal`}
              labelComponent={<VictoryTooltip renderInPortal={false} style={{ fontSize: 12 }} />}
            />
            {targetLine.length > 0 ? (
              <VictoryArea
                data={targetLine}
                x="x"
                y="y"
                interpolation="monotoneX"
                style={{ data: { stroke: theme.colors.secondary, strokeDasharray: "6,6", fillOpacity: 0, strokeWidth: 2 } }}
                labels={({ datum }) => `Mục tiêu ${datum.y} kcal`}
                labelComponent={<VictoryTooltip renderInPortal={false} style={{ fontSize: 10 }} />}
              />
            ) : null}
          </VictoryChart>
        )}

        {weekSummary && weekSummary.days.length > 0 && (
          <View style={styles.summaryRow}>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 0 && { backgroundColor: theme.colors.primaryLight },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 0 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(200).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(0)} style={{ alignItems: 'center' }}>
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Trung bình/ngày
                </ThemedText>
                <ThemedText variant="h4">
                  {Math.round(weekSummary.days.reduce((sum, day) => sum + day.calories, 0) / weekSummary.days.length)} kcal
                </ThemedText>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 1 && { backgroundColor: theme.colors.secondaryLight },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 1 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(300).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(1)} style={{ alignItems: 'center' }}>
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Tổng tuần
                </ThemedText>
                <ThemedText variant="h4">
                  {weekSummary.days.reduce((sum, day) => sum + day.calories, 0)} kcal
                </ThemedText>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 2 && { backgroundColor: theme.colors.success + '20' },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 2 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(400).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(2)} style={{ alignItems: 'center' }}>
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Đạt mục tiêu
                </ThemedText>
                <ThemedText variant="h4" color="success">
                  {weekSummary.days.filter(day => day.targetCalories && day.calories >= day.targetCalories).length}/{weekSummary.days.length} ngày
                </ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </AppCard>
    </Screen>
  );
};


export default WeekStatsScreen;
