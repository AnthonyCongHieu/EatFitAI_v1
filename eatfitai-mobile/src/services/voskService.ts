/**
 * Vosk Service - Offline Speech Recognition
 * Wrapper for react-native-vosk
 *
 * IMPORTANT: This file is PREPARED CODE.
 * Package react-native-vosk must be installed before use.
 *
 * SETUP:
 * 1. npx expo install react-native-vosk
 * 2. Download model: https://alphacephei.com/vosk/models
 * 3. Place model in: assets/vosk-model-vi/
 * 4. npx expo prebuild
 */

import { VOSK_CONFIG, getVoskModelPath } from '../config/vosk.config';

// Type definitions for Vosk
// These match react-native-vosk API
interface VoskResult {
  text: string;
  partial?: boolean;
}

interface VoskModule {
  loadModel: (path: string) => Promise<void>;
  start: () => void;
  stop: () => Promise<string>;
  unload: () => void;
  onResult: (callback: (result: VoskResult) => void) => void;
  onPartialResult: (callback: (result: VoskResult) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  onTimeout: (callback: () => void) => void;
}

// Placeholder - will be replaced with actual import when package is installed
// import Vosk from 'react-native-vosk';
let Vosk: VoskModule | null = null;

// Try to import Vosk - will fail gracefully if not installed
const loadVoskModule = async (): Promise<boolean> => {
  try {
    // Dynamic import to avoid crash if not installed
    // @ts-ignore - Package may not be installed yet
    const module = await import('react-native-vosk');
    Vosk = module.default || module;
    return true;
  } catch (error) {
    console.warn('[VoskService] react-native-vosk not installed. Using fallback.');
    return false;
  }
};

/**
 * Vosk Service State
 */
interface VoskState {
  isInitialized: boolean;
  isListening: boolean;
  modelLoaded: boolean;
  error: string | null;
}

let state: VoskState = {
  isInitialized: false,
  isListening: false,
  modelLoaded: false,
  error: null,
};

// Callbacks
let onResultCallback: ((text: string) => void) | null = null;
let onPartialCallback: ((text: string) => void) | null = null;
let onErrorCallback: ((error: string) => void) | null = null;

/**
 * Vosk Service API
 */
export const voskService = {
  /**
   * Check if Vosk is available (package installed)
   */
  isAvailable: async (): Promise<boolean> => {
    if (Vosk !== null) return true;
    return await loadVoskModule();
  },

  /**
   * Initialize Vosk and load Vietnamese model
   */
  initialize: async (): Promise<boolean> => {
    try {
      // Check if package is available
      const available = await voskService.isAvailable();
      if (!available || !Vosk) {
        state.error = 'Vosk package not installed';
        console.warn(
          '[VoskService] Package not available. Run: npx expo install react-native-vosk',
        );
        return false;
      }

      // Load model
      const modelPath = getVoskModelPath();
      console.log('[VoskService] Loading model from:', modelPath);

      await Vosk.loadModel(modelPath);

      // Set up callbacks
      Vosk.onResult((result: VoskResult) => {
        console.log('[VoskService] Result:', result.text);
        if (onResultCallback) {
          onResultCallback(result.text);
        }
      });

      Vosk.onPartialResult((result: VoskResult) => {
        if (VOSK_CONFIG.showPartialResults && onPartialCallback) {
          onPartialCallback(result.text);
        }
      });

      Vosk.onError((error: Error) => {
        console.error('[VoskService] Error:', error);
        state.error = error.message;
        if (onErrorCallback) {
          onErrorCallback(error.message);
        }
      });

      Vosk.onTimeout(() => {
        console.log('[VoskService] Timeout - stopping');
        voskService.stop();
      });

      state.isInitialized = true;
      state.modelLoaded = true;
      state.error = null;

      console.log('[VoskService] Initialized successfully');
      return true;
    } catch (error: any) {
      state.error = error?.message || 'Failed to initialize Vosk';
      console.error('[VoskService] Init error:', error);
      return false;
    }
  },

  /**
   * Start listening for speech
   */
  start: (): boolean => {
    if (!state.isInitialized || !Vosk) {
      console.warn('[VoskService] Not initialized');
      return false;
    }

    if (state.isListening) {
      console.warn('[VoskService] Already listening');
      return false;
    }

    try {
      Vosk.start();
      state.isListening = true;
      console.log('[VoskService] Started listening');
      return true;
    } catch (error: any) {
      console.error('[VoskService] Start error:', error);
      return false;
    }
  },

  /**
   * Stop listening and get final result
   */
  stop: async (): Promise<string | null> => {
    if (!state.isListening || !Vosk) {
      return null;
    }

    try {
      const result = await Vosk.stop();
      state.isListening = false;
      console.log('[VoskService] Stopped, final result:', result);
      return result;
    } catch (error: any) {
      console.error('[VoskService] Stop error:', error);
      state.isListening = false;
      return null;
    }
  },

  /**
   * Set callback for final results
   */
  onResult: (callback: (text: string) => void): void => {
    onResultCallback = callback;
  },

  /**
   * Set callback for partial results (while speaking)
   */
  onPartialResult: (callback: (text: string) => void): void => {
    onPartialCallback = callback;
  },

  /**
   * Set callback for errors
   */
  onError: (callback: (error: string) => void): void => {
    onErrorCallback = callback;
  },

  /**
   * Get current state
   */
  getState: (): VoskState => ({ ...state }),

  /**
   * Cleanup / unload model
   */
  cleanup: (): void => {
    if (Vosk && state.modelLoaded) {
      try {
        Vosk.unload();
      } catch (e) {
        // Ignore unload errors
      }
    }
    state = {
      isInitialized: false,
      isListening: false,
      modelLoaded: false,
      error: null,
    };
    onResultCallback = null;
    onPartialCallback = null;
    onErrorCallback = null;
  },
};

export default voskService;
