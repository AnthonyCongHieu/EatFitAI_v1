import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import MoChiSprite from './MoChiSprite';
import { getMoChiEventState, type MoChiPetEventType } from './mochiPetEngine';
import { getMoChiExperience } from './mochiExperienceCatalog';

type MoChiInlineNoticeProps = {
  mochiEvent: MoChiPetEventType;
  title?: string;
  message?: string;
  ctaLabel?: string;
  compact?: boolean;
  hideSprite?: boolean;
};

const MoChiInlineNotice = ({
  mochiEvent,
  title,
  message,
  ctaLabel,
  compact = false,
  hideSprite = false,
}: MoChiInlineNoticeProps): React.ReactElement => {
  const EN = useEN();
  const state = getMoChiEventState(mochiEvent);
  const experience = getMoChiExperience(mochiEvent);
  const spriteSize = compact ? 80 : 102;

  return (
    <View
      style={[
        styles.root,
        compact && styles.compact,
        { backgroundColor: EN.glassBg, borderColor: EN.outlineVariant },
      ]}
    >
      {!hideSprite && (
        <MoChiSprite poseKey={state.poseKey} size={spriteSize} animated={!compact} />
      )}
      <View style={styles.copy}>
        <ThemedText style={[styles.title, { color: EN.primary }]}>{title ?? experience.title}</ThemedText>
        <ThemedText style={[styles.dialogue, { color: EN.onSurface }]}>{message ?? state.dialogue}</ThemedText>
        {(ctaLabel ?? experience.ctaLabel) && (
          <ThemedText style={[styles.cta, { color: EN.primary }]}>{ctaLabel ?? experience.ctaLabel}</ThemedText>
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
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#86efac',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dialogue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dee1f7',
    lineHeight: 18,
  },
  cta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4BE277',
    lineHeight: 16,
  },
});

export default MoChiInlineNotice;
