import { create } from 'zustand';

import { useProfileStore } from './useProfileStore';
import voiceService, { ParsedVoiceCommand } from '../services/voiceService';

type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'parsing'
  | 'review'
  | 'executing'
  | 'success'
  | 'error';

interface VoiceState {
  status: VoiceStatus;
  isSheetOpen: boolean;
  recognizedText: string;
  parsedCommand: ParsedVoiceCommand | null;
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
  processText: (text: string) => Promise<void>;
  executeCommand: () => Promise<void>;
  confirmWeight: (weight: number) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as VoiceStatus,
  isSheetOpen: false,
  recognizedText: '',
  parsedCommand: null,
  error: null,
  lastExecutedAction: null,
  executedData: null,
};

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

  async processText(text) {
    set({
      status: 'parsing',
      recognizedText: text,
      parsedCommand: null,
      executedData: null,
      lastExecutedAction: null,
      error: null,
    });

    try {
      const response = await voiceService.processVoiceText({ text });

      if (response.success && response.command) {
        const command = response.command;

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

        if (command.intent === 'LOG_WEIGHT') {
          set({ status: 'executing', parsedCommand: command, error: null });

          try {
            const execResponse = await voiceService.executeCommand(command);
            if (execResponse.success && execResponse.executedAction) {
              set({
                status: 'review',
                parsedCommand: command,
                lastExecutedAction:
                  execResponse.executedAction.details ||
                  'Kiểm tra trước khi lưu cân nặng.',
                executedData: {
                  type: execResponse.executedAction.type,
                  details: execResponse.executedAction.details,
                  ...execResponse.executedAction.data,
                },
              });
            } else {
              set({
                status: 'error',
                error: execResponse.error || 'Không thể lấy thông tin cân nặng.',
              });
            }
          } catch {
            set({ status: 'error', error: 'Không thể lấy thông tin cân nặng.' });
          }
          return;
        }

        set({
          status: command.intent !== 'UNKNOWN' ? 'review' : 'idle',
          parsedCommand: command,
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
        error: response.error || 'Không hiểu lệnh. Hãy thử lại.',
      });
    } catch (error: any) {
      console.error('[VoiceStore] Parse error:', error);
      set({
        status: 'error',
        parsedCommand: null,
        error: 'Không thể kết nối AI giọng nói. Vui lòng thử lại.',
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
