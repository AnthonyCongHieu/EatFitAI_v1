/**
 * AvatarPicker - Component cho phép chọn avatar từ bộ hình có sẵn
 * Không cần upload - dùng preset avatars để đơn giản hóa
 * Hiển thị initial letter nếu chưa có avatar
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';
import { glassStyles } from './GlassCard';

// Preset avatars - sử dụng các emoji hoặc icon có sẵn
// Lưu dưới dạng ID để lưu vào database, frontend sẽ map sang hình thực tế
const PRESET_AVATARS = [
  { id: 'avatar_1', emoji: '👨', label: 'Nam 1' },
  { id: 'avatar_2', emoji: '👩', label: 'Nữ 1' },
  { id: 'avatar_3', emoji: '👨‍🦱', label: 'Nam 2' },
  { id: 'avatar_4', emoji: '👩‍🦰', label: 'Nữ 2' },
  { id: 'avatar_5', emoji: '🧑', label: 'Trung tính' },
  { id: 'avatar_6', emoji: '👴', label: 'Lớn tuổi 1' },
  { id: 'avatar_7', emoji: '👵', label: 'Lớn tuổi 2' },
  { id: 'avatar_8', emoji: '🧑‍🍳', label: 'Đầu bếp' },
  { id: 'avatar_9', emoji: '🏃', label: 'Thể thao' },
  { id: 'avatar_10', emoji: '🧘', label: 'Yoga' },
  { id: 'avatar_11', emoji: '💪', label: 'Gym' },
  { id: 'avatar_12', emoji: '🍎', label: 'Healthy' },
] as const;

interface AvatarPickerProps {
  // URL hoặc ID hiện tại của avatar (nếu có)
  avatarUrl?: string | null;
  // Tên để lấy initial letter
  name?: string | null;
  // Email hiển thị dưới avatar
  email?: string | null;
  // Callback khi chọn avatar, trả về ID hoặc emoji
  onUploadComplete?: (avatarId: string) => void;
  // Kích thước avatar (default: 100)
  size?: number;
}

// Helper để lấy emoji từ avatarUrl/ID
const getAvatarDisplay = (avatarUrl?: string | null): { emoji?: string; isPreset: boolean } => {
  if (!avatarUrl) return { isPreset: false };

  // Nếu là preset avatar ID
  const preset = PRESET_AVATARS.find(a => a.id === avatarUrl);
  if (preset) return { emoji: preset.emoji, isPreset: true };

  // Nếu là direct emoji (legacy support)
  if (avatarUrl.length <= 4 && /\p{Emoji}/u.test(avatarUrl)) {
    return { emoji: avatarUrl, isPreset: true };
  }

  return { isPreset: false };
};

const { width: screenWidth } = Dimensions.get('window');
const MODAL_PADDING = 24;
const AVATAR_SIZE = (screenWidth - MODAL_PADDING * 4 - 24) / 4; // 4 avatars per row

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  avatarUrl,
  name,
  email,
  onUploadComplete,
  size = 100,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(avatarUrl || null);

  // Display info
  const avatarDisplay = getAvatarDisplay(selectedAvatar || avatarUrl);
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const handleSelectAvatar = (avatarId: string, emoji: string) => {
    setSelectedAvatar(avatarId);
    onUploadComplete?.(avatarId);
    setShowPicker(false);
    Toast.show({
      type: 'success',
      text1: 'Đã cập nhật avatar',
      text2: `Chọn: ${emoji}`,
    });
  };

  return (
    <View style={styles.container}>
      {/* Avatar Display */}
      <Pressable onPress={() => setShowPicker(true)}>
        <View
          style={[
            styles.avatarContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.primaryLight,
            },
          ]}
        >
          {avatarDisplay.emoji ? (
            // Hiển thị emoji
            <ThemedText style={{ fontSize: size * 0.5 }}>
              {avatarDisplay.emoji}
            </ThemedText>
          ) : (
            // Hiển thị initial letter
            <ThemedText variant="h1" color="primary" style={{ fontSize: size * 0.4 }}>
              {initial}
            </ThemedText>
          )}

          {/* Edit icon overlay */}
          <View
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          >
            <Icon name="pencil" size="sm" color="card" />
          </View>
        </View>
      </Pressable>

      {/* Email dưới avatar */}
      {email && (
        <ThemedText variant="bodySmall" color="textSecondary" style={styles.email}>
          {email}
        </ThemedText>
      )}

      {/* Avatar Picker Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[glass.card, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" weight="600">
                Chọn Avatar
              </ThemedText>
              <Pressable onPress={() => setShowPicker(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.avatarGrid}
              showsVerticalScrollIndicator={false}
            >
              {PRESET_AVATARS.map((avatar) => (
                <Pressable
                  key={avatar.id}
                  onPress={() => handleSelectAvatar(avatar.id, avatar.emoji)}
                  style={[
                    styles.avatarOption,
                    {
                      width: AVATAR_SIZE,
                      height: AVATAR_SIZE,
                      backgroundColor:
                        (selectedAvatar || avatarUrl) === avatar.id
                          ? theme.colors.primaryLight
                          : isDark
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(0,0,0,0.03)',
                      borderColor:
                        (selectedAvatar || avatarUrl) === avatar.id
                          ? theme.colors.primary
                          : 'transparent',
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: AVATAR_SIZE * 0.5 }}>
                    {avatar.emoji}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText
              variant="caption"
              color="textSecondary"
              style={{ textAlign: 'center', marginTop: theme.spacing.md }}
            >
              Chọn avatar phù hợp với bạn
            </ThemedText>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  email: {
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: MODAL_PADDING,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 420,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  avatarOption: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

export default AvatarPicker;
