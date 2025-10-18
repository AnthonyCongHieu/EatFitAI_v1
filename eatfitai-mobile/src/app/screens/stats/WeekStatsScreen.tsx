import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { VictoryArea, VictoryChart, VictoryTheme, VictoryTooltip } from "victory-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "../../../components/ThemedText";
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">Thong ke 7 ngay</ThemedText>
        <ThemedText style={styles.subtitle}>So sanh calo tieu thu voi muc tieu hang ngay</ThemedText>

        {isLoading && !weekSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : chartData.length === 0 ? (
          <ThemedText style={styles.infoText}>Chua co du lieu</ThemedText>
        ) : (
          <VictoryChart
            height={280}
            theme={VictoryTheme.material}
            padding={{ top: 40, bottom: 60, left: 60, right: 32 }}
            domainPadding={{ x: 20, y: [10, 20] }}
            style={{ background: { fill: theme.colors.background } }}
          >
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
                labels={({ datum }) => `Target ${datum.y} kcal`}
                labelComponent={<VictoryTooltip renderInPortal={false} style={{ fontSize: 10 }} />}
              />
            ) : null}
          </VictoryChart>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
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
