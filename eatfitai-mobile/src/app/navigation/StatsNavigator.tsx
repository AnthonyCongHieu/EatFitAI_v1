// StatsNavigator - Top tabs for Week/Month stats views
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '../../components/ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import WeekStatsScreen from '../screens/stats/WeekStatsScreen';
import MonthStatsScreen from '../screens/stats/MonthStatsScreen';

type StatsView = 'week' | 'month';

const StatsNavigator = (): JSX.Element => {
  const { theme } = useAppTheme();
  const [activeView, setActiveView] = useState<StatsView>('week');
  const indicatorPosition = useSharedValue(0);

  const handleTabPress = (view: StatsView) => {
    setActiveView(view);
    indicatorPosition.value = withSpring(view === 'week' ? 0 : 1, { damping: 15 });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      padding: 4,
      ...theme.shadows.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.card - 2,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => handleTabPress('week')}
          style={[styles.tab, activeView === 'week' && styles.activeTab]}
        >
          <ThemedText
            variant="bodySmall"
            weight="600"
            style={activeView === 'week' ? { color: '#fff' } : undefined}
            color={activeView !== 'week' ? 'textSecondary' : undefined}
          >
            📅 Tuần
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleTabPress('month')}
          style={[styles.tab, activeView === 'month' && styles.activeTab]}
        >
          <ThemedText
            variant="bodySmall"
            weight="600"
            style={activeView === 'month' ? { color: '#fff' } : undefined}
            color={activeView !== 'month' ? 'textSecondary' : undefined}
          >
            📆 Tháng
          </ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      <Animated.View entering={FadeIn} style={styles.content}>
        {activeView === 'week' ? <WeekStatsScreen /> : <MonthStatsScreen />}
      </Animated.View>
    </View>
  );
};

export default StatsNavigator;
