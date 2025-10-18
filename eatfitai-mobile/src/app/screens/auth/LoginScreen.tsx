// Màn hình Đăng nhập sử dụng React Hook Form + zod
// Chú thích bằng tiếng Việt

import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import { useAuthStore } from '../../../store/useAuthStore';
import type { RootStackParamList } from '../../types';

// Schema validate đầu vào bằng zod
const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginValues = z.infer<typeof LoginSchema>;

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props): JSX.Element => {
  const { theme } = useAppTheme();
  const login = useAuthStore((s) => s.login);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = useCallback(
    async (values: LoginValues) => {
      try {
        setLoading(true);
        await login(values.email, values.password);
        // Thành công: điều hướng sang Tabs (AppTabs)
        navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      } catch (e: any) {
        Alert.alert('Đăng nhập thất bại', e?.message ?? 'Vui lòng thử lại');
      } finally {
        setLoading(false);
      }
    },
    [login, navigation],
  );

  const onGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert('Google Sign-in', e?.message ?? 'Không thể đăng nhập bằng Google');
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">Đăng nhập</ThemedText>

        {/* Input Email */}
        <ThemedText style={styles.label}>Email</ThemedText>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <ThemedText style={styles.error}>{errors.email.message}</ThemedText>}

        {/* Input Mật khẩu */}
        <ThemedText style={styles.label}>Mật khẩu</ThemedText>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="••••••"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && <ThemedText style={styles.error}>{errors.password.message}</ThemedText>}

        {/* Nút Đăng nhập */}
        <Pressable
          disabled={loading}
          onPress={handleSubmit(onSubmit)}
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>{loading ? 'Đang xử lý…' : 'Đăng nhập'}</ThemedText>
        </Pressable>

        {/* Đăng nhập Google */}
        <Pressable
          disabled={loading}
          onPress={onGoogle}
          style={[styles.button, { backgroundColor: theme.colors.secondary, marginTop: 10, opacity: loading ? 0.7 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>Đăng nhập với Google</ThemedText>
        </Pressable>

        {/* Điều hướng sang Đăng ký */}
        <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: 16 }}>
          <ThemedText>Chưa có tài khoản? Đăng ký</ThemedText>
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
  label: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  error: { color: '#E53935', marginTop: 6 },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});

export default LoginScreen;
