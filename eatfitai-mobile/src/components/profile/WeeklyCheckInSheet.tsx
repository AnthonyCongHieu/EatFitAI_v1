/**
 * WeeklyCheckInSheet - Bottom sheet for submitting weekly check-in
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import ThemedTextInput from '../ThemedTextInput';
import Button from '../Button';
import { BottomSheet } from '../BottomSheet';
import { QuickRating } from '../ui/QuickRating';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useWeeklyStore } from '../../store/useWeeklyStore';

interface WeeklyCheckInSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const WeeklyCheckInSheet = ({
    visible,
    onClose,
    onSuccess,
}: WeeklyCheckInSheetProps): JSX.Element => {
    const { theme } = useAppTheme();
    const { currentWeek, isSubmitting, submitCheckIn, error, clearError } = useWeeklyStore();

    const [weight, setWeight] = useState('');
    const [sleepQuality, setSleepQuality] = useState(3);
    const [hungerLevel, setHungerLevel] = useState(3);
    const [stressLevel, setStressLevel] = useState(3);
    const [notes, setNotes] = useState('');
    const [weightError, setWeightError] = useState('');

    useEffect(() => {
        if (visible) {
            // Pre-fill with previous weight if available
            if (currentWeek?.previousWeight) {
                setWeight(currentWeek.previousWeight.toString());
            }
            clearError();
        }
    }, [visible, currentWeek?.previousWeight]);

    const validateWeight = (value: string): boolean => {
        const num = parseFloat(value);
        if (isNaN(num)) {
            setWeightError('Vui lòng nhập số hợp lệ');
            return false;
        }
        if (num < 30 || num > 300) {
            setWeightError('Cân nặng phải từ 30 đến 300 kg');
            return false;
        }
        setWeightError('');
        return true;
    };

    const handleSubmit = async () => {
        if (!validateWeight(weight)) return;

        const success = await submitCheckIn({
            weightKg: parseFloat(weight),
            sleepQuality,
            hungerLevel,
            stressLevel,
            notes: notes.trim() || undefined,
        });

        if (success) {
            setWeight('');
            setNotes('');
            onClose();
            onSuccess?.();
        }
    };

    const styles = StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
        },
        header: {
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
        },
        emoji: {
            fontSize: 48,
            marginBottom: theme.spacing.md,
        },
        title: {
            marginBottom: theme.spacing.xs,
        },
        subtitle: {
            textAlign: 'center',
        },
        inputSection: {
            marginBottom: theme.spacing.lg,
        },
        previousWeight: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.muted,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.md,
        },
        errorBox: {
            backgroundColor: theme.colors.danger + '20',
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.md,
        },
        buttonRow: {
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
        },
    });

    return (
        <BottomSheet visible={visible} onClose={onClose} height={680}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.container}>
                        {/* Header */}
                        <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
                            <ThemedText style={styles.emoji}>⚖️</ThemedText>
                            <ThemedText variant="h2" weight="600" style={styles.title}>
                                Check-in Tuần {currentWeek?.weekNumber || 1}
                            </ThemedText>
                            <ThemedText variant="body" color="textSecondary" style={styles.subtitle}>
                                Nhập cân nặng hiện tại để theo dõi tiến độ
                            </ThemedText>
                        </Animated.View>

                        {/* Previous Weight Reference */}
                        {currentWeek?.previousWeight && (
                            <Animated.View entering={FadeInUp.delay(200)} style={styles.previousWeight}>
                                <ThemedText color="textSecondary">Tuần trước:</ThemedText>
                                <ThemedText weight="600">{currentWeek.previousWeight.toFixed(1)} kg</ThemedText>
                            </Animated.View>
                        )}

                        {/* Error Message */}
                        {error && (
                            <View style={styles.errorBox}>
                                <ThemedText color="danger">{error}</ThemedText>
                            </View>
                        )}

                        {/* Input Section */}
                        <Animated.View entering={FadeInUp.delay(300)} style={styles.inputSection}>
                            <ThemedTextInput
                                label="Cân nặng (kg)"
                                placeholder="Ví dụ: 65.5"
                                keyboardType="decimal-pad"
                                value={weight}
                                onChangeText={(text) => {
                                    setWeight(text);
                                    if (weightError) validateWeight(text);
                                }}
                                error={!!weightError}
                                helperText={weightError}
                                required
                            />

                            <ThemedTextInput
                                label="Ghi chú (tùy chọn)"
                                placeholder="Cảm giác, thách thức tuần này..."
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                style={{ marginTop: theme.spacing.md }}
                            />

                            {/* Physical State */}
                            <View style={{ marginTop: theme.spacing.lg }}>
                                <ThemedText variant="body" weight="600" style={{ marginBottom: theme.spacing.sm }}>
                                    😴 Giấc ngủ tuần này?
                                </ThemedText>
                                <QuickRating
                                    value={sleepQuality}
                                    onChange={setSleepQuality}
                                    options={['Kém', 'Tạm', 'TB', 'Tốt', '⭐']}
                                />
                            </View>

                            <View style={{ marginTop: theme.spacing.md }}>
                                <ThemedText variant="body" weight="600" style={{ marginBottom: theme.spacing.sm }}>
                                    🍽️ Cảm giác đói?
                                </ThemedText>
                                <QuickRating
                                    value={hungerLevel}
                                    onChange={setHungerLevel}
                                    options={['No', 'Vừa', 'Bình thường', 'Đói', 'Rất đói']}
                                />
                            </View>

                            <View style={{ marginTop: theme.spacing.md }}>
                                <ThemedText variant="body" weight="600" style={{ marginBottom: theme.spacing.sm }}>
                                    💭 Stress level?
                                </ThemedText>
                                <QuickRating
                                    value={stressLevel}
                                    onChange={setStressLevel}
                                    options={['Thấp', 'OK', 'TB', 'Cao', '😰']}
                                />
                            </View>
                        </Animated.View>

                        {/* Actions */}
                        <View style={styles.buttonRow}>
                            <Button
                                title="Hủy"
                                onPress={onClose}
                                variant="ghost"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title={isSubmitting ? 'Đang gửi...' : 'Xác nhận'}
                                onPress={handleSubmit}
                                variant="primary"
                                loading={isSubmitting}
                                disabled={isSubmitting || !weight}
                                style={{ flex: 2 }}
                                icon="checkmark-circle-outline"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </BottomSheet>
    );
};

export default WeeklyCheckInSheet;
