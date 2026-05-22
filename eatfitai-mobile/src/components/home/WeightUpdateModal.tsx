/**
 * WeightUpdateModal — Modal cập nhật cân nặng toàn màn hình
 *
 * Cho phép người dùng điều chỉnh cân nặng bằng nút +/- (bước 0.1 kg),
 * chọn ngày đo, và lưu vào hệ thống.
 * Thiết kế dark theme + MeshBackground khớp với Emerald Nebula design system.
 */

import { useState, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';
import { formatBusinessDate } from '../../utils/businessDate';
import MeshBackground from '../ui/MeshBackground';

/* ─── Hằng số ─── */
const WEIGHT_STEP = 0.1;
const MIN_WEIGHT = 20;
const MAX_WEIGHT = 300;

/* ─── Định dạng hiển thị cân nặng ẩn .0 ─── */
const formatWeight = (val: number): string => parseFloat(val.toFixed(1)).toString();

/* ─── Props ─── */
interface WeightUpdateModalProps {
  visible: boolean;
  onClose: () => void;
}

/* ─── Định dạng ngày hiển thị (DD / MM / YYYY) ─── */
const formatDateDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
};

/* ═══════════════════════════════════════════════
   Component chính
   ═══════════════════════════════════════════════ */
const WeightUpdateModal = ({ visible, onClose }: WeightUpdateModalProps): React.ReactElement => {
  const EN = useEN();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile } = useProfileStore();

  // Khởi tạo cân nặng từ profile hoặc mặc định 70 kg
  const [weight, setWeight] = useState<number>(profile?.weightKg ?? 70);
  const [measuredDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  // Reset cân nặng khi modal mở
  const handleShow = useCallback(() => {
    setWeight(useProfileStore.getState().profile?.weightKg ?? 70);
    setIsEditing(false);
    setEditVal('');
  }, []);

  const handleStartEdit = useCallback(() => {
    setEditVal(formatWeight(weight));
    setIsEditing(true);
  }, [weight]);

  const handleFinishEdit = useCallback(() => {
    setIsEditing(false);
    const normalized = editVal.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed >= MIN_WEIGHT && parsed <= MAX_WEIGHT) {
      setWeight(Math.round(parsed * 10) / 10);
    } else if (editVal.trim() !== '') {
      Toast.show({
        type: 'info',
        text1: 'Cân nặng không hợp lệ ⚖️',
        text2: `Vui lòng nhập từ ${MIN_WEIGHT} kg đến ${MAX_WEIGHT} kg`,
      });
    }
  }, [editVal]);

  // Tăng cân nặng 0.1 kg
  const handleIncrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeight((prev) => {
      const next = Math.round((prev + WEIGHT_STEP) * 10) / 10;
      return Math.min(next, MAX_WEIGHT);
    });
  }, []);

  // Giảm cân nặng 0.1 kg
  const handleDecrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeight((prev) => {
      const next = Math.round((prev - WEIGHT_STEP) * 10) / 10;
      return Math.max(next, MIN_WEIGHT);
    });
  }, []);

  // Lưu cân nặng
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const dateStr = formatBusinessDate(measuredDate);

      // 1. Tạo bản ghi body metrics mới
      await profileService.createBodyMetrics({
        weightKg: weight,
        measuredDate: dateStr,
      });

      // 2. Cập nhật profile với cân nặng mới
      await useProfileStore.getState().updateProfile({
        weightKg: weight,
      });

      // 3. Xoá cache để tải lại dữ liệu mới (cả card lẫn stats)
      await queryClient.invalidateQueries({ queryKey: ['weight-history'] });

      // 4. Thông báo thành công
      Toast.show({
        type: 'success',
        text1: 'Cập nhật cân nặng thành công! 🎉',
        text2: `Capy đã ghi lại số cân ${formatWeight(weight)} kg rồi nhé. Cố lên nào! 💪`,
      });

      // 5. Đóng modal
      onClose();
    } catch (error: any) {
      const isNetwork =
        error?.message?.includes('Network') ||
        error?.message?.includes('timeout') ||
        error?.code === 'ECONNABORTED';

      Toast.show({
        type: 'error',
        text1: 'Lưu cân nặng thất bại 😢',
        text2: isNetwork
          ? 'Kết nối mạng yếu quá, bạn kiểm tra lại rồi thử lại với Capy nha!'
          : 'Đã có lỗi xảy ra. Bạn thử lại sau nhé!',
      });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, weight, measuredDate, queryClient, onClose]);

  const targetWeight = profile?.targetWeightKg;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: EN.bg, paddingTop: insets.top }]}>
        {/* MeshBackground cho hiệu ứng mesh */}
        <MeshBackground />

        {/* ══════════ Header ══════════ */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <ThemedText style={[styles.headerTitle, { color: EN.onSurface }]}>
            Ghi lại cân nặng
          </ThemedText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={EN.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* ══════════ Nội dung chính ══════════ */}
        <View style={styles.content}>
          {/* Nhãn cân nặng hiện tại */}
          <ThemedText style={[styles.sectionLabel, { color: EN.onSurface }]}>
            Cân nặng hiện tại
          </ThemedText>

          {/* Mục tiêu */}
          {targetWeight != null && (
            <ThemedText style={[styles.targetText, { color: EN.textMuted }]}>
              Mục tiêu: {formatWeight(targetWeight)} Kg
            </ThemedText>
          )}

          {/* ── Bộ điều chỉnh cân nặng ── */}
          <View style={styles.adjustRow}>
            {/* Nút giảm */}
            <Pressable
              onPress={handleDecrement}
              accessibilityRole="button"
              accessibilityLabel="Giảm 0.1 kg"
              hitSlop={8}
              style={[styles.adjustBtn, { backgroundColor: EN.surfaceHighest }]}
            >
              <Ionicons name="remove" size={24} color={EN.onSurface} />
            </Pressable>

            {/* Hiển thị cân nặng lớn */}
            <Pressable
              onPress={handleStartEdit}
              style={styles.weightDisplay}
              accessibilityRole="keyboardkey"
              accessibilityLabel={`Cân nặng hiện tại là ${formatWeight(weight)} kg. Chạm để nhập số nhanh.`}
            >
              {isEditing ? (
                <TextInput
                  value={editVal}
                  onChangeText={setEditVal}
                  onBlur={handleFinishEdit}
                  onSubmitEditing={handleFinishEdit}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectTextOnFocus
                  style={[
                    styles.weightInputLarge,
                    {
                      color: EN.onSurface,
                    },
                  ]}
                />
              ) : (
                <ThemedText style={[styles.weightValueLarge, { color: EN.onSurface }]}>
                  {formatWeight(weight)}
                </ThemedText>
              )}
              <ThemedText style={[styles.weightUnitLarge, { color: EN.textMuted }]}>
                Kg
              </ThemedText>
            </Pressable>

            {/* Nút tăng */}
            <Pressable
              onPress={handleIncrement}
              accessibilityRole="button"
              accessibilityLabel="Tăng 0.1 kg"
              hitSlop={8}
              style={[styles.adjustBtn, { backgroundColor: EN.surfaceHighest }]}
            >
              <Ionicons name="add" size={24} color={EN.onSurface} />
            </Pressable>
          </View>

          {/* ── Ngày cân ── */}
          <View style={[styles.dateRow, { borderColor: EN.outline }]}>
            <ThemedText style={[styles.dateLabel, { color: EN.onSurfaceVariant }]}>
              Ngày cân
            </ThemedText>
            <View style={styles.dateValueRow}>
              <Ionicons name="calendar-outline" size={18} color={EN.textMuted} />
              <ThemedText style={[styles.dateValue, { color: EN.onSurface }]}>
                {formatDateDisplay(measuredDate)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* ══════════ Nút lưu (màu xanh lá) ══════════ */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Lưu cân nặng"
            style={[styles.saveBtn, { backgroundColor: EN.primary }, isSaving && styles.saveBtnDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Lưu cân nặng</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    textAlign: 'center',
    flex: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Nội dung ── */
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    marginBottom: 24,
  },

  /* ── Bộ điều chỉnh ── */
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 48,
  },
  adjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  weightValueLarge: {
    fontSize: 48,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 56,
  },
  weightInputLarge: {
    fontSize: 48,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 56,
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
  },
  weightUnitLarge: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_500Medium',
    marginTop: -4,
  },

  /* ── Ngày cân ── */
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateValue: {
    fontSize: 15,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },

  /* ── Nút lưu (xanh lá) ── */
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#003915',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
  },
});

export default WeightUpdateModal;
