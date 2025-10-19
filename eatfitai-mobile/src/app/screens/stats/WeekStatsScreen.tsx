import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { VictoryArea, VictoryChart, VictoryTheme, VictoryTooltip, VictoryAxis } from "victory-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "../../../components/ThemedText";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { useStatsStore } from "../../../store/useStatsStore";

const WeekStatsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const weekSummary = useStatsStore((state) => state.weekSummary);
  const isLoading = useStatsStore((state) => state.isLoading);
  const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);
  const refreshWeekSummary = useStatsStore((state) => state.refreshWeekSummary);
  const error = useStatsStore((state) => state.error);

  useEffect(() => {
    fetchWeekSummary().catch(() => {
      // toast da duoc hien o Home
    });
  }, [fetchWeekSummary]);

  useEffect(() => {
    if (error) {
      Toast.show({ type: "error", text1: error });
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    refreshWeekSummary().catch(() => {
      // swallow
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
      <Card style={styles.card}>
        <ThemedText variant="title">Thống kê 7 ngày</ThemedText>
        <ThemedText style={styles.subtitle}>So sánh calo tiêu thụ với mục tiêu hằng ngày</ThemedText>

        {isLoading && !weekSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : chartData.length === 0 ? (
          <ThemedText style={styles.infoText}>Chưa có dữ liệu</ThemedText>
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
                tickLabels: { fill: theme.colors.muted, fontSize: 12 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: theme.colors.border },
                tickLabels: { fill: theme.colors.muted, fontSize: 12 },
                grid: { stroke: theme.colors.border, strokeDasharray: '4,4', opacity: 0.4 },
              }}
            />
            <VictoryArea
              data={chartData}
              x="x"
              y="y"
              interpolation="monotoneX"
              style={{ data: { fill: theme.colors.primary, fillOpacity: 0.3, stroke: theme.colors.primary } }}
              labels={({ datum }) => `${datum.y} kcal`}
              labelComponent={<VictoryTooltip renderInPortal={false} style={{ fontSize: 12 }} />}
            />
            {targetLine.length > 0 ? (
              <VictoryArea
                data={targetLine}
                x="x"
                y="y"
                interpolation="monotoneX"
                style={{ data: { stroke: theme.colors.secondary, strokeDasharray: "6,6", fillOpacity: 0 } }}
                labels={({ datum }) => `Mục tiêu ${datum.y} kcal`}
                labelComponent={<VictoryTooltip renderInPortal={false} style={{ fontSize: 10 }} />}
              />
            ) : null}
          </VictoryChart>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    gap: 16,
  },
  subtitle: {
    opacity: 0.8,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  infoText: {
    opacity: 0.8,
  },
});

export default WeekStatsScreen;
