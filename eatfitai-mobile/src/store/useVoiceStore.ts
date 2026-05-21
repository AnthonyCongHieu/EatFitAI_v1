import { create } from 'zustand';

import { useProfileStore } from './useProfileStore';
import voiceService, {
  ParsedVoiceCommand,
  VoiceReviewDraft,
} from '../services/voiceService';

type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'parsing'
  | 'review'
  | 'executing'
  | 'committing'
  | 'success'
  | 'error';

interface VoiceState {
  status: VoiceStatus;
  isSheetOpen: boolean;
  recognizedText: string;
  parsedCommand: ParsedVoiceCommand | null;
  reviewDraft: VoiceReviewDraft | null;
  error: string | null;
  lastExecutedAction: string | null;
  executedData: {
    type?: string;
    details?: string;
    totalCalories?: number;
    targetCalories?: number;
    remaining?: number;
    currentWeight?: number;
    newWeight?: number;
    requireConfirm?: boolean;
    entryCount?: number;
    value?: number;
    nutrient?: string;
    noteText?: string;
  } | null;
  setStatus: (status: VoiceStatus) => void;
  openSheet: () => void;
  closeSheet: () => void;
  setRecognizedText: (text: string) => void;
  setReviewDraft: (draft: VoiceReviewDraft | null) => void;
  processText: (text: string) => Promise<void>;
  commitReviewDraft: () => Promise<void>;
  executeCommand: () => Promise<void>;
  confirmWeight: (weight: number) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as VoiceStatus,
  isSheetOpen: false,
  recognizedText: '',
  parsedCommand: null,
  reviewDraft: null,
  error: null,
  lastExecutedAction: null,
  executedData: null,
};

let voiceRequestSequence = 0;

const refreshProfileAfterWeightUpdate = () => {
  const profileStore = useProfileStore.getState();
  profileStore.invalidateProfile();
  void profileStore.fetchProfile({ force: true }).catch(() => undefined);
};

const TECHNICAL_ERROR_PATTERN =
  /\b(api|backend|provider|parser|proxy|axios|network error|status code|timeout|undefined|null|exception|stack|500|503|404)\b/i;

const toVoiceUserError = (message: string | undefined | null, fallback: string): string => {
  const trimmed = message?.trim();
  if (!trimmed) {
    return fallback;
  }

  return TECHNICAL_ERROR_PATTERN.test(trimmed) ? fallback : trimmed;
};

export const useVoiceStore = create<VoiceState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  openSheet: () => set({ isSheetOpen: true, status: 'listening', error: null }),

  closeSheet: () => set({ isSheetOpen: false, status: 'idle' }),

  setRecognizedText: (text) => set({ recognizedText: text }),
  setReviewDraft: (draft) => set({ reviewDraft: draft }),

  async processText(text) {
    const requestId = ++voiceRequestSequence;
    set({
      status: 'parsing',
      recognizedText: text,
      parsedCommand: null,
      reviewDraft: null,
      executedData: null,
      lastExecutedAction: null,
      error: null,
    });

    try {
      const response = await voiceService.processVoiceText({ text });

      if (response.success && response.command) {
        const command = response.command;
        if (requestId !== voiceRequestSequence) {
          return;
        }

        if (
          command.intent === 'ASK_CALORIES' ||
          command.intent === 'ASK_NUTRITION' ||
          command.intent === 'QUERY_MEAL'
        ) {
          set({ status: 'executing', parsedCommand: command, error: null });

          try {
            const execResponse = await voiceService.executeCommand(command);
            if (execResponse.success && execResponse.executedAction) {
              set({
                status: 'success',
                lastExecutedAction:
                  execResponse.executedAction.details || 'Đã thực hiện.',
                executedData: {
                  type: execResponse.executedAction.type,
                  details: execResponse.executedAction.details,
                  ...execResponse.executedAction.data,
                },
              });
            } else {
              set({
                status: 'error',
                error: toVoiceUserError(
                  execResponse.error,
                  'Chưa lấy được thông tin. Vui lòng thử lại.',
                ),
              });
            }
          } catch {
            set({ status: 'error', error: 'Chưa lấy được thông tin. Vui lòng thử lại.' });
          }
          return;
        }

        if (
          command.intent === 'ADD_FOOD' ||
          command.intent === 'LOG_WEIGHT' ||
          command.intent === 'REPEAT_MEAL' ||
          command.intent === 'ADD_NOTE'
        ) {
          try {
            const reviewDraft = await voiceService.reviewCommand(command);
            if (requestId !== voiceRequestSequence) {
              return;
            }
            set({
              status: 'review',
              parsedCommand: command,
              reviewDraft,
              lastExecutedAction: null,
              executedData: null,
              error: null,
            });
          } catch (error: any) {
            if (requestId !== voiceRequestSequence) {
              return;
            }
            set({
              status: 'error',
              parsedCommand: command,
              reviewDraft: null,
              error: toVoiceUserError(
                error?.message,
                'Chưa chuẩn bị được thông tin để lưu. Vui lòng thử lại.',
              ),
            });
          }
          return;
        }

        set({
          status: command.intent !== 'UNKNOWN' ? 'review' : 'idle',
          parsedCommand: command,
          reviewDraft: null,
          lastExecutedAction: null,
          executedData: null,
          error:
            command.intent === 'UNKNOWN'
              ? toVoiceUserError(
                response.error,
                'Chưa hiểu yêu cầu. Hãy thử nói rõ món, khẩu phần, bữa ăn hoặc điều muốn tra cứu.',
              )
              : null,
        });
        return;
      }

      set({
        status: 'idle',
        parsedCommand: null,
        reviewDraft: null,
        error: toVoiceUserError(
          response.error,
          'Chưa hiểu yêu cầu. Hãy thử nói rõ món, khẩu phần, bữa ăn hoặc điều muốn tra cứu.',
        ),
      });
    } catch (error: any) {
      console.error('[VoiceStore] Parse error:', error);
      set({
        status: 'error',
        parsedCommand: null,
        reviewDraft: null,
        error: 'Tính năng giọng nói đang tạm gián đoạn. Vui lòng thử lại.',
      });
    }
  },

  async commitReviewDraft() {
    const { reviewDraft } = get();
    if (!reviewDraft || !reviewDraft.canSave) {
      set({
        error:
          reviewDraft?.blockingReason ||
          'Thông tin chưa đủ để lưu.',
      });
      return;
    }

    set({ status: 'committing', error: null });

    try {
      const response = await voiceService.commitReview(reviewDraft);

      if (response.success && response.executedAction) {
        if (response.executedAction.type === 'LOG_WEIGHT') {
          refreshProfileAfterWeightUpdate();
        }

        set({
          status: 'success',
          lastExecutedAction: response.executedAction.details || 'Đã thực hiện lệnh.',
          executedData: {
            type: response.executedAction.type,
            details: response.executedAction.details,
            ...response.executedAction.data,
          },
        });
        return;
      }

      set({
        status: 'error',
        error: toVoiceUserError(response.error, 'Chưa lưu được thông tin. Vui lòng thử lại.'),
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: toVoiceUserError(error?.message, 'Chưa lưu được thông tin. Vui lòng thử lại.'),
      });
    }
  },

  async executeCommand() {
    const { parsedCommand } = get();
    if (!parsedCommand || parsedCommand.intent === 'UNKNOWN') {
      set({ error: 'Chưa có yêu cầu rõ ràng để thực hiện.' });
      return;
    }

    set({ status: 'executing', error: null });

    try {
      const response = await voiceService.executeCommand(parsedCommand);

      if (response.success && response.executedAction) {
        set({
          status: 'success',
          lastExecutedAction: response.executedAction.details || 'Đã thực hiện lệnh.',
          executedData: {
            type: response.executedAction.type,
            details: response.executedAction.details,
            ...response.executedAction.data,
          },
        });
        return;
      }

      set({
        status: 'error',
        error: toVoiceUserError(response.error, 'Chưa thực hiện được yêu cầu này.'),
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: toVoiceUserError(error?.message, 'Chưa thực hiện được yêu cầu này.'),
      });
    }
  },

  async confirmWeight(weight) {
    set({ status: 'executing', error: null });

    try {
      const response = await voiceService.confirmWeight(weight);

      if (response.success) {
        refreshProfileAfterWeightUpdate();
        set({
          status: 'success',
          lastExecutedAction:
            response.executedAction?.details || `Đã lưu cân nặng ${weight} kg.`,
          executedData: {
            type: 'LOG_WEIGHT',
            details: response.executedAction?.details,
            ...response.executedAction?.data,
          },
        });
        return;
      }

      set({
        status: 'error',
        error: toVoiceUserError(response.error, 'Chưa lưu được cân nặng.'),
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: toVoiceUserError(error?.message, 'Chưa lưu được cân nặng.'),
      });
    }
  },

  reset: () => set(initialState),
}));

export default useVoiceStore;
