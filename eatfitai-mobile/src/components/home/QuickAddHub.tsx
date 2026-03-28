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
      title: 'Search',
      description: 'Tim nhanh va save ngay tu ket qua',
      icon: 'search-outline',
      accent: theme.colors.primary,
      onPress: onSearch,
      testID: searchTestID,
    },
    {
      key: 'scan',
      title: 'Scan',
      description: 'Chup anh, AI goi y, luu nhanh top result',
      icon: 'scan-outline',
      accent: theme.colors.secondary,
      onPress: onScan,
      testID: scanTestID,
    },
    {
      key: 'voice',
      title: 'Voice',
      description: 'Mo micro va ghi bua an bang giong noi',
      icon: 'mic-outline',
      accent: theme.colors.success,
      onPress: onVoice,
      testID: voiceTestID,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText variant={compact ? 'body' : 'h4'} weight="700">
            Quick Add Hub
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Search / Scan / Voice in 3 buoc hoac it hon tu Home den Save.
          </ThemedText>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.05)',
            },
          ]}
        >
          <ThemedText variant="caption" weight="700" color="textSecondary">
            {'<=3 steps'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
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
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View style={styles.actionTopRow}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: action.accent + '18',
                    borderColor: action.accent + '30',
                  },
                ]}
              >
                <Icon name={action.icon} size="lg" color={action.accent} />
              </View>

              <View
                style={[
                  styles.stepPill,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
                  },
                ]}
              >
                <ThemedText variant="caption" weight="700" color="textSecondary">
                  {action.key === 'search' ? '2-3 taps' : '3 taps'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.copy}>
              <ThemedText variant="body" weight="700">
                {action.title}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                {action.description}
              </ThemedText>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
  actionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  actionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copy: {
    gap: 4,
  },
});

export default QuickAddHub;
