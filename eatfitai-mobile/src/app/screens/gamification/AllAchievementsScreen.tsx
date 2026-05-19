// Tất cả huy hiệu — Emerald Nebula
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { ThemedText } from '../../../components/ThemedText';
import { useGamificationStore } from '../../../store/useGamificationStore';
import { EN } from '../../../theme/emeraldNebula';

const BADGE_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  first_log: { icon: 'sparkles', color: '#4be277', bgColor: 'rgba(75,226,119,0.15)' },
  streak_3: { icon: 'flame', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  streak_7: { icon: 'calendar', color: '#f7c052', bgColor: 'rgba(245,158,11,0.15)' },
  streak_14: { icon: 'star', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  log_30_meals: { icon: 'pizza', color: '#f7c052', bgColor: 'rgba(245,158,11,0.15)' },
  log_50_meals: { icon: 'fast-food', color: '#14b8a6', bgColor: 'rgba(20,184,166,0.15)' },
  log_100_meals: { icon: 'restaurant', color: '#32d7f0', bgColor: 'rgba(6,182,212,0.15)' },
  log_200_meals: { icon: 'restaurant-outline', color: '#ff8c8c', bgColor: 'rgba(239,68,68,0.15)' },
  log_500_meals: { icon: 'medal', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  streak_30: { icon: 'shield-checkmark', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  streak_50: { icon: 'flame', color: '#f43f5e', bgColor: 'rgba(244,63,94,0.15)' },
  streak_100: { icon: 'trophy', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' },
  streak_200: { icon: 'ribbon', color: '#6366f1', bgColor: 'rgba(99,102,241,0.15)' },
  water_master: { icon: 'water', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
  water_30: { icon: 'water-outline', color: '#0ea5e9', bgColor: 'rgba(14,165,233,0.15)' },
  water_100: { icon: 'boat', color: '#32d7f0', bgColor: 'rgba(45,212,191,0.15)' },
  early_bird: { icon: 'sunny', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' },
  early_bird_7: { icon: 'partly-sunny', color: '#f7c052', bgColor: 'rgba(245,158,11,0.15)' },
  log_1000_meals: { icon: 'star-half', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
};

const AllAchievementsScreen = (): React.ReactElement => {
  const { achievements } = useGamificationStore();
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);

  const getBadge = (id: string) =>
    BADGE_CONFIG[id] ?? { icon: 'trophy-outline', color: EN.textMuted, bgColor: 'rgba(148,163,184,0.1)' };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <SubScreenLayout title="Tất cả huy hiệu" subtitle={`${unlocked.length} / ${achievements.length} đã đạt`}>
      {/* Earned */}
      {unlocked.length > 0 && (
        <View style={{ gap: 14, marginBottom: 24 }}>
          <ThemedText style={S.sectionLabel}>ĐÃ ĐẠT ({unlocked.length})</ThemedText>
          <View style={S.grid}>
            {unlocked.map((a) => {
              const cfg = getBadge(a.id);
              return (
                <View key={a.id} style={S.card}>
                  <View style={S.cardContent}>
                    <View style={{ alignItems: 'center', width: '100%' }}>
                      <View style={[S.iconCircle, { backgroundColor: cfg.bgColor }]}>
                        <Ionicons name={cfg.icon as any} size={38} color={cfg.color} />
                      </View>
                      <View style={S.titleContainer}>
                        <ThemedText style={S.name} numberOfLines={3}>{a.title}</ThemedText>
                      </View>
                      <View style={S.descContainer}>
                        <ThemedText style={S.desc} numberOfLines={3}>{a.description}</ThemedText>
                      </View>
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 12 }}>
                      <View style={S.earnedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={EN.primary} />
                        <ThemedText style={S.earnedText}>Đã đạt</ThemedText>
                      </View>
                      <ThemedText style={S.dateText}>{formatDate(a.unlockedAt!)}</ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <View style={{ gap: 14 }}>
          <ThemedText style={S.sectionLabel}>CHƯA ĐẠT ({locked.length})</ThemedText>
          <View style={S.grid}>
            {locked.map((a) => {
              const cfg = getBadge(a.id);
              const pct = Math.min(100, (a.progress / a.target) * 100);
              return (
                <View key={a.id} style={[S.card, S.cardLocked]}>
                  {/* Tiny lock at top right */}
                  <View style={S.lockIconTopRight}>
                    <Ionicons name="lock-closed" size={14} color={EN.textMuted} />
                  </View>

                  {/* Dimmed Content */}
                  <View style={[S.cardContent, { opacity: 0.6 }]}>
                    <View style={{ alignItems: 'center', width: '100%' }}>
                      <View style={[S.iconCircle, { backgroundColor: EN.surfaceHighest }]}>
                        <Ionicons name={cfg.icon as any} size={38} color="#64748b" />
                      </View>
                      <View style={S.titleContainer}>
                        <ThemedText style={[S.name, { color: '#64748b' }]} numberOfLines={3}>{a.title}</ThemedText>
                      </View>
                      <View style={S.descContainer}>
                        <ThemedText style={[S.desc, { color: '#64748b' }]} numberOfLines={3}>{a.description}</ThemedText>
                      </View>
                    </View>

                    <View style={{ width: '100%', alignItems: 'center', marginTop: 12 }}>
                      <View style={S.progressBar}>
                        <LinearGradient
                          colors={[EN.primary, EN.primaryContainer]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[S.progressFill, { width: `${pct}%` }]}
                        />
                      </View>
                      <ThemedText style={S.progressLabel}>{Math.round(a.progress)} / {a.target}</ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </SubScreenLayout>
  );
};

export default AllAchievementsScreen;

const S = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontFamily: 'BeVietnamPro_700Bold', color: '#64748b', letterSpacing: 1.5, paddingLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    width: '47%' as any, backgroundColor: EN.surfaceHigh, borderRadius: 20,
    paddingVertical: 22, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent', minHeight: 300,
  },
  cardContent: {
    flex: 1, width: '100%', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLocked: { backgroundColor: EN.surfaceLow, position: 'relative' },
  lockIconTopRight: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: EN.surfaceHighest, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titleContainer: { height: 68, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 4, paddingHorizontal: 4 },
  descContainer: { height: 60, justifyContent: 'flex-start', alignItems: 'center', width: '100%', marginBottom: 8, paddingHorizontal: 4 },
  name: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: '#fff', textAlign: 'center', lineHeight: 20 },
  desc: { fontSize: 13, color: EN.textMuted, textAlign: 'center', lineHeight: 18 },
  earnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earnedText: { fontSize: 12, fontFamily: 'BeVietnamPro_700Bold', color: EN.primary, letterSpacing: 1 },
  dateText: { fontSize: 11, color: EN.textMuted, marginTop: 4 },
  progressBar: { width: '85%', height: 5, borderRadius: 3, backgroundColor: EN.surfaceHighest, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, fontFamily: 'BeVietnamPro_600SemiBold', color: EN.textMuted, marginTop: 5 },
});
