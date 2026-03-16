/**
 * VoiceResultCard - Displays parsed voice command result
 * Shows intent, entities, and execute button
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { AppCard } from '../ui/AppCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { ParsedVoiceCommand, VoiceIntent } from '../../services/voiceService';

interface ExecutedData {
    type?: string;
    details?: string;
    totalCalories?: number;
    targetCalories?: number;
    remaining?: number;
    currentWeight?: number;
    newWeight?: number;
    requireConfirm?: boolean;
}

interface VoiceResultCardProps {
    command: ParsedVoiceCommand;
    onExecute: () => void;
    onConfirmWeight?: (weight: number) => void;
    isExecuting?: boolean;
    executedData?: ExecutedData | null;
}

const INTENT_CONFIG: Record<VoiceIntent, { icon: string; emoji: string; label: string; color: string }> = {
    ADD_FOOD: {
        icon: 'restaurant',
        emoji: '',
        label: 'Thêm món ăn',
        color: '#10B981',
    },
    LOG_WEIGHT: {
        icon: 'scale',
        emoji: '',
        label: 'Ghi cân nặng',
        color: '#3B82F6',
    },
    ASK_CALORIES: {
        icon: 'flame',
        emoji: '',
        label: 'Xem calories',
        color: '#F59E0B',
    },
    ASK_NUTRITION: {
        icon: 'nutrition',
        emoji: '',
        label: 'Xem dinh dưỡng',
        color: '#8B5CF6',
    },
    UNKNOWN: {
        icon: 'help-circle',
        emoji: '',
        label: 'Không hiểu',
        color: '#6B7280',
    },
};

const MEAL_LABELS: Record<string, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
    snack: 'Bữa phụ',
};

export const VoiceResultCard = ({
    command,
    onExecute,
    onConfirmWeight,
    isExecuting = false,
    executedData,
}: VoiceResultCardProps): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Fallback nếu intent không match với INTENT_CONFIG
    const config = INTENT_CONFIG[command.intent] || INTENT_CONFIG.UNKNOWN;

    // Check nếu đây là LOG_WEIGHT cần confirm
    const needsWeightConfirm = executedData?.type === 'LOG_WEIGHT_CONFIRM' && executedData?.requireConfirm;

    const styles = StyleSheet.create({
        card: {
            marginBottom: theme.spacing.md,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: config.color + '20',
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerText: {
            flex: 1,
        },
        confidence: {
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        entities: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.md,
        },
        entityRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        entityLabel: {
            color: theme.colors.textSecondary,
        },
        entityValue: {
            fontWeight: '600',
        },
        rawText: {
            fontStyle: 'italic',
            marginBottom: theme.spacing.md,
        },
    });

    const renderEntities = () => {
        const { entities } = command;
        const rows: { label: string; value: string }[] = [];

        // ADD_FOOD: Kiểm tra nếu có nhiều món (foods array)
        if (command.intent === 'ADD_FOOD') {
            if (entities.foods && entities.foods.length > 0) {
                // Nhiều món - hiển thị từng món
                entities.foods.forEach((food, index) => {
                    const qty = food.quantity || 1;
                    const unit = food.unit || '';
                    const weight = food.weight ? `${food.weight}g` : '';
                    const display = weight
                        ? `${weight} ${food.foodName || ''}`.trim()
                        : unit
                            ? `${qty} ${unit} ${food.foodName || ''}`.trim()
                            : `${qty} ${food.foodName || ''}`.trim();
                    rows.push({ label: `Món ${index + 1}`, value: display });
                });
            } else if (entities.foodName) {
                // 1 món - hiển thị như cũ
                const qty = entities.quantity || 1;
                const unit = entities.unit || '';
                const foodDisplay = unit ? `${qty} ${unit} ${entities.foodName}` : `${qty} ${entities.foodName}`;
                rows.push({ label: 'Món ăn', value: foodDisplay });
            }
        } else if (entities.foodName) {
            rows.push({ label: 'Món ăn', value: entities.foodName });
        }

        // Bữa ăn
        if (entities.mealType) {
            rows.push({ label: 'Bữa ăn', value: MEAL_LABELS[entities.mealType] || entities.mealType });
        }

        // Khối lượng (gram) - chỉ hiện nếu có, là ADD_FOOD 1 món, và không có foods array
        if (entities.weight && command.intent === 'ADD_FOOD' && !entities.foods) {
            rows.push({ label: 'Khối lượng', value: `${entities.weight}g` });
        }

        // LOG_WEIGHT: hiển thị so sánh cân nặng từ backend
        if (command.intent === 'LOG_WEIGHT') {
            if (executedData?.currentWeight && executedData?.newWeight) {
                // Đã có data từ backend - hiển thị so sánh
                rows.push({ label: 'Cân hiện tại', value: `${executedData.currentWeight} kg` });
                rows.push({ label: 'Cân mới', value: `${executedData.newWeight} kg` });
            } else if (entities.weight) {
                // Chưa execute - hiển thị từ parsed entities
                rows.push({ label: 'Cân nặng', value: `${entities.weight} kg` });
            }
        }

        // Ngày
        if (entities.date) {
            const dateObj = new Date(entities.date);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            rows.push({ label: 'Ngày', value: isToday ? 'Hôm nay' : entities.date });
        }

        // ASK_CALORIES: hiển thị data thực từ backend
        if (command.intent === 'ASK_CALORIES') {
            if (executedData?.totalCalories !== undefined) {
                // Đã có data từ backend
                rows.push({
                    label: 'Đã tiêu thụ',
                    value: `${Math.round(executedData.totalCalories)} / ${Math.round(executedData.targetCalories || 0)} kcal`,
                });
                if (executedData.remaining !== undefined) {
                    const remaining = Math.round(executedData.remaining);
                    rows.push({
                        label: remaining >= 0 ? 'Còn lại' : 'Vượt quá',
                        value: `${Math.abs(remaining)} kcal`,
                    });
                }
            } else {
                // Chưa execute - hiển thị hướng dẫn
                rows.push({ label: 'Thao tác', value: 'Nhấn xác nhận để xem calories' });
            }
        }

        // ASK_NUTRITION: hiển thị thông báo
        if (command.intent === 'ASK_NUTRITION') {
            rows.push({ label: 'Thông tin', value: 'Sẽ hiển thị thông tin dinh dưỡng' });
        }

        if (rows.length === 0) return null;

        return (
            <View style={styles.entities}>
                {rows.map((row, index) => (
                    <View key={index} style={styles.entityRow}>
                        <ThemedText variant="bodySmall" style={styles.entityLabel}>
                            {row.label}
                        </ThemedText>
                        <ThemedText variant="bodySmall" style={styles.entityValue}>
                            {row.value}
                        </ThemedText>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <Animated.View entering={FadeInUp.springify()}>
            <AppCard style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <ThemedText variant="h4" weight="600">
                            {config.label}
                        </ThemedText>
                    </View>
                    <View style={styles.confidence}>
                        <ThemedText variant="caption" color="textSecondary">
                            {Math.round(command.confidence * 100)}%
                        </ThemedText>
                    </View>
                </View>

                {/* Raw Text */}
                <ThemedText variant="bodySmall" color="muted" style={styles.rawText}>
                    "{command.rawText}"
                </ThemedText>

                {/* Entities */}
                {renderEntities()}

                {/* Execute Button - Logic phụ thuộc vào loại command */}
                {command.intent !== 'UNKNOWN' && (
                    <>
                        {/* ASK_CALORIES: Không cần button vì đã auto-execute */}
                        {command.intent === 'ASK_CALORIES' && executedData?.totalCalories !== undefined && (
                            <ThemedText
                                variant="caption"
                                color="success"
                                style={{ textAlign: 'center', marginTop: theme.spacing.md }}
                            >
                                ✅ Đã lấy thông tin thành công
                            </ThemedText>
                        )}

                        {/* LOG_WEIGHT cần confirm - hiện button xác nhận lưu */}
                        {needsWeightConfirm && executedData?.newWeight && onConfirmWeight && (
                            <Button
                                title={isExecuting ? 'Đang lưu...' : `Xác nhận: ${executedData.newWeight} kg`}
                                variant="primary"
                                onPress={() => onConfirmWeight(executedData.newWeight!)}
                                loading={isExecuting}
                                disabled={isExecuting}
                                fullWidth
                                style={{
                                    marginTop: theme.spacing.md,
                                    minHeight: 52,
                                }}
                            />
                        )}

                        {/* ADD_FOOD và các intent khác: Button execute thông thường */}
                        {command.intent !== 'ASK_CALORIES' && command.intent !== 'LOG_WEIGHT' && (
                            <Button
                                title={isExecuting ? 'Đang thực hiện...' : 'Xác nhận thực hiện'}
                                variant="primary"
                                onPress={onExecute}
                                loading={isExecuting}
                                disabled={isExecuting}
                                fullWidth
                                style={{
                                    marginTop: theme.spacing.md,
                                    minHeight: 52,
                                }}
                            />
                        )}
                    </>
                )}
            </AppCard>
        </Animated.View>
    );
};

export default VoiceResultCard;
