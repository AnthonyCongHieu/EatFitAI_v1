import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Icon from '../Icon';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type QuickAddAction = {
  key: 'search' | 'scan' | 'voice';
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  accent: string;
  onPress: () => void;
  testID?: string;
};

interface QuickAddHubProps {
  onSearch: () => void;
  onScan: () => void;
  onVoice: () => void;
  searchTestID?: string;
  scanTestID?: string;
  voiceTestID?: string;
  compact?: boolean;
}

export const QuickAddHub = ({
  onSearch,
  onScan,
  onVoice,
  searchTestID,
  scanTestID,
  voiceTestID,
  compact = false,
}: QuickAddHubProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const actions: QuickAddAction[] = [
    {
      key: 'search',
      title: 'Tìm kiếm',
      description: 'Tìm nhanh và lưu ngay từ kết quả',
      icon: 'search-outline',
      accent: theme.colors.primary,
      onPress: onSearch,
      testID: searchTestID,
    },
    {
      key: 'scan',
      title: 'Quét ảnh',
      description: 'Chụp ảnh, AI gợi ý, lưu nhanh kết quả',
      icon: 'scan-outline',
      accent: theme.colors.secondary,
      onPress: onScan,
      testID: scanTestID,
    },
    {
      key: 'voice',
      title: 'Giọng nói',
      description: 'Mở micro và ghi bữa ăn bằng giọng nói',
      icon: 'mic-outline',
      accent: theme.colors.success,
      onPress: onVoice,
      testID: voiceTestID,
    },
  ];

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <ThemedText variant={compact ? 'h4' : 'h4'} weight="700">
            Thêm nhanh
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Chọn một cách thêm bữa phù hợp với tình huống hiện tại.
          </ThemedText>
        </View>
        {!compact && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15, 23, 42, 0.05)',
              },
            ]}
          >
            <ThemedText variant="caption" weight="700" color="textSecondary">
              Gợi ý
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.actions, compact && styles.actionsCompact]}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            testID={action.testID}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            accessibilityHint={action.description}
            style={({ pressed }) => [
              styles.actionCard,
              compact && styles.actionCardCompact,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View style={[styles.actionTopRow, compact && styles.actionTopRowCompact]}>
              <View
                style={[
                  styles.iconWrap,
                  compact && styles.iconWrapCompact,
                  {
                    backgroundColor: action.accent + '18',
                    borderColor: action.accent + '30',
                  },
                ]}
              >
                <Icon name={action.icon} size="lg" color={action.accent} />
              </View>

              {!compact && (
                <View
                  style={[
                    styles.stepPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(226,232,240,0.12)'
                        : 'rgba(15, 23, 42, 0.04)',
                    },
                  ]}
                >
                  <ThemedText variant="caption" weight="700" color="textSecondary">
                    {action.key === 'search' ? '2-3 taps' : '3 taps'}
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={[styles.copy, compact && styles.copyCompact]}>
              <ThemedText variant="body" weight="700">
                {action.title}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" numberOfLines={compact ? 1 : undefined}>
                {action.description}
              </ThemedText>
            </View>

            {compact && <Icon name="chevron-forward" size="sm" color="textSecondary" />}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  containerCompact: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCompact: {
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: {
    gap: 12,
  },
  actionsCompact: {
    gap: 8,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  actionCardCompact: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTopRowCompact: {
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  stepPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copy: {
    gap: 4,
  },
  copyCompact: {
    flex: 1,
    gap: 2,
  },
});

export default QuickAddHub;
