import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useEN } from '../theme/emeraldNebula';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  isDestructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps): React.ReactElement => {
  const P = useEN();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmOverlay}>
        <Pressable
          style={styles.confirmBackdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`Đóng hộp thoại ${title}`}
        />
        <Animated.View
          entering={FadeInUp.duration(180)}
          exiting={FadeOut.duration(140)}
          style={[
            styles.confirmSheet,
            {
              backgroundColor: P.surface || '#1a1f2f',
              borderColor: isDestructive ? 'rgba(255,140,140,0.18)' : P.outline || 'rgba(226,232,240,0.12)',
            },
          ]}
        >
          {icon && (
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isDestructive
                    ? 'rgba(147, 0, 10, 0.2)'
                    : (P.primary + '18' || 'rgba(75,226,119,0.1)'),
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={24}
                color={isDestructive ? P.danger || '#ff8c8c' : P.primary || '#4be277'}
              />
            </View>
          )}
          
          <ThemedText style={[styles.title, { color: P.onSurface || '#dee1f7' }]}>
            {title}
          </ThemedText>
          
          <ThemedText style={[styles.body, { color: P.textMuted || '#9aa9c1' }]}>
            {message}
          </ThemedText>
          
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.76 },
              ]}
              onPress={onCancel}
            >
              <ThemedText style={[styles.cancelText, { color: P.onSurface || '#dee1f7' }]}>
                {cancelText}
              </ThemedText>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.76 },
              ]}
              onPress={onConfirm}
            >
              <ThemedText
                style={[
                  styles.confirmText,
                  {
                    color: isDestructive
                      ? P.danger || '#ff8c8c'
                      : P.primary || '#4be277',
                  },
                ]}
              >
                {confirmText}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  confirmSheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'BeVietnamPro_500Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(226,232,240,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(226,232,240,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  confirmText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
  },
});

export default ConfirmModal;
