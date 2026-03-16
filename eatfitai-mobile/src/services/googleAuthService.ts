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
 * 3. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 * 4. Add google-services.json (Android) and GoogleService-Info.plist (iOS)
 * 5. npx expo prebuild
 */

import { GOOGLE_CONFIG, validateGoogleConfig } from '../config/google.config';

// Type definitions for Google Sign-in
interface _GoogleUser {
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
    configure: (config?: any) => void;
    hasPlayServices: (options?: any) => Promise<boolean>;
    signIn: () => Promise<any>; // Changed to any to match actual library
    signInSilently: () => Promise<any | null>;
    signOut: () => Promise<any>;
    revokeAccess: () => Promise<any>;
    getCurrentUser: () => Promise<any | null>;
    isSignedIn?: () => Promise<boolean>;
}

// Placeholder - will be replaced with actual import when package is installed
let GoogleSignin: GoogleSignInModule | null = null;
let statusCodes: any = null;

/**
 * Try to load Google Sign-in module
 */
const loadGoogleModule = async (): Promise<boolean> => {
    try {
        const module = await import('@react-native-google-signin/google-signin');
        GoogleSignin = module.GoogleSignin as any as GoogleSignInModule;
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
                    error: 'Google Sign-in kh\u00f4ng kh\u1ea3 d\u1ee5ng. H\u00e3y c\u00e0i \u0111\u1eb7t package tr\u01b0\u1edbc.',
                };
            }

            // Check Play Services
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in
            const response = await GoogleSignin.signIn();

            // Debug log to inspect the response shape
            console.log('[GoogleAuth] Raw response:', JSON.stringify(response, null, 2));

            // Newer APIs may return data in response.data instead of response.user
            const userInfo = (response as any).data || response;
            const user = userInfo.user || userInfo;

            if (!user || !user.email) {
                console.error('[GoogleAuth] No user email in response:', response);
                return {
                    success: false,
                    error: 'Kh\u00f4ng th\u1ec3 l\u1ea5y th\u00f4ng tin email t\u1eeb Google. Vui l\u00f2ng th\u1eed l\u1ea1i.',
                };
            }

            console.log('[GoogleAuth] Sign in success:', user.email);

            return {
                success: true,
                user: {
                    id: user.id || user.userId || '',
                    email: user.email,
                    name: user.name || user.displayName || null,
                    photo: user.photo || user.photoUrl || null,
                },
                idToken: userInfo.idToken || response.idToken || undefined,
                serverAuthCode: userInfo.serverAuthCode || response.serverAuthCode || undefined,
            };
        } catch (error: any) {
            console.error('[GoogleAuth] Sign in error:', error);

            // Handle specific error codes
            if (statusCodes) {
                if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                    return { success: false, error: '\u0110\u00e3 h\u1ee7y \u0111\u0103ng nh\u1eadp' };
                }
                if (error.code === statusCodes.IN_PROGRESS) {
                    return { success: false, error: '\u0110ang x\u1eed l\u00fd \u0111\u0103ng nh\u1eadp...' };
                }
                if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    return { success: false, error: 'Google Play Services kh\u00f4ng kh\u1ea3 d\u1ee5ng' };
                }
            }

            return {
                success: false,
                error: error?.message || '\u0110\u0103ng nh\u1eadp Google th\u1ea5t b\u1ea1i',
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
            if (!GoogleSignin || !GoogleSignin.isSignedIn) return false;
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
