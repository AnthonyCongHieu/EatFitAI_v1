import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import MoChiInlineNotice from './MoChiInlineNotice';
import type { MoChiPetEventType } from './mochiPetEngine';

type MoChiScreenStateVariant = 'screen' | 'inline' | 'compact';

type MoChiScreenStateProps = {
  mochiEvent: MoChiPetEventType;
  title: string;
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
  showSpinner?: boolean;
  variant?: MoChiScreenStateVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const MoChiScreenState = ({
  mochiEvent,
  title,
  message,
  ctaLabel,
  onPress,
  showSpinner = false,
  variant = 'inline',
  style,
  testID,
}: MoChiScreenStateProps): React.ReactElement => {
  const EN = useEN();
  const compact = variant !== 'screen';
  const content = (
    <View
      style={[
        styles.root,
        variant === 'screen' && styles.screen,
        variant === 'compact' && styles.compact,
        style,
      ]}
      testID={testID}
    >
      <MoChiInlineNotice
        mochiEvent={mochiEvent}
        title={title}
        message={message}
        ctaLabel={ctaLabel}
        compact={compact}
      />
      {showSpinner && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={EN.primary} />
          <ThemedText style={[styles.loadingText, { color: EN.textMuted }]}>
            MoChi đang xử lý...
          </ThemedText>
        </View>
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 10,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  compact: {
    gap: 8,
  },
  loadingRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MoChiScreenState;
