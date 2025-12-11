/**
 * Google OAuth Configuration
 * Configuration for Google Sign-in
 *
 * SETUP REQUIRED:
 * 1. npm install @react-native-google-signin/google-signin
 * 2. Create project at https://console.cloud.google.com
 * 3. Enable Google Sign-In API
 * 4. Create OAuth 2.0 Client IDs (Web, Android, iOS)
 * 5. Download google-services.json (Android) & GoogleService-Info.plist (iOS)
 * 6. Update app.json with config
 * 7. npx expo prebuild && npx expo run:android
 */

export const GOOGLE_CONFIG = {
  // Web Client ID (used for all platforms in Expo)
  // Replace with your actual Web Client ID from Google Cloud Console
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',

  // iOS Client ID (optional, for iOS-specific features)
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',

  // Scopes to request from Google
  scopes: [
    'profile',
    'email',
    // 'openid', // Included by default
  ],

  // Whether to request server auth code
  offlineAccess: true,

  // Force account selection even if only one account
  forceCodeForRefreshToken: true,
};

/**
 * Validate Google config is set up correctly
 */
export const validateGoogleConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (GOOGLE_CONFIG.webClientId.includes('YOUR_')) {
    errors.push(
      'Web Client ID chưa được cấu hình. Vui lòng cập nhật trong google.config.ts',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Google Cloud Console setup guide
 */
export const GOOGLE_SETUP_GUIDE = `
📋 HƯỚNG DẪN SETUP GOOGLE SIGN-IN:

1. Truy cập Google Cloud Console:
   https://console.cloud.google.com

2. Tạo project mới hoặc chọn project existing

3. Enable API:
   - APIs & Services → Library
   - Tìm "Google Sign-In API" → Enable

4. Tạo OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Điền thông tin app

5. Tạo Credentials:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   
   a) Web application:
      - Name: EatFitAI Web
      - Authorized JavaScript origins: http://localhost
      - Copy Client ID → webClientId

   b) Android:
      - Name: EatFitAI Android
      - Package name: com.eatfitai.app (từ app.json)
      - SHA-1 fingerprint: 
        cd android && ./gradlew signingReport
      
   c) iOS:
      - Name: EatFitAI iOS
      - Bundle ID: com.eatfitai.app

6. Download config files:
   - Android: google-services.json → đặt vào root
   - iOS: GoogleService-Info.plist → đặt vào root

7. Cập nhật webClientId trong file này

8. Rebuild app:
   npx expo prebuild
   npx expo run:android
`;

export default GOOGLE_CONFIG;
