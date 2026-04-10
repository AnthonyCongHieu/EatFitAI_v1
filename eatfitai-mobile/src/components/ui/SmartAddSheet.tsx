import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../app/types';
import QuickAddHub from '../home/QuickAddHub';
import { TEST_IDS } from '../../testing/testIds';
import { t } from '../../i18n/vi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SmartAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const SmartAddSheet: React.FC<SmartAddSheetProps> = ({ visible, onClose }) => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const navigateAfterClose = (
    route: keyof RootStackParamList,
    params?: RootStackParamList[keyof RootStackParamList],
  ) => {
    onClose();
    setTimeout(() => {
      (navigation as any).navigate(route, params);
    }, 220);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay.medium }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng bảng thêm nhanh"
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(220)}
          exiting={SlideOutDown.duration(180)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.card,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          <QuickAddHub
            compact
            onSearch={() =>
              navigateAfterClose('FoodSearch', {
                autoFocus: true,
                showQuickSuggestions: true,
                returnToDiaryOnSave: true,
              })
            }
            onScan={() => navigateAfterClose('AiCamera')}
            onVoice={() =>
              navigateAfterClose('AppTabs', {
                screen: 'VoiceTab',
                params: { autoStart: true, source: 'sheet-hub' },
              })
            }
            searchTestID={TEST_IDS.home.quickAddSearchButton}
            scanTestID={TEST_IDS.home.quickAddScanButton}
            voiceTestID={TEST_IDS.home.quickAddVoiceButton}
          />

          <View style={styles.utilitySection}>
            <ThemedText variant="bodySmall" color="textSecondary">
              Lối vào khác
            </ThemedText>

            <Pressable
              testID={TEST_IDS.home.quickAccessDiaryButton}
              accessibilityRole="button"
              accessibilityLabel={t('home.diary_today')}
              accessibilityHint="Mở nhật ký để kiểm tra và chỉnh sửa bữa ăn hôm nay"
              style={[
                styles.primaryUtilityButton,
                {
                  backgroundColor: theme.colors.primary + '14',
                  borderColor: theme.colors.primary + '35',
                },
              ]}
              onPress={() => navigateAfterClose('MealDiary')}
            >
              <ThemedText variant="body" weight="700" color="primary">
                {t('home.diary_today')}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                {t('home.see_all')}
              </ThemedText>
            </Pressable>

            <View style={styles.utilityRow}>
              <Pressable
                style={[styles.utilityButton, { borderColor: theme.colors.border }]}
                onPress={() => navigateAfterClose('FoodSearch', { initialTab: 'favorites' })}
              >
                <ThemedText variant="bodySmall" weight="600">
                  {t('food_search.tab_favorites')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.utilityButton, { borderColor: theme.colors.border }]}
                onPress={() => navigateAfterClose('CustomDish')}
              >
                <ThemedText variant="bodySmall" weight="600">
                  {t('home.createCustom')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    gap: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  utilitySection: {
    gap: 12,
  },
  primaryUtilityButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  utilityButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SmartAddSheet;
