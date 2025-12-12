/**
 * Vosk Configuration
 * Configuration for Vosk offline speech recognition
 * 
 * SETUP REQUIRED:
 * 1. npm install react-native-vosk
 * 2. Download Vietnamese model from: https://alphacephei.com/vosk/models
 * 3. Extract to: assets/vosk-model-vi/
 * 4. npx expo prebuild && npx expo run:android
 */

export const VOSK_CONFIG = {
    // Path to model directory (relative to assets)
    modelPath: 'vosk-model-vi',

    // Model download URL (for documentation)
    modelDownloadUrl: 'https://alphacephei.com/vosk/models',

    // Recommended model for Vietnamese
    recommendedModel: 'vosk-model-small-vi-0.4',
    modelSize: '~50MB',

    // Sample rate for audio recording
    sampleRate: 16000,

    // Whether to show partial results while speaking
    showPartialResults: true,

    // Language code
    language: 'vi',

    // Timeout settings (ms)
    timeout: {
        maxSilence: 2000,     // Auto-stop after 2s silence
        maxRecording: 30000,  // Max 30s recording
    },
};

/**
 * Check if Vosk model exists
 * Call this on app startup to verify setup
 */
export const checkVoskModelInstalled = async (): Promise<boolean> => {
    // This will be implemented to check if model files exist
    // For now, return false (not installed yet)
    console.log('[Vosk] Checking model installation...');
    return false;
};

/**
 * Get model path for Vosk initialization
 */
export const getVoskModelPath = (): string => {
    // In production, this will resolve to the actual path
    // Platform-specific path resolution needed
    return VOSK_CONFIG.modelPath;
};

export default VOSK_CONFIG;
