import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "../../components/ThemedText";
import { useDiaryStore } from "../../store/useDiaryStore";
import { useAppTheme } from "../../theme/ThemeProvider";
import type { RootStackParamList } from "../types";

const MEAL_TITLE_MAP: Record<string, string> = {
  breakfast: "Bua sang",
  lunch: "Bua trua",
  dinner: "Bua toi",
  snack: "An vat",
};

type AddOption = "search" | "custom" | "ai";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddEntryModal = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: AddOption) => void;
}): JSX.Element => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <ThemedText variant="title">Them mon</ThemedText>
        <ThemedText style={styles.modalHint}>Chon cach them mon vao nhat ky</ThemedText>
        <Pressable style={styles.modalButton} onPress={() => onSelect("search")}>
          <ThemedText style={styles.modalButtonText}>Tim mon co san</ThemedText>
        </Pressable>
        <Pressable style={styles.modalButton} onPress={() => onSelect("custom")}>
          <ThemedText style={styles.modalButtonText}>Tao mon thu cong</ThemedText>
        </Pressable>
        <Pressable style={styles.modalButton} onPress={() => onSelect("ai")}>
          <ThemedText style={styles.modalButtonText}>Goi y AI</ThemedText>
        </Pressable>
        <Pressable style={styles.modalCancel} onPress={onClose}>
          <ThemedText>Dong</ThemedText>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const formatNumber = (value?: number | null, suffix = ""): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  const rounded = Math.round(value);
  return `${rounded}${suffix}`;
};

const formatDate = (dateValue: string | undefined): string => {
  if (!dateValue) {
    return "Hom nay";
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Hom nay";
  }
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
};

const HomeScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((state) => state.summary);
  const isLoading = useDiaryStore((state) => state.isLoading);
  const isRefreshing = useDiaryStore((state) => state.isRefreshing);
  const fetchSummary = useDiaryStore((state) => state.fetchSummary);
  const refreshSummary = useDiaryStore((state) => state.refreshSummary);
  const deleteEntry = useDiaryStore((state) => state.deleteEntry);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchSummary().catch(() => {
      Toast.show({ type: "error", text1: "Khong the tai nhat ky hom nay" });
    });
  }, [fetchSummary]);

  const handleRefresh = useCallback(() => {
    refreshSummary().catch(() => {
      Toast.show({ type: "error", text1: "Tai lai that bai" });
    });
  }, [refreshSummary]);

  const handleDelete = useCallback(
    (entryId: string, foodName: string) => {
      Alert.alert("Xoa mon", `Xac nhan xoa "${foodName}" khoi nhat ky?`, [
        { text: "Huy", style: "cancel" },
        {
          text: "Xoa",
          style: "destructive",
          onPress: () => {
            deleteEntry(entryId)
              .then(() => {
                Toast.show({ type: "success", text1: "Da xoa mon" });
              })
              .catch(() => {
                Toast.show({ type: "error", text1: "Xoa that bai" });
              });
          },
        },
      ]);
    },
    [deleteEntry],
  );

  const handleAddOption = useCallback(
    (option: AddOption) => {
      setShowAddModal(false);
      if (option === "search") {
        navigation.navigate("FoodSearch");
        return;
      }
      if (option === "custom") {
        navigation.navigate("CustomDish");
        return;
      }
      Toast.show({ type: "info", text1: "AI se duoc kich hoat o buoc tiep theo" });
    },
    [navigation],
  );

  const calorieDiffText = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== "number" || typeof summary.targetCalories !== "number") {
      return null;
    }
    const diff = summary.totalCalories - summary.targetCalories;
    if (diff === 0) {
      return "Ban dang bang voi muc tieu";
    }
    if (diff > 0) {
      return `Vuot ${Math.abs(diff)} kcal so voi muc tieu`;
    }
    return `Thap hon ${Math.abs(diff)} kcal so voi muc tieu`;
  }, [summary]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}> 
          <ThemedText variant="title">Nhat ky hom nay</ThemedText>
          <ThemedText style={styles.dateText}>{formatDate(summary?.date)}</ThemedText>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Tieu thu</ThemedText>
              <ThemedText variant="title">{formatNumber(summary?.totalCalories, " kcal")}</ThemedText>
            </View>
            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Muc tieu</ThemedText>
              <ThemedText variant="title">{formatNumber(summary?.targetCalories, " kcal")}</ThemedText>
            </View>
          </View>
          {calorieDiffText ? <ThemedText style={styles.infoText}>{calorieDiffText}</ThemedText> : null}

          <View style={styles.macroRow}>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText style={styles.summaryLabel}>Protein</ThemedText>
              <ThemedText>{formatNumber(summary?.protein, " g")}</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText style={styles.summaryLabel}>Carb</ThemedText>
              <ThemedText>{formatNumber(summary?.carbs, " g")}</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText style={styles.summaryLabel}>Fat</ThemedText>
              <ThemedText>{formatNumber(summary?.fat, " g")}</ThemedText>
            </View>
          </View>

          <Pressable style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowAddModal(true)}>
            <ThemedText style={styles.addButtonText}>+ Them mon</ThemedText>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={[styles.loadingBox, { backgroundColor: theme.colors.card }]}> 
            <ActivityIndicator color={theme.colors.primary} />
            <ThemedText style={styles.loadingText}>Dang tai nhat ky...</ThemedText>
          </View>
        ) : summary && summary.meals.length > 0 ? (
          summary.meals.map((meal) => (
            <View key={meal.mealType} style={[styles.mealCard, { backgroundColor: theme.colors.card }]}> 
              <View style={styles.mealHeader}>
                <View>
                  <ThemedText variant="subtitle">{MEAL_TITLE_MAP[meal.mealType] ?? meal.title}</ThemedText>
                  <ThemedText style={styles.mealTotal}>{formatNumber(meal.totalCalories, " kcal")}</ThemedText>
                </View>
                <ThemedText style={styles.entryCount}>{meal.entries.length} mon</ThemedText>
              </View>

              {meal.entries.map((entry) => (
                <View key={entry.id} style={[styles.entryRow, { borderColor: theme.colors.border }]}> 
                  <View style={styles.entryInfo}>
                    <ThemedText style={styles.entryName}>{entry.foodName}</ThemedText>
                    <ThemedText style={styles.entryMeta}>
                      {formatNumber(entry.calories, " kcal")} · {entry.quantityText ?? "Khong ro khau phan"}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => handleDelete(entry.id, entry.foodName)} style={styles.deleteChip}>
                    <ThemedText style={styles.deleteText}>Xoa</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}> 
            <ThemedText variant="subtitle">Chua co mon nao</ThemedText>
            <ThemedText style={styles.infoText}>Nhan "Them mon" de ghi lai bua an dau tien</ThemedText>
          </View>
        )}
      </ScrollView>

      <AddEntryModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSelect={handleAddOption} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
    paddingBottom: 48,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dateText: {
    textTransform: "capitalize",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  infoText: {
    opacity: 0.8,
  },
  macroRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  addButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  loadingBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  loadingText: {
    opacity: 0.8,
  },
  mealCard: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealTotal: {
    opacity: 0.7,
    marginTop: 4,
  },
  entryCount: {
    opacity: 0.6,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  entryInfo: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  entryName: {
    fontFamily: "Inter_600SemiBold",
  },
  entryMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  deleteChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FDECEA",
  },
  deleteText: {
    color: "#D84343",
    fontFamily: "Inter_600SemiBold",
  },
  emptyCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    backgroundColor: "#fff",
  },
  modalHint: {
    opacity: 0.7,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F4F3",
  },
  modalButtonText: {
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  modalCancel: {
    marginTop: 8,
    alignItems: "center",
  },
});

export default HomeScreen;
