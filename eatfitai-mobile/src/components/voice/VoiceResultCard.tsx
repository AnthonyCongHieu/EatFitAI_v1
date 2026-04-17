import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import Button from '../Button';
import { ThemedText } from '../ThemedText';
import { AppCard } from '../ui/AppCard';
import type { ParsedVoiceCommand, VoiceIntent } from '../../services/voiceService';
import { useAppTheme } from '../../theme/ThemeProvider';
import { TEST_IDS } from '../../testing/testIds';

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

const INTENT_CONFIG: Record<VoiceIntent, { label: string; color: string }> = {
  ADD_FOOD: { label: 'Thêm món ăn', color: '#10B981' },
  LOG_WEIGHT: { label: 'Ghi cân nặng', color: '#3B82F6' },
  ASK_CALORIES: { label: 'Xem calo', color: '#F59E0B' },
  ASK_NUTRITION: { label: 'Xem dinh dưỡng', color: '#8B5CF6' },
  UNKNOWN: { label: 'Không hiểu lệnh', color: '#6B7280' },
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

  const config = INTENT_CONFIG[command.intent] || INTENT_CONFIG.UNKNOWN;
  const needsWeightConfirm =
    executedData?.type === 'LOG_WEIGHT_CONFIRM' && executedData?.requireConfirm;
  const isLowConfidence = command.confidence <= 0 || command.confidence < 0.75;
  const requiresManualReview =
    Boolean(command.reviewRequired) ||
    command.intent === 'ADD_FOOD' ||
    command.intent === 'LOG_WEIGHT' ||
    isLowConfidence;

  const reviewTitle = isLowConfidence
    ? 'Độ tin cậy chưa cao, hãy kiểm tra kỹ trước khi lưu.'
    : 'Voice Beta luôn cần bạn xác nhận trước khi lưu.';
  const reviewBody =
    command.reviewReason ||
    (command.intent === 'ADD_FOOD'
      ? 'Xác nhận lại món ăn, khẩu phần và bữa ăn trước khi ghi nhật ký.'
      : 'Xác nhận lại dữ liệu trước khi tiếp tục.');
  const sourceLabel =
    command.source === 'backend-rule-fallback'
      ? 'Parser dự phòng'
      : command.source === 'ai-provider-proxy'
        ? 'AI provider'
        : command.source;
  const primaryActionLabel =
    command.intent === 'ADD_FOOD' ? 'Xác nhận lưu vào nhật ký' : 'Xác nhận thực hiện';

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
    headerText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    confidence: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    reviewBanner: {
      backgroundColor: isLowConfidence
        ? `${theme.colors.warning}20`
        : isDark
          ? 'rgba(255,255,255,0.06)'
          : `${theme.colors.info}12`,
      borderWidth: 1,
      borderColor: isLowConfidence
        ? `${theme.colors.warning}55`
        : `${theme.colors.info}33`,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    metaPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
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

    if (command.intent === 'ADD_FOOD') {
      if (entities.foods && entities.foods.length > 0) {
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
        const qty = entities.quantity || 1;
        const unit = entities.unit || '';
        const foodDisplay = unit
          ? `${qty} ${unit} ${entities.foodName}`
          : `${qty} ${entities.foodName}`;
        rows.push({ label: 'Món ăn', value: foodDisplay });
      }
    } else if (entities.foodName) {
      rows.push({ label: 'Món ăn', value: entities.foodName });
    }

    if (entities.mealType) {
      rows.push({
        label: 'Bữa ăn',
        value: MEAL_LABELS[entities.mealType] || entities.mealType,
      });
    }

    if (entities.weight && command.intent === 'ADD_FOOD' && !entities.foods) {
      rows.push({ label: 'Khối lượng', value: `${entities.weight}g` });
    }

    if (command.intent === 'LOG_WEIGHT') {
      if (executedData?.currentWeight && executedData?.newWeight) {
        rows.push({ label: 'Cân hiện tại', value: `${executedData.currentWeight} kg` });
        rows.push({ label: 'Cân mới', value: `${executedData.newWeight} kg` });
      } else if (entities.weight) {
        rows.push({ label: 'Cân nặng', value: `${entities.weight} kg` });
      }
    }

    if (entities.date) {
      const dateObj = new Date(entities.date);
      const isToday = dateObj.toDateString() === new Date().toDateString();
      rows.push({ label: 'Ngày', value: isToday ? 'Hôm nay' : entities.date });
    }

    if (command.intent === 'ASK_CALORIES') {
      if (executedData?.totalCalories !== undefined) {
        rows.push({
          label: 'Đã tiêu thụ',
          value: `${Math.round(executedData.totalCalories)} / ${Math.round(
            executedData.targetCalories || 0,
          )} kcal`,
        });
        if (executedData.remaining !== undefined) {
          const remaining = Math.round(executedData.remaining);
          rows.push({
            label: remaining >= 0 ? 'Còn lại' : 'Vượt quá',
            value: `${Math.abs(remaining)} kcal`,
          });
        }
      } else {
        rows.push({ label: 'Thao tác', value: 'Nhấn xác nhận để xem calo.' });
      }
    }

    if (command.intent === 'ASK_NUTRITION') {
      rows.push({ label: 'Thông tin', value: 'Sẽ hiển thị dữ liệu dinh dưỡng.' });
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
      <AppCard style={styles.card} testID={TEST_IDS.voice.resultCard}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText variant="h4" weight="600" style={{ color: config.color }}>
              {config.label}
            </ThemedText>
            {requiresManualReview && (
              <ThemedText variant="caption" color="textSecondary">
                Voice Beta luôn yêu cầu xác nhận trước khi ghi dữ liệu.
              </ThemedText>
            )}
          </View>
          <View style={styles.confidence}>
            <ThemedText variant="caption" color="textSecondary">
              Tin cậy {Math.round(command.confidence * 100)}%
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="bodySmall" color="muted" style={styles.rawText}>
          "{command.rawText}"
        </ThemedText>

        {requiresManualReview && (
          <View style={styles.reviewBanner}>
            <ThemedText variant="bodySmall" weight="600">
              {reviewTitle}
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              {reviewBody}
            </ThemedText>
            {command.suggestedAction && (
              <ThemedText variant="caption" color="textSecondary">
                Gợi ý: {command.suggestedAction}
              </ThemedText>
            )}
            {sourceLabel && (
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <ThemedText variant="caption" color="textSecondary">
                    Nguồn: {sourceLabel}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        )}

        {renderEntities()}

        {command.intent !== 'UNKNOWN' && (
          <>
            {command.intent === 'ASK_CALORIES' &&
              executedData?.totalCalories !== undefined && (
                <ThemedText
                  variant="caption"
                  color="success"
                  style={{ textAlign: 'center', marginTop: theme.spacing.md }}
                >
                  Đã lấy thông tin thành công.
                </ThemedText>
              )}

            {needsWeightConfirm && executedData?.newWeight && onConfirmWeight && (
              <Button
                title={
                  isExecuting
                    ? 'Đang lưu...'
                    : `Xác nhận lưu ${executedData.newWeight} kg`
                }
                variant="primary"
                onPress={() => onConfirmWeight(executedData.newWeight!)}
                loading={isExecuting}
                disabled={isExecuting}
                fullWidth
                style={{
                  marginTop: theme.spacing.md,
                  minHeight: 52,
                }}
                testID={TEST_IDS.voice.confirmWeightButton}
              />
            )}

            {command.intent !== 'ASK_CALORIES' && command.intent !== 'LOG_WEIGHT' && (
              <Button
                title={isExecuting ? 'Đang lưu...' : primaryActionLabel}
                variant="primary"
                onPress={onExecute}
                loading={isExecuting}
                disabled={isExecuting}
                fullWidth
                style={{
                  marginTop: theme.spacing.md,
                  minHeight: 52,
                }}
                testID={TEST_IDS.voice.executeButton}
              />
            )}
          </>
        )}
      </AppCard>
    </Animated.View>
  );
};

export default VoiceResultCard;
