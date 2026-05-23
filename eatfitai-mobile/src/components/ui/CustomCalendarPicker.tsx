import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useEN } from '../../theme/emeraldNebula';

interface CustomCalendarPickerProps {
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const VIET_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export const CustomCalendarPicker: React.FC<CustomCalendarPickerProps> = ({
  selectedDate,
  minDate,
  maxDate,
  onSelectDate,
  onClose,
}) => {
  const EN = useEN();
  const C = {
    bg: EN.bg,
    surfaceLow: EN.surfaceLow,
    surface: EN.surface,
    surfaceHigh: EN.surfaceHigh,
    surfaceHighest: EN.surfaceHighest,
    primary: EN.primary,
    onSurface: EN.onSurface,
    textMuted: EN.textMuted,
    outline: EN.outline,
  };

  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days (to complete the grid)
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59)) return true;
    return false;
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: C.surfaceLow, borderColor: C.outline }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handlePrevMonth} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={24} color={C.onSurface} />
            </Pressable>
            <View style={styles.monthTitleWrap}>
              <ThemedText style={[styles.monthTitle, { color: C.onSurface }]}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </ThemedText>
            </View>
            <Pressable onPress={handleNextMonth} style={styles.monthBtn}>
              <Ionicons name="chevron-forward" size={24} color={C.onSurface} />
            </Pressable>
          </View>

          {/* Weekdays */}
          <View style={styles.weekdaysRow}>
            {VIET_DAYS.map((day, idx) => (
              <ThemedText key={idx} style={[styles.weekdayText, { color: C.textMuted }]}>
                {day}
              </ThemedText>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              const selected = isSameDay(item.date, selectedDate);
              const disabled = isDateDisabled(item.date);
              const today = isSameDay(item.date, new Date());

              let textColor: string = C.onSurface;
              if (selected) textColor = '#000';
              else if (disabled) textColor = C.surfaceHighest;
              else if (!item.isCurrentMonth) textColor = C.textMuted;
              else if (today) textColor = C.primary;

              return (
                <Pressable
                  key={index}
                  disabled={disabled}
                  onPress={() => onSelectDate(item.date)}
                  style={[
                    styles.dayCell,
                    selected && { backgroundColor: C.primary, borderColor: C.primary },
                    today && !selected && { borderColor: C.primary, borderWidth: 1 },
                  ]}
                >
                  <ThemedText style={[styles.dayText, { color: textColor as string }, selected && { fontWeight: 'bold' }]}>
                    {item.date.getDate()}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.closeBtn, { backgroundColor: C.surfaceHigh }]} onPress={onClose}>
            <ThemedText style={[styles.closeBtnText, { color: C.onSurface }]}>Đóng</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  monthBtn: {
    padding: 8,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 999,
  },
  dayText: {
    fontSize: 15,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});
