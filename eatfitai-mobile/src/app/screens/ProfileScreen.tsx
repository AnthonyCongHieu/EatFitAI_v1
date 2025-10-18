// Màn hình hồ sơ đơn giản (tab thứ 2)
// Chú thích bằng tiếng Việt

import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';

const ProfileScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">Hồ sơ</ThemedText>
        <ThemedText style={{ marginTop: 8 }}>
          Đây là màn hình hồ sơ mẫu. Bạn có thể bổ sung thông tin cá nhân tại đây.
        </ThemedText>

        <Pressable
          onPress={() => logout().catch(() => {})}
          style={[styles.button, { backgroundColor: '#E53935', marginTop: 16 }]}
        >
          <ThemedText style={styles.buttonText}>Đăng xuất</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});

export default ProfileScreen;
