/**
 * VoiceResultCard - Displays parsed voice command result
 * Shows intent, entities, and execute button
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { AppCard } from '../ui/AppCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { ParsedVoiceCommand, VoiceIntent } from '../../services/voiceService';

interface VoiceResultCardProps {
    command: ParsedVoiceCommand;
    onExecute: () => void;
    isExecuting?: boolean;
}

const INTENT_CONFIG: Record<VoiceIntent, { icon: string; emoji: string; label: string; color: string }> = {
    ADD_FOOD: {
        icon: 'restaurant',
        emoji: '🍽️',
        label: 'Thêm món ăn',
        color: '#10B981',
    },
    LOG_WEIGHT: {
        icon: 'scale',
        emoji: '⚖️',
        label: 'Ghi cân nặng',
        color: '#3B82F6',
    },
    ASK_CALORIES: {
        icon: 'flame',
        emoji: '🔥',
        label: 'Xem calories',
        color: '#F59E0B',
    },
    ASK_NUTRITION: {
        icon: 'nutrition',
        emoji: '📊',
        label: 'Xem dinh dưỡng',
        color: '#8B5CF6',
    },
    UNKNOWN: {
        icon: 'help-circle',
        emoji: '❓',
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
    isExecuting = false,
}: VoiceResultCardProps): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Fallback nếu intent không match với INTENT_CONFIG
    const config = INTENT_CONFIG[command.intent] || INTENT_CONFIG.UNKNOWN;

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

        if (entities.foodName) {
            rows.push({ label: 'Món ăn', value: entities.foodName });
        }
        if (entities.quantity) {
            const unit = entities.unit || '';
            rows.push({ label: 'Số lượng', value: `${entities.quantity} ${unit}`.trim() });
        }
        if (entities.mealType) {
            rows.push({ label: 'Bữa ăn', value: MEAL_LABELS[entities.mealType] || entities.mealType });
        }
        if (entities.weight) {
            rows.push({ label: 'Khối lượng', value: `${entities.weight}g` });
        }
        if (entities.date) {
            const dateObj = new Date(entities.date);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            rows.push({ label: 'Ngày', value: isToday ? 'Hôm nay' : entities.date });
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
                    <View style={styles.iconContainer}>
                        <ThemedText style={{ fontSize: 20 }}>{config.emoji}</ThemedText>
                    </View>
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

                {/* Execute Button */}
                {command.intent !== 'UNKNOWN' && (
                    <Button
                        title={isExecuting ? 'Đang thực hiện...' : '✔️ Xác nhận thực hiện'}
                        variant="primary"
                        onPress={onExecute}
                        loading={isExecuting}
                        disabled={isExecuting}
                        fullWidth
                        icon="checkmark-circle"
                        style={{
                            marginTop: theme.spacing.md,
                            minHeight: 52,
                        }}
                    />
                )}
            </AppCard>
        </Animated.View>
    );
};

export default VoiceResultCard;
