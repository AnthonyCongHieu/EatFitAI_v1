import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import Button from '../Button';
import { ThemedText } from '../ThemedText';
import { AppCard } from '../ui/AppCard';
import type {
  ParsedVoiceCommand,
  VoiceFoodCandidate,
  VoiceIntent,
  VoiceReviewDraft,
  VoiceReviewItem,
} from '../../services/voiceService';
import { useAppTheme } from '../../theme/ThemeProvider';
import { TEST_IDS } from '../../testing/testIds';

interface ExecutedData {
  type?: string;
  details?: string;
  totalCalories?: number;
  targetCalories?: number;
  remaining?: number;
  entryCount?: number;
  value?: number;
  nutrient?: string;
  noteText?: string;
}

interface VoiceResultCardProps {
  command: ParsedVoiceCommand;
  onExecute?: () => void;
  onCommit?: () => void;
  onDraftChange?: (draft: VoiceReviewDraft) => void;
  isExecuting?: boolean;
  isCommitting?: boolean;
  executedData?: ExecutedData | null;
  reviewDraft?: VoiceReviewDraft | null;
}

const INTENT_CONFIG: Record<VoiceIntent, { label: string; color: string }> = {
  ADD_FOOD: { label: 'Nhật ký bữa ăn', color: '#10B981' },
  LOG_WEIGHT: { label: 'Cân nặng của bạn', color: '#22C55E' },
  ASK_CALORIES: { label: 'Lượng calo hôm nay', color: '#f7c052' },
  ASK_NUTRITION: { label: 'Dinh dưỡng của bạn', color: '#8B5CF6' },
  QUERY_MEAL: { label: 'Lịch sử ăn uống', color: '#38BDF8' },
  REPEAT_MEAL: { label: 'Ăn lại món cũ', color: '#10B981' },
  ADD_NOTE: { label: 'Lưu ý / Ghi chú', color: '#F59E0B' },
  UNKNOWN: { label: 'Mình chưa hiểu ý bạn lắm', color: '#728099' },
};

const MEAL_OPTIONS = [
  { value: 'Breakfast', label: 'Sáng' },
  { value: 'Lunch', label: 'Trưa' },
  { value: 'Dinner', label: 'Tối' },
  { value: 'Snack', label: 'Phụ' },
];

const P = {
  primary: '#4be277',
  surface: '#05070d',
  surfaceHigh: '#252b3f',
  field: 'rgba(7, 11, 20, 0.42)',
  border: 'rgba(75, 226, 119, 0.18)',
  borderMuted: 'rgba(255,255,255,0.08)',
  text: '#dee1f7',
  muted: '#9aa9c1',
  danger: '#fca5a5',
};

const normalizeMeal = (value?: string | null): string =>
  String(value || '').trim().toLowerCase();

const candidateMacro = (
  candidate: VoiceFoodCandidate | null | undefined,
  key: 'calories' | 'protein' | 'carb' | 'fat',
): number => {
  if (!candidate) return 0;
  if (key === 'calories') return Number(candidate.caloriesPer100 ?? 0) || 0;
  if (key === 'protein') return Number(candidate.proteinPer100 ?? 0) || 0;
  if (key === 'carb') {
    return Number(candidate.carbPer100 ?? candidate.carbsPer100 ?? 0) || 0;
  }
  return Number(candidate.fatPer100 ?? 0) || 0;
};

const calculateTotals = (items: VoiceReviewItem[]) =>
  items.reduce(
    (total, item) => {
      const grams = Number(item.grams) || 0;
      const factor = grams / 100;
      return {
        calories:
          total.calories + Math.round(candidateMacro(item.selectedCandidate, 'calories') * factor * 10) / 10,
        protein:
          total.protein + Math.round(candidateMacro(item.selectedCandidate, 'protein') * factor * 10) / 10,
        carbs:
          total.carbs + Math.round(candidateMacro(item.selectedCandidate, 'carb') * factor * 10) / 10,
        fat:
          total.fat + Math.round(candidateMacro(item.selectedCandidate, 'fat') * factor * 10) / 10,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

const normalizeDraftSaveState = (draft: VoiceReviewDraft): VoiceReviewDraft => {
  const isFoodDraft = draft.intent === 'ADD_FOOD' || draft.intent === 'REPEAT_MEAL';
  const isWeightDraft = draft.intent === 'LOG_WEIGHT';
  const isNoteDraft = draft.intent === 'ADD_NOTE';
  const foodBlocked =
    isFoodDraft &&
    (draft.items.length === 0 ||
      draft.items.some(
        (item) =>
          !item.selectedCandidate ||
          !Number.isFinite(Number(item.grams)) ||
          Number(item.grams) < 1 ||
          Number(item.grams) > 5000,
      ));
  const weight = Number(draft.weight?.newWeight);
  const weightBlocked =
    isWeightDraft && (!Number.isFinite(weight) || weight < 20 || weight > 300);
  const noteBlocked = isNoteDraft && !draft.note?.noteText?.trim();
  const blockingReason =
    draft.blockingReason ||
    draft.warnings[0] ||
    draft.items.flatMap((item) => item.warnings)[0] ||
    (foodBlocked ? 'Bạn nhớ chọn món ăn và điền số gam hợp lệ để mình lưu lại nha.' : undefined) ||
    (weightBlocked ? 'Số cân chưa đúng kìa, bạn nhập từ 20 đến 300 kg nha.' : undefined) ||
    (noteBlocked ? 'Ghi chú đang trống kìa, bạn viết thêm vài chữ nha.' : undefined);

  return {
    ...draft,
    totals: calculateTotals(draft.items),
    canSave: !foodBlocked && !weightBlocked && !noteBlocked,
    blockingReason: !foodBlocked && !weightBlocked && !noteBlocked ? null : blockingReason,
  };
};

export const VoiceResultCard = ({
  command,
  onExecute,
  onCommit,
  onDraftChange,
  isExecuting = false,
  isCommitting = false,
  executedData,
  reviewDraft,
}: VoiceResultCardProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const config = INTENT_CONFIG[command.intent] || INTENT_CONFIG.UNKNOWN;
  const headerCaption = reviewDraft
    ? 'Bạn xem lại thông tin xem đã chuẩn chưa nha!'
    : 'Thông tin nhật ký nè';
  const headerBadge = reviewDraft ? 'Cần bạn xem lại nè' : 'Lưu thành công';

  const styles = StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
      backgroundColor: 'rgba(26,31,47,0.96)',
      borderColor: P.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    headerText: { flex: 1, gap: theme.spacing.xs },
    confidence: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    rawText: {
      fontStyle: 'italic',
      marginBottom: theme.spacing.md,
      color: P.muted,
    },
    reviewBanner: {
      backgroundColor: 'rgba(75,226,119,0.08)',
      borderWidth: 1,
      borderColor: P.border,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: 'BeVietnamPro_700Bold',
      color: P.primary,
    },
    itemPanel: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: P.borderMuted,
      marginBottom: theme.spacing.md,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: 'BeVietnamPro_700Bold',
      color: P.muted,
    },
    field: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: P.field,
      borderWidth: 1,
      borderColor: P.borderMuted,
      color: P.text,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_600SemiBold',
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    segment: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: P.borderMuted,
    },
    segmentActive: {
      backgroundColor: 'rgba(75,226,119,0.14)',
      borderColor: P.border,
    },
    segmentText: {
      color: P.muted,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    segmentTextActive: {
      color: P.primary,
    },
    candidate: {
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: P.borderMuted,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    candidateActive: {
      borderColor: P.border,
      backgroundColor: 'rgba(75,226,119,0.12)',
    },
    candidateName: {
      color: P.text,
      fontSize: 13,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    candidateMeta: {
      marginTop: 2,
      color: P.muted,
      fontSize: 11,
      fontFamily: 'BeVietnamPro_600SemiBold',
    },
    totalPanel: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: theme.radius.md,
      backgroundColor: 'rgba(75,226,119,0.08)',
      borderWidth: 1,
      borderColor: P.border,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    totalItem: { 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    totalValue: {
      color: P.text,
      fontSize: 16,
      fontFamily: 'BeVietnamPro_700Bold',
      textAlign: 'center',
    },
    totalLabel: {
      marginTop: 4,
      color: P.muted,
      fontSize: 10,
      fontFamily: 'BeVietnamPro_700Bold',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    warning: {
      color: P.danger,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_700Bold',
      marginBottom: theme.spacing.sm,
    },
    readOnlyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: P.borderMuted,
    },
  });

  const updateDraft = (nextDraft: VoiceReviewDraft) => {
    onDraftChange?.(normalizeDraftSaveState(nextDraft));
  };

  const updateItem = (
    index: number,
    updater: (item: VoiceReviewItem) => VoiceReviewItem,
  ) => {
    if (!reviewDraft) return;
    updateDraft({
      ...reviewDraft,
      items: reviewDraft.items.map((item, itemIndex) =>
        itemIndex === index ? updater(item) : item,
      ),
    });
  };

  const updateWeight = (value: string) => {
    if (!reviewDraft) return;
    updateDraft({
      ...reviewDraft,
      weight: {
        currentWeight: reviewDraft.weight?.currentWeight,
        newWeight: Number(value) || 0,
      },
    });
  };

  const updateNote = (value: string) => {
    if (!reviewDraft) return;
    updateDraft({
      ...reviewDraft,
      note: {
        targetKind: reviewDraft.note?.targetKind || 'meal',
        existingNote: reviewDraft.note?.existingNote,
        noteText: value,
      },
    });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="h4" weight="600" style={{ color: config.color }}>
            {config.label}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {headerCaption}
          </ThemedText>
        </View>
        <View style={styles.confidence}>
          <ThemedText variant="caption" color="textSecondary">
            {headerBadge}
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="bodySmall" style={styles.rawText}>
        Bạn nói: "{reviewDraft?.rawText ?? command.rawText}"
      </ThemedText>
    </>
  );

  const renderAddFoodDraft = (draft: VoiceReviewDraft) => (
    <>
      <View style={styles.reviewBanner}>
        <ThemedText variant="bodySmall" weight="600" style={{ color: P.primary }}>
          Mình đã soạn sẵn thông tin rồi nè!
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" style={{ lineHeight: 18 }}>
          Bạn xem qua rồi chỉnh lại bữa ăn, số gam, hoặc chọn món cho đúng bên dưới nha!
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Bữa ăn</ThemedText>
        <View style={styles.segmentedRow}>
          {MEAL_OPTIONS.map((meal) => {
            const active = normalizeMeal(draft.mealType) === normalizeMeal(meal.value);
            return (
              <Pressable
                key={meal.value}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => updateDraft({ ...draft, mealType: meal.value })}
              >
                <ThemedText style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {meal.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {draft.items.map((item, index) => (
        <View key={item.clientId || index} style={styles.itemPanel}>
          <ThemedText style={styles.sectionTitle}>{item.foodName || `Món ${index + 1}`}</ThemedText>

          <ThemedText style={styles.fieldLabel}>Khối lượng (gam)</ThemedText>
          <TextInput
            testID={`voice-review-grams-${item.clientId}`}
            value={String(item.grams || '')}
            keyboardType="numeric"
            onChangeText={(value) =>
              updateItem(index, (current) => ({
                ...current,
                grams: Number(value) || 0,
              }))
            }
            style={styles.field}
            placeholderTextColor={P.muted}
          />

          {item.candidates.length > 0 && (
            <>
              <ThemedText style={styles.fieldLabel}>Món ăn phù hợp nhất</ThemedText>
              <View style={styles.section}>
                {item.candidates.map((candidate) => {
                  const active =
                    candidate.id === item.selectedCandidate?.id &&
                    candidate.source === item.selectedCandidate?.source;
                  return (
                    <Pressable
                      key={`${candidate.source}-${candidate.id}`}
                      style={[styles.candidate, active && styles.candidateActive]}
                      onPress={() =>
                        updateItem(index, (current) => ({
                          ...current,
                          selectedCandidate: candidate,
                          foodName: candidate.name,
                        }))
                      }
                    >
                      <ThemedText style={styles.candidateName}>{candidate.name}</ThemedText>
                      <ThemedText style={styles.candidateMeta}>
                        {Math.round(candidate.caloriesPer100 || 0)} kcal/100g
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {item.warnings.map((warning) => (
            <ThemedText key={warning} style={styles.warning}>
              {warning}
            </ThemedText>
          ))}
        </View>
      ))}

      {renderTotals(draft)}
      {renderBlocking(draft)}
      {renderCommitButton(draft, 'Lưu vào nhật ký')}
    </>
  );

  const renderWeightDraft = (draft: VoiceReviewDraft) => (
    <>
      <View style={styles.reviewBanner}>
        <ThemedText variant="bodySmall" weight="600" style={{ color: P.primary }}>
          Cập nhật số cân mới
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" style={{ lineHeight: 18 }}>
          Bạn xác nhận lại số đo cân nặng mới để mình ghi chép giúp nha!
        </ThemedText>
      </View>
      {draft.weight?.currentWeight !== null && draft.weight?.currentWeight !== undefined && (
        <View style={styles.readOnlyRow}>
          <ThemedText variant="bodySmall" color="textSecondary">Hiện tại</ThemedText>
          <ThemedText variant="bodySmall">{draft.weight.currentWeight} kg</ThemedText>
        </View>
      )}
      <View style={styles.section}>
        <ThemedText style={styles.fieldLabel}>Cân nặng mới (kg)</ThemedText>
        <TextInput
          testID="voice-review-weight-input"
          value={String(draft.weight?.newWeight || '')}
          keyboardType="numeric"
          onChangeText={updateWeight}
          style={styles.field}
          placeholderTextColor={P.muted}
        />
      </View>
      {renderBlocking(draft)}
      {renderCommitButton(draft, 'Lưu cân nặng')}
    </>
  );

  const renderNoteDraft = (draft: VoiceReviewDraft) => (
    <>
      <View style={styles.reviewBanner}>
        <ThemedText variant="bodySmall" weight="600" style={{ color: P.primary }}>
          Thêm ghi chú mới nè
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" style={{ lineHeight: 18 }}>
          Ghi lại vài dòng cảm xúc hoặc lưu ý đặc biệt cho ngày hôm nay nha!
        </ThemedText>
      </View>
      <View style={styles.section}>
        <ThemedText style={styles.fieldLabel}>Ghi chú</ThemedText>
        <TextInput
          testID="voice-review-note-input"
          value={draft.note?.noteText || ''}
          onChangeText={updateNote}
          style={[styles.field, { minHeight: 76, textAlignVertical: 'top' }]}
          multiline
          placeholderTextColor={P.muted}
        />
      </View>
      {renderBlocking(draft)}
      {renderCommitButton(draft, 'Lưu ghi chú')}
    </>
  );

  const renderTotals = (draft: VoiceReviewDraft) => {
    const totals = draft.totals || {};
    return (
      <View style={styles.totalPanel}>
        <View style={styles.totalItem}>
          <ThemedText style={styles.totalValue}>{Math.round(totals.calories || 0)}</ThemedText>
          <ThemedText style={styles.totalLabel}>kcal</ThemedText>
        </View>
        <View style={styles.totalItem}>
          <ThemedText style={styles.totalValue}>{Math.round(totals.protein || 0)}g</ThemedText>
          <ThemedText style={styles.totalLabel}>protein</ThemedText>
        </View>
        <View style={styles.totalItem}>
          <ThemedText style={styles.totalValue}>{Math.round((totals.carbs ?? totals.carb) || 0)}g</ThemedText>
          <ThemedText style={styles.totalLabel}>carb</ThemedText>
        </View>
        <View style={styles.totalItem}>
          <ThemedText style={styles.totalValue}>{Math.round(totals.fat || 0)}g</ThemedText>
          <ThemedText style={styles.totalLabel}>fat</ThemedText>
        </View>
      </View>
    );
  };

  const renderBlocking = (draft: VoiceReviewDraft) =>
    draft.blockingReason ? (
      <ThemedText style={styles.warning}>{draft.blockingReason}</ThemedText>
    ) : null;

  const renderCommitButton = (draft: VoiceReviewDraft, title: string) => (
    <Button
      title={isCommitting || isExecuting ? 'Đang lưu...' : title}
      variant="primary"
      onPress={onCommit}
      loading={isCommitting || isExecuting}
      disabled={!draft.canSave || isCommitting || isExecuting}
      fullWidth
      style={{ marginTop: theme.spacing.md, minHeight: 52 }}
      testID="voice-review-commit-button"
    />
  );

  const renderReadOnlyResult = () => (
    <>
      {executedData?.details && command.intent !== 'ASK_CALORIES' ? (
        <>
          <View style={styles.reviewBanner}>
            <ThemedText variant="bodySmall" weight="600">
              {executedData.details}
            </ThemedText>
            {executedData.totalCalories !== undefined && (
              <ThemedText variant="caption" color="textSecondary">
                {Math.round(executedData.totalCalories)} kcal
              </ThemedText>
            )}
          </View>
        </>
      ) : command.intent === 'ASK_CALORIES' && executedData?.totalCalories !== undefined ? (
        <>
          <View style={styles.totalPanel}>
            <View style={styles.totalItem}>
              <ThemedText style={styles.totalValue}>
                {Math.round(executedData.totalCalories)}
              </ThemedText>
              <ThemedText style={styles.totalLabel}>đã dùng</ThemedText>
            </View>
            <View style={styles.totalItem}>
              <ThemedText style={styles.totalValue}>
                {Math.round(executedData.targetCalories || 0)}
              </ThemedText>
              <ThemedText style={styles.totalLabel}>mục tiêu</ThemedText>
            </View>
            <View style={styles.totalItem}>
              <ThemedText style={styles.totalValue}>
                {Math.abs(Math.round(executedData.remaining || 0))}
              </ThemedText>
              <ThemedText style={styles.totalLabel}>
                {(executedData.remaining || 0) >= 0 ? 'còn lại' : 'vượt'}
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="caption" color="success" style={{ textAlign: 'center' }}>
            EatFit đã cập nhật thông tin mới nhất rồi nè!
          </ThemedText>
        </>
      ) : (
        onExecute && (
          <Button
            title={isExecuting ? 'Chờ mình một xíu nhé...' : 'Xem kết quả nhé'}
            variant="primary"
            onPress={onExecute}
            loading={isExecuting}
            disabled={isExecuting}
            fullWidth
            style={{ marginTop: theme.spacing.md, minHeight: 52 }}
            testID={TEST_IDS.voice.executeButton}
          />
        )
      )}
    </>
  );

  return (
    <Animated.View entering={FadeInUp.springify()}>
      <AppCard style={styles.card} testID={TEST_IDS.voice.resultCard}>
        {renderHeader()}
        {(reviewDraft?.intent === 'ADD_FOOD' || reviewDraft?.intent === 'REPEAT_MEAL') && renderAddFoodDraft(reviewDraft)}
        {reviewDraft?.intent === 'LOG_WEIGHT' && renderWeightDraft(reviewDraft)}
        {reviewDraft?.intent === 'ADD_NOTE' && renderNoteDraft(reviewDraft)}
        {!reviewDraft && renderReadOnlyResult()}
      </AppCard>
    </Animated.View>
  );
};

export default VoiceResultCard;
