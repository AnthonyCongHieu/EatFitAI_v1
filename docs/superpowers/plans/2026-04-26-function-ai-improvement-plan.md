# Function And AI Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the current normal app functions and AI functions after the visual inventory, while keeping the repo clean and proving the primary path for every core function is stable, not merely covered by fallback behavior.

**Architecture:** Keep the current boundary: Expo mobile calls the ASP.NET Core backend, and the backend proxies AI provider calls. Fallback paths stay as safety nets, but release/readiness must be judged by primary-path success for auth, diary, stats/profile, vision, nutrition, recipe, and voice flows.

**Tech Stack:** Expo / React Native / TypeScript / Jest, ASP.NET Core 9 / xUnit, Flask AI provider, Mermaid docs, Android ADB smoke scripts.

---

## Baseline Checkpoint

- Baseline commit before improvement work: `b22eb74 chore: checkpoint screening baseline`.
- Working tree was clean after the checkpoint.
- Mobile targeted tests passed: `29 passed / 5 suites`.
- Backend targeted tests passed: `60 passed`.
- Mojibake guard passed for docs, mobile source, backend, and AI provider.

Commands already run:

```powershell
npm --prefix .\eatfitai-mobile test -- aiService.test.ts voiceService.test.ts diaryService.test.ts summaryService.test.ts useStatsStore.test.ts
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore --filter "FullyQualifiedName~AIControllerTests|FullyQualifiedName~AIVisionControllerTests|FullyQualifiedName~VoiceControllerTests|FullyQualifiedName~MealDiaryControllerTests|FullyQualifiedName~FoodControllerTests|FullyQualifiedName~AnalyticsControllerTests|FullyQualifiedName~AuthControllerTests|FullyQualifiedName~AiHealthServiceTests|FullyQualifiedName~RecipeSuggestionServiceTests|FullyQualifiedName~VisionCacheServiceTests"
python scripts\cloud\check_mojibake.py docs eatfitai-mobile\src eatfitai-backend ai-provider
```

## Self-Assessment Scorecard

| Area | Score | Current Strength | Main Gap To Improve |
|---|---:|---|---|
| Runtime architecture | 8.5/10 | Mobile -> Backend -> DB/AI boundary is clear and tested. | A few stale comments/names still mention old Ollama/direct flow concepts. |
| Normal app flows | 8.0/10 | Auth, diary, stats, profile, favorites, water, and summary APIs have clear controllers/services/tests. | Docs and tests need a guard so screen inventory cannot drift again. |
| Vision AI | 8.0/10 | Backend proxy, cache, YOLO provider, mapping, teach-label, and add-to-diary review exist. | Review/save logic is embedded in a large screen and needs pure helper tests for unresolved labels and calorie math. |
| Nutrition/recipe AI | 7.5/10 | Gemini-first provider path plus formula fallback exists. | AI availability state should drive clearer mobile UX when provider is down/degraded. |
| Voice AI | 7.0/10 | Backend proxy with rule fallback and review-required behavior exists. | Mobile naming still says `parseWithOllama`, STT is disabled locally, and review messages need more deterministic helper tests. |
| Release/automation | 8.0/10 | Real-device ADB lanes and smoke scripts are present. | The largest automation script needs more focused tests around markers, logcat evidence, and non-fragile waits. |
| Encoding safety | 9.0/10 | Mojibake guard exists and passed. | Keep Vietnamese strings in UTF-8 and include the guard in every validation batch. |

## Primary-Path Stability Requirement

Fallback is not a success criterion. It is useful evidence that the app degrades safely, but the task is not complete until the primary path is proven stable.

Primary-path pass means:

- Auth works through real backend auth, email verification, login, refresh/session bootstrap, and protected route access.
- Normal app functions work through backend and database read/write paths: food search, food detail, custom dish, meal diary create/update/delete/readback, summary/stats, profile/body metrics/goals, favorites, water intake, and telemetry where applicable.
- Vision works through `Mobile -> Backend -> AI provider /detect -> YOLO custom model -> backend food mapping -> review -> diary save/readback`.
- Nutrition, recipe, and cooking AI work through Gemini-backed provider paths when configured. Formula output is allowed only as a safety fallback and must be reported as degraded, not passed.
- Voice parse works through `Mobile -> Backend -> AI provider /voice/parse -> backend execute/readback`. Rule parser fallback is allowed only for resilience and must be reported as degraded, not passed.
- Release evidence must expose `primaryPath.passed` for each protected gate. A run can only be marked release-ready when every required gate has `primaryPath.passed === true`.

## File Structure

- `docs/USERFLOW.md`: keep as the source visual map for current normal and AI functions.
- `eatfitai-mobile/__tests__/userflowDocsInventory.test.js`: new guard that checks important current screens and AI routes are documented.
- `eatfitai-mobile/src/services/voiceService.ts`: rename provider-facing voice parse function without breaking current callers.
- `eatfitai-mobile/__tests__/voiceService.test.ts`: add compatibility and provider naming tests.
- `eatfitai-backend/Controllers/AIController.cs`: fix stale comments and keep provider error behavior unchanged.
- `eatfitai-mobile/src/utils/aiAvailability.ts`: new pure helper for AI status display and feature gating.
- `eatfitai-mobile/__tests__/aiAvailability.test.ts`: unit tests for healthy/degraded/down states.
- `eatfitai-mobile/src/app/screens/ai/AIScanScreen.tsx`: consume AI availability helper for clearer provider-down state.
- `eatfitai-mobile/src/app/screens/ai/NutritionInsightsScreen.tsx`: consume AI availability helper for degraded/offline messaging.
- `eatfitai-mobile/src/app/screens/VoiceScreen.tsx`: consume AI availability helper and voice review helper.
- `eatfitai-mobile/src/utils/visionReview.ts`: pure helper for selected detections, unresolved labels, grams bounds, and total calories.
- `eatfitai-mobile/__tests__/visionReview.test.ts`: unit tests for scan review/save logic.
- `eatfitai-mobile/src/app/screens/meals/AddMealFromVisionScreen.tsx`: replace inline scan review calculations with `visionReview` helpers.
- `eatfitai-mobile/src/utils/voiceCommandReview.ts`: pure helper for voice review requirements and user-facing confirmation text.
- `eatfitai-mobile/__tests__/voiceCommandReview.test.ts`: unit tests for add-food, log-weight, ask-calories, and unknown commands.
- `eatfitai-backend/Tests/Integration/Controllers/VoiceControllerTests.cs`: extend provider fallback contract tests.
- `eatfitai-backend/Tests/Integration/Controllers/AIVisionControllerTests.cs`: extend AI provider-down and cache behavior tests.
- `eatfitai-mobile/scripts/lib/primary-path-readiness.js`: new smoke-report evaluator that fails readiness when a feature only passed through fallback/offline behavior.
- `eatfitai-mobile/__tests__/primaryPathReadiness.test.js`: unit tests for primary-path versus fallback/degraded evidence.
- `eatfitai-mobile/scripts/production-smoke-auth-api.js`: attach auth primary-path readiness for register/verify/login/session coverage.
- `eatfitai-mobile/scripts/production-smoke-user-api.js`: attach normal-function primary-path readiness for profile, food, diary, summary, analytics, water, and favorites coverage.
- `eatfitai-mobile/scripts/production-smoke-ai-api.js`: attach primary-path readiness to `ai-api-report.json` and fail the AI smoke when AI features only hit fallback.
- `eatfitai-mobile/scripts/production-smoke-regression.js`: attach regression primary-path readiness for fixture-driven search, scan, nutrition, and voice cases.
- `eatfitai-mobile/scripts/lib/backend-non-ui-summary.js`: include `primaryPath.passed` in the final cloud functional gate.
- `eatfitai-mobile/__tests__/backendNonUiSummary.test.js`: lock the final summary behavior so fallback/degraded AI does not count as release-ready.
- `docs/TESTING_AND_RELEASE.md`: add the final validation command set after code changes land.

---

### Task 1: Guard The Visual Inventory Against Drift

**Files:**
- Create: `eatfitai-mobile/__tests__/userflowDocsInventory.test.js`
- Test: `eatfitai-mobile/__tests__/userflowDocsInventory.test.js`

- [ ] **Step 1: Write the documentation inventory test**

```javascript
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('USERFLOW current function inventory', () => {
  const userflow = read('docs/USERFLOW.md');

  test('documents current normal app surfaces', () => {
    [
      'Welcome',
      'Login',
      'Register',
      'VerifyEmail',
      'ForgotPassword',
      'Onboarding',
      'Home',
      'MealDiary',
      'FoodSearch',
      'FoodDetail',
      'CustomDish',
      'CommonMeals',
      'Stats',
      'Profile',
      'BodyMetrics',
      'GoalSettings',
      'WeightHistory',
      'ChangePassword',
    ].forEach((screenName) => {
      expect(userflow).toContain(screenName);
    });
  });

  test('documents current AI app surfaces and backend-proxied routes', () => {
    [
      'AIScan',
      'AiCamera',
      'AddMealFromVision',
      'VisionHistory',
      'RecipeSuggestions',
      'RecipeDetail',
      'NutritionInsights',
      'NutritionSettings',
      'DietaryRestrictions',
      'Voice',
      '/api/ai/vision/detect',
      '/api/ai/labels/teach',
      '/api/voice/parse',
      '/api/voice/execute',
      'Không gọi trực tiếp AI provider',
    ].forEach((token) => {
      expect(userflow).toContain(token);
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- userflowDocsInventory.test.js
```

Expected: PASS because `docs/USERFLOW.md` already contains the current visual inventory. If it fails, update only `docs/USERFLOW.md` so the documented inventory matches `AppNavigator.tsx`, `AppTabs.tsx`, and current backend-proxied AI routes.

- [ ] **Step 3: Commit**

```powershell
git add docs\USERFLOW.md eatfitai-mobile\__tests__\userflowDocsInventory.test.js
git commit -m "test: guard userflow function inventory"
```

---

### Task 2: Remove Stale AI Runtime Names Without Breaking Callers

**Files:**
- Modify: `eatfitai-mobile/src/services/voiceService.ts`
- Modify: `eatfitai-mobile/__tests__/voiceService.test.ts`
- Modify: `eatfitai-backend/Controllers/AIController.cs`
- Test: `eatfitai-mobile/__tests__/voiceService.test.ts`
- Test: `eatfitai-backend/Tests/Integration/Controllers/AIControllerTests.cs`

- [ ] **Step 1: Add a voice provider naming test**

Append this test to `eatfitai-mobile/__tests__/voiceService.test.ts`:

```typescript
it('keeps parseWithOllama as a compatibility alias for provider parsing', async () => {
  mockApiClient.post.mockResolvedValueOnce({
    data: {
      intent: 'ADD_FOOD',
      entities: { foodName: 'cơm', mealType: 'lunch' },
      confidence: 0.91,
      rawText: 'thêm cơm bữa trưa',
      source: 'ai-provider-proxy',
    },
  });

  const commandFromNewName = await voiceService.parseWithProvider('thêm cơm bữa trưa');

  mockApiClient.post.mockResolvedValueOnce({
    data: {
      intent: 'ADD_FOOD',
      entities: { foodName: 'cơm', mealType: 'lunch' },
      confidence: 0.91,
      rawText: 'thêm cơm bữa trưa',
      source: 'ai-provider-proxy',
    },
  });

  const commandFromAlias = await voiceService.parseWithOllama('thêm cơm bữa trưa');

  expect(commandFromNewName.source).toBe('ai-provider-proxy');
  expect(commandFromAlias).toEqual(commandFromNewName);
  expect(mockApiClient.post).toHaveBeenCalledWith('/api/voice/parse', {
    text: 'thêm cơm bữa trưa',
    language: 'vi',
  });
});
```

- [ ] **Step 2: Run the test to verify it fails before the rename**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- voiceService.test.ts
```

Expected before implementation: FAIL with `voiceService.parseWithProvider is not a function`.

- [ ] **Step 3: Add the new function and keep the old alias**

In `eatfitai-mobile/src/services/voiceService.ts`, rename the existing `parseWithOllama` implementation to `parseWithProvider`, then add this alias below it inside `voiceService`:

```typescript
  async parseWithOllama(text: string): Promise<ParsedVoiceCommand> {
    return this.parseWithProvider(text);
  },
```

Keep the request path as `/api/voice/parse` and keep `source: data.source || 'backend-proxy'`.

- [ ] **Step 4: Fix stale backend comment only**

In `eatfitai-backend/Controllers/AIController.cs`, replace the stale comment above nutrition recalculation:

```csharp
// Gọi AI Provider để tính toán bằng Ollama (không dùng công thức local)
```

with:

```csharp
// Gọi AI Provider để tính mục tiêu dinh dưỡng bằng provider AI hiện tại.
```

No runtime behavior changes in this step.

- [ ] **Step 5: Run targeted tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- voiceService.test.ts
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore --filter "FullyQualifiedName~AIControllerTests"
python scripts\cloud\check_mojibake.py eatfitai-mobile\src eatfitai-backend
```

Expected: all pass, mojibake guard reports no markers.

- [ ] **Step 6: Commit**

```powershell
git add eatfitai-mobile\src\services\voiceService.ts eatfitai-mobile\__tests__\voiceService.test.ts eatfitai-backend\Controllers\AIController.cs
git commit -m "refactor: clarify voice ai provider naming"
```

---

### Task 3: Add A Pure AI Availability Helper

**Files:**
- Create: `eatfitai-mobile/src/utils/aiAvailability.ts`
- Create: `eatfitai-mobile/__tests__/aiAvailability.test.ts`
- Test: `eatfitai-mobile/__tests__/aiAvailability.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { getAiFeatureAvailability } from '../src/utils/aiAvailability';
import type { AiHealthStatus } from '../src/types/ai';

const baseStatus: AiHealthStatus = {
  state: 'HEALTHY',
  providerUrl: 'https://ai.example.com',
  lastCheckedAt: '2026-04-26T00:00:00Z',
  lastHealthyAt: '2026-04-26T00:00:00Z',
  consecutiveFailures: 0,
  modelLoaded: true,
  geminiConfigured: true,
  message: null,
};

describe('getAiFeatureAvailability', () => {
  it('allows all AI features when provider is healthy and configured', () => {
    expect(getAiFeatureAvailability(baseStatus, 'vision')).toEqual({
      state: 'available',
      canUseAi: true,
      allowsManualFallback: true,
      title: 'AI sẵn sàng',
      message: null,
    });
  });

  it('blocks vision when provider is down', () => {
    expect(
      getAiFeatureAvailability({ ...baseStatus, state: 'DOWN' }, 'vision'),
    ).toMatchObject({
      state: 'blocked',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI tạm offline',
    });
  });

  it('marks nutrition degraded when Gemini is not configured', () => {
    expect(
      getAiFeatureAvailability({ ...baseStatus, geminiConfigured: false }, 'nutrition'),
    ).toMatchObject({
      state: 'degraded',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI dinh dưỡng chưa sẵn sàng',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- aiAvailability.test.ts
```

Expected before implementation: FAIL with `Cannot find module '../src/utils/aiAvailability'`.

- [ ] **Step 3: Implement the helper**

Create `eatfitai-mobile/src/utils/aiAvailability.ts`:

```typescript
import type { AiHealthStatus } from '../types/ai';

export type AiFeature = 'vision' | 'nutrition' | 'voice' | 'cooking';

export type AiFeatureAvailability = {
  state: 'available' | 'degraded' | 'blocked';
  canUseAi: boolean;
  allowsManualFallback: boolean;
  title: string;
  message: string | null;
};

export function getAiFeatureAvailability(
  status: AiHealthStatus | null | undefined,
  feature: AiFeature,
): AiFeatureAvailability {
  if (!status || status.state === 'DOWN') {
    return {
      state: 'blocked',
      canUseAi: false,
      allowsManualFallback: true,
      title: 'AI tạm offline',
      message: 'Bạn vẫn có thể nhập hoặc tìm món thủ công.',
    };
  }

  if ((feature === 'vision' && !status.modelLoaded) || status.state === 'DEGRADED') {
    return {
      state: 'degraded',
      canUseAi: feature !== 'vision',
      allowsManualFallback: true,
      title: 'AI chưa ổn định',
      message: status.message ?? 'Một số tính năng AI có thể phản hồi chậm.',
    };
  }

  if (
    (feature === 'nutrition' || feature === 'voice' || feature === 'cooking') &&
    !status.geminiConfigured
  ) {
    return {
      state: 'degraded',
      canUseAi: false,
      allowsManualFallback: true,
      title: feature === 'nutrition'
        ? 'AI dinh dưỡng chưa sẵn sàng'
        : 'AI ngôn ngữ chưa sẵn sàng',
      message: 'Backend sẽ dùng dữ liệu có sẵn hoặc parser dự phòng khi có thể.',
    };
  }

  return {
    state: 'available',
    canUseAi: true,
    allowsManualFallback: true,
    title: 'AI sẵn sàng',
    message: null,
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- aiAvailability.test.ts aiService.test.ts voiceService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add eatfitai-mobile\src\utils\aiAvailability.ts eatfitai-mobile\__tests__\aiAvailability.test.ts
git commit -m "feat: add ai availability helper"
```

---

### Task 4: Apply AI Availability To User-Facing AI Screens

**Files:**
- Modify: `eatfitai-mobile/src/app/screens/ai/AIScanScreen.tsx`
- Modify: `eatfitai-mobile/src/app/screens/ai/NutritionInsightsScreen.tsx`
- Modify: `eatfitai-mobile/src/app/screens/VoiceScreen.tsx`
- Test: `eatfitai-mobile/__tests__/aiService.test.ts`
- Test: `eatfitai-mobile/__tests__/voiceService.test.ts`

- [ ] **Step 1: Verify existing AI status hook**

Read `eatfitai-mobile/src/hooks/useAiStatus.ts` and confirm it returns the current `AiHealthStatus` or equivalent data used by screens. Use that hook; do not create a second network fetch path.

- [ ] **Step 2: Add AIScan blocked state**

In `AIScanScreen.tsx`, import and compute:

```typescript
import { getAiFeatureAvailability } from '../../../utils/aiAvailability';

const availability = getAiFeatureAvailability(aiStatus, 'vision');
```

Before upload/detect starts, block vision detection when `!availability.canUseAi`:

```typescript
if (!availability.canUseAi) {
  Toast.show({
    type: 'info',
    text1: availability.title,
    text2: availability.message ?? 'Bạn có thể tìm món thủ công.',
  });
  navigation.navigate('FoodSearch');
  return;
}
```

Keep manual search fallback available. Do not remove the backend 503 handling because the provider can go down after the status check.

- [ ] **Step 3: Add NutritionInsights degraded message**

In `NutritionInsightsScreen.tsx`, compute:

```typescript
const availability = getAiFeatureAvailability(aiStatus, 'nutrition');
```

When `availability.state !== 'available'`, render the existing error/info component with:

```typescript
title={availability.title}
message={availability.message ?? 'EatFitAI sẽ dùng dữ liệu hiện có khi AI chưa sẵn sàng.'}
```

Do not block viewing cached/offline nutrition data.

- [ ] **Step 4: Add Voice degraded message**

In `VoiceScreen.tsx`, compute:

```typescript
const availability = getAiFeatureAvailability(aiStatus, 'voice');
```

When the user submits text and `availability.state === 'blocked'`, still allow `/api/voice/parse` because backend has rule fallback, but show:

```typescript
Toast.show({
  type: 'info',
  text1: availability.title,
  text2: 'Mình sẽ thử parser dự phòng và yêu cầu bạn xác nhận trước khi lưu.',
});
```

- [ ] **Step 5: Run focused mobile tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- aiAvailability.test.ts aiService.test.ts voiceService.test.ts
npm --prefix .\eatfitai-mobile run typecheck
```

Expected: tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```powershell
git add eatfitai-mobile\src\app\screens\ai\AIScanScreen.tsx eatfitai-mobile\src\app\screens\ai\NutritionInsightsScreen.tsx eatfitai-mobile\src\app\screens\VoiceScreen.tsx
git commit -m "feat: surface ai availability in mobile flows"
```

---

### Task 5: Extract And Test Vision Review Logic

**Files:**
- Create: `eatfitai-mobile/src/utils/visionReview.ts`
- Create: `eatfitai-mobile/__tests__/visionReview.test.ts`
- Modify: `eatfitai-mobile/src/app/screens/meals/AddMealFromVisionScreen.tsx`
- Test: `eatfitai-mobile/__tests__/visionReview.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import {
  buildVisionReviewItems,
  calculateVisionReviewCalories,
  getVisionReviewSaveBlocker,
} from '../src/utils/visionReview';

describe('visionReview helpers', () => {
  const matchedItem = {
    label: 'rice',
    confidence: 0.92,
    foodItemId: 12,
    foodName: 'Cơm trắng',
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    fatPer100g: 0.3,
    carbPer100g: 28,
    thumbNail: null,
    isMatched: true,
  };

  const unresolvedItem = {
    ...matchedItem,
    label: 'unknown_food',
    foodItemId: null,
    foodName: null,
    isMatched: false,
  };

  it('selects matched items by default and leaves unresolved items unselected', () => {
    expect(buildVisionReviewItems([matchedItem, unresolvedItem])).toEqual([
      { item: matchedItem, selected: true, grams: 100 },
      { item: unresolvedItem, selected: false, grams: 100 },
    ]);
  });

  it('calculates calories from selected grams only', () => {
    const items = [
      { item: matchedItem, selected: true, grams: 150 },
      { item: unresolvedItem, selected: false, grams: 300 },
    ];

    expect(calculateVisionReviewCalories(items)).toBe(195);
  });

  it('blocks saving when a selected item has no food id', () => {
    const items = [{ item: unresolvedItem, selected: true, grams: 100 }];

    expect(getVisionReviewSaveBlocker(items)).toBe(
      'Hãy đổi món bằng Search hoặc bỏ chọn món chưa được map.',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- visionReview.test.ts
```

Expected before implementation: FAIL with `Cannot find module '../src/utils/visionReview'`.

- [ ] **Step 3: Implement the helper**

Create `eatfitai-mobile/src/utils/visionReview.ts`:

```typescript
import type { MappedFoodItem } from '../types/ai';

export type VisionReviewItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
};

export const buildVisionReviewItems = (
  items: MappedFoodItem[],
): VisionReviewItem[] =>
  items.map((item) => ({
    item,
    selected: item.isMatched,
    grams: 100,
  }));

export const clampVisionGrams = (grams: number): number =>
  Math.min(1000, Math.max(25, grams));

export const calculateVisionReviewCalories = (
  items: VisionReviewItem[],
): number =>
  items
    .filter((item) => item.selected)
    .reduce(
      (sum, detection) =>
        sum + ((detection.item.caloriesPer100g ?? 0) * detection.grams) / 100,
      0,
    );

export const getVisionReviewSaveBlocker = (
  items: VisionReviewItem[],
): string | null => {
  const selectedItems = items.filter((item) => item.selected);

  if (selectedItems.length === 0) {
    return 'Hãy chọn ít nhất một món để lưu.';
  }

  const hasUnresolvedItem = selectedItems.some(
    (detection) =>
      !detection.item.foodItemId || Number(detection.item.foodItemId) <= 0,
  );

  return hasUnresolvedItem
    ? 'Hãy đổi món bằng Search hoặc bỏ chọn món chưa được map.'
    : null;
};
```

- [ ] **Step 4: Replace inline logic in AddMealFromVisionScreen**

In `AddMealFromVisionScreen.tsx`, replace local `DetectionItem`, `toDetectionItems`, calorie reduce, and unresolved save check with imports:

```typescript
import {
  buildVisionReviewItems,
  calculateVisionReviewCalories,
  clampVisionGrams,
  getVisionReviewSaveBlocker,
  type VisionReviewItem,
} from '../../../utils/visionReview';
```

Use:

```typescript
const [detectionItems, setDetectionItems] = useState<VisionReviewItem[]>(() =>
  buildVisionReviewItems(result.items),
);

const totalCalories = useMemo(
  () => calculateVisionReviewCalories(selectedItems),
  [selectedItems],
);
```

Use `clampVisionGrams(current.grams + delta)` in `handleAdjustGrams`.

Use this save blocker before submit:

```typescript
const blocker = getVisionReviewSaveBlocker(detectionItems);
if (blocker) {
  Toast.show({
    type: 'info',
    text1: selectedItems.length === 0 ? 'Chưa chọn món' : 'Còn món cần sửa',
    text2: blocker,
  });
  return;
}
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- visionReview.test.ts aiService.test.ts diaryService.test.ts
npm --prefix .\eatfitai-mobile run typecheck
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add eatfitai-mobile\src\utils\visionReview.ts eatfitai-mobile\__tests__\visionReview.test.ts eatfitai-mobile\src\app\screens\meals\AddMealFromVisionScreen.tsx
git commit -m "refactor: test vision review save logic"
```

---

### Task 6: Extract And Test Voice Review Logic

**Files:**
- Create: `eatfitai-mobile/src/utils/voiceCommandReview.ts`
- Create: `eatfitai-mobile/__tests__/voiceCommandReview.test.ts`
- Modify: `eatfitai-mobile/src/app/screens/VoiceScreen.tsx`
- Test: `eatfitai-mobile/__tests__/voiceCommandReview.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import {
  getVoiceReviewMessage,
  shouldRequireVoiceConfirmation,
} from '../src/utils/voiceCommandReview';

describe('voice command review helpers', () => {
  it('requires confirmation for add-food commands even when confidence is high', () => {
    expect(
      shouldRequireVoiceConfirmation({
        intent: 'ADD_FOOD',
        confidence: 0.95,
        entities: { foodName: 'cơm', mealType: 'lunch' },
        rawText: 'thêm cơm bữa trưa',
      }),
    ).toBe(true);
  });

  it('does not require confirmation for ask-calories commands', () => {
    expect(
      shouldRequireVoiceConfirmation({
        intent: 'ASK_CALORIES',
        confidence: 0.83,
        entities: {},
        rawText: 'hôm nay bao nhiêu calo',
      }),
    ).toBe(false);
  });

  it('uses backend review reason before generic copy', () => {
    expect(
      getVoiceReviewMessage({
        intent: 'ADD_FOOD',
        confidence: 0.2,
        entities: {},
        rawText: 'thêm gì đó',
        reviewRequired: true,
        reviewReason: 'AI parse chưa đủ dữ liệu.',
      }),
    ).toBe('AI parse chưa đủ dữ liệu.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- voiceCommandReview.test.ts
```

Expected before implementation: FAIL with missing module.

- [ ] **Step 3: Implement helper**

Create `eatfitai-mobile/src/utils/voiceCommandReview.ts`:

```typescript
import type { ParsedVoiceCommand } from '../services/voiceService';

export function shouldRequireVoiceConfirmation(command: ParsedVoiceCommand): boolean {
  if (command.intent === 'UNKNOWN' || command.intent === 'ASK_CALORIES') {
    return false;
  }

  if (command.reviewRequired) {
    return true;
  }

  return command.intent === 'ADD_FOOD' || command.intent === 'LOG_WEIGHT';
}

export function getVoiceReviewMessage(command: ParsedVoiceCommand): string | null {
  if (!shouldRequireVoiceConfirmation(command)) {
    return null;
  }

  if (command.reviewReason?.trim()) {
    return command.reviewReason.trim();
  }

  if (command.confidence <= 0 || command.confidence < 0.75) {
    return 'Độ tin cậy chưa cao. Hãy kiểm tra trước khi lưu.';
  }

  return 'Voice Beta cần bạn xác nhận trước khi lưu.';
}
```

- [ ] **Step 4: Use helper in VoiceScreen**

In `VoiceScreen.tsx`, replace duplicated review-message conditionals with:

```typescript
import {
  getVoiceReviewMessage,
  shouldRequireVoiceConfirmation,
} from '../../utils/voiceCommandReview';
```

Use `shouldRequireVoiceConfirmation(command)` to decide whether the confirmation UI is shown. Use `getVoiceReviewMessage(command)` for the explanatory text.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- voiceCommandReview.test.ts voiceService.test.ts
npm --prefix .\eatfitai-mobile run typecheck
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add eatfitai-mobile\src\utils\voiceCommandReview.ts eatfitai-mobile\__tests__\voiceCommandReview.test.ts eatfitai-mobile\src\app\screens\VoiceScreen.tsx
git commit -m "refactor: test voice command review logic"
```

---

### Task 7: Tighten Backend AI Error Contracts

**Files:**
- Modify: `eatfitai-backend/Tests/Integration/Controllers/AIVisionControllerTests.cs`
- Modify: `eatfitai-backend/Tests/Integration/Controllers/VoiceControllerTests.cs`
- Modify: `eatfitai-backend/Controllers/AIController.cs`
- Modify: `eatfitai-backend/Controllers/VoiceController.cs`
- Test: backend AI/voice controller tests

- [ ] **Step 1: Add provider-down vision contract test**

Add a test in `AIVisionControllerTests.cs` that asserts provider-down returns a stable error code and does not try to parse provider output:

```csharp
[Fact]
public async Task DetectVision_WhenProviderDown_ReturnsServiceUnavailableContract()
{
    using var host = await IntegrationTestHost.CreateAsync();
    host.SetAiHealthStateForTests("DOWN", "AI provider unavailable");
    var client = host.CreateAuthenticatedClient();

    using var content = new MultipartFormDataContent();
    content.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "file", "food.jpg");

    using var response = await client.PostAsync("/api/ai/vision/detect", content);
    var body = await response.Content.ReadAsStringAsync();

    Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    Assert.Contains("ai_provider_down", body);
    Assert.Contains("AI provider", body);
}
```

If `IntegrationTestHost` does not expose `SetAiHealthStateForTests`, add a test-only service override in `IntegrationTestHost` rather than modifying production service behavior.

- [ ] **Step 2: Add voice provider fallback contract test**

Add a test in `VoiceControllerTests.cs`:

```csharp
[Fact]
public async Task Parse_WhenProviderUnavailable_ReturnsRuleFallbackWithReview()
{
    using var host = await IntegrationTestHost.CreateAsync();
    host.MockAiProviderFailureForTests("/voice/parse", HttpStatusCode.ServiceUnavailable);
    var client = host.CreateAuthenticatedClient();

    using var response = await client.PostAsJsonAsync("/api/voice/parse", new
    {
        text = "thêm 100g cơm bữa trưa",
        language = "vi"
    });
    var body = await response.Content.ReadAsStringAsync();

    response.EnsureSuccessStatusCode();
    Assert.Contains("backend-rule-fallback", body);
    Assert.Contains("reviewRequired", body);
}
```

If the current host helper uses a different mock API, adapt only the setup line and keep the assertions intact.

- [ ] **Step 3: Run tests to verify current behavior**

Run:

```powershell
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore --filter "FullyQualifiedName~AIVisionControllerTests|FullyQualifiedName~VoiceControllerTests"
```

Expected before implementation: either PASS if the contracts already exist, or FAIL showing the missing test helper/contract gap.

- [ ] **Step 4: Implement minimal contract fixes**

Keep behavior stable:

- Vision provider down returns HTTP 503 with `error = "ai_provider_down"`.
- Voice provider failure returns HTTP 200 with `source = "backend-rule-fallback"` and `reviewRequired = true` for write intents.
- Internal auth failure still returns 503 and does not fall back silently.

Use `ErrorResponseHelper.SafeError(...)` where the controller currently builds ad hoc unsafe payloads. Preserve all existing Vietnamese user-facing strings.

- [ ] **Step 5: Run backend tests**

Run:

```powershell
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore --filter "FullyQualifiedName~AIVisionControllerTests|FullyQualifiedName~VoiceControllerTests|FullyQualifiedName~AIControllerTests"
python scripts\cloud\check_mojibake.py eatfitai-backend
```

Expected: PASS and no mojibake markers.

- [ ] **Step 6: Commit**

```powershell
git add eatfitai-backend\Tests\Integration\Controllers\AIVisionControllerTests.cs eatfitai-backend\Tests\Integration\Controllers\VoiceControllerTests.cs eatfitai-backend\Controllers\AIController.cs eatfitai-backend\Controllers\VoiceController.cs
git commit -m "test: lock ai provider error contracts"
```

---

### Task 8: Strengthen Real-Device Evidence Tests

**Files:**
- Modify: `eatfitai-mobile/__tests__/deviceAutomationMarkers.test.js`
- Modify: `eatfitai-mobile/__tests__/rcUnblockHelpers.test.js`
- Modify: `eatfitai-mobile/scripts/real-device-adb-flow.js`
- Modify: `eatfitai-mobile/scripts/lib/device-logcat.js`
- Modify: `docs/TESTING_AND_RELEASE.md`
- Test: mobile automation tests

- [ ] **Step 1: Add marker test for every main function**

Extend `deviceAutomationMarkers.test.js` with the current visible function groups:

```javascript
const expectedMainFlowMarkers = [
  'home-screen',
  'meal-diary-screen',
  'food-search-screen',
  'ai-scan-screen',
  'voice-screen',
  'stats-screen',
  'profile-screen',
];

test('real-device smoke covers every current main function group', () => {
  const script = readScript('scripts/real-device-adb-flow.js');

  expectedMainFlowMarkers.forEach((marker) => {
    expect(script).toContain(marker);
  });
});
```

- [ ] **Step 2: Add logcat evidence test**

Extend `rcUnblockHelpers.test.js`:

```javascript
test('device logcat helper redacts token-like values', () => {
  const { redactLogcatLine } = require('../scripts/lib/device-logcat');

  expect(
    redactLogcatLine('Authorization: Bearer abc.def.ghi and token=secret-value'),
  ).toBe('Authorization: Bearer [REDACTED] and token=[REDACTED]');
});
```

- [ ] **Step 3: Run test to verify any missing helper behavior**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- deviceAutomationMarkers.test.js rcUnblockHelpers.test.js
```

Expected before implementation: FAIL only if `redactLogcatLine` is not exported or redaction is incomplete.

- [ ] **Step 4: Implement minimal logcat export/redaction**

In `eatfitai-mobile/scripts/lib/device-logcat.js`, export:

```javascript
function redactLogcatLine(line) {
  return String(line)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]')
    .replace(/token=([^&\s]+)/gi, 'token=[REDACTED]');
}

module.exports = {
  redactLogcatLine,
};
```

Keep any existing exports by adding `redactLogcatLine` to the existing export object instead of replacing it.

- [ ] **Step 5: Document final real-device command set**

In `docs/TESTING_AND_RELEASE.md`, add this command block under the real-device RC lane:

```powershell
npm --prefix .\eatfitai-mobile run device:doctor:android
npm --prefix .\eatfitai-mobile run device:full-tab-ui-smoke:android
npm --prefix .\eatfitai-mobile run device:scan-save-readback:android
npm --prefix .\eatfitai-mobile run device:voice-text-readback:android
npm --prefix .\eatfitai-mobile run device:stats-profile-smoke:android
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- deviceAutomationMarkers.test.js rcUnblockHelpers.test.js
python scripts\cloud\check_mojibake.py docs eatfitai-mobile\scripts
```

Expected: PASS and no mojibake markers.

- [ ] **Step 7: Commit**

```powershell
git add eatfitai-mobile\__tests__\deviceAutomationMarkers.test.js eatfitai-mobile\__tests__\rcUnblockHelpers.test.js eatfitai-mobile\scripts\real-device-adb-flow.js eatfitai-mobile\scripts\lib\device-logcat.js docs\TESTING_AND_RELEASE.md
git commit -m "test: strengthen real-device evidence gates"
```

---

### Task 9: Add Primary-Path Readiness Gates

**Files:**
- Create: `eatfitai-mobile/scripts/lib/primary-path-readiness.js`
- Create: `eatfitai-mobile/__tests__/primaryPathReadiness.test.js`
- Modify: `eatfitai-mobile/scripts/production-smoke-ai-api.js`
- Modify: `eatfitai-mobile/scripts/production-smoke-auth-api.js`
- Modify: `eatfitai-mobile/scripts/production-smoke-user-api.js`
- Modify: `eatfitai-mobile/scripts/production-smoke-regression.js`
- Modify: `eatfitai-mobile/scripts/lib/backend-non-ui-summary.js`
- Modify: `eatfitai-mobile/__tests__/backendNonUiSummary.test.js`
- Test: `eatfitai-mobile/__tests__/primaryPathReadiness.test.js`
- Test: `eatfitai-mobile/__tests__/backendNonUiSummary.test.js`

- [ ] **Step 1: Write failing primary-path readiness tests**

Create `eatfitai-mobile/__tests__/primaryPathReadiness.test.js`:

```javascript
const {
  evaluateAiPrimaryPathReadiness,
  evaluateCloudPrimaryPathReadiness,
} = require('../scripts/lib/primary-path-readiness');

describe('primary path readiness', () => {
  const healthyAiReport = {
    aiStatus: {
      ok: true,
      state: 'HEALTHY',
      modelLoaded: true,
      geminiConfigured: true,
    },
    summary: {
      attempted: 12,
      failed: 0,
      blocked: 0,
    },
    readback: {
      detectedLabels: 5,
      recipeSuggestionCount: 2,
      voiceExecuteAddFoodMatched: true,
    },
    aiNutritionRecalculate: {
      source: 'gemini',
      offlineMode: false,
      calories: 2100,
      protein: 120,
      carbs: 240,
      fat: 70,
    },
    voiceParse: {
      source: 'ai-provider-proxy',
      intent: 'ASK_CALORIES',
      confidence: 0.91,
    },
    voiceExecuteAddFood: {
      success: true,
      executedActionType: 'ADD_FOOD',
    },
  };

  it('passes when AI smoke proves the full primary path', () => {
    expect(evaluateAiPrimaryPathReadiness(healthyAiReport)).toEqual({
      passed: true,
      failures: [],
      degraded: [],
    });
  });

  it('fails when nutrition only used formula fallback', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      aiNutritionRecalculate: {
        ...healthyAiReport.aiNutritionRecalculate,
        source: 'formula',
        offlineMode: true,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('nutrition-primary-path-used-fallback');
  });

  it('fails when voice parse only used backend rule fallback', () => {
    const result = evaluateAiPrimaryPathReadiness({
      ...healthyAiReport,
      voiceParse: {
        ...healthyAiReport.voiceParse,
        source: 'backend-rule-fallback',
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('voice-primary-path-used-fallback');
  });

  it('fails cloud readiness when any required gate lacks primaryPath pass', () => {
    const result = evaluateCloudPrimaryPathReadiness({
      authApi: { passed: true, primaryPath: { passed: true } },
      userApi: { passed: true, primaryPath: { passed: true } },
      aiApi: { passed: true, primaryPath: { passed: false } },
      regression: { passed: true, primaryPath: { passed: true } },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('ai-api-primary-path-failed');
  });

  it('fails cloud readiness when a required gate has no primaryPath evidence', () => {
    const result = evaluateCloudPrimaryPathReadiness({
      authApi: { passed: true, primaryPath: { passed: true } },
      userApi: { passed: true },
      aiApi: { passed: true, primaryPath: { passed: true } },
      regression: { passed: true, primaryPath: { passed: true } },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('user-api-primary-path-failed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- primaryPathReadiness.test.js
```

Expected before implementation: FAIL with `Cannot find module '../scripts/lib/primary-path-readiness'`.

- [ ] **Step 3: Implement the primary-path evaluator**

Create `eatfitai-mobile/scripts/lib/primary-path-readiness.js`:

```javascript
function trim(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return trim(value).toLowerCase();
}

function isFallbackSource(value) {
  const source = normalize(value);
  return (
    source.includes('fallback') ||
    source.includes('offline') ||
    source === 'formula' ||
    source === 'backend-rule-parser'
  );
}

function evaluateAiPrimaryPathReadiness(report = {}) {
  const failures = [];
  const degraded = [];
  const aiStatus = report.aiStatus || {};
  const nutrition = report.aiNutritionRecalculate || {};
  const voiceParse = report.voiceParse || {};
  const readback = report.readback || {};

  if (normalize(aiStatus.state) !== 'healthy') {
    failures.push('ai-status-not-healthy');
  }

  if (!aiStatus.modelLoaded) {
    failures.push('vision-model-not-loaded');
  }

  if (!aiStatus.geminiConfigured) {
    failures.push('gemini-not-configured');
  }

  if (Number(readback.detectedLabels || 0) <= 0) {
    failures.push('vision-primary-path-no-detections');
  }

  if (nutrition.offlineMode || isFallbackSource(nutrition.source)) {
    failures.push('nutrition-primary-path-used-fallback');
  }

  if (isFallbackSource(voiceParse.source)) {
    failures.push('voice-primary-path-used-fallback');
  }

  if (!readback.voiceExecuteAddFoodMatched) {
    failures.push('voice-add-food-readback-missing');
  }

  if (Number(readback.recipeSuggestionCount || 0) <= 0) {
    degraded.push('recipe-suggestions-empty');
  }

  return {
    passed: failures.length === 0,
    failures,
    degraded,
  };
}

function gatePrimaryPathPassed(gate) {
  if (!gate || gate.passed !== true) {
    return false;
  }

  if (!gate.primaryPath) {
    return false;
  }

  return gate.primaryPath.passed === true;
}

function evaluateCloudPrimaryPathReadiness(gates = {}) {
  const required = [
    ['auth-api', gates.authApi],
    ['user-api', gates.userApi],
    ['ai-api', gates.aiApi],
    ['regression', gates.regression],
  ];
  const failures = [];

  for (const [name, gate] of required) {
    if (!gatePrimaryPathPassed(gate)) {
      failures.push(`${name}-primary-path-failed`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

module.exports = {
  evaluateAiPrimaryPathReadiness,
  evaluateCloudPrimaryPathReadiness,
  isFallbackSource,
};
```

- [ ] **Step 4: Attach primary-path readiness to auth, user, AI, and regression smoke reports**

In `eatfitai-mobile/scripts/production-smoke-auth-api.js`, replace the existing `report.passed = report.failures.length === 0 && report.cleanup.ok;` line with:

```javascript
    report.primaryPath = {
      passed: report.failures.length === 0 && report.cleanup.ok,
      failures: report.failures.map((failure) =>
        failure.id || failure.step || failure.message || 'auth-primary-path-failed',
      ),
      covered: [
        'register',
        'verify-email',
        'login',
        'refresh-or-session',
        'protected-auth-route',
        'cleanup',
      ],
    };
    report.passed = report.primaryPath.passed;
```

In `eatfitai-mobile/scripts/production-smoke-user-api.js`, set primary path immediately before the existing `report.passed = requiredFailures === 0;` line:

```javascript
  report.primaryPath = {
    passed: requiredFailures === 0,
    failures: report.failures.map((failure) =>
      failure.step || failure.reason || failure.message || 'user-primary-path-failed',
    ),
    covered: [
      'profile',
      'body-metrics',
      'food-search',
      'food-detail',
      'custom-dish',
      'meal-diary',
      'summary-day',
      'summary-week',
      'analytics',
      'water-intake',
      'favorites',
    ],
  };
```

Replace the existing `report.passed = requiredFailures === 0;` line with:

```javascript
  report.passed = report.primaryPath.passed;
```

In `eatfitai-mobile/scripts/production-smoke-regression.js`, add this helper near `buildSummary`:

```javascript
function buildPrimaryPathReadiness(summary) {
  const failures = [];

  if (
    summary.search.positiveCases === 0 ||
    summary.search.positivePassed !== summary.search.positiveCases
  ) {
    failures.push('search-primary-cases-failed');
  }

  if (
    summary.scan.primaryAttempted === 0 ||
    summary.scan.primaryPassed !== summary.scan.primaryAttempted
  ) {
    failures.push('scan-primary-cases-failed');
  }

  if (
    summary.voice.attempted > 0 &&
    summary.voice.parsePassed !== summary.voice.attempted
  ) {
    failures.push('voice-parse-primary-cases-failed');
  }

  if (
    summary.voice.executeAttempted > 0 &&
    summary.voice.executePassed !== summary.voice.executeAttempted
  ) {
    failures.push('voice-execute-primary-cases-failed');
  }

  if (
    summary.voice.diaryReadbackAttempted > 0 &&
    summary.voice.diaryReadbackPassed !== summary.voice.diaryReadbackAttempted
  ) {
    failures.push('voice-diary-readback-primary-cases-failed');
  }

  if (
    summary.nutrition.attempted > 0 &&
    summary.nutrition.suggestPassed !== summary.nutrition.attempted
  ) {
    failures.push('nutrition-primary-cases-failed');
  }

  return {
    passed: failures.length === 0,
    failures,
    covered: ['search', 'scan', 'voice', 'nutrition'],
  };
}
```

After `results.summary = buildSummary(results);`, add:

```javascript
  results.primaryPath = buildPrimaryPathReadiness(results.summary);
  if (!results.primaryPath.passed) {
    process.exitCode = 1;
  }
```

In `eatfitai-mobile/scripts/production-smoke-ai-api.js`, add the import:

```javascript
const {
  evaluateAiPrimaryPathReadiness,
} = require('./lib/primary-path-readiness');
```

At the end of `finalizeSummary(report)`, before `report.passed = ...`, add:

```javascript
  report.primaryPath = evaluateAiPrimaryPathReadiness(report);
  if (!report.primaryPath.passed) {
    for (const reason of report.primaryPath.failures) {
      if (!report.failures.some((failure) => failure.reason === reason)) {
        report.failures.push({
          group: 'primary-path',
          name: 'ai-primary-path',
          status: null,
          reason,
          details: report.primaryPath,
        });
      }
    }
    report.summary.failed += report.primaryPath.failures.length;
  }
```

Update `report.passed` in the same function so it includes:

```javascript
    report.primaryPath.passed === true &&
```

- [ ] **Step 5: Include primary-path readiness in backend non-UI summary**

In `eatfitai-mobile/scripts/lib/backend-non-ui-summary.js`, import:

```javascript
const {
  evaluateCloudPrimaryPathReadiness,
} = require('./primary-path-readiness');
```

Preserve primary-path evidence in `normalizeGate`:

```javascript
function normalizeGate(name, gate) {
  return {
    name,
    passed: Boolean(gate?.passed),
    failures: cloneFailures(gate?.failures),
    primaryPath: gate?.primaryPath
      ? {
          ...gate.primaryPath,
          failures: cloneFailures(gate.primaryPath.failures),
        }
      : null,
  };
}
```

Add regression to the `gates` object:

```javascript
    regression: normalizeGate('regression', input?.regression),
```

When building the final summary object, add:

```javascript
const primaryPath = evaluateCloudPrimaryPathReadiness({
  authApi: gates.authApi,
  userApi: gates.userApi,
  aiApi: gates.aiApi,
  regression: gates.regression,
});
```

Set:

```javascript
summary.primaryPath = primaryPath;
summary.overallPassed = summary.overallPassed && primaryPath.passed;
```

Assign the existing returned object to `summary`, add the two lines above before `return summary;`, and keep `cleanup` in `cloudGate` but out of `primaryPath`.

- [ ] **Step 6: Extend backend summary tests**

Append to `eatfitai-mobile/__tests__/backendNonUiSummary.test.js`:

```javascript
it('fails overall readiness when AI gate only passed fallback safety', () => {
  const summary = buildBackendNonUiSummary({
    outputDir: 'D:/tmp/session',
    preflight: createGate({ name: 'preflight' }),
    authApi: createGate({
      name: 'auth-api',
      primaryPath: { passed: true },
    }),
    userApi: createGate({
      name: 'user-api',
      primaryPath: { passed: true },
    }),
    aiApi: createGate({
      name: 'ai-api',
      primaryPath: {
        passed: false,
        failures: ['nutrition-primary-path-used-fallback'],
      },
    }),
    cleanup: createGate({ name: 'cleanup' }),
    regression: createGate({
      name: 'regression',
      primaryPath: { passed: true },
    }),
    codeHealth: {
      dotnetTests: { passed: true },
      pythonUnitTests: { passed: true },
    },
  });

  expect(summary.primaryPath.passed).toBe(false);
  expect(summary.overallPassed).toBe(false);
  expect(summary.primaryPath.failures).toContain('ai-api-primary-path-failed');
});
```

- [ ] **Step 7: Run focused tests**

Run:

```powershell
npm --prefix .\eatfitai-mobile test -- primaryPathReadiness.test.js backendNonUiSummary.test.js
python scripts\cloud\check_mojibake.py eatfitai-mobile\scripts eatfitai-mobile\__tests__
```

Expected: PASS and no mojibake markers.

- [ ] **Step 8: Commit**

```powershell
git add eatfitai-mobile\scripts\lib\primary-path-readiness.js eatfitai-mobile\__tests__\primaryPathReadiness.test.js eatfitai-mobile\scripts\production-smoke-auth-api.js eatfitai-mobile\scripts\production-smoke-user-api.js eatfitai-mobile\scripts\production-smoke-ai-api.js eatfitai-mobile\scripts\production-smoke-regression.js eatfitai-mobile\scripts\lib\backend-non-ui-summary.js eatfitai-mobile\__tests__\backendNonUiSummary.test.js
git commit -m "test: require primary path readiness"
```

---

### Task 10: Final Full Validation Batch

**Files:**
- Modify: `docs/TESTING_AND_RELEASE.md`
- Test: full validation commands

- [ ] **Step 1: Run mobile focused unit batch**

```powershell
npm --prefix .\eatfitai-mobile test -- aiService.test.ts voiceService.test.ts diaryService.test.ts summaryService.test.ts useStatsStore.test.ts aiAvailability.test.ts visionReview.test.ts voiceCommandReview.test.ts userflowDocsInventory.test.js deviceAutomationMarkers.test.js rcUnblockHelpers.test.js
npm --prefix .\eatfitai-mobile test -- primaryPathReadiness.test.js backendNonUiSummary.test.js
```

Expected: all listed suites pass.

- [ ] **Step 2: Run mobile typecheck and lint**

```powershell
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
```

Expected: no TypeScript errors and no ESLint errors. The lint command also runs `guard:no-direct-ai-provider`.

- [ ] **Step 3: Run backend targeted test batch**

```powershell
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore --filter "FullyQualifiedName~AIControllerTests|FullyQualifiedName~AIVisionControllerTests|FullyQualifiedName~VoiceControllerTests|FullyQualifiedName~MealDiaryControllerTests|FullyQualifiedName~FoodControllerTests|FullyQualifiedName~AnalyticsControllerTests|FullyQualifiedName~AuthControllerTests|FullyQualifiedName~AiHealthServiceTests|FullyQualifiedName~RecipeSuggestionServiceTests|FullyQualifiedName~VisionCacheServiceTests"
```

Expected: all selected backend tests pass.

- [ ] **Step 4: Run encoding and secret guards**

```powershell
python scripts\cloud\check_mojibake.py docs eatfitai-mobile\src eatfitai-mobile\scripts eatfitai-backend ai-provider
python scripts\cloud\check_secret_tracking.py
```

Expected: no mojibake markers and no tracked secret findings.

- [ ] **Step 5: Run primary-path cloud smoke gates**

Run these only after backend, AI provider, and smoke credentials are configured:

```powershell
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:auth:api
npm --prefix .\eatfitai-mobile run smoke:user:api
npm --prefix .\eatfitai-mobile run smoke:ai:api
npm --prefix .\eatfitai-mobile run smoke:regression
npm --prefix .\eatfitai-mobile run smoke:backend:non-ui
```

Expected:

- `auth-api-report.json` has `"primaryPath": { "passed": true }`.
- `user-api-report.json` has `"primaryPath": { "passed": true }`.
- `ai-api-report.json` has `"primaryPath": { "passed": true }`.
- `regression-run.json` has `"primaryPath": { "passed": true }`.
- `backend-non-ui-summary.json` has `"primaryPath": { "passed": true }`.
- `backend-non-ui-summary.json` has `"overallPassed": true`.
- No AI smoke item is counted as release-ready when `source` is `formula`, `backend-rule-fallback`, `backend-rule-parser`, or any offline/fallback source.

- [ ] **Step 6: Record results in docs**

Append a short dated validation entry to `docs/TESTING_AND_RELEASE.md`:

```markdown
### 2026-04-26 Function/AI improvement validation

- Mobile focused Jest batch: PASS
- Primary-path readiness Jest batch: PASS
- Mobile typecheck: PASS
- Mobile lint / no-direct-ai-provider guard: PASS
- Backend targeted AI/voice/diary/auth/analytics batch: PASS
- Mojibake guard: PASS
- Secret tracking guard: PASS
- Cloud primary-path smoke: PASS
```

- [ ] **Step 7: Commit final validation docs**

```powershell
git add docs\TESTING_AND_RELEASE.md
git commit -m "docs: record function ai validation results"
```

## Regression Risks To Watch

- AI status can become stale between mobile pre-check and backend request; keep backend 503 handling.
- Voice write intents must keep explicit confirmation before saving diary or weight changes.
- Vision review must never save unmapped detections without a selected catalog/user food ID.
- Do not reintroduce direct mobile-to-AI-provider calls; the backend proxy is the current architecture.
- Do not count formula nutrition, rule parser voice, offline AI, blocked coverage, or manual fallback as release-ready primary-path success.
- Preserve Vietnamese strings exactly; run the mojibake guard after every task touching user-facing text.

## Recommended Execution Order

1. Task 1 and Task 2 first: low-risk guards and naming cleanup.
2. Task 3 and Task 4 next: user-visible AI availability messaging.
3. Task 5 and Task 6 next: extract pure helpers from large mobile screens with tests.
4. Task 7 after mobile helper extraction: backend error contract hardening.
5. Task 8 strengthens release evidence.
6. Task 9 adds the explicit primary-path gate so fallback cannot count as success.
7. Task 10 runs final validation and records evidence.

## Execution Choice

Plan complete. Recommended path is subagent-driven execution because tasks 3-8 are independent enough to split by file ownership. Inline execution is also safe if each task is committed before starting the next one.
