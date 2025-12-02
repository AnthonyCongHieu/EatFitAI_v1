# 🎯 COMPREHENSIVE TECHNICAL DEBT INVENTORY

**Generated**: 2025-12-02 08:30:00  
**Purpose**: Complete list of ALL code quality issues, limitations, and improvements needed  
**Status**: Master tracking document for technical debt

---

## 📊 EXECUTIVE SUMMARY

| Category                        | Count                | Priority    | Est. Time |
| ------------------------------- | -------------------- | ----------- | --------- |
| **Error Handler Duplication**   | 32 patterns          | 🔴 Critical | 3-4h      |
| **Type Safety Issues**          | 45+ `as any` casts   | 🟡 High     | 2-3h      |
| **Duplicate Components**        | 2 Card components    | 🟡 Medium   | 1h        |
| **Duplicate Screens**           | AiCamera vs AiVision | 🟠 Medium   | 2h        |
| **Missing Type Definitions**    | 15+ locations        | 🟡 High     | 1-2h      |
| **Loading State Inconsistency** | 8+ screens           | 🟢 Low      | 1h        |
| **Performance Optimizations**   | React Query needed   | 🟢 Low      | 2-3h      |

**Total Estimated Effort**: 12-16 hours

---

## 🔴 CATEGORY 1: ERROR HANDLER DUPLICATION (CRITICAL)

### Overview

- **Problem**: 32 duplicate error handling patterns across 12 files
- **Impact**: ~180 lines of duplicate code
- **Solution**: Migrate to centralized `handleApiError`
- **Progress**: 5/12 files complete (33%)

### Detailed Inventory

#### ✅ COMPLETED (5 files, 52 lines removed)

1. ✅ errorHandler.ts - Utility created
2. ✅ LoginScreen.tsx (-12 lines)
3. ✅ RegisterScreen.tsx (-11 lines)
4. ✅ WeekStatsScreen.tsx (-8 lines, 1 remaining)
5. ✅ FoodSearchScreen.tsx (-9 lines)

#### ❌ BLOCKED - MANUAL REQUIRED (2 files, 59 lines)

6. ❌ **HomeScreen.tsx** (35 lines)
   - Lines 97-108: fetchSummary handler
   - Lines 133-144: handleRefresh handler
   - Lines 186-199: handleDelete handler
   - **Why failed**: 421 lines, complex structure
   - **Action**: Manual migration required

7. ❌ **ProfileScreen.tsx** (24 lines)
   - Lines 157-160: fetchProfile handler
   - Lines 181-192: onSubmitProfile handler
   - Lines 207-218: onSubmitBodyMetrics handler
   - **Why failed**: 457 lines, complex forms
   - **Action**: Manual migration required

#### ⏳ PENDING - AUTOMATED POSSIBLE (5 files, ~70 lines)

8. ⏳ **CustomDishScreen.tsx** (10 lines) ⭐ EASY
   - Lines 119-129: Create custom dish handler
   - **Complexity**: Low, single handler
   - **Action**: Automated migration safe

9. ⏳ **FoodDetailScreen.tsx** (24 lines)
   - Lines 121-132: Load food details
   - Lines 197-210: Add to diary
   - **Complexity**: Medium, 2 handlers
   - **Action**: Automated, one at a time

10. ⏳ **AddMealFromVisionScreen.tsx** (Unknown)
    - 4 Toast.show instances (needs inspection)
    - **Action**: Inspect first, then migrate

11. ⏳ **AiCameraScreen.tsx** (Unknown)
    - 10+ Toast.show (many are info/success)
    - **Action**: Careful inspection needed

12. ⏳ **NutritionSuggestScreen.tsx** (Unknown)
    - 3 Toast.show instances
    - **Action**: Inspect first

#### ✅ NO ACTION NEEDED (1 file)

13. ✅ **MealDiaryScreen.tsx** - Uses console.error only

**References**:

- `ERROR_HANDLER_COMPLETE_INVENTORY.md` - Detailed breakdown
- `ERROR_HANDLER_MIGRATION.md` - Migration guide
- `PHASE_2_COMPLEX_FILES_STRATEGY.md` - Strategy doc

---

## 🟡 CATEGORY 2: TYPE SAFETY ISSUES (HIGH PRIORITY)

### Overview

- **Problem**: 45+ `as any` type casts across codebase
- **Impact**: Bypasses TypeScript safety, potential runtime errors
- **Solution**: Add proper type definitions
- **Priority**: High (safety critical)

### Detailed Breakdown

#### 🔴 Critical Locations (Need immediate attention)

**1. useAuthStore.ts** (10 instances, Lines 73-172)

```typescript
// Problem locations:
Line 73:  const data = resp.data as any;
Line 94:  const data = resp.data as any;
Line 127: const redirectUri = (AuthSession as any).makeRedirectUri({ useProxy: true });
Line 130: const AS: any = AuthSession as any;
Line 136: const params: Record<string, string | undefined> = (result as any).params ?? {};
Line 138: params.accessToken || params.access_token || (result as any).accessToken || (result as any).access_token;
Line 140: params.refreshToken || params.refresh_token || (result as any).refreshToken || (result as any).refresh_token;
Line 146: accessTokenExpiresAt: (result as any).accessTokenExpiresAt || params.accessTokenExpiresAt,
Line 148: refreshTokenExpiresAt: (result as any).refreshTokenExpiresAt || params.refreshTokenExpiresAt,
Line 172: const data = resp.data as any;
```

**Issue**: OAuth response types not defined  
**Solution**: Define `OAuthResponse`, `AuthSessionResult` interfaces  
**Estimated time**: 30 minutes

---

**2. apiClient.ts** (6 instances, Lines 125-195)

```typescript
// Problem locations:
Line 125: isRetry: !!(originalRequest as any)?._retry,
Line 129: if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
Line 130: (originalRequest as any)._retry = true;
Line 182: if ((tokenStorage as any).saveTokensFull) {
Line 183: await (tokenStorage as any).saveTokensFull({
Line 192: try { (updateSessionFromAuthResponse as any)?.(data); } catch {}
Line 195: (originalRequest as any).headers = { ...(originalRequest.headers ?? {}), Authorization: `Bearer ${newAccessToken}` } as any;
```

**Issue**: Axios request config types incomplete  
**Solution**: Extend `AxiosRequestConfig` with custom properties  
**Estimated time**: 45 minutes

---

**3. aiService.ts** (17 instances, Lines 52-138)

```typescript
// Problem locations:
Line 52:  } as any);
Line 101-104: (data as any)?.calories/protein/carbs/fat
Line 109-113: (data as any)?.caloriesKcal/proteinGrams/carbohydrateGrams/fatGrams
Line 125-138: Multiple instances in nutrition target responses
```

**Issue**: API response types not defined  
**Solution**: Define `NutritionData`, `NutritionTarget` interfaces  
**Estimated time**: 1 hour

---

**4. foodService.ts** (2 instances)

```typescript
// Problem locations:
Line 55: nameEn: (data as any)?.foodNameEn ?? null,
Line 61: thumbnail: (data as any)?.thumbNail ?? null,
```

**Issue**: Food API response type incomplete  
**Solution**: Add missing fields to `FoodData` interface  
**Estimated time**: 15 minutes

---

#### 🟡 Medium Priority

**5. Component Type Issues**

```typescript
// Icon.tsx (2 instances)
Line 69: name={name as any}
Line 79: name={name as any}

// Tooltip.tsx (1 instance)
Line 183: getPositionStyles() as any,

// Screen.tsx (1 instance)
Line 29: refreshControl={refreshControl as any}

// Modal.tsx (1 instance)
Line 142: } as any,
```

**Issue**: React Native component prop types mismatched  
**Solution**: Proper type assertions or prop type fixes  
**Estimated time**: 30 minutes

---

### Type Safety Improvement Plan

**Phase 1: API Response Types** (2 hours)

- [ ] Define OAuth types in `types/auth.ts`
- [ ] Define AI service types in `types/ai.ts`
- [ ] Define food service types in `types/food.ts`
- [ ] Update service files to use proper types

**Phase 2: Axios Extensions** (1 hour)

- [ ] Create `types/axios.d.ts` with extended request config
- [ ] Add `_retry` property properly
- [ ] Fix token storage types

**Phase 3: Component Types** (30 min)

- [ ] Fix Icon component prop types
- [ ] Fix other component type mismatches

**Expected Result**: Remove ~40 `as any` casts, improve type safety

---

## 🟡 CATEGORY 3: DUPLICATE CODE (MEDIUM PRIORITY)

### 3.1 Duplicate Components

#### Card Components Duplication

**Files**:

- `src/components/Card.tsx` (legacy)
- `src/components/ui/AppCard.tsx` (new)

**Problem**: Two Card components serving same purpose

**Analysis**:

```
Card.tsx:
- Simple wrapper with padding
- Used in legacy screens
- ~50 lines

AppCard.tsx:
- Modern design with title support
- Used in new screens
- ~80 lines
- More features (title, badge, onPress)
```

**Impact**:

- Confusion about which to use
- Inconsistent UI
- Duplicate maintenance

**Solution**:

1. Migrate all screens to use AppCard
2. Delete Card.tsx
3. Update imports

**Affected Files** (need inspection):

- HomeScreen.tsx
- ProfileScreen.tsx
- MealDiaryScreen.tsx
- Other screens using old Card

**Estimated time**: 1 hour

---

### 3.2 Duplicate Screens

#### AiCameraScreen vs AiVisionScreen

**Files**:

- `src/app/screens/ai/AiCameraScreen.tsx`
- `src/app/screens/ai/AiVisionScreen.tsx`

**Problem**: Possible duplicate functionality

**Analysis Required**:

- [ ] Compare both screens side by side
- [ ] Identify differences
- [ ] Determine if merge is possible
- [ ] Check navigation usage

**Potential Issues**:

- Which one is actively used?
- Are they different features or iterations?
- Can they be merged?

**Action**: Manual inspection needed

**Estimated time**: 2 hours (inspection + merge if needed)

---

## 🟢 CATEGORY 4: ARCHITECTURE IMPROVEMENTS (LOW PRIORITY)

### 4.1 Missing React Query Integration

**Problem**: Manual data fetching with useState/useEffect everywhere

**Current Pattern** (repeated 15+ times):

```typescript
const [data, setData] = useState();
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetchData()
    .then(setData)
    .catch(handleError)
    .finally(() => setLoading(false));
}, []);
```

**Recommended Pattern** (with React Query):

```typescript
const { data, isLoading, error } = useQuery('key', fetchData);
```

**Benefits**:

- Automatic caching
- Background refetching
- Optimistic updates
- Less boilerplate

**Files to Update** (estimated):

- HomeScreen.tsx
- ProfileScreen.tsx
- FoodDetailScreen.tsx
- WeekStatsScreen.tsx
- MealDiaryScreen.tsx
- ~10 more files

**Estimated time**: 2-3 hours

---

### 4.2 Loading State Standardization

**Problem**: Inconsistent loading states across screens

**Variations found**:

1. Simple boolean `loading` state
2. Separate `isLoading` and `isRefreshing`
3. No loading indicator
4. Manual ActivityIndicator placement

**Solution**: Create standardized loading component

**Proposed**:

```typescript
// LoadingScreen.tsx
<Screen loading={isLoading}>
  {/* content */}
</Screen>
```

**Files to update**: ~8 screens

**Estimated time**: 1 hour

---

### 4.3 Error Boundary Implementation

**Problem**: No error boundaries for crash protection

**Current**: App crashes on unhandled errors

**Recommended**: React Error Boundaries

```typescript
// ErrorBoundary.tsx
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

**Benefits**:

- Graceful error handling
- Better UX
- Error reporting

**Estimated time**: 1 hour

---

## 🟠 CATEGORY 5: MISSING FEATURES/IMPROVEMENTS

### 5.1 Missing Error Tracking

**Problem**: No error tracking service integrated

**Recommendation**: Sentry or similar

**Implementation**:

- [ ] Choose service (Sentry recommended)
- [ ] Install SDK
- [ ] Integrate with errorHandler.ts
- [ ] Add error reporting to catch blocks

**Estimated time**: 2 hours

---

### 5.2 Missing Analytics

**Problem**: No user behavior tracking

**Recommendation**: Firebase Analytics or Amplitude

**Use cases**:

- Screen views
- Button clicks
- Error occurrences
- User flows

**Estimated time**: 2-3 hours

---

## 📋 PRIORITIZED ACTION PLAN

### 🔴 CRITICAL (Do First)

#### Week 1: Error Handlers

- [ ] CustomDishScreen.tsx (10 lines) - 30 min
- [ ] FoodDetailScreen.tsx (24 lines) - 1 hour
- [ ] Manual: HomeScreen.tsx (35 lines) - 1.5 hours
- [ ] Manual: ProfileScreen.tsx (24 lines) - 1 hour

**Total**: 4 hours  
**Expected**: 93 lines removed

---

### 🟡 HIGH (Do Second)

#### Week 2: Type Safety

- [ ] Define API response types - 2 hours
- [ ] Fix useAuthStore.ts types - 30 min
- [ ] Fix apiClient.ts types - 45 min
- [ ] Fix aiService.ts types - 1 hour
- [ ] Fix component types - 30 min

**Total**: 4-5 hours  
**Expected**: -40 `as any` casts

---

### 🟠 MEDIUM (Do Third)

#### Week 3: Code Consolidation

- [ ] Merge Card.tsx → AppCard.tsx - 1 hour
- [ ] Inspect AiCamera vs AiVision - 30 min
- [ ] Merge or document differences - 1.5 hours
- [ ] Update imports - 30 min

**Total**: 3-4 hours  
**Expected**: 1-2 files removed

---

### 🟢 LOW (Nice to Have)

#### Week 4: Architecture

- [ ] Add React Query - 3 hours
- [ ] Standardize loading states - 1 hour
- [ ] Add Error Boundary - 1 hour
- [ ] Add error tracking (Sentry) - 2 hours
- [ ] Add analytics - 2 hours

**Total**: 9 hours (optional)  
**Expected**: Better architecture, monitoring

---

## 📊 PROGRESS TRACKING

### Current Status (Dec 2, 2025)

| Category       | Progress         | Status         |
| -------------- | ---------------- | -------------- |
| Error Handlers | 33% (5/12 files) | 🟡 In Progress |
| Type Safety    | 0% (0/45 casts)  | ⏳ Not Started |
| Duplicate Code | 0% (0/4 items)   | ⏳ Not Started |
| Architecture   | 0%               | ⏳ Not Started |

### Completion Target

| Milestone               | Target Date | Status      |
| ----------------------- | ----------- | ----------- |
| Error Handlers Complete | Week 1      | ⏳ Pending  |
| Type Safety Fixed       | Week 2      | ⏳ Pending  |
| Code Consolidated       | Week 3      | ⏳ Pending  |
| Architecture Improved   | Week 4      | ⏳ Optional |

---

## 🎯 SUCCESS METRICS

### Code Quality

- [ ] -180 lines of duplicate error handling
- [ ] -40 `as any` type casts
- [ ] -1-2 duplicate files
- [ ] +Error tracking coverage
- [ ] +Type safety coverage

### Technical Debt

- **Before**: High (multiple categories)
- **After**: Low (systematic approach)

### Maintainability

- **Before**: Hard to update error messages
- **After**: Single point of change

---

## 📚 RELATED DOCUMENTS

### Reference Files

1. `ERROR_HANDLER_COMPLETE_INVENTORY.md` - Error handlers detail
2. `ERROR_HANDLER_MIGRATION.md` - Migration guide
3. `PHASE_2_COMPLEX_FILES_STRATEGY.md` - Complex files strategy
4. `CLEANUP_SUMMARY.md` - Previous cleanup report
5. This file - **Master tracking document**

### How to Use This Document

1. **Planning**: Review categories, understand scope
2. **Prioritization**: Follow priority order (🔴→🟡→🟠→🟢)
3. **Execution**: Work through action plan week by week
4. **Tracking**: Update progress checkboxes as you go
5. **Review**: Revisit monthly, update estimates

---

## 💡 KEY RECOMMENDATIONS

### DO ✅

- Work on one category at a time
- Complete critical items first
- Test after each change
- Commit frequently
- Update this document as you progress

### DON'T ❌

- Try to fix everything at once
- Skip testing
- Ignore TypeScript errors
- Leave incomplete migrations

### BEST PRACTICES

1. **One file at a time** for error handlers
2. **One type at a time** for type safety
3. **Test thoroughly** after each change
4. **Document decisions** in code comments

---

**Document Owner**: Development Team  
**Last Updated**: 2025-12-02 08:30:00  
**Next Review**: Weekly during active cleanup  
**Status**: 🟡 Active - cleanup in progress
