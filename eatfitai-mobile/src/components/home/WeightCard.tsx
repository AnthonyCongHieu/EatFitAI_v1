/**
 * WeightCard — Thẻ theo dõi cân nặng trên Trang chủ
 *
 * Bố cục được tối giản và đồng bộ hoàn toàn với thẻ Uống nước:
 * - Dùng icon cái cân (MaterialCommunityIcons "scale-bathroom") màu vàng/amber.
 * - Bỏ hoàn toàn biểu đồ.
 * - Cân nặng hiển thị đồng bộ với text của thẻ nước.
 * - Ngày đo gần nhất được hiển thị nhỏ ngay dưới cân nặng.
 * - Nút "Cập nhật" đổi thành màu xanh lá (EN.primary) đồng bộ với app.
 */

import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService, type BodyMetricsPayload } from '../../services/profileService';

/* ─── Hằng số ─── */
const AMBER_ICON = '#f7c052';

/* ─── Định dạng hiển thị cân nặng ẩn .0 ─── */
const formatWeight = (val: number): string => parseFloat(val.toFixed(1)).toString();

/* ─── Props ─── */
interface WeightCardProps {
  onUpdatePress: () => void;
  onCardPress: () => void;
}

/* ═══════════════════════════════════════════════
   Component chính
   ═══════════════════════════════════════════════ */
const WeightCard = ({ onUpdatePress, onCardPress }: WeightCardProps): React.ReactElement => {
  const EN = useEN();
  const { profile } = useProfileStore();

  const currentWeight = profile?.weightKg;

  // Lấy lịch sử cân nặng
  const { data: metricsHistory } = useQuery<BodyMetricsPayload[]>({
    queryKey: ['weight-history', 'card', 10],
    queryFn: () => profileService.getBodyMetricsHistory(10),
    staleTime: 5 * 60 * 1000,
  });

  // Tìm ngày đo gần nhất
  const lastMeasuredDate = useMemo(() => {
    if (metricsHistory && metricsHistory.length > 0) {
      const sorted = [...metricsHistory]
        .filter((m) => m.measuredDate)
        .sort((a, b) => new Date(b.measuredDate!).getTime() - new Date(a.measuredDate!).getTime());
      if (sorted[0]) {
        return sorted[0].measuredDate;
      }
    }
    return profile?.lastMeasuredDate;
  }, [metricsHistory, profile?.lastMeasuredDate]);

  // Định dạng ngày đo
  const measuredDateText = useMemo(() => {
    if (!lastMeasuredDate) return '';
    try {
      const date = new Date(lastMeasuredDate);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `Đo ngày ${day}/${month}/${year}`;
    } catch {
      return '';
    }
  }, [lastMeasuredDate]);

  const handleUpdatePress = useCallback(() => {
    onUpdatePress();
  }, [onUpdatePress]);

  const handleCardPress = useCallback(() => {
    onCardPress();
  }, [onCardPress]);

  return (
    <Animated.View entering={FadeInUp.delay(500).springify()}>
      <Pressable
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel="Xem thống kê cân nặng"
        style={[
          styles.card,
          styles.glassCard,
          { backgroundColor: EN.surfaceHigh, borderColor: EN.outline },
        ]}
      >
        {/* Phần bên trái: Icon + Column chứ các nhãn */}
        <View style={styles.leftSection}>
          <MaterialCommunityIcons name="scale-bathroom" size={28} color={AMBER_ICON} />
          
          <View style={styles.labelWrap}>
            <ThemedText style={[styles.title, { color: EN.onSurface }]}>
              Cân nặng gần nhất
            </ThemedText>
            
            <ThemedText style={[styles.weightValue, { color: EN.onSurface }]}>
              {currentWeight != null ? `${formatWeight(currentWeight)} kg` : '— kg'}
            </ThemedText>

            {measuredDateText ? (
              <ThemedText style={[styles.dateText, { color: EN.textMuted }]}>
                {measuredDateText}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Nút cập nhật (Màu xanh lá đồng bộ với app) */}
        <Pressable
          onPress={handleUpdatePress}
          accessibilityRole="button"
          accessibilityLabel="Cập nhật cân nặng"
          hitSlop={8}
          style={[styles.updateBtn, { backgroundColor: EN.primary }]}
        >
          <ThemedText style={styles.updateBtnText}>Cập nhật</ThemedText>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* ── Thẻ chứa (Đồng bộ style với waterCard) ── */
  card: {
    borderRadius: 18,
    padding: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  glassCard: {
    backgroundColor: 'rgba(27, 35, 55, 0.72)',
    borderColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 3,
  },

  /* ── Phần bên trái ── */
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  labelWrap: {
    gap: 2,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: '#f8fafc',
  },
  weightValue: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#f8fafc',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 1,
  },

  /* ── Nút Cập nhật màu xanh lá ── */
  updateBtn: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  updateBtnText: {
    color: '#003915', // Chữ xanh lá đậm dễ đọc trên nền xanh sáng
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
  },
});

export default WeightCard;
