# Phase 2: Complex Files Migration Strategy

## 🎯 OBJECTIVE
Safely migrate error handling in complex files (HomeScreen, ProfileScreen, FoodDetailScreen) without breaking functionality.

---

## 📋 STRATEGY OVERVIEW

### Core Principles
1. **One handler at a time** - Never edit multiple error handlers simultaneously
2. **Inspect before edit** - Always view exact code before making changes  
3. **Test incrementally** - Run typecheck and manual test after each change
4. **Commit frequently** - Git commit after each successful handler migration
5. **Backup plan** - Always ready to revert if something goes wrong

### Risk Mitigation
- ✅ Use `view_file` to inspect exact line numbers
- ✅ Use `grep_search` to find all Toast.show instances
- ✅ Match EXACT whitespace and formatting
- ✅ Keep original file accessible for comparison
- ✅ Test each screen after migration

---

## 🔴 PRIORITY 1: HomeScreen.tsx

### File Analysis
- **Location**: `src/app/screens/HomeScreen.tsx`
- **Size**: 421 lines
- **Complexity**: ⚠️ Very High
- **Error Handlers**: 3 confirmed
- **Key Features**: Animations, state management, server health checks

### Identified Error Handlers

#### Handler 1: fetchSummary (Line ~97-107)
**Context**: Initial data loading  
**Current code pattern**:
```typescript
.catch((error: any) => {
  const status = error?.response?.status;
  if (status === 401) {
    Toast.show({ type: 'error', text1: t('common.sessionExpired'), ... });
  } else if (status >= 500) {
    Toast.show({ type: 'error', text1: t('common.serverError'), ... });
  } else if (!navigator.onLine) {
    Toast.show({ type: 'error', text1: t('common.networkError'), ... });
  } else {
    Toast.show({ type: 'error', text1: t('home.loadDiaryFailed'), ... });
  }
});
```

**Target replacement**:
```typescript
.catch(handleApiError);
```

**Testing**:
- Navigate to HomeScreen
- Verify data loads correctly
- Test offline mode
- Test with expired token

---

#### Handler 2: handleRefresh (Line ~133-143)  
**Context**: Pull-to-refresh functionality  
**Current code pattern**:
```typescript
.catch((error: any) => {
  const status = error?.response?.status;
  if (status === 401) {
    Toast.show({ type: 'error', text1: t('common.sessionExpired'), ... });
  } else if (status >= 500) {
    Toast.show({ type: 'error', text1: t('common.serverError'), ... });
  } else if (!navigator.onLine) {
    Toast.show({ type: 'error', text1: t('common.networkError'), ... });
  } else {
    Toast.show({ type: 'error', text1: t('home.loadDiaryFailed'), ... });
  }
});
```

**Target replacement**:
```typescript
.catch(handleApiError);
```

**Testing**:
- Pull down to refresh
- Verify error handling works
- Check loading state

---

#### Handler 3: handleDelete (Line ~186-198)
**Context**: Deleting diary entries  
**Current code pattern**:
```typescript
.catch((error: any) => {
  const status = error?.response?.status;
  if (status === 404) {
    Toast.show({ type: 'error', text1: t('common.notFound'), ... });
  } else if (status === 403) {
    Toast.show({ type: 'error', text1: t('common.noPermission'), ... });
  } else if (status >= 500) {
    Toast.show({ type: 'error', text1: t('common.serverError'), ... });
  } else if (!navigator.onLine) {
    Toast.show({ type: 'error', text1: t('common.networkError'), ... });
  } else {
    Toast.show({ type: 'error', text1: t('common.deleteFailed'), ... });
  }
});
```

**Target replacement**:
```typescript
.catch(handleApiError);
```

**Testing**:
- Create a diary entry
- Delete it
- Verify success
- Test error scenarios

---

### Migration Workflow for HomeScreen.tsx

#### Step 1: Preparation
```bash
# Ensure clean state
git status

# View entire file to understand structure
view_file HomeScreen.tsx

# Search for all error handlers
grep_search "Toast.show" HomeScreen.tsx
```

#### Step 2: Add Import
```typescript
// At top of file (after other imports)
import { handleApiError } from '../../utils/errorHandler';
```

**Action**:
- Edit ONLY the import section
- Run `npm run typecheck`
- Commit: "chore: add errorHandler import to HomeScreen"

#### Step 3: Migrate fetchSummary Handler
```bash
# View exact lines
view_file HomeScreen.tsx --lines 90:110

# Edit ONLY lines 97-107
# Replace error handler with handleApiError(error)

# Verify
npm run typecheck

# Test
# - Open app
# - Navigate to Home
# - Verify data loads

# Commit
git add src/app/screens/HomeScreen.tsx
git commit -m "refactor(HomeScreen): migrate fetchSummary error handler"
```

#### Step 4: Migrate handleRefresh Handler  
```bash
# View exact lines
view_file HomeScreen.tsx --lines 125:145

# Edit ONLY lines 133-143
# Replace error handler

# Verify
npm run typecheck

# Test pull-to-refresh

# Commit
git add src/app/screens/HomeScreen.tsx
git commit -m "refactor(HomeScreen): migrate handleRefresh error handler"
```

#### Step 5: Migrate handleDelete Handler
```bash
# View exact lines
view_file HomeScreen.tsx --lines 180:200

# Edit ONLY lines 186-198
# Replace error handler

# Verify
npm run typecheck

# Test delete functionality

# Commit
git add src/app/screens/HomeScreen.tsx
git commit -m "refactor(HomeScreen): migrate handleDelete error handler"
```

#### Step 6: Final Verification
```bash
# Run full typecheck
npm run typecheck

# Run app
npm start

# Manual testing checklist:
# ✅ Home screen loads
# ✅ Data displays correctly
# ✅ Pull-to-refresh works
# ✅ Delete entry works
# ✅ Error messages appear correctly
# ✅ Offline mode handled gracefully
```

---

## 🟡 PRIORITY 2: ProfileScreen.tsx

### File Analysis
- **Location**: `src/app/screens/ProfileScreen.tsx`
- **Size**: 457 lines
- **Complexity**: ⚠️ Very High
- **Error Handlers**: 3 confirmed
- **Key Features**: Two forms (Profile + BodyMetrics), validation

### Identified Error Handlers

#### Handler 1: fetchProfile (Line ~158-160)
**Context**: Loading user profile data  
**Difficulty**: ⭐ Easy

**Current**:
```typescript
useEffect(() => {
  fetchProfile().catch(() => {
    Toast.show({ type: 'error', text1: 'Tải hồ sơ thất bại' });
  });
}, [fetchProfile]);
```

**Target**:
```typescript
useEffect(() => {
  fetchProfile().catch(handleApiError);
}, [fetchProfile]);
```

**Lines to remove**: 2 lines  
**Testing**: Navigate to Profile, verify data loads

---

#### Handler 2: onSubmitProfile (Line ~181-192)
**Context**: Saving profile changes  
**Difficulty**: ⭐⭐ Medium

**Current**:
```typescript
} catch (error: any) {
  const status = error?.response?.status;
  if (status === 422) {
    Toast.show({
      type: 'error',
      text1: 'Dữ liệu không hợp lệ',
      text2: 'Vui lòng kiểm tra lại nội dung',
    });
    return;
  }
  Toast.show({ type: 'error', text1: 'Không thể lưu hồ sơ' });
}
```

**Target**:
```typescript
} catch (error: any) {
  handleApiError(error);
}
```

**Lines to remove**: 10 lines  
**Testing**: Edit profile, save, verify success and error cases

---

#### Handler 3: onSubmitBodyMetrics (Line ~207-218)
**Context**: Saving body measurements  
**Difficulty**: ⭐⭐ Medium

**Current**:
```typescript
} catch (error: any) {
  const status = error?.response?.status;
  if (status === 422) {
    Toast.show({
      type: 'error',
      text1: 'Số đo không hợp lệ',
      text2: 'Vui lòng kiểm tra các trường',
    });
    return;
  }
  Toast.show({ type: 'error', text1: 'Không thể lưu số đo' });
}
```

**Target**:
```typescript
} catch (error: any) {
  handleApiError(error);
}
```

**Lines to remove**: 10 lines  
**Testing**: Add body metrics, verify save and validation

---

### Migration Workflow for ProfileScreen.tsx

#### Preparation
```bash
# View file structure
view_file ProfileScreen.tsx --lines 1:50
view_file ProfileScreen.tsx --lines 150:220

# Identify all error handlers
grep_search "Toast.show" ProfileScreen.tsx
```

#### Step-by-Step Process
1. **Add import** → typecheck → commit
2. **Fix fetchProfile** → typecheck → test → commit
3. **Fix onSubmitProfile** → typecheck → test → commit  
4. **Fix onSubmitBodyMetrics** → typecheck → test → commit
5. **Final verification** → full app test

---

## 🔴 PRIORITY 3: FoodDetailScreen.tsx

### File Analysis
- **Location**: `src/app/screens/diary/FoodDetailScreen.tsx`
- **Size**: Unknown (needs inspection)
- **Complexity**: Medium-High
- **Error Handlers**: 2-3 estimated

### Pre-Migration Tasks
```bash
# Inspect file
view_file FoodDetailScreen.tsx

# Count lines
wc -l FoodDetailScreen.tsx

# Find error handlers
grep_search "Toast.show" FoodDetailScreen.tsx
grep_search "catch.*error" FoodDetailScreen.tsx

# Document findings before proceeding
```

### Migration Approach
1. Create detailed analysis document
2. Identify each error handler with exact line numbers
3. Categorize by difficulty (easy/medium/hard)
4. Follow same workflow as HomeScreen
5. Test thoroughly (this is a critical user-facing screen)

---

## 🛠️ TOOLS & COMMANDS

### Inspection Commands
```bash
# View specific lines
view_file <path> --lines start:end

# Search for patterns
grep_search "pattern" <path>

# Count instances
grep_search "Toast.show" <path> | wc -l

# Check file size
wc -l <path>
```

### Editing Commands
```typescript
// Always use replace_file_content for single edits
// Never use multi_replace_file_content for complex files

// Template:
replace_file_content {
  TargetFile: "<absolute_path>",
  StartLine: <number>,
  EndLine: <number>,
  TargetContent: "<exact_match>",
  ReplacementContent: "<new_code>",
  // ... other params
}
```

### Verification Commands
```bash
# TypeScript check
npm run typecheck

# Run app
npm start

# Git status
git status
git diff src/app/screens/HomeScreen.tsx
```

### Testing Checklist Template
```markdown
## Testing: [ScreenName]

### Functional Tests
- [ ] Screen loads without errors
- [ ] Data displays correctly
- [ ] User actions work (buttons, forms, etc.)
- [ ] Navigation works

### Error Handling Tests
- [ ] Network error (offline mode)
- [ ] Server error (500)
- [ ] Auth error (401)
- [ ] Validation error (422)
- [ ] Error toasts appear correctly
- [ ] Error messages are user-friendly

### Edge Cases
- [ ] Empty state
- [ ] Loading state
- [ ] Error state
- [ ] Slow network
```

---

## 📊 PROGRESS TRACKING TEMPLATE

```markdown
### HomeScreen.tsx Progress

- [x] File inspection complete
- [x] Error handlers identified (3 total)
- [ ] Import added
- [ ] Handler 1: fetchSummary migrated
- [ ] Handler 2: handleRefresh migrated
- [ ] Handler 3: handleDelete migrated
- [ ] TypeScript verified
- [ ] Manual testing complete
- [ ] Git committed

**Status**: 🔄 In Progress (2/7 steps)
**Est. completion**: [date]
```

---

## ⚠️ COMMON PITFALLS & SOLUTIONS

### Pitfall 1: Whitespace Mismatch
**Problem**: TargetContent doesn't match due to spaces/tabs  
**Solution**: Copy exact code from view_file, including all whitespace

### Pitfall 2: Line Numbers Changed
**Problem**: Previous edit shifted line numbers  
**Solution**: Re-run view_file before each edit

### Pitfall 3: Missing Imports
**Problem**: handleApiError not found  
**Solution**: Always add import FIRST, test, then continue

### Pitfall 4: Breaking Other Functionality
**Problem**: Edit affects unrelated code  
**Solution**: Keep edits minimal, test after EACH change

### Pitfall 5: Forgetting to Test
**Problem**: Multiple issues discovered later  
**Solution**: Test after EVERY single handler migration

---

## 🎯 SUCCESS CRITERIA

### For Each File
- ✅ All error handlers migrated to handleApiError
- ✅ TypeScript compilation passes
- ✅ No runtime errors
- ✅ All functionality works as before
- ✅ Error messages still user-friendly
- ✅ Git history clean with meaningful commits

### For Phase 2 Overall
- ✅ All Priority 1 files migrated (Home, Profile, FoodDetail)
- ✅ All Priority 2 files migrated (remaining screens)
- ✅ Full app tested
- ✅ No regressions introduced
- ✅ ~150-180 lines of code removed
- ✅ Codebase maintainability improved

---

## 📅 RECOMMENDED TIMELINE

### Week 1
- **Day 1**: HomeScreen.tsx migration (2-3 hours)
- **Day 2**: Testing + fixes for HomeScreen
- **Day 3**: ProfileScreen.tsx migration (2-3 hours)
- **Day 4**: Testing + fixes for ProfileScreen

### Week 2
- **Day 1**: FoodDetailScreen.tsx inspection + migration
- **Day 2**: Testing + fixes
- **Day 3**: Priority 2 files (start with easiest)
- **Day 4**: Continue Priority 2 files

### Week 3
- **Day 1**: Complete remaining Priority 2 files
- **Day 2**: Full application testing
- **Day 3**: Bug fixes + refinement
- **Day 4**: Documentation + code review

**Total estimated time**: 15-20 hours over 3 weeks

---

## ✅ FINAL CHECKLIST

Before starting Phase 2:
- [ ] Phase 1 changes fully tested
- [ ] All Phase 1 files committed
- [  ] TypeScript passing for entire project
- [ ] This strategy document reviewed
- [ ] Time allocated for careful work
- [ ] Backup plan ready (git revert knowledge)

After completing Phase 2:
- [ ] All files migrated
- [ ] All tests passing
- [ ] No regressions found
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Team review complete

---

**Created**: 2025-12-02 07:48:00  
**Status**: Ready for execution  
**Owner**: Development team
