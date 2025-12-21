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
    /** Dữ liệu trả về từ backend sau khi execute (calories, weight, etc.) */
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

    // Actions
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

export const useVoiceStore = create<VoiceState>((set, get) => ({
    ...initialState,

    setStatus: (status: VoiceStatus) => set({ status }),

    openSheet: () => set({ isSheetOpen: true, status: 'listening', error: null }),

    closeSheet: () => set({ isSheetOpen: false, status: 'idle' }),

    setRecognizedText: (text: string) => set({ recognizedText: text }),

    /**
     * Process recognized text and parse intent using Ollama AI
     * ASK_CALORIES sẽ được execute ngay, LOG_WEIGHT cần confirm
     */
    processText: async (text: string) => {
        set({ status: 'parsing', recognizedText: text, error: null });

        try {
            // Parse with Ollama AI
            const response = await voiceService.processVoiceText({ text });

            if (response.success && response.command) {
                const command = response.command;

                // ASK_CALORIES: Auto-execute ngay để hiển thị calories
                if (command.intent === 'ASK_CALORIES') {
                    set({ status: 'executing', parsedCommand: command, error: null });

                    try {
                        const execResponse = await voiceService.executeCommand(command);
                        if (execResponse.success && execResponse.executedAction) {
                            set({
                                status: 'success',
                                lastExecutedAction: execResponse.executedAction.details || 'Đã thực hiện',
                                executedData: {
                                    type: execResponse.executedAction.type,
                                    details: execResponse.executedAction.details,
                                    ...execResponse.executedAction.data,
                                },
                            });
                        } else {
                            set({ status: 'error', error: execResponse.error || 'Không thể lấy thông tin' });
                        }
                    } catch {
                        set({ status: 'error', error: 'Lỗi khi lấy thông tin calories' });
                    }
                    return;
                }

                // LOG_WEIGHT: Execute để lấy current weight, nhưng cần confirm để lưu
                if (command.intent === 'LOG_WEIGHT') {
                    set({ status: 'executing', parsedCommand: command, error: null });

                    try {
                        const execResponse = await voiceService.executeCommand(command);
                        if (execResponse.success && execResponse.executedAction) {
                            set({
                                status: 'success',
                                lastExecutedAction: execResponse.executedAction.details || 'Xác nhận thay đổi cân nặng',
                                executedData: {
                                    type: execResponse.executedAction.type,
                                    details: execResponse.executedAction.details,
                                    ...execResponse.executedAction.data,
                                },
                            });
                        } else {
                            set({ status: 'error', error: execResponse.error || 'Không thể lấy thông tin' });
                        }
                    } catch {
                        set({ status: 'error', error: 'Lỗi khi lấy thông tin cân nặng' });
                    }
                    return;
                }

                // Các intent khác (ADD_FOOD, etc.): Hiển thị và chờ user confirm
                set({
                    status: command.intent !== 'UNKNOWN' ? 'success' : 'idle',
                    parsedCommand: command,
                    error: command.intent === 'UNKNOWN' ? 'Không hiểu lệnh. Hãy thử lại.' : null,
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

            if (response.success && response.executedAction) {
                set({
                    status: 'success',
                    lastExecutedAction: response.executedAction.details || 'Đã thực hiện lệnh',
                    executedData: {
                        type: response.executedAction.type,
                        details: response.executedAction.details,
                        ...response.executedAction.data,
                    },
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

    /**
     * Confirm and save weight after user approval
     */
    confirmWeight: async (weight: number) => {
        set({ status: 'executing', error: null });

        try {
            const response = await voiceService.confirmWeight(weight);

            if (response.success) {
                set({
                    status: 'success',
                    lastExecutedAction: response.executedAction?.details || `Đã lưu cân nặng ${weight}kg`,
                    executedData: {
                        type: 'LOG_WEIGHT',
                        details: response.executedAction?.details,
                        ...response.executedAction?.data,
                    },
                });
            } else {
                set({
                    status: 'error',
                    error: response.error || 'Không thể lưu cân nặng',
                });
            }
        } catch (error: any) {
            set({
                status: 'error',
                error: error?.message || 'Lỗi khi lưu cân nặng',
            });
        }
    },

    reset: () => set(initialState),
}));

export default useVoiceStore;
