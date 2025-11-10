import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { VictoryArea, VictoryChart, VictoryTheme, VictoryTooltip, VictoryAxis } from "victory-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "../../../components/ThemedText";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import Button from "../../../components/Button";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { useStatsStore } from "../../../store/useStatsStore";
import { summaryService } from "../../../services/summaryService";

const WeekStatsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const weekSummary = useStatsStore((state) => state.weekSummary);
  const isLoading = useStatsStore((state) => state.isLoading);
  const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);
  const refreshWeekSummary = useStatsStore((state) => state.refreshWeekSummary);
  const error = useStatsStore((state) => state.error);

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
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          Thống kê 7 ngày
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
          So sánh calo tiêu thụ với mục tiêu hằng ngày
        </ThemedText>

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
            <View style={styles.summaryItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Trung bình/ngày
              </ThemedText>
              <ThemedText variant="h4">
                {Math.round(weekSummary.days.reduce((sum, day) => sum + day.calories, 0) / weekSummary.days.length)} kcal
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Tổng tuần
              </ThemedText>
              <ThemedText variant="h4">
                {weekSummary.days.reduce((sum, day) => sum + day.calories, 0)} kcal
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText variant="caption" color="textSecondary" weight="600">
                Đạt mục tiêu
              </ThemedText>
              <ThemedText variant="h4" color="success">
                {weekSummary.days.filter(day => day.targetCalories && day.calories >= day.targetCalories).length}/{weekSummary.days.length} ngày
              </ThemedText>
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
});

export default WeekStatsScreen;
