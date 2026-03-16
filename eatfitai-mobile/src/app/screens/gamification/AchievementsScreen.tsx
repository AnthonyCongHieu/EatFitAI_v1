// Màn hình Thành tích - Redesigned với UI/UX hiện đại
// Inspired by Duolingo, Strava, và các fitness apps hàng đầu

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useGamificationStore, Achievement } from '../../../store/useGamificationStore';
import { shareService } from '../../../services/shareService';


const AchievementsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const navigation = useNavigation();
  const { achievements, currentStreak, longestStreak, totalDaysLogged, checkStreak, syncAchievementProgress } =
    useGamificationStore();
  const viewRef = useRef(null);

  useEffect(() => {
    checkStreak();
    // Sync progress achievements với state hiện tại (fix bug progress không cập nhật)
    syncAchievementProgress();
  }, [checkStreak, syncAchievementProgress]);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkStreak(); // Force recalculate streak from API
    syncAchievementProgress();
    setRefreshing(false);
  }, [checkStreak, syncAchievementProgress]);

  const handleShare = async () => {
    await shareService.shareScreenshot(viewRef);
  };

  // Tính toán số thành tích đã mở khóa
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  // Gradient colors cho các thành tích - sử dụng theme
  const getGradientColors = (id: string, isUnlocked: boolean): readonly [string, string] => {
    if (!isUnlocked) return [theme.colors.card, theme.colors.card] as const;

    switch (id) {
      case 'first_log':
        return theme.achievementGradients.first_log;
      case 'streak_3':
        return theme.achievementGradients.streak_3;
      case 'streak_7':
        return theme.achievementGradients.streak_7;
      case 'log_100_meals':
        return theme.achievementGradients.log_100_meals;
      default:
        return theme.achievementGradients.default;
    }
  };

  // Emoji cho từng thành tích
  const getEmoji = (id: string): string => {
    switch (id) {
      case 'first_log':
        return '🚀';
      case 'streak_3':
        return '🔥';
      case 'streak_7':
        return '📅';
      case 'log_100_meals':
        return '🍽️';
      default:
        return '🏆';
    }
  };

  const renderStreakHeader = () => (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <LinearGradient
        colors={theme.achievementGradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        {/* Main streak display */}
        <View style={styles.mainStreak}>
          <ThemedText
            style={[styles.streakNumber, { color: '#fff' }]}
            variant="h1"
            weight="700"
          >
            {currentStreak}
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.9)' }} variant="body" weight="600">
            ngày liên tiếp 🔥
          </ThemedText>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{longestStreak}</ThemedText>
            <ThemedText style={styles.statLabel}>Kỷ lục</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalDaysLogged}</ThemedText>
            <ThemedText style={styles.statLabel}>Tổng ngày</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {unlockedCount}/{totalCount}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Thành tích</ThemedText>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderAchievementCard = ({ item, index }: { item: Achievement; index: number }) => {
    const isUnlocked = !!item.unlockedAt;
    const progressPercent = Math.min(100, (item.progress / item.target) * 100);
    const gradientColors = getGradientColors(item.id, isUnlocked);
    const emoji = getEmoji(item.id);

    return (
      <Animated.View entering={FadeInDown.delay(200 + index * 100).springify()}>
        <View style={[styles.achievementCard, !isUnlocked && styles.lockedCard]}>
          {/* Left: Icon với gradient background */}
          <View style={styles.iconWrapper}>
            {isUnlocked ? (
              <LinearGradient
                colors={gradientColors}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText style={styles.emoji}>{emoji}</ThemedText>
              </LinearGradient>
            ) : (
              <View style={[styles.iconLocked, { backgroundColor: theme.colors.border }]}>
                <Ionicons name="lock-closed" size={24} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>

          {/* Right: Content */}
          <View style={styles.contentWrapper}>
            <View style={styles.titleRow}>
              <ThemedText
                variant="h4"
                weight="700"
                color={isUnlocked ? undefined : 'textSecondary'}
              >
                {item.title}
              </ThemedText>
              {isUnlocked && (
                <View style={[styles.badge, { backgroundColor: theme.colors.success + '20' }]}>
                  <ThemedText variant="caption" color="success" weight="600">
                    🏆 Đã đạt
                  </ThemedText>
                </View>
              )}
            </View>

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginTop: 2, marginBottom: 8 }}
            >
              {item.description}
            </ThemedText>

            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
              <LinearGradient
                colors={isUnlocked ? gradientColors : [theme.colors.primary, theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>

            <View style={styles.progressRow}>
              <ThemedText variant="caption" color="textSecondary">
                Tiến độ: {Math.round(item.progress)}/{item.target}
              </ThemedText>
              <ThemedText variant="caption" color={isUnlocked ? 'success' : 'textSecondary'}>
                {Math.round(progressPercent)}%
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderSectionTitle = () => (
    <Animated.View entering={FadeIn.delay(150)} style={styles.sectionHeader}>
      <ThemedText variant="h3" weight="700">
        Tất cả thành tích
      </ThemedText>
      <ThemedText variant="caption" color="textSecondary">
        {unlockedCount} / {totalCount} đã đạt
      </ThemedText>
    </Animated.View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: 100,
    },
    streakCard: {
      borderRadius: 20,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      ...theme.shadows.lg,
    },
    mainStreak: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    streakNumber: {
      fontSize: 64,
      lineHeight: 72,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    statLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 30,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    achievementCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    lockedCard: {
      opacity: 0.6,
    },
    iconWrapper: {
      marginRight: theme.spacing.md,
    },
    iconGradient: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.md,
    },
    iconLocked: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 28,
    },
    contentWrapper: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    progressBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
  });

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Custom Header matching EditProfileScreen */}
      <View style={{ paddingTop: 60, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
        {/* Row: Back button + Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText variant="h3" weight="700">
              Thành tích
            </ThemedText>
          </View>

          <TouchableOpacity onPress={handleShare} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="share-social-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Subtitle below */}
        <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
          Hành trình sức khỏe của bạn
        </ThemedText>
      </View>

      <View ref={viewRef} collapsable={false} style={{ flex: 1 }}>
        <FlatList
          data={achievements}
          renderItem={renderAchievementCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {renderStreakHeader()}
              {renderSectionTitle()}
            </>
          }
        />
      </View>
    </LinearGradient>
  );
};

export default AchievementsScreen;
