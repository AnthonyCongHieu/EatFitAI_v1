import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../components/ThemedText';
import { navigateRoot } from '../../app/navigation/navigationRef';
import { useEN } from '../../theme/emeraldNebula';
import MoChiSprite from './MoChiSprite';
import { getMoChiExperience } from './mochiExperienceCatalog';
import { useMoChiNudgeContext, type MoChiNudgeCandidate } from './useMoChiNudgeContext';
import { useMoChiSurfaceDecision } from './useMoChiSurfaceDecision';
import type { MoChiSurfaceDecision } from './mochiNudgePolicy';

type MoChiOverlayHostProps = {
  currentRouteName?: string | null;
};

type ActiveOverlay = {
  candidate: MoChiNudgeCandidate;
  decision: MoChiSurfaceDecision;
};

const getActionTarget = (candidate: MoChiNudgeCandidate): (() => void) => {
  if (candidate.eventType === 'water_reminder') {
    return () => {
      navigateRoot('AppTabs', {
        screen: 'HomeTab',
        params: {
          source: 'water-quick-action',
          focusWaterRequestId: Date.now(),
        },
      });
    };
  }

  return () => {
    navigateRoot('FoodSearch', {
      autoFocus: true,
      showQuickSuggestions: true,
      returnToDiaryOnSave: true,
    });
  };
};

const MoChiOverlayHost = ({
  currentRouteName,
}: MoChiOverlayHostProps): React.ReactElement | null => {
  const EN = useEN();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const candidate = useMoChiNudgeContext(currentRouteName);
  const { decision, recordDecision } = useMoChiSurfaceDecision(candidate);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null);

  useEffect(() => {
    if (!candidate) {
      setActiveOverlay(null);
      return;
    }

    if (activeOverlay?.decision.cadenceKey === decision?.cadenceKey) {
      return;
    }

    if (!decision?.shouldShow || decision.surface !== 'overlay') {
      return;
    }

    setActiveOverlay({ candidate, decision });
    recordDecision(decision, 'shown');
  }, [activeOverlay?.decision.cadenceKey, candidate, decision, recordDecision]);

  const closeOverlay = useCallback(() => {
    if (!activeOverlay) {
      return;
    }

    recordDecision(activeOverlay.decision, 'dismissed');
    setActiveOverlay(null);
  }, [activeOverlay, recordDecision]);

  const actOnOverlay = useCallback(() => {
    if (!activeOverlay) {
      return;
    }

    recordDecision(activeOverlay.decision, 'acted');
    setActiveOverlay(null);
    getActionTarget(activeOverlay.candidate)();
  }, [activeOverlay, recordDecision]);

  useEffect(() => {
    if (!activeOverlay?.decision.autoHideMs) {
      return;
    }

    const timer = setTimeout(closeOverlay, activeOverlay.decision.autoHideMs);
    return () => clearTimeout(timer);
  }, [activeOverlay?.decision.autoHideMs, closeOverlay]);

  if (!activeOverlay) {
    return null;
  }

  const experience = getMoChiExperience(activeOverlay.candidate.eventType);
  const stageWidth = Math.min(width - 24, 386);
  const bottomOffset = Math.max(insets.bottom, 10) + 96;

  return (
    <View pointerEvents="box-none" style={styles.companionOverlay}>
      <Animated.View
        accessibilityLabel="MoChi đang gợi ý"
        entering={FadeInDown.duration(180)}
        exiting={FadeOutUp.duration(140)}
        pointerEvents="box-none"
        style={[
          styles.companionStage,
          {
            bottom: bottomOffset,
            width: stageWidth,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeOverlay.candidate.message}
          onPress={actOnOverlay}
          onLongPress={closeOverlay}
          style={styles.companionSpriteHitbox}
        >
          <MoChiSprite
            poseKey={experience.poseKey}
            size={88}
            variant="full"
            animated
            testID="mochi-overlay-sprite"
          />
        </Pressable>

        <View
          style={[
            styles.companionSpeech,
            {
              backgroundColor: EN.glassBg,
              borderColor: EN.outlineVariant,
              shadowColor: EN.primary,
            },
          ]}
        >
          <View style={[styles.companionSpeechTail, { borderRightColor: EN.glassBg }]} />
          <View style={styles.companionHeader}>
            <ThemedText style={[styles.companionEyebrow, { color: EN.primary }]} numberOfLines={1}>
              {activeOverlay.candidate.title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ẩn gợi ý MoChi"
              hitSlop={8}
              onPress={closeOverlay}
              style={styles.companionDismiss}
            >
              <Ionicons name="close" size={15} color={EN.textMuted} />
            </Pressable>
          </View>
          <ThemedText style={[styles.companionMessage, { color: EN.onSurface }]} numberOfLines={2}>
            {activeOverlay.candidate.message}
          </ThemedText>
          {activeOverlay.candidate.ctaLabel && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={activeOverlay.candidate.ctaLabel}
              onPress={actOnOverlay}
              style={styles.companionCtaHitbox}
            >
              <ThemedText style={[styles.companionCta, { color: EN.primary }]} numberOfLines={1}>
                {activeOverlay.candidate.ctaLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  companionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1400,
    elevation: 30,
  },
  companionStage: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  companionSpriteHitbox: {
    width: 86,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  companionSpeech: {
    flex: 1,
    minWidth: 0,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 12,
  },
  companionSpeechTail: {
    position: 'absolute',
    left: -8,
    bottom: 22,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  companionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companionEyebrow: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  companionDismiss: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionMessage: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  companionCtaHitbox: {
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  companionCta: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
});

export default MoChiOverlayHost;
