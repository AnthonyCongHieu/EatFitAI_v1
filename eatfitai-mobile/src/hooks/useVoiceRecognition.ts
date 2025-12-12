/**
 * useVoiceRecognition - Hook for handling voice recording
 * Uses expo-av for audio recording
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { useVoiceStore } from '../store/useVoiceStore';
import { voiceService } from '../services/voiceService';

interface UseVoiceRecognitionOptions {
    /** Maximum recording duration in seconds */
    maxDuration?: number;
    /** Auto-stop after silence (not implemented yet) */
    autoStop?: boolean;
}

interface UseVoiceRecognitionReturn {
    isRecording: boolean;
    duration: number;
    amplitude: number;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<string | null>;
    cancelRecording: () => void;
}

export const useVoiceRecognition = (
    options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn => {
    const { maxDuration = 30 } = options;

    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [amplitude, setAmplitude] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const recordingRef = useRef<Audio.Recording | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const amplitudeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { setStatus, processText } = useVoiceStore();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (amplitudeTimerRef.current) clearInterval(amplitudeTimerRef.current);
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, []);

    /**
     * Start voice recording
     */
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setDuration(0);
            setAmplitude(0);

            // Request permissions
            const permissionResult = await Audio.requestPermissionsAsync();
            if (!permissionResult.granted) {
                setError('Cần quyền truy cập microphone');
                return;
            }

            // Set audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Create and start recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            setIsRecording(true);
            setStatus('listening');

            // Haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Duration timer
            timerRef.current = setInterval(() => {
                setDuration((prev) => {
                    if (prev >= maxDuration) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Amplitude meter (for visualization)
            amplitudeTimerRef.current = setInterval(async () => {
                if (recordingRef.current) {
                    try {
                        const status = await recordingRef.current.getStatusAsync();
                        if (status.isRecording && status.metering !== undefined) {
                            // Convert dB to 0-1 range (dB typically -160 to 0)
                            const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
                            setAmplitude(normalized);
                        }
                    } catch {
                        // Ignore errors during metering
                    }
                }
            }, 100);

        } catch (err: any) {
            console.error('[VoiceRecognition] Start error:', err);
            setError('Không thể bắt đầu ghi âm');
            setIsRecording(false);
        }
    }, [maxDuration, setStatus]);

    /**
     * Stop recording and process
     */
    const stopRecording = useCallback(async (): Promise<string | null> => {
        // Clear timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (amplitudeTimerRef.current) {
            clearInterval(amplitudeTimerRef.current);
            amplitudeTimerRef.current = null;
        }

        if (!recordingRef.current) {
            setIsRecording(false);
            return null;
        }

        try {
            setIsRecording(false);
            setStatus('processing');

            // Haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Stop and get URI
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            if (uri) {
                console.log('[VoiceRecognition] Recording saved:', uri);

                // Transcribe using Whisper (via AI Provider)
                setStatus('processing');
                const transcription = await voiceService.transcribeAudio(uri);

                if (transcription.success && transcription.text) {
                    console.log('[VoiceRecognition] Whisper transcribed:', transcription.text);
                    // Parse with Ollama
                    await processText(transcription.text);
                } else {
                    setError(transcription.error || 'Không thể nhận diện giọng nói');
                    setStatus('error');
                }

                return uri;
            }

            return null;
        } catch (err: any) {
            console.error('[VoiceRecognition] Stop error:', err);
            setError('Lỗi khi xử lý ghi âm');
            return null;
        }
    }, [setStatus, processText]);

    /**
     * Cancel recording without processing
     */
    const cancelRecording = useCallback(() => {
        // Clear timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (amplitudeTimerRef.current) {
            clearInterval(amplitudeTimerRef.current);
            amplitudeTimerRef.current = null;
        }

        if (recordingRef.current) {
            recordingRef.current.stopAndUnloadAsync().catch(() => { });
            recordingRef.current = null;
        }

        setIsRecording(false);
        setDuration(0);
        setAmplitude(0);
        setStatus('idle');
    }, [setStatus]);

    return {
        isRecording,
        duration,
        amplitude,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
    };
};

export default useVoiceRecognition;
