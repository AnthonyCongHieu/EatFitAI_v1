/**
 * Voice Store - Zustand state management for Voice AI Assistant
 */

import { create } from 'zustand';
import voiceService, {
    ParsedVoiceCommand,
    VoiceProcessResponse,
    VoiceIntent,
} from '../services/voiceService';

type VoiceStatus =
    | 'idle'           // Sẵn sàng
    | 'listening'      // Đang ghi âm
    | 'processing'     // Đang xử lý STT
    | 'parsing'        // Đang phân tích intent
    | 'executing'      // Đang thực hiện lệnh
    | 'success'        // Hoàn thành
    | 'error';         // Lỗi

interface VoiceState {
    // State
    status: VoiceStatus;
    isSheetOpen: boolean;
    recognizedText: string;
    parsedCommand: ParsedVoiceCommand | null;
    error: string | null;
    lastExecutedAction: string | null;

    // Actions
    setStatus: (status: VoiceStatus) => void;
    openSheet: () => void;
    closeSheet: () => void;
    setRecognizedText: (text: string) => void;
    processText: (text: string) => Promise<void>;
    executeCommand: () => Promise<void>;
    reset: () => void;
}

const initialState = {
    status: 'idle' as VoiceStatus,
    isSheetOpen: false,
    recognizedText: '',
    parsedCommand: null,
    error: null,
    lastExecutedAction: null,
};

export const useVoiceStore = create<VoiceState>((set, get) => ({
    ...initialState,

    setStatus: (status: VoiceStatus) => set({ status }),

    openSheet: () => set({ isSheetOpen: true, status: 'listening', error: null }),

    closeSheet: () => set({ isSheetOpen: false, status: 'idle' }),

    setRecognizedText: (text: string) => set({ recognizedText: text }),

    /**
     * Process recognized text and parse intent using Ollama AI
     */
    processText: async (text: string) => {
        set({ status: 'parsing', recognizedText: text, error: null });

        try {
            // Parse with Ollama AI
            const response = await voiceService.processVoiceText({ text });

            if (response.success && response.command) {
                set({
                    status: response.command.intent !== 'UNKNOWN' ? 'success' : 'idle',
                    parsedCommand: response.command,
                    error: response.command.intent === 'UNKNOWN' ? 'Không hiểu lệnh. Hãy thử lại.' : null,
                });
            } else {
                set({
                    status: 'idle',
                    parsedCommand: null,
                    error: response.error || 'Không hiểu lệnh. Hãy thử lại.',
                });
            }
        } catch (error: any) {
            console.error('[VoiceStore] Parse error:', error);
            set({
                status: 'error',
                parsedCommand: null,
                error: 'Không thể kết nối AI. Vui lòng thử lại.',
            });
        }
    },

    /**
     * Execute the parsed command
     */
    executeCommand: async () => {
        const { parsedCommand } = get();
        if (!parsedCommand || parsedCommand.intent === 'UNKNOWN') {
            set({ error: 'Không có lệnh để thực hiện' });
            return;
        }

        set({ status: 'executing', error: null });

        try {
            const response = await voiceService.executeCommand(parsedCommand);

            if (response.success) {
                set({
                    status: 'success',
                    lastExecutedAction: response.executedAction?.details || 'Đã thực hiện lệnh',
                });
            } else {
                set({
                    status: 'error',
                    error: response.error || 'Không thể thực hiện lệnh',
                });
            }
        } catch (error: any) {
            set({
                status: 'error',
                error: error?.message || 'Lỗi khi thực hiện lệnh',
            });
        }
    },

    reset: () => set(initialState),
}));

export default useVoiceStore;
