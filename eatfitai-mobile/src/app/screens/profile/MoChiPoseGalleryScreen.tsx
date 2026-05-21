import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { ThemedText } from '../../../components/ThemedText';
import MeshBackground from '../../../components/ui/MeshBackground';
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
  { key: 'face', label: 'Đầu' },
  { key: 'notice', label: 'Thông báo' },
];

const MOOD_LABEL: Record<MoChiPetMood, string> = {
  idle: 'Nghỉ ngơi',
  happy: 'Vui vẻ',
  hungry: 'Nhắc ăn',
  thirsty: 'Nhắc nước',
  thinking: 'Đang nghĩ',
  confused: 'Băn khoăn',
  concerned: 'Nhắc nhở',
  error: 'Sự cố',
  celebrating: 'Ăn mừng',
  reporting: 'Báo cáo',
};

const VARIANT_LABEL: Record<MoChiSpriteVariant, string> = {
  full: 'Toàn thân',
  notice: 'Thông báo',
  face: 'Gương mặt',
};

const POSE_EXPLANATION_BY_MOOD: Record<MoChiPetMood, string> = {
  idle: 'MoChi đang thư thả nghỉ ngơi và sẵn sàng đồng hành cùng bạn bất cứ lúc nào.',
  happy: 'MoChi siêu vui và phấn khích khi bạn hoàn thành xuất sắc mục tiêu trong ngày!',
  hungry: 'Đến giờ ăn rồi nè, chúng mình cùng ghi nhận nhật ký ăn uống thôi bạn ơi.',
  thirsty: 'MoChi nhắc bạn nhớ uống đủ nước để cơ thể luôn tràn đầy năng lượng nha!',
  thinking: 'MoChi đang chăm chú suy nghĩ để đưa ra những gợi ý sức khỏe tốt nhất cho bạn.',
  confused: 'Hình như có gì đó chưa rõ, bạn giúp MoChi kiểm tra và làm rõ lại một xíu nhé.',
  concerned: 'MoChi hơi lo lắng một chút, bạn nhớ chú ý giữ gìn và chăm sóc sức khỏe nha!',
  error: 'Ui da, đã xảy ra sự cố rồi! MoChi vô cùng xin lỗi vì sự bất tiện này.',
  celebrating: 'Tuyệt vời quá đi! Hãy cùng MoChi ăn mừng thói quen tốt và thành tích mới nào!',
  reporting: 'Để MoChi tổng hợp lại và báo cáo tiến trình thay đổi tích cực của bạn nhé!',
};

const getPoseExplanation = (pose: MoChiSpriteMeta): string =>
  POSE_EXPLANATION_BY_MOOD[pose.mood] ?? 'MoChi luôn bên cạnh để hỗ trợ và chia sẻ cùng bạn.';


const MoChiPoseGalleryScreen = (): React.ReactElement => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PoseFilter>('all');
  const [selectedPose, setSelectedPose] = useState<MoChiSpriteMeta | null>(null);

  const poses = useMemo(
    () =>
      MOCHI_SPRITE_ORDER.map((key) => MOCHI_SPRITE_CATALOG[key]).filter((pose) =>
        filter === 'all' ? true : pose.variant === filter,
      ),
    [filter],
  );

  const totalCount = useMemo(() => MOCHI_SPRITE_ORDER.length, []);

  const renderPose = ({ item: pose }: { item: MoChiSpriteMeta }) => (
    <Pressable
      style={({ pressed }) => [S.poseCard, pressed && S.pressed]}
      onPress={() => setSelectedPose(pose)}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết biểu cảm ${pose.labelVi}`}
    >
      <View style={S.spriteStage}>
        <Image source={MOCHI_SPRITES[pose.key]} resizeMode="contain" style={S.spriteImage} />
      </View>
      <ThemedText style={S.poseLabel} numberOfLines={1}>
        {pose.labelVi}
      </ThemedText>
      <ThemedText style={S.poseExplanation} numberOfLines={2}>
        {getPoseExplanation(pose)}
      </ThemedText>
      <View style={S.metaRow}>
        <ThemedText style={S.metaText}>{VARIANT_LABEL[pose.variant]}</ThemedText>
        <ThemedText style={S.metaText}>{MOOD_LABEL[pose.mood]}</ThemedText>
      </View>
    </Pressable>
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

  const renderDetailModal = () => {
    if (!selectedPose) return null;

    return (
      <Modal
        visible={!!selectedPose}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPose(null)}
      >
        <View style={S.modalOverlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 7, 13, 0.82)' }]} />
          )}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPose(null)} />

          <View style={S.modalContent}>
            <View style={S.modalSpriteStage}>
              <Image
                source={MOCHI_SPRITES[selectedPose.key]}
                resizeMode="contain"
                style={S.modalSpriteImage}
              />
            </View>

            <ThemedText style={S.modalPoseLabel}>{selectedPose.labelVi}</ThemedText>

            <View style={S.modalMetaContainer}>
              <View style={S.modalMetaItem}>
                <ThemedText style={S.modalMetaLabel}>Phân loại</ThemedText>
                <ThemedText style={S.modalMetaValue}>{VARIANT_LABEL[selectedPose.variant]}</ThemedText>
              </View>
              <View style={S.modalMetaItem}>
                <ThemedText style={S.modalMetaLabel}>Trạng thái</ThemedText>
                <ThemedText style={S.modalMetaValue}>{MOOD_LABEL[selectedPose.mood]}</ThemedText>
              </View>
            </View>

            <View style={S.modalExplanationContainer}>
              <ThemedText style={S.modalExplanationTitle}>Ý nghĩa biểu cảm</ThemedText>
              <ThemedText style={S.modalExplanationText}>
                {getPoseExplanation(selectedPose)}
              </ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [S.modalActionButton, pressed && S.pressed]}
              onPress={() => setSelectedPose(null)}
            >
              <ThemedText style={S.modalActionButtonText}>Đóng</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <MeshBackground />
      <View style={S.header}>
        <Pressable
          style={({ pressed }) => [S.headerButton, pressed && S.pressed]}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={P.text} />
        </Pressable>
        <View style={S.headerTitleWrap}>
          <ThemedText style={S.headerTitle}>Phòng MoChi</ThemedText>
          <ThemedText style={S.headerSubtitle}>
            Bộ sưu tập {totalCount} biểu cảm đáng yêu của MoChi
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
      {renderDetailModal()}
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
    backgroundColor: 'transparent',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: P.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75,226,119,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
    position: 'relative',
  },
  modalSpriteStage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: P.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  modalSpriteImage: {
    width: 120,
    height: 120,
  },
  modalPoseLabel: {
    fontSize: 20,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMetaContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  modalMetaItem: {
    flex: 1,
    backgroundColor: P.surfaceLow,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.border,
  },
  modalMetaLabel: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.muted,
    marginBottom: 4,
  },
  modalMetaValue: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
  },
  modalExplanationContainer: {
    width: '100%',
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: P.border,
  },
  modalExplanationTitle: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalExplanationText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.muted,
    lineHeight: 20,
  },
  modalActionButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionButtonText: {
    fontSize: 15,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.surface,
  },
});

export default MoChiPoseGalleryScreen;
