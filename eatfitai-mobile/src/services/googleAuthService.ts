/**
 * Google Auth Service - Google Sign-in for React Native
 * Wrapper for @react-native-google-signin/google-signin
 * 
 * IMPORTANT: This file is PREPARED CODE.
 * Package must be installed before use.
 * 
 * SETUP:
 * 1. npx expo install @react-native-google-signin/google-signin
 * 2. Configure Google Cloud Console
 * 3. Update google.config.ts with your Client IDs
 * 4. Add google-services.json (Android) and GoogleService-Info.plist (iOS)
 * 5. npx expo prebuild
 */

import { GOOGLE_CONFIG, validateGoogleConfig } from '../config/google.config';

// Type definitions for Google Sign-in
interface GoogleUser {
    user: {
        id: string;
        name: string | null;
        email: string;
        photo: string | null;
        familyName: string | null;
        givenName: string | null;
    };
    idToken: string | null;
    serverAuthCode: string | null;
}

interface GoogleSignInModule {
    configure: (config: any) => void;
    hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
    signIn: () => Promise<GoogleUser>;
    signInSilently: () => Promise<GoogleUser | null>;
    signOut: () => Promise<void>;
    revokeAccess: () => Promise<void>;
    getCurrentUser: () => Promise<GoogleUser | null>;
    isSignedIn: () => Promise<boolean>;
}

// Placeholder - will be replaced with actual import when package is installed
let GoogleSignin: GoogleSignInModule | null = null;
let statusCodes: any = null;

/**
 * Try to load Google Sign-in module
 */
const loadGoogleModule = async (): Promise<boolean> => {
    try {
        // @ts-ignore - Package may not be installed yet
        const module = await import('@react-native-google-signin/google-signin');
        GoogleSignin = module.GoogleSignin;
        statusCodes = module.statusCodes;
        return true;
    } catch (error) {
        console.warn('[GoogleAuth] Package not installed. Using fallback.');
        return false;
    }
};

/**
 * Auth result from Google Sign-in
 */
export interface GoogleAuthResult {
    success: boolean;
    user?: {
        id: string;
        email: string;
        name: string | null;
        photo: string | null;
    };
    idToken?: string;
    serverAuthCode?: string;
    error?: string;
}

/**
 * Google Auth Service
 */
export const googleAuthService = {
    /**
     * Check if Google Sign-in is available
     */
    isAvailable: async (): Promise<boolean> => {
        if (GoogleSignin !== null) return true;
        return await loadGoogleModule();
    },

    /**
     * Configure Google Sign-in
     * Call this once on app startup
     */
    configure: async (): Promise<boolean> => {
        try {
            // Validate config
            const validation = validateGoogleConfig();
            if (!validation.valid) {
                console.error('[GoogleAuth] Config errors:', validation.errors);
                return false;
            }

            // Load module
            const available = await googleAuthService.isAvailable();
            if (!available || !GoogleSignin) {
                console.warn('[GoogleAuth] Package not installed');
                return false;
            }

            // Configure
            GoogleSignin.configure({
                webClientId: GOOGLE_CONFIG.webClientId,
                iosClientId: GOOGLE_CONFIG.iosClientId,
                offlineAccess: GOOGLE_CONFIG.offlineAccess,
                forceCodeForRefreshToken: GOOGLE_CONFIG.forceCodeForRefreshToken,
                scopes: GOOGLE_CONFIG.scopes,
            });

            console.log('[GoogleAuth] Configured successfully');
            return true;
        } catch (error: any) {
            console.error('[GoogleAuth] Configure error:', error);
            return false;
        }
    },

    /**
     * Check if Google Play Services is available (Android only)
     */
    hasPlayServices: async (): Promise<boolean> => {
        if (!GoogleSignin) return false;

        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            return true;
        } catch (error) {
            console.warn('[GoogleAuth] Play Services not available');
            return false;
        }
    },

    /**
     * Sign in with Google
     */
    signIn: async (): Promise<GoogleAuthResult> => {
        try {
            const available = await googleAuthService.isAvailable();
            if (!available || !GoogleSignin) {
                return {
                    success: false,
                    error: 'Google Sign-in không khả dụng. Hãy cài đặt package trước.',
                };
            }

            // Check Play Services
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in
            const userInfo = await GoogleSignin.signIn();

            console.log('[GoogleAuth] Sign in success:', userInfo.user.email);

            return {
                success: true,
                user: {
                    id: userInfo.user.id,
                    email: userInfo.user.email,
                    name: userInfo.user.name,
                    photo: userInfo.user.photo,
                },
                idToken: userInfo.idToken || undefined,
                serverAuthCode: userInfo.serverAuthCode || undefined,
            };
        } catch (error: any) {
            console.error('[GoogleAuth] Sign in error:', error);

            // Handle specific error codes
            if (statusCodes) {
                if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                    return { success: false, error: 'Đã hủy đăng nhập' };
                }
                if (error.code === statusCodes.IN_PROGRESS) {
                    return { success: false, error: 'Đang xử lý đăng nhập...' };
                }
                if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    return { success: false, error: 'Google Play Services không khả dụng' };
                }
            }

            return {
                success: false,
                error: error?.message || 'Đăng nhập Google thất bại',
            };
        }
    },

    /**
     * Try to sign in silently (if user was previously signed in)
     */
    signInSilently: async (): Promise<GoogleAuthResult> => {
        try {
            if (!GoogleSignin) {
                return { success: false, error: 'Package not installed' };
            }

            const userInfo = await GoogleSignin.signInSilently();

            if (!userInfo) {
                return { success: false, error: 'No previous session' };
            }

            return {
                success: true,
                user: {
                    id: userInfo.user.id,
                    email: userInfo.user.email,
                    name: userInfo.user.name,
                    photo: userInfo.user.photo,
                },
                idToken: userInfo.idToken || undefined,
            };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    },

    /**
     * Sign out from Google
     */
    signOut: async (): Promise<boolean> => {
        try {
            if (!GoogleSignin) return true;
            await GoogleSignin.signOut();
            console.log('[GoogleAuth] Signed out');
            return true;
        } catch (error) {
            console.error('[GoogleAuth] Sign out error:', error);
            return false;
        }
    },

    /**
     * Revoke access (disconnect app from Google account)
     */
    revokeAccess: async (): Promise<boolean> => {
        try {
            if (!GoogleSignin) return true;
            await GoogleSignin.revokeAccess();
            await GoogleSignin.signOut();
            return true;
        } catch (error) {
            console.error('[GoogleAuth] Revoke error:', error);
            return false;
        }
    },

    /**
     * Check if user is currently signed in with Google
     */
    isSignedIn: async (): Promise<boolean> => {
        try {
            if (!GoogleSignin) return false;
            return await GoogleSignin.isSignedIn();
        } catch (error) {
            return false;
        }
    },

    /**
     * Get current user (if signed in)
     */
    getCurrentUser: async (): Promise<GoogleAuthResult> => {
        try {
            if (!GoogleSignin) {
                return { success: false, error: 'Not available' };
            }

            const userInfo = await GoogleSignin.getCurrentUser();

            if (!userInfo) {
                return { success: false, error: 'Not signed in' };
            }

            return {
                success: true,
                user: {
                    id: userInfo.user.id,
                    email: userInfo.user.email,
                    name: userInfo.user.name,
                    photo: userInfo.user.photo,
                },
            };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    },
};

export default googleAuthService;
