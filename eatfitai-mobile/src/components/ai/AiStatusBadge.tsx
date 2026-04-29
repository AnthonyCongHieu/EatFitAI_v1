import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { AiHealthStatus } from '../../types/ai';

type Props = {
  status?: AiHealthStatus | null;
  loading?: boolean;
  compact?: boolean;
  testID?: string;
};

const getMeta = (status?: AiHealthStatus | null) => {
  if (!status) {
    return {
      label: 'AI đang kiểm tra',
      caption: 'Đang lấy trạng thái từ máy chủ.',
      dotColor: '#9AA4B2',
      bgColor: 'rgba(154, 164, 178, 0.16)',
      borderColor: 'rgba(154, 164, 178, 0.3)',
    };
  }

  switch (status.state) {
    case 'HEALTHY':
      return {
        label: 'AI sẵn sàng',
        caption: 'Tất cả tính năng AI đang hoạt động bình thường.',
        dotColor: '#22C55E',
        bgColor: 'rgba(34, 197, 94, 0.14)',
        borderColor: 'rgba(34, 197, 94, 0.28)',
      };
    case 'DOWN':
      return {
        label: 'AI tạm dừng',
        caption:
          status.message ||
          'Các thao tác AI sẽ tạm khóa; bạn vẫn có thể nhập thủ công.',
        dotColor: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.14)',
        borderColor: 'rgba(239, 68, 68, 0.28)',
      };
    case 'DEGRADED':
    default:
      return {
        label: 'AI suy giảm',
        caption: status?.message || 'AI đang hoạt động nhưng chưa ổn định hoàn toàn.',
        dotColor: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.14)',
        borderColor: 'rgba(245, 158, 11, 0.28)',
      };
  }
};

export const AiStatusBadge = ({
  status,
  loading = false,
  compact = false,
  testID,
}: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const meta = getMeta(loading ? null : status);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: meta.bgColor,
          borderColor: meta.borderColor,
          paddingVertical: compact ? 8 : 10,
          paddingHorizontal: compact ? 12 : 14,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: meta.dotColor }]} />
        <ThemedText
          variant={compact ? 'bodySmall' : 'body'}
          weight="700"
          style={{ color: compact ? theme.colors.text : theme.colors.text }}
        >
          {meta.label}
        </ThemedText>
      </View>
      {!compact && (
        <ThemedText
          variant="caption"
          color="textSecondary"
          style={{ marginTop: 4 }}
          numberOfLines={2}
        >
          {meta.caption}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default AiStatusBadge;
