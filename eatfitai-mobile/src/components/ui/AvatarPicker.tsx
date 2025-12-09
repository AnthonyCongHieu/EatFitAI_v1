/**
 * AvatarPicker - Component cho phép chọn và upload avatar
 * Sử dụng expo-image-picker để chọn ảnh từ thư viện
 * Hiển thị initial letter nếu chưa có avatar
 */

import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';
import { profileService } from '../../services/profileService';

interface AvatarPickerProps {
  // URL hiện tại của avatar (nếu có)
  avatarUrl?: string | null;
  // Tên để lấy initial letter
  name?: string | null;
  // Email hiển thị dưới avatar
  email?: string | null;
  // Callback khi upload thành công, trả về URL mới
  onUploadComplete?: (url: string) => void;
  // Kích thước avatar (default: 100)
  size?: number;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  avatarUrl,
  name,
  email,
  onUploadComplete,
  size = 100,
}) => {
  const { theme } = useAppTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Avatar URL: ưu tiên localUri (vừa chọn) > avatarUrl (từ server)
  const displayUri = localUri || avatarUrl;

  // Initial letter từ tên
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const handlePickAvatar = async () => {
    try {
      // Xin quyền truy cập thư viện ảnh
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Cần quyền truy cập',
          text2: 'Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt',
        });
        return;
      }

      // Mở image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Cắt vuông cho avatar
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setLocalUri(uri);

        // Upload lên server
        setIsUploading(true);
        try {
          const uploadedUrl = await profileService.uploadAvatar(uri);
          onUploadComplete?.(uploadedUrl);
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Đã cập nhật avatar',
          });
        } catch (uploadError: any) {
          // Nếu upload lỗi, vẫn giữ ảnh local để xem
          console.error('Avatar upload failed:', uploadError);
          Toast.show({
            type: 'error',
            text1: 'Upload thất bại',
            text2: uploadError?.message || 'Không thể upload avatar. Vui lòng thử lại.',
          });
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể chọn ảnh. Vui lòng thử lại.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePickAvatar} disabled={isUploading}>
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
          {displayUri ? (
            <Image
              source={{ uri: displayUri }}
              style={[
                styles.avatarImage,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
            />
          ) : (
            <ThemedText variant="h1" color="primary" style={{ fontSize: size * 0.4 }}>
              {initial}
            </ThemedText>
          )}

          {/* Overlay khi uploading */}
          {isUploading && (
            <View
              style={[
                styles.uploadingOverlay,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
            >
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}

          {/* Camera icon overlay */}
          {!isUploading && (
            <View
              style={[styles.cameraButton, { backgroundColor: theme.colors.primary }]}
            >
              <Icon name="camera" size="sm" color="card" />
            </View>
          )}
        </View>
      </Pressable>

      {/* Email dưới avatar */}
      {email && (
        <ThemedText variant="bodySmall" color="textSecondary" style={styles.email}>
          {email}
        </ThemedText>
      )}
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
  avatarImage: {
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
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
});

export default AvatarPicker;
