// Màn hình Đăng ký sử dụng React Hook Form + zod
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
const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Nhập lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof RegisterSchema>;

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props): JSX.Element => {
  const { theme } = useAppTheme();
  const registerFn = useAuthStore((s) => s.register);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (values: RegisterValues) => {
      try {
        setLoading(true);
        await registerFn(values.name, values.email, values.password);
        // Thành công: điều hướng sang Tabs (AppTabs)
        navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      } catch (e: any) {
        Alert.alert('Đăng ký thất bại', e?.message ?? 'Vui lòng thử lại');
      } finally {
        setLoading(false);
      }
    },
    [registerFn, navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <ThemedText variant="title">Đăng ký</ThemedText>

        {/* Tên hiển thị */}
        <ThemedText style={styles.label}>Tên hiển thị</ThemedText>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={theme.colors.muted}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.name && <ThemedText style={styles.error}>{errors.name.message}</ThemedText>}

        {/* Email */}
        <ThemedText style={styles.label}>Email</ThemedText>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <ThemedText style={styles.error}>{errors.email.message}</ThemedText>}

        {/* Mật khẩu */}
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

        {/* Nhập lại mật khẩu */}
        <ThemedText style={styles.label}>Nhập lại mật khẩu</ThemedText>
        <Controller
          control={control}
          name="confirmPassword"
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
        {errors.confirmPassword && (
          <ThemedText style={styles.error}>{errors.confirmPassword.message}</ThemedText>
        )}

        {/* Nút Đăng ký */}
        <Pressable
          disabled={loading}
          onPress={handleSubmit(onSubmit)}
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>{loading ? 'Đang xử lý…' : 'Tạo tài khoản'}</ThemedText>
        </Pressable>

        {/* Điều hướng về Đăng nhập */}
        <Pressable onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
          <ThemedText>Đã có tài khoản? Đăng nhập</ThemedText>
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

export default RegisterScreen;
