import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import MoChiSprite from './MoChiSprite';
import { getMoChiEventState, type MoChiPetEventType } from './mochiPetEngine';
import { getMoChiExperience } from './mochiExperienceCatalog';
import { useMoChiVisibleTargetsStore } from './mochiVisibleTargets';
import { useMoChiSurfacePresence } from './useMoChiSurfacePresence';

type MoChiInlineNoticeProps = {
  mochiEvent: MoChiPetEventType;
  routeName?: string | null;
  title?: string;
  message?: string;
  ctaLabel?: string;
  compact?: boolean;
  hideSprite?: boolean;
  tone?: 'standard' | 'calm';
  registerSurface?: boolean;
};

const INLINE_NOTICE_BLOCKS = ['topOverlay'] as const;

const MoChiInlineNotice = ({
  mochiEvent,
  routeName,
  title,
  message,
  ctaLabel,
  compact = false,
  hideSprite = false,
  tone = 'standard',
  registerSurface = true,
}: MoChiInlineNoticeProps): React.ReactElement => {
  const EN = useEN();
  const state = getMoChiEventState(mochiEvent);
  const experience = getMoChiExperience(mochiEvent);
  const isCalm = tone === 'calm';
  const spriteSize = isCalm ? 70 : compact ? 80 : 102;
  const setVisibleTarget = useMoChiVisibleTargetsStore((store) => store.setVisibleTarget);
  const shouldRegisterSurface = registerSurface && Boolean(routeName) && !hideSprite;

  useMoChiSurfacePresence({
    id: `inline:${routeName ?? 'global'}:${mochiEvent}`,
    surface: 'inlineNotice',
    routeName,
    eventType: mochiEvent,
    priority: 60,
    blocks: INLINE_NOTICE_BLOCKS,
    enabled: shouldRegisterSurface,
  });

  useEffect(() => {
    if (!shouldRegisterSurface || !routeName) {
      return undefined;
    }

    setVisibleTarget(routeName, mochiEvent, true);
    return () => setVisibleTarget(routeName, mochiEvent, false);
  }, [mochiEvent, routeName, setVisibleTarget, shouldRegisterSurface]);

  return (
    <View
      style={[
        styles.root,
        compact && styles.compact,
        isCalm && styles.calm,
        { backgroundColor: EN.glassBg, borderColor: EN.outlineVariant },
      ]}
    >
      {!hideSprite && (
        <MoChiSprite poseKey={state.poseKey} size={spriteSize} animated={!compact} />
      )}
      <View style={styles.copy}>
        <ThemedText style={[styles.title, isCalm && styles.titleCalm, { color: EN.primary }]}>
          {title ?? experience.title}
        </ThemedText>
        <ThemedText style={[styles.dialogue, isCalm && styles.dialogueCalm, { color: EN.onSurface }]}>
          {message ?? state.dialogue}
        </ThemedText>
        {(ctaLabel ?? experience.ctaLabel) && (
          <ThemedText style={[styles.cta, isCalm && styles.ctaCalm, { color: EN.primary }]}>
            {ctaLabel ?? experience.ctaLabel}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.24)',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compact: {
    paddingVertical: 8,
  },
  calm: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#86efac',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  titleCalm: {
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'none',
  },
  dialogue: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: '#dee1f7',
    lineHeight: 18,
  },
  dialogueCalm: {
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#4BE277',
    lineHeight: 16,
  },
  ctaCalm: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default MoChiInlineNotice;
