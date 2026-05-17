import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ToastConfig, BaseToastProps } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import MoChiSprite from '../features/mochi/MoChiSprite';
import type { MoChiPoseKey } from '../assets/mascot/mochi/mochiAssets';

const C = {
  primary: '#4be277',
  surfaceHigh: 'rgba(37, 41, 58, 0.95)',
  outline: 'rgba(255,255,255,0.12)',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

type MoChiToastTone = 'success' | 'error' | 'info' | 'warning' | 'achievement';

const TONE_META: Record<
  MoChiToastTone,
  {
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    poseKey: MoChiPoseKey;
  }
> = {
  success: {
    iconName: 'checkmark',
    iconColor: C.primary,
    poseKey: 'sparkleSuccess',
  },
  error: {
    iconName: 'alert-circle',
    iconColor: C.danger,
    poseKey: 'softSorryFace',
  },
  info: {
    iconName: 'information-circle',
    iconColor: C.info,
    poseKey: 'faceThinking',
  },
  warning: {
    iconName: 'warning',
    iconColor: C.warning,
    poseKey: 'nutritionCoachNotice',
  },
  achievement: {
    iconName: 'trophy',
    iconColor: '#fbbf24',
    poseKey: 'celebrate',
  },
};

const CustomToast = ({
  text1,
  text2,
  props,
  tone,
}: BaseToastProps & {
  tone: MoChiToastTone;
  props?: {
    mochiPose?: MoChiPoseKey;
    mochiLabel?: string;
  };
}) => {
  const meta = TONE_META[tone];
  const poseKey = props?.mochiPose ?? meta.poseKey;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.iconColor}22` }]}>
        <Ionicons name={meta.iconName} size={20} color={meta.iconColor} />
      </View>

      <View style={styles.textWrap}>
        {props?.mochiLabel ? (
          <ThemedText style={styles.eyebrow}>{props.mochiLabel}</ThemedText>
        ) : null}
        {text1 ? (
          <ThemedText weight="700" numberOfLines={2} style={styles.title}>
            {text1}
          </ThemedText>
        ) : null}
        {text2 ? (
          <ThemedText color="textSecondary" numberOfLines={2} style={styles.body}>
            {text2}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.mochiWrap}>
        <MoChiSprite poseKey={poseKey} size={48} variant="notice" animated={false} />
      </View>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <CustomToast {...props} tone="success" />,
  error: (props) => <CustomToast {...props} tone="error" />,
  info: (props) => <CustomToast {...props} tone="info" />,
  warning: (props) => <CustomToast {...props} tone="warning" />,
  achievement: (props) => <CustomToast {...props} tone="achievement" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    width: '92%',
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  mochiWrap: {
    width: 54,
    height: 54,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
