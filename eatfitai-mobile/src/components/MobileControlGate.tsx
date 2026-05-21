import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  dismissOptionalUpdateVersion,
  fetchMobileRuntimeConfig,
  getDismissedOptionalUpdateVersion,
  isForceUpdateRequired,
  isUpdateAvailable,
  MobileRuntimeConfig,
} from '../services/mobileConfigService';
import { E2E_AUTOMATION_ENABLED } from '../config/automation';
import { useAppTheme } from '../theme/ThemeProvider';

export default function MobileControlGate({
  children,
}: PropsWithChildren): React.ReactElement {
  const { theme } = useAppTheme();
  const [config, setConfig] = useState<MobileRuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const optionalUpdatePromptedVersionRef = useRef<string | null>(null);

  const openUpdateUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => {});
  }, []);

  const maybePromptForOptionalUpdate = useCallback(
    async (nextConfig: MobileRuntimeConfig) => {
      if (
        E2E_AUTOMATION_ENABLED ||
        isForceUpdateRequired(nextConfig) ||
        !isUpdateAvailable(nextConfig)
      ) {
        return;
      }

      const latestVersion = nextConfig.latestVersion?.trim();
      const updateUrl = nextConfig.updateUrl?.trim();
      if (!latestVersion || !updateUrl) {
        return;
      }

      if (optionalUpdatePromptedVersionRef.current === latestVersion) {
        return;
      }

      const dismissedVersion = await getDismissedOptionalUpdateVersion();
      if (dismissedVersion === latestVersion) {
        return;
      }

      optionalUpdatePromptedVersionRef.current = latestVersion;
      Alert.alert(
        'Có bản cập nhật mới',
        `EatFitAI ${latestVersion} đã sẵn sàng. Cập nhật để nhận bản APK mới nhất.`,
        [
          {
            text: 'Để sau',
            style: 'cancel',
            onPress: () => {
              void dismissOptionalUpdateVersion(latestVersion);
            },
          },
          {
            text: 'Cập nhật',
            onPress: () => openUpdateUrl(updateUrl),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            void dismissOptionalUpdateVersion(latestVersion);
          },
        },
      );
    },
    [openUpdateUrl],
  );

  const refreshConfig = useCallback(
    async (force = false) => {
      const nextConfig = await fetchMobileRuntimeConfig({ force });
      setConfig(nextConfig);
      setLoading(false);
      void maybePromptForOptionalUpdate(nextConfig);
    },
    [maybePromptForOptionalUpdate],
  );

  useEffect(() => {
    void refreshConfig(false);
    const initialFreshCheck = setTimeout(() => {
      void refreshConfig(true);
    }, 1000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshConfig(true);
      }
    });

    return () => {
      clearTimeout(initialFreshCheck);
      subscription.remove();
    };
  }, [refreshConfig]);

  if (loading && !config) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (config?.maintenanceEnabled) {
    return (
      <View
        style={[
          styles.center,
          styles.screenPadding,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          EatFitAI đang bảo trì
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {config.maintenanceMessage || 'Vui lòng quay lại sau ít phút.'}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => void refreshConfig(true)}
        >
          <Text style={styles.buttonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (config && isForceUpdateRequired(config)) {
    return (
      <View
        style={[
          styles.center,
          styles.screenPadding,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Cần cập nhật EatFitAI
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Phiên bản hiện tại không còn được hỗ trợ. Hãy cập nhật để tiếp tục sử dụng ổn
          định.
        </Text>
        {config.updateUrl ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => openUpdateUrl(config.updateUrl!)}
          >
            <Text style={styles.buttonText}>Cập nhật</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  screenPadding: {
    padding: 28,
  },
  title: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 15,
  },
});
