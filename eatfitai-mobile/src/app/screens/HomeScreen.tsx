import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useThemeToggle } from '../../hooks/useThemeToggle';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAppTheme } from '../../theme/ThemeProvider';

const HomeScreen = (): JSX.Element => {
  const { theme, mode } = useAppTheme();
  const toggleTheme = useThemeToggle();
  const profile = useDashboardStore((state) => state.profile);
  const hydration = useDashboardStore((state) => state.hydration);
  const addHydration = useDashboardStore((state) => state.addHydration);
  const loadProfile = useDashboardStore((state) => state.loadProfile);

  useEffect(() => {
    loadProfile().catch(() => {
      // swallow error until API ready
    });
  }, [loadProfile]);

  const handleLogWater = useCallback(() => {
    addHydration(250);
  }, [addHydration]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">EatFitAI</ThemedText>
        <ThemedText variant="subtitle" style={styles.subtitle}>
          Xin chào {profile?.name ?? 'bạn'} 👋
        </ThemedText>
        <ThemedText>
          Mục tiêu calo: {profile?.targetCalories ?? 'đang cập nhật'} kcal/ngày
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="subtitle" style={styles.subtitle}>
          Nước hôm nay
        </ThemedText>
        <ThemedText variant="title">{hydration} ml</ThemedText>
        <Pressable
          onPress={handleLogWater}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <ThemedText style={styles.buttonText}>+250 ml</ThemedText>
        </Pressable>
      </View>

      <Pressable
        onPress={toggleTheme}
        style={[
          styles.button,
          { backgroundColor: theme.colors.secondary, marginTop: 12 },
        ]}
      >
        <ThemedText style={styles.buttonText}>Đổi theme (hiện tại: {mode})</ThemedText>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  subtitle: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default HomeScreen;
