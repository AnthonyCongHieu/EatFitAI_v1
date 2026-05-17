// Màn hình Thành tích — Emerald Nebula Redesign
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ThemedText } from '../../../components/ThemedText';
import { useGamificationStore } from '../../../store/useGamificationStore';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { waterService, WaterIntakeData } from '../../../services/waterService';
import { shareService } from '../../../services/shareService';
import type { RootStackParamList } from '../../types';
import { formatBusinessDate } from '../../../utils/businessDate';
import { useEN } from '../../../theme/emeraldNebula';
import MoChiSprite from '../../../features/mochi/MoChiSprite';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/* ═══ Palette ═══ */
const P_STATIC = {
  bg: '#0e1322', surfaceLowest: '#090e1c', surfaceLow: '#161b2b',
  surface: '#1a1f2f', surfaceHigh: '#25293a', surfaceHighest: '#2f3445',
  primary: '#22c55e', primaryLight: '#4be277',
  primaryGlow: 'rgba(75, 226, 119, 0.15)',
  amber: '#f59e0b', cyan: '#06b6d4', orange: '#f97316',
  onSurface: '#dee1f7', onSurfaceVariant: '#bccbb9',
  textMuted: '#94a3b8', slate500: '#64748b',
  glassBg: 'rgba(37, 41, 58, 0.4)', glassBorder: 'rgba(61, 74, 61, 0.2)',
  outlineVariant: 'rgba(255,255,255,0.06)',
};
const P = P_STATIC;

/* ─── Level system: 300 XP per level ─── */
const XP_PER_LEVEL = 300;
const LEVEL_NAMES_VI = ['Tập sự','Khởi đầu','Khám phá','Học hỏi','Nhà vô địch','Chuyên gia','Bậc thầy','Huyền thoại','Thần thoại','Siêu việt'];

const getLevel = (xp: number) => {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const curThreshold = (level - 1) * XP_PER_LEVEL;
  const nextThreshold = level * XP_PER_LEVEL;
  const progress = ((xp - curThreshold) / XP_PER_LEVEL) * 100;
  const idx = Math.min(level - 1, LEVEL_NAMES_VI.length - 1);
  return { level, name: LEVEL_NAMES_VI[idx] ?? 'Tập sự', nextThreshold, progress: Math.min(100, Math.max(0, progress)), xpToNext: nextThreshold - xp };
};

/* ─── Badge config ─── */
const BADGE_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  first_log: { icon: 'sparkles', color: P.primaryLight, bgColor: 'rgba(75,226,119,0.15)' },
  streak_3: { icon: 'flame', color: P.orange, bgColor: 'rgba(249,115,22,0.15)' },
  streak_7: { icon: 'calendar', color: P.amber, bgColor: 'rgba(245,158,11,0.15)' },
  streak_14: { icon: 'star', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  log_30_meals: { icon: 'pizza', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  log_50_meals: { icon: 'fast-food', color: '#14b8a6', bgColor: 'rgba(20,184,166,0.15)' },
  log_100_meals: { icon: 'restaurant', color: P.cyan, bgColor: 'rgba(6,182,212,0.15)' },
  log_200_meals: { icon: 'restaurant-outline', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  log_500_meals: { icon: 'medal', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  streak_30: { icon: 'shield-checkmark', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  streak_50: { icon: 'flame', color: '#f43f5e', bgColor: 'rgba(244,63,94,0.15)' },
  streak_100: { icon: 'trophy', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' },
  streak_200: { icon: 'ribbon', color: '#6366f1', bgColor: 'rgba(99,102,241,0.15)' },
  water_master: { icon: 'water', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
  water_30: { icon: 'water-outline', color: '#0ea5e9', bgColor: 'rgba(14,165,233,0.15)' },
  water_100: { icon: 'boat', color: '#2dd4bf', bgColor: 'rgba(45,212,191,0.15)' },
  early_bird: { icon: 'sunny', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' },
  early_bird_7: { icon: 'partly-sunny', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  log_1000_meals: { icon: 'star-half', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
};

const getStreakColor = (streak: number) => {
  if (streak >= 100) return '#c084fc'; // Purple (Legendary)
  if (streak >= 50) return '#f43f5e';  // Rose/Red
  if (streak >= 14) return '#f97316';  // Orange
  if (streak >= 7) return '#eab308';   // Yellow
  if (streak >= 3) return '#10b981';   // Emerald
  return P.primaryLight; // Default
};

/* ═══ Component ═══ */
const AchievementsScreen = (): React.ReactElement => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const viewRef = useRef(null);
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const P = { ...P_STATIC, ...useEN() };
  const { achievements, currentStreak, totalXP, checkStreak, syncAchievementProgress, dailyQuestsClaimed, claimDailyQuest } = useGamificationStore();
  const summary = useDiaryStore((s) => s.summary);
  const [refreshing, setRefreshing] = useState(false);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-achievements'], queryFn: () => waterService.getWaterIntake(new Date()), staleTime: 60_000,
  });

  useEffect(() => { checkStreak(); syncAchievementProgress(); }, [checkStreak, syncAchievementProgress]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); await checkStreak(); syncAchievementProgress(); setRefreshing(false);
  }, [checkStreak, syncAchievementProgress]);

  const unlocked = useMemo(() => achievements.filter((a) => a.unlockedAt), [achievements]);
  const unlockedCount = unlocked.length;
  const levelInfo = useMemo(() => getLevel(totalXP), [totalXP]);

  // Recent activity from REAL unlock dates
  const recentActivity = useMemo(() => {
    return [...unlocked]
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 3)
      .map((a) => {
        const unlockDate = new Date(a.unlockedAt!);
        const now = new Date();
        const diffMs = now.getTime() - unlockDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        let time: string;
        if (diffDays === 0) time = 'Hôm nay';
        else if (diffDays === 1) time = 'Hôm qua';
        else time = `${diffDays} ngày trước`;
        return { text: `MoChi ăn mừng: bạn đạt "${a.title}"`, time, color: P.primaryLight };
      });
  }, [unlocked]);

  // Daily quests from real data (auto-reset because data is fetched fresh each day)
  const todayMealCount = useMemo(() => summary?.meals?.length ?? 0, [summary]);
  const waterAmount = waterData?.amountMl ?? 0;
  const waterTarget = waterData?.targetMl ?? 2500;

  const dailyQuests = useMemo(() => [
    { id: 'q1', title: 'Ghi lại 3 bữa ăn', reward: '50 XP', icon: 'nutrition-outline' as const, iconColor: P.orange, progress: Math.min(todayMealCount, 3), target: 3, completed: todayMealCount >= 3 },
    { id: 'q2', title: 'Uống đủ nước', reward: '30 XP', icon: 'water-outline' as const, iconColor: P.primaryLight, progress: Math.min(waterAmount, waterTarget), target: waterTarget, completed: waterAmount >= waterTarget },
  ], [todayMealCount, waterAmount, waterTarget]);

  // Auto-claim daily quests
  useEffect(() => {
    const todayStr = formatBusinessDate();
    dailyQuests.forEach(q => {
      if (q.completed && dailyQuestsClaimed?.[q.id] !== todayStr) {
        claimDailyQuest(q.id, parseInt(q.reward.replace(/[^0-9]/g, ''), 10));
      }
    });
  }, [dailyQuests, dailyQuestsClaimed, claimDailyQuest]);

  const getBadge = (id: string) => BADGE_CONFIG[id] ?? { icon: 'trophy-outline', color: P.textMuted, bgColor: 'rgba(148,163,184,0.1)' };

  return (
    <View style={[S.container, { backgroundColor: P.bg }]}>
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, width: 44 }}>
          <Ionicons name="arrow-back" size={26} color={P.primary} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Thành tích</ThemedText>
        <Pressable onPress={() => shareService.shareScreenshot(viewRef)} style={{ padding: 8, width: 44, alignItems: 'center' }}>
          <Ionicons name="share-social-outline" size={22} color={P.primary} />
        </Pressable>
      </View>

      <ScrollView ref={viewRef} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={P.primary} colors={[P.primary]} />}>

        {/* ═══ HERO BANNER ═══ */}
        <View style={S.heroBanner}>
          <ThemedText style={S.heroLabel}>TIẾN ĐỘ CỦA BẠN</ThemedText>
          <View style={S.streakRow}>
            <ThemedText style={[S.streakNumber, { color: getStreakColor(currentStreak) }]}>{currentStreak}</ThemedText>
            <View style={S.streakCopy}>
              <ThemedText style={S.streakText}>Ngày liên tiếp</ThemedText>
              <ThemedText style={S.streakSubtext}>Giữ nhịp hôm nay để MoChi ăn mừng cùng bạn</ThemedText>
            </View>
            <View style={S.heroMochi}>
              <MoChiSprite poseKey={currentStreak > 0 ? 'celebrate' : 'faceDetermined'} size={62} animated={false} />
            </View>
          </View>
          <View style={S.statsRow}>
            <View style={S.statItem}>
              <ThemedText style={S.statValue}>{unlockedCount}</ThemedText>
              <ThemedText style={S.statLabel}>HUY HIỆU</ThemedText>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <ThemedText style={S.statValue}>{totalXP.toLocaleString()}</ThemedText>
              <ThemedText style={S.statLabel}>ĐIỂM KN</ThemedText>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <ThemedText style={S.statValue}>{levelInfo.level}</ThemedText>
              <ThemedText style={S.statLabel}>CẤP ĐỘ</ThemedText>
            </View>
          </View>
        </View>

        {/* ═══ LEVEL CARD ═══ */}
        <View style={S.levelCard}>
          <View style={S.levelWatermark}><Ionicons name="trophy" size={80} color={P.primary} /></View>
          <View style={S.levelHeader}>
            <View style={S.levelIconBox}><Ionicons name="medal" size={26} color={P.primary} /></View>
            <ThemedText style={S.levelTitle}>Cấp {levelInfo.level} — {levelInfo.name}</ThemedText>
          </View>
          <View style={{ gap: 8 }}>
            <View style={S.levelProgressLabels}>
              <ThemedText style={S.levelProgressText}>{totalXP.toLocaleString()} / {levelInfo.nextThreshold.toLocaleString()} XP</ThemedText>
              <ThemedText style={S.levelProgressPercent}>{Math.round(levelInfo.progress)}%</ThemedText>
            </View>
            <View style={S.progressBarBg}>
              <LinearGradient colors={[P.primaryLight, P.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[S.progressBarFill, { width: `${levelInfo.progress}%` }]} />
            </View>
            <ThemedText style={S.levelHint}>{levelInfo.xpToNext.toLocaleString()} XP đến Cấp {levelInfo.level + 1}</ThemedText>
          </View>
        </View>

        {/* ═══ RECENT ACTIVITY ═══ */}
        {recentActivity.length > 0 && (
          <View style={{ gap: 14 }}>
            <ThemedText style={S.sectionLabel}>HOẠT ĐỘNG GẦN ĐÂY</ThemedText>
            {recentActivity.map((a, i) => (
              <View key={i} style={S.activityRow}>
                <View style={[S.activityIconBox, { backgroundColor: a.color + '18' }]}>
                  <MoChiSprite poseKey="sparkleSuccess" size={34} animated={false} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={S.activityText}>{a.text}</ThemedText>
                  <ThemedText style={S.activityTime}>{a.time}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ═══ BADGES (earned only) ═══ */}
        <View style={S.badgesContainer}>
          <View style={S.badgesHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ThemedText style={S.badgesTitle}>Huy hiệu đã đạt</ThemedText>
              <ThemedText style={S.badgesCount}>({unlockedCount})</ThemedText>
            </View>
            <Pressable onPress={() => navigation.navigate('AllAchievements')}>
              <ThemedText style={S.viewAllBtn}>Xem tất cả</ThemedText>
            </Pressable>
          </View>
          {unlocked.length > 0 ? (
            <View style={S.badgesGrid}>
              {unlocked.map((badge) => {
                const cfg = getBadge(badge.id);
                return (
                  <View key={badge.id} style={S.badgeCard}>
                    <View style={[S.badgeIconCircle, { backgroundColor: cfg.bgColor }]}>
                      <Ionicons name={cfg.icon as any} size={36} color={cfg.color} />
                    </View>
                    <ThemedText style={S.badgeName} numberOfLines={2}>{badge.title}</ThemedText>
                    <ThemedText style={S.badgeStatus}>ĐÃ ĐẠT</ThemedText>
                  </View>
                );
              })}
            </View>
          ) : (
            <ThemedText style={{ color: P.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 20 }}>
              Chưa có huy hiệu nào. Hãy bắt đầu hành trình!
            </ThemedText>
          )}
        </View>

        {/* ═══ DAILY QUESTS ═══ */}
        <View style={S.questsContainer}>
          <ThemedText style={S.questsTitle}>Nhiệm vụ hàng ngày</ThemedText>
          <View style={{ gap: 14 }}>
            {dailyQuests.map((q) => (
              <View key={q.id} style={S.questRow}>
                <View style={S.questLeft}>
                  <View style={[S.questIconBox, { backgroundColor: q.iconColor + '18' }]}>
                    <Ionicons name={q.icon} size={22} color={q.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={S.questName}>{q.title}</ThemedText>
                    <ThemedText style={S.questReward}>Phần thưởng: {q.reward}</ThemedText>
                  </View>
                </View>
                {q.completed ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="checkmark-circle" size={20} color={P.primary} />
                    <ThemedText style={S.questCompleted}>Xong</ThemedText>
                  </View>
                ) : (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <ThemedText style={S.questProgress}>{q.progress}/{q.target}</ThemedText>
                    <View style={S.questProgressBar}>
                      <View style={[S.questProgressFill, { width: `${(q.progress / q.target) * 100}%`, backgroundColor: q.iconColor }]} />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AchievementsScreen;

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: P.primary, letterSpacing: -0.5, flex: 1, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 64, gap: 22 },
  heroBanner: { backgroundColor: P.surfaceLow, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(75,226,119,0.18)', shadowColor: P.primaryLight, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  heroLabel: { fontSize: 12, fontWeight: '800', color: P.primaryLight, letterSpacing: 2, opacity: 0.9, marginBottom: 10 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  streakNumber: { fontSize: 62, fontWeight: '800', color: P.primaryLight, lineHeight: 66 },
  streakCopy: { flex: 1, gap: 4 },
  streakText: { fontSize: 20, fontWeight: '800', color: P.onSurface },
  streakSubtext: { fontSize: 13, fontWeight: '600', color: P.textMuted },
  streakFlame: { fontSize: 24, lineHeight: 28 },
  heroMochi: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(75,226,119,0.10)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(9,14,28,0.42)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 4 },
  statItem: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, fontWeight: '700', color: P.onSurfaceVariant, letterSpacing: 1.5, marginTop: 3 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 },
  levelCard: { backgroundColor: P.surfaceHigh, borderRadius: 22, padding: 22, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: P.outlineVariant },
  levelWatermark: { position: 'absolute', right: -18, top: -18, opacity: 0.035 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  levelIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: P.primary + '24', alignItems: 'center', justifyContent: 'center' },
  levelTitle: { fontSize: 19, fontWeight: '800', color: '#fff', flex: 1, lineHeight: 25 },
  levelProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  levelProgressText: { fontSize: 15, fontWeight: '700', color: P.onSurface },
  levelProgressPercent: { fontSize: 15, fontWeight: '700', color: P.primary },
  progressBarBg: { height: 12, borderRadius: 999, backgroundColor: P.surfaceLowest, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 999 },
  levelHint: { fontSize: 14, color: P.textMuted, fontStyle: 'italic' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: P.slate500, letterSpacing: 1.5, paddingLeft: 4 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.surfaceLow, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: P.outlineVariant },
  activityIconBox: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  activityText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  activityTime: { fontSize: 13, color: P.textMuted, marginTop: 3 },
  badgesContainer: { backgroundColor: P.surfaceLow, borderRadius: 24, padding: 22 },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badgesTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  badgesCount: { fontSize: 20, fontWeight: '500', color: P.primaryLight },
  viewAllBtn: { fontSize: 15, fontWeight: '700', color: P.primary },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  badgeCard: { width: '47%' as any, backgroundColor: P.surfaceHigh, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  badgeIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  badgeName: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  badgeStatus: { fontSize: 11, fontWeight: '800', color: P.primary, letterSpacing: 1 },
  questsContainer: { backgroundColor: P.surface, borderRadius: 24, padding: 22 },
  questsTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 18 },
  questRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: P.surfaceLow, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: P.outlineVariant },
  questLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  questIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  questReward: { fontSize: 13, color: P.onSurfaceVariant, marginTop: 3 },
  questProgress: { fontSize: 13, fontWeight: '800', color: '#fff' },
  questProgressBar: { width: 52, height: 6, borderRadius: 3, backgroundColor: P.surfaceLowest, overflow: 'hidden' },
  questProgressFill: { height: '100%', borderRadius: 3 },
  questCompleted: { fontSize: 13, fontWeight: '800', color: P.primary },
});
