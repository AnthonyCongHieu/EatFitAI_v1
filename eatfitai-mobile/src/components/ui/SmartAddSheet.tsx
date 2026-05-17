import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../app/types';
import { TEST_IDS } from '../../testing/testIds';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QuickAction = {
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID?: string;
  position: 'upperLeft' | 'upperRight' | 'lowerLeft' | 'lowerRight';
  onPress: () => void;
};

interface SmartAddSheetProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

const ACTION_DELAY_MS = 180;
const DESIGN_TOKENS = {
  overlay: 'rgba(5, 10, 22, 0.32)',
  glass: 'rgba(13, 23, 39, 0.92)',
  glassBorder: 'rgba(75, 226, 119, 0.16)',
  actionTint: 'rgba(75, 226, 119, 0.10)',
  actionBorder: 'rgba(75, 226, 119, 0.26)',
  primary: '#4be277',
  accent: '#7dd3fc',
  label: '#eef2ff',
  meta: '#9fb0c8',
  radiusFull: 999,
};

export const SmartAddSheet: React.FC<SmartAddSheetProps> = ({ visible, onClose, testID }) => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const navigateAfterClose = (
    route: keyof RootStackParamList,
    params?: RootStackParamList[keyof RootStackParamList],
  ) => {
    onClose();
    setTimeout(() => {
      (navigation as any).navigate(route, params);
    }, ACTION_DELAY_MS);
  };

  const actions: QuickAction[] = [
    {
      title: 'QUÉT THỨC ĂN',
      meta: 'Camera AI',
      icon: 'camera',
      position: 'upperLeft',
      testID: TEST_IDS.home.quickAddScanButton,
      onPress: () => navigateAfterClose('AiCamera'),
    },
    {
      title: 'THÊM BỮA',
      meta: 'Tìm món',
      icon: 'restaurant',
      position: 'upperRight',
      testID: TEST_IDS.home.quickAddSearchButton,
      onPress: () =>
        navigateAfterClose('FoodSearch', {
          autoFocus: true,
          showQuickSuggestions: true,
          returnToDiaryOnSave: true,
        }),
    },
    {
      title: 'CÔNG THỨC',
      meta: 'Gợi ý món',
      icon: 'book',
      position: 'lowerRight',
      onPress: () => navigateAfterClose('RecipeSuggestions', {}),
    },
    {
      title: 'LƯỢNG NƯỚC',
      meta: 'Về thẻ nước',
      icon: 'water',
      position: 'lowerLeft',
      onPress: () =>
        navigateAfterClose('AppTabs', {
          screen: 'HomeTab',
          params: {
            focusWaterRequestId: Date.now(),
            source: 'water-quick-action',
          },
        }),
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng thao tác nhanh"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(190)}
          exiting={FadeOut.duration(120)}
          testID={testID}
          style={[
            styles.radialMenu,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.orbitScrim} pointerEvents="none" />
          {actions.map((action) => (
            <Pressable
              key={action.title}
              testID={action.testID}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.radialAction,
                styles[action.position],
                pressed && styles.radialActionPressed,
              ]}
            >
              <View style={styles.radialIconGlass}>
                <Ionicons name={action.icon} size={25} color={theme.colors.primary} />
              </View>
              <ThemedText style={styles.radialActionLabel}>{action.title}</ThemedText>
              <ThemedText style={styles.radialActionMeta}>{action.meta}</ThemedText>
            </Pressable>
          ))}
          <Pressable
            testID={TEST_IDS.home.quickAccessDiaryButton}
            accessibilityRole="button"
            accessibilityLabel="Mở nhật ký hôm nay"
            onPress={() => navigateAfterClose('MealDiary')}
            style={({ pressed }) => [
              styles.diaryShortcut,
              pressed && styles.radialActionPressed,
            ]}
          >
            <View style={styles.diaryShortcutDot} />
            <ThemedText style={styles.diaryShortcutText}>NHẬT KÝ HÔM NAY</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DESIGN_TOKENS.overlay,
  },
  radialMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitScrim: {
    position: 'absolute',
    width: 388,
    maxWidth: '92%',
    height: 284,
    borderRadius: 34,
    backgroundColor: DESIGN_TOKENS.glass,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.glassBorder,
    shadowColor: DESIGN_TOKENS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 10,
  },
  radialAction: {
    position: 'absolute',
    alignItems: 'center',
    width: 124,
    minHeight: 92,
    gap: 5,
  },
  radialActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  upperLeft: {
    left: 54,
    top: '50%',
    marginTop: -132,
  },
  upperRight: {
    right: 54,
    top: '50%',
    marginTop: -132,
  },
  lowerLeft: {
    left: 54,
    top: '50%',
    marginTop: 8,
  },
  lowerRight: {
    right: 54,
    top: '50%',
    marginTop: 8,
  },
  radialIconGlass: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.actionTint,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.actionBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  radialActionLabel: {
    color: DESIGN_TOKENS.label,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  radialActionMeta: {
    color: DESIGN_TOKENS.meta,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  diaryShortcut: {
    position: 'absolute',
    top: '50%',
    marginTop: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: DESIGN_TOKENS.radiusFull,
    backgroundColor: 'rgba(18, 32, 48, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.18)',
  },
  diaryShortcutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.primary,
  },
  diaryShortcutText: {
    color: DESIGN_TOKENS.label,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default SmartAddSheet;
