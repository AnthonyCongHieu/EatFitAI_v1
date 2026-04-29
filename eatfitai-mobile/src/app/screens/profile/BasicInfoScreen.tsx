// BasicInfoScreen — "Thông tin cơ bản"
// Emerald Nebula 3D: Editable rows for Nickname, Gender, Age, Height

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import { useProfileStore } from '../../../store/useProfileStore';
import {
  showSuccess,
  handleApiErrorWithCustomMessage,
} from '../../../utils/errorHandler';

/* ═══ Emerald Nebula Palette ═══ */
const P = {
  surface: '#0e1322',
  surfaceContainerHigh: '#25293a',
  surfaceContainerLow: '#161b2b',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  primary: '#4be277',
  glassBorder: 'rgba(255,255,255,0.05)',
};

const getGenderLabel = (g?: string): string => {
  switch (g) {
    case 'male': return 'Nam';
    case 'female': return 'Nữ';
    default: return 'Chưa đặt';
  }
};

/* ═══ Editable Row ═══ */
interface EditRowProps {
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
}

const EditRow = ({ label, value, onPress, isLast = false }: EditRowProps) => (
  <Pressable
    style={({ pressed }) => [
      S.editRow,
      !isLast && S.editRowBorder,
      pressed && { opacity: 0.7 },
    ]}
    onPress={onPress}
  >
    <ThemedText style={S.editRowLabel}>{label}</ThemedText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText style={S.editRowValue}>{value}</ThemedText>
      <Ionicons name="chevron-forward" size={18} color={P.onSurfaceVariant + '60'} />
    </View>
  </Pressable>
);

/* ═══ Edit Modal ═══ */
interface EditModalProps {
  visible: boolean;
  title: string;
  value: string;
  onChangeText: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}

const EditModal = ({
  visible, title, value, onChangeText, onSave, onCancel,
  keyboardType = 'default', placeholder,
}: EditModalProps) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={S.modalOverlay} onPress={onCancel}>
      <Pressable style={S.modalCard} onPress={() => {}}>
        <ThemedText style={S.modalTitle}>{title}</ThemedText>
        <TextInput
          style={S.modalInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={P.onSurfaceVariant + '40'}
          autoFocus
        />
        <View style={S.modalBtnRow}>
          <Pressable style={S.modalBtnCancel} onPress={onCancel}>
            <ThemedText style={{ color: P.onSurfaceVariant, fontWeight: '600', fontSize: 15 }}>Hủy</ThemedText>
          </Pressable>
          <Pressable style={S.modalBtnSave} onPress={onSave}>
            <ThemedText style={{ color: '#003915', fontWeight: '700', fontSize: 15 }}>Lưu</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ═══ Gender Picker Modal ═══ */
const GenderModal = ({
  visible,
  current,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  current?: string;
  onSelect: (g: string) => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={S.modalOverlay} onPress={onCancel}>
      <Pressable style={S.modalCard} onPress={() => {}}>
        <ThemedText style={S.modalTitle}>Chọn giới tính</ThemedText>
        {['male', 'female'].map((g) => (
          <Pressable
            key={g}
            style={[
              S.genderOption,
              current === g && { backgroundColor: P.primary + '20', borderColor: P.primary + '40' },
            ]}
            onPress={() => onSelect(g)}
          >
            <ThemedText style={[
              S.genderOptionText,
              current === g && { color: P.primary },
            ]}>
              {g === 'male' ? 'Nam' : 'Nữ'}
            </ThemedText>
            {current === g && <Ionicons name="checkmark" size={20} color={P.primary} />}
          </Pressable>
        ))}
        <Pressable style={[S.modalBtnCancel, { marginTop: 8 }]} onPress={onCancel}>
          <ThemedText style={{ color: P.onSurfaceVariant, fontWeight: '600', fontSize: 15 }}>Hủy</ThemedText>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ═══════════════════════════════════════════════
   BasicInfoScreen
   ═══════════════════════════════════════════════ */
const BasicInfoScreen = (): React.ReactElement => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { profile, updateProfile } = useProfileStore((s) => ({
    profile: s.profile,
    updateProfile: s.updateProfile,
  }));

  // Edit state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const openEdit = (field: string, current: string) => {
    setEditField(field);
    setEditValue(current);
  };

  const handleSave = useCallback(async () => {
    if (!editField) return;
    try {
      const payload: Record<string, any> = {};
      if (editField === 'fullName') payload.fullName = editValue.trim() || null;
      if (editField === 'age') {
        const age = Number(editValue);
        if (isNaN(age) || age < 1 || age > 120) {
          Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Tuổi phải từ 1-120' });
          return;
        }
        // Calculate dateOfBirth from age
        const now = new Date();
        const birthYear = now.getFullYear() - age;
        payload.dateOfBirth = `${birthYear}-01-01`;
      }
      if (editField === 'heightCm') {
        const h = Number(editValue);
        if (isNaN(h) || h < 100 || h > 250) {
          Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Chiều cao từ 100-250 cm' });
          return;
        }
        payload.heightCm = h;
      }

      await updateProfile(payload);
      showSuccess('profile_updated');
      setEditField(null);
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Lỗi', text2: 'Không thể lưu thông tin' },
      });
    }
  }, [editField, editValue, updateProfile]);

  const handleGenderSelect = useCallback(async (g: string) => {
    try {
      await updateProfile({ gender: g });
      showSuccess('profile_updated');
      setGenderModalVisible(false);
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Lỗi', text2: 'Không thể lưu' },
      });
    }
  }, [updateProfile]);

  const getEditTitle = (): string => {
    switch (editField) {
      case 'fullName': return 'Chỉnh sửa tên';
      case 'age': return 'Chỉnh sửa tuổi';
      case 'heightCm': return 'Chỉnh sửa chiều cao (cm)';
      default: return '';
    }
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={P.onSurface} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Thông tin cơ bản</ThemedText>
        <View style={S.headerBtn} />
      </View>

      {/* Card */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={S.content}>
        <View style={S.card}>
          <EditRow
            label="Nickname của bạn"
            value={profile?.fullName || 'Chưa đặt'}
            onPress={() => openEdit('fullName', profile?.fullName || '')}
          />
          <EditRow
            label="Giới tính"
            value={getGenderLabel(profile?.gender)}
            onPress={() => setGenderModalVisible(true)}
          />
          <EditRow
            label="Tuổi"
            value={profile?.age ? `${profile.age}` : 'Chưa đặt'}
            onPress={() => openEdit('age', profile?.age?.toString() || '')}
          />
          <EditRow
            label="Chiều cao"
            value={profile?.heightCm ? `${profile.heightCm} cm` : 'Chưa đặt'}
            onPress={() => openEdit('heightCm', profile?.heightCm?.toString() || '')}
            isLast
          />
        </View>
      </Animated.View>

      {/* Edit Modal */}
      <EditModal
        visible={!!editField}
        title={getEditTitle()}
        value={editValue}
        onChangeText={setEditValue}
        onSave={handleSave}
        onCancel={() => setEditField(null)}
        keyboardType={editField === 'fullName' ? 'default' : 'numeric'}
        placeholder={editField === 'fullName' ? 'Nhập tên...' : 'Nhập số...'}
      />

      {/* Gender Modal */}
      <GenderModal
        visible={genderModalVisible}
        current={profile?.gender}
        onSelect={handleGenderSelect}
        onCancel={() => setGenderModalVisible(false)}
      />
    </View>
  );
};

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: P.onSurface, letterSpacing: -0.3 },
  content: { paddingHorizontal: 20, marginTop: 8 },
  card: {
    borderRadius: 16,
    backgroundColor: P.surfaceContainerHigh,
    overflow: 'hidden',
  },

  /* Edit rows */
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  editRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: P.glassBorder,
  },
  editRowLabel: { fontSize: 16, fontWeight: '500', color: P.onSurface },
  editRowValue: { fontSize: 16, fontWeight: '600', color: P.onSurfaceVariant },

  /* Gender option */
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.glassBorder,
    marginBottom: 8,
  },
  genderOptionText: { fontSize: 16, fontWeight: '600', color: P.onSurface },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: P.onSurface },
  modalInput: {
    borderRadius: 12,
    backgroundColor: P.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: P.onSurface,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtnCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: P.surfaceContainerLow,
  },
  modalBtnSave: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: P.primary,
  },
});

export default BasicInfoScreen;
