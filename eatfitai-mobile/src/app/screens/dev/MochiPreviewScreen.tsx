import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import MascotCharacter, {
  MOCHI_STATE_ASSETS,
  type MascotState,
} from '../../../components/MascotCharacter';
import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import {
  MOCHI_ASSETS,
  MOCHI_ASSET_METADATA,
  type MochiAssetKey,
} from '../../../assets/mascot/mochi/mochiAssets';
import { EN } from '../../../theme/emeraldNebula';
import { TEST_IDS } from '../../../testing/testIds';

type MochiPreviewState = {
  state: MascotState;
  label: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const MOCHI_PREVIEW_STATES: MochiPreviewState[] = [
  {
    state: 'idle',
    label: 'Đứng yên',
    caption: 'Idle nhẹ, dùng cho FAB hoặc trạng thái chờ.',
    icon: 'radio-button-on',
  },
  {
    state: 'wave',
    label: 'Chào bạn',
    caption: 'Lắc thân và tay từ pose hello.',
    icon: 'hand-left-outline',
  },
  {
    state: 'thinking',
    label: 'Suy nghĩ',
    caption: 'Nghiêng đầu chậm khi phân vân calo.',
    icon: 'bulb-outline',
  },
  {
    state: 'pointing',
    label: 'Quét món',
    caption: 'Nhịp scan dùng pose cầm điện thoại và món ăn.',
    icon: 'scan-outline',
  },
  {
    state: 'success',
    label: 'Thành công',
    caption: 'Bounce ăn mừng khi đạt mục tiêu hoặc streak.',
    icon: 'trophy-outline',
  },
  {
    state: 'reminder',
    label: 'Nhắc nhở',
    caption: 'Đung đưa mạnh hơn để gọi chú ý trên mobile.',
    icon: 'notifications-outline',
  },
  {
    state: 'error',
    label: 'Ngạc nhiên',
    caption: 'Shake ngắn cho cảnh món nhiều calo hoặc lỗi nhẹ.',
    icon: 'alert-circle-outline',
  },
];

const MOCHI_POSES = Object.keys(MOCHI_ASSETS) as MochiAssetKey[];

const MochiPreviewScreen = (): React.ReactElement => {
  const { width } = useWindowDimensions();
  const [selectedState, setSelectedState] = useState<MascotState>('idle');

  const activePreview = useMemo(
    () =>
      MOCHI_PREVIEW_STATES.find((item) => item.state === selectedState) ??
      MOCHI_PREVIEW_STATES[0]!,
    [selectedState],
  );

  const activeAssetKey = MOCHI_STATE_ASSETS[selectedState];
  const stageSize = Math.min(Math.max(width * 0.44, 150), 220);
  const stateButtonWidth = Math.max((width - 72) / 2, 136);
  const poseTileWidth = Math.max((width - 72) / 3, 88);

  return (
    <SubScreenLayout
      title="Mochi preview"
      subtitle="source-sheet crop / mobile motion test"
      testID={TEST_IDS.profile.mochiPreviewScreen}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInDown.duration(260)} style={styles.stageCard}>
        <View style={styles.stageGlow} />
        <View style={styles.mascotStage}>
          <MascotCharacter
            state={selectedState}
            hasReminder={selectedState === 'reminder'}
            size={stageSize}
            testID="mochi-preview-live-mascot"
          />
        </View>

        <View style={styles.stateSummary}>
          <View style={styles.stateIcon}>
            <Ionicons name={activePreview.icon} size={19} color={EN.bg} />
          </View>
          <View style={styles.stateCopy}>
            <ThemedText style={styles.stateTitle}>{activePreview.label}</ThemedText>
            <ThemedText style={styles.stateCaption}>{activePreview.caption}</ThemedText>
          </View>
        </View>

        <View style={styles.sourcePill}>
          <ThemedText style={styles.sourceText}>
            {MOCHI_ASSET_METADATA[activeAssetKey].fileName}
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Motion states</ThemedText>
        <ThemedText style={styles.sectionMeta}>{MOCHI_PREVIEW_STATES.length} trạng thái</ThemedText>
      </View>

      <View style={styles.stateGrid}>
        {MOCHI_PREVIEW_STATES.map((item) => {
          const isSelected = item.state === selectedState;

          return (
            <Pressable
              key={item.state}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedState(item.state)}
              style={({ pressed }) => [
                styles.stateButton,
                { width: stateButtonWidth },
                isSelected && styles.stateButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isSelected ? EN.bg : EN.primary}
              />
              <ThemedText
                style={[
                  styles.stateButtonText,
                  isSelected && styles.stateButtonTextActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>24 source poses</ThemedText>
        <ThemedText style={styles.sectionMeta}>crop từ sheet gốc</ThemedText>
      </View>

      <View style={styles.poseGrid}>
        {MOCHI_POSES.map((poseKey) => {
          const isMappedPose = poseKey === activeAssetKey;
          const meta = MOCHI_ASSET_METADATA[poseKey];

          return (
            <Pressable
              key={poseKey}
              accessibilityRole="imagebutton"
              onPress={() => {
                const mappedState = MOCHI_PREVIEW_STATES.find(
                  (item) => MOCHI_STATE_ASSETS[item.state] === poseKey,
                );
                if (mappedState) {
                  setSelectedState(mappedState.state);
                }
              }}
              style={({ pressed }) => [
                styles.poseTile,
                { width: poseTileWidth },
                isMappedPose && styles.poseTileActive,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={MOCHI_ASSETS[poseKey]}
                contentFit="contain"
                cachePolicy="memory-disk"
                style={styles.poseImage}
              />
              <ThemedText style={styles.poseLabel} numberOfLines={1}>
                {meta.fileName.replace('.png', '').replace(/^\d+_/, '')}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </SubScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  stageCard: {
    minHeight: 300,
    borderRadius: 22,
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.24)',
    overflow: 'hidden',
    padding: 18,
  },
  stageGlow: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: -80,
    height: 210,
    backgroundColor: 'rgba(245, 194, 128, 0.18)',
  },
  mascotStage: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 246, 231, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 231, 0.1)',
    padding: 12,
  },
  stateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5C280',
  },
  stateCopy: {
    flex: 1,
    gap: 3,
  },
  stateTitle: {
    color: '#FFF6E7',
    fontSize: 16,
    fontWeight: '800',
  },
  stateCaption: {
    color: '#D9C7AE',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 194, 128, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.24)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sourceText: {
    color: '#F5C280',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: EN.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionMeta: {
    color: EN.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stateButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: EN.surfaceLow,
    borderWidth: 1,
    borderColor: EN.outline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
  },
  stateButtonActive: {
    backgroundColor: '#F5C280',
    borderColor: '#FFE0AB',
  },
  stateButtonText: {
    flex: 1,
    color: EN.onSurface,
    fontSize: 13,
    fontWeight: '800',
  },
  stateButtonTextActive: {
    color: EN.bg,
  },
  poseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  poseTile: {
    aspectRatio: 0.86,
    borderRadius: 16,
    backgroundColor: '#FFF6E7',
    borderWidth: 1,
    borderColor: 'rgba(123, 71, 31, 0.22)',
    overflow: 'hidden',
    padding: 8,
  },
  poseTileActive: {
    borderWidth: 2,
    borderColor: '#F5C280',
  },
  poseImage: {
    flex: 1,
    width: '100%',
  },
  poseLabel: {
    color: '#4B2D17',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});

export default MochiPreviewScreen;
