# Walkthrough - AI Client Timeout Fix

## Changes Overview
Resolved issues where AI requests (Recipe suggestions, Cooking instructions) would timeout after 10s by switching to specific `aiApiClient` (60s timeout).

### Files Modified
- **[OnboardingScreen.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/app/screens/auth/OnboardingScreen.tsx)**: Updated `calculateNutrition` to extract nutrition targets using the 60s timeout client.
- **[nutrition.ts](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/services/nutrition.ts)**: Switched `suggestNutrition` and `applyNutrition` to use `aiApiClient`.
- **[aiService.ts](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/services/aiService.ts)**: 
  - Updated `suggestRecipes` and `suggestRecipesEnhanced` to use `aiApiClient`.
  - Refactored `getCookingInstructions` to use `aiApiClient` instead of `fetch`, enabling automatic token injection and extending timeout to 60s.

## Verification
- **Lint Check**: Passed (`npm run lint` with strict typescript checking).
- **Manual Check Required**:
  1. Open app > "Thêm món ăn" > "AI Scan" > "Gợi ý món".
  2. Verify creating cooking instructions does not error out immediately.

## UI Animation Refinements
Adjusted spring physics to reduce "bounciness" and improve speed.

### Files Modified
- **[Modal.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/Modal.tsx)**: Increased damping (18 -> 30) and stiffness (400 -> 300) for a "tighter", less bouncy feel.
- **[FAB.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/FAB.tsx)**: Applied same spring config as Modal for consistency.
- **[SmartAddSheet.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/ui/SmartAddSheet.tsx)**: Changed entrance to `springify` for smoother slide-up animation.
- **Other Components**: Applied consistent spring config (`damping: 30`, `stiffness: 300`) to:
  - `ActionSheet.tsx`
  - `IngredientBasketFab.tsx`
  - `Button.tsx`
  - `VoiceInput.tsx`
  - `PressableScale.tsx`

### Verification
- **Manual Check**:
  - Open any Modal: Should feel stable and responsive.
  - Press FAB: Should have subtle press effect without oscillating.
  - Open SmartAdd (+) menu: Should slide up naturally.
