import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import {
  MOCHI_SPRITE_CATALOG,
  MOCHI_SPRITE_ORDER,
  type MoChiSpriteMeta,
  type MoChiPetMood,
} from '../../../features/mochi/mochiPoseCatalog';
import {
  MOCHI_SPRITES,
  type MoChiSpriteVariant,
} from '../../../assets/mascot/mochi/mochiAssets';

const P = {
  primary: '#4be277',
  surface: '#05070d',
  surfaceLow: '#0f1625',
  surfaceHigh: '#252b3f',
  card: '#1a1f2f',
  text: '#dee1f7',
  muted: '#9aa7bd',
  border: 'rgba(255,255,255,0.08)',
};

type PoseFilter = 'all' | MoChiSpriteVariant;

const FILTERS: { key: PoseFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'full', label: 'Toàn thân' },
  { key: 'notice', label: 'Thông báo' },
  { key: 'face', label: 'Đầu' },
];

const MOOD_LABEL: Record<MoChiPetMood, string> = {
  idle: 'Nghỉ',
  happy: 'Vui',
  hungry: 'Bữa ăn',
  thirsty: 'Nước',
  thinking: 'Suy nghĩ',
  confused: 'Cần kiểm tra',
  concerned: 'Cẩn trọng',
  error: 'Lỗi',
  celebrating: 'Ăn mừng',
  reporting: 'Báo cáo',
};

const POSE_EXPLANATION_BY_MOOD: Record<MoChiPetMood, string> = {
  idle: 'Dùng khi app ở trạng thái bình tĩnh, không có việc gấp.',
  happy: 'Dùng để khen hoặc xác nhận thao tác đã ổn.',
  hungry: 'Dùng cho ghi bữa, chọn món hoặc nhắc nhật ký ăn uống.',
  thirsty: 'Dùng cho nhắc nước và các mục tiêu uống nước.',
  thinking: 'Dùng khi MoChi đang phân tích, cân nhắc hoặc cần người dùng xác nhận.',
  confused: 'Dùng khi kết quả chưa chắc và cần hỏi lại nhẹ nhàng.',
  concerned: 'Dùng cho cảnh báo mềm, tránh gây áp lực.',
  error: 'Dùng khi có lỗi hoặc cần xin lỗi người dùng.',
  celebrating: 'Dùng cho streak, huy hiệu và khoảnh khắc ăn mừng.',
  reporting: 'Dùng cho báo cáo, thống kê và tổng kết tiến độ.',
};

const getPoseExplanation = (pose: MoChiSpriteMeta): string =>
  POSE_EXPLANATION_BY_MOOD[pose.mood] ?? 'Dùng để MoChi phản hồi theo ngữ cảnh hiện tại.';


const MoChiPoseGalleryScreen = (): React.ReactElement => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PoseFilter>('all');

  const poses = useMemo(
    () =>
      MOCHI_SPRITE_ORDER.map((key) => MOCHI_SPRITE_CATALOG[key]).filter((pose) =>
        filter === 'all' ? true : pose.variant === filter,
      ),
    [filter],
  );

  const counts = useMemo(
    () => ({
      all: MOCHI_SPRITE_ORDER.length,
      full: MOCHI_SPRITE_ORDER.filter((key) => MOCHI_SPRITE_CATALOG[key].variant === 'full')
        .length,
      notice: MOCHI_SPRITE_ORDER.filter((key) => MOCHI_SPRITE_CATALOG[key].variant === 'notice')
        .length,
      face: MOCHI_SPRITE_ORDER.filter((key) => MOCHI_SPRITE_CATALOG[key].variant === 'face')
        .length,
    }),
    [],
  );

  const renderPose = ({ item: pose }: { item: MoChiSpriteMeta }) => (
    <View style={S.poseCard}>
      <View style={S.spriteStage}>
        <Image source={MOCHI_SPRITES[pose.key]} resizeMode="contain" style={S.spriteImage} />
      </View>
      <ThemedText style={S.poseLabel} numberOfLines={1}>
        {pose.labelVi}
      </ThemedText>
      <ThemedText style={S.poseKey} numberOfLines={1}>
        {pose.key}
      </ThemedText>
      <ThemedText style={S.poseExplanation} numberOfLines={2}>
        {getPoseExplanation(pose)}
      </ThemedText>
      <View style={S.metaRow}>
        <ThemedText style={S.metaText}>{pose.variant}</ThemedText>
        <ThemedText style={S.metaText}>{MOOD_LABEL[pose.mood]}</ThemedText>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={S.filterRow}>
      {FILTERS.map((item) => {
        const selected = filter === item.key;
        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              S.filterChip,
              selected && S.filterChipActive,
              pressed && S.pressed,
            ]}
            onPress={() => setFilter(item.key)}
            accessibilityRole="button"
          >
            <ThemedText style={[S.filterText, selected && S.filterTextActive]}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <Pressable
          style={({ pressed }) => [S.headerButton, pressed && S.pressed]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={24} color={P.text} />
        </Pressable>
        <View style={S.headerTitleWrap}>
          <ThemedText style={S.headerTitle}>Phòng MoChi</ThemedText>
          <ThemedText style={S.headerSubtitle}>
            {counts.all} pose · full {counts.full} · notice {counts.notice} · face {counts.face}
          </ThemedText>
        </View>
        <View style={S.headerButton} />
      </View>

      <FlatList
        key={filter}
        data={poses}
        keyExtractor={(pose) => pose.key}
        numColumns={2}
        renderItem={renderPose}
        ListHeaderComponent={renderFilters}
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 28 }]}
        columnWrapperStyle={S.gridRow}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
};

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: P.text,
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  headerSubtitle: {
    marginTop: 3,
    color: P.muted,
    fontSize: 11,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(75,226,119,0.16)',
    borderColor: 'rgba(75,226,119,0.5)',
  },
  filterText: {
    color: P.muted,
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  filterTextActive: {
    color: P.primary,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  poseCard: {
    width: '48.5%',
    minHeight: 216,
    borderRadius: 14,
    padding: 10,
    backgroundColor: P.card,
    borderWidth: 1,
    borderColor: P.border,
  },
  spriteStage: {
    height: 102,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surfaceHigh,
    marginBottom: 9,
  },
  spriteImage: {
    width: 94,
    height: 94,
  },
  poseLabel: {
    color: P.text,
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  poseKey: {
    marginTop: 2,
    color: P.muted,
    fontSize: 11,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  poseExplanation: {
    marginTop: 6,
    minHeight: 32,
    color: P.muted,
    fontSize: 10.5,
    fontFamily: 'BeVietnamPro_600SemiBold',
    lineHeight: 16,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(226,232,240,0.12)',
    color: P.muted,
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  pressed: {
    opacity: 0.72,
  },
});

export default MoChiPoseGalleryScreen;
