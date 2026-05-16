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

        if (command.intent === 'ASK_CALORIES') {
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
                error: execResponse.error || 'Không thể lấy thông tin dinh dưỡng.',
              });
            }
          } catch {
            set({ status: 'error', error: 'Không thể lấy thông tin calo.' });
          }
          return;
        }

        if (command.intent === 'ADD_FOOD' || command.intent === 'LOG_WEIGHT') {
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
              error:
                error?.message ||
                'Không thể chuẩn bị bản nháp giọng nói. Vui lòng thử lại.',
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
              ? response.error || 'Không hiểu lệnh. Hãy thử lại.'
              : null,
        });
        return;
      }

      set({
        status: 'idle',
        parsedCommand: null,
        reviewDraft: null,
        error: response.error || 'Không hiểu lệnh. Hãy thử lại.',
      });
    } catch (error: any) {
      console.error('[VoiceStore] Parse error:', error);
      set({
        status: 'error',
        parsedCommand: null,
        reviewDraft: null,
        error: 'Không thể kết nối AI giọng nói. Vui lòng thử lại.',
      });
    }
  },

  async commitReviewDraft() {
    const { reviewDraft } = get();
    if (!reviewDraft || !reviewDraft.canSave) {
      set({
        error:
          reviewDraft?.blockingReason ||
          'Bản nháp chưa đủ thông tin để lưu.',
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
        error: response.error || 'Không thể lưu bản nháp giọng nói.',
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: error?.message || 'Không thể lưu bản nháp giọng nói.',
      });
    }
  },

  async executeCommand() {
    const { parsedCommand } = get();
    if (!parsedCommand || parsedCommand.intent === 'UNKNOWN') {
      set({ error: 'Không có lệnh hợp lệ để thực hiện.' });
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
        error: response.error || 'Không thể thực hiện lệnh.',
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: error?.message || 'Không thể thực hiện lệnh.',
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
        error: response.error || 'Không thể lưu cân nặng.',
      });
    } catch (error: any) {
      set({
        status: 'error',
        error: error?.message || 'Không thể lưu cân nặng.',
      });
    }
  },

  reset: () => set(initialState),
}));

export default useVoiceStore;
