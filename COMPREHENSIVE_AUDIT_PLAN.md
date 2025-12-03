# 🔍 KẾ HOẠCH AUDIT & OPTIMIZATION TOÀN DIỆN - EATFITAI

**Mục tiêu**: Kiểm tra và tối ưu hóa toàn bộ codebase từ UI/UX → Frontend → Backend → Database  
**Thời gian ước tính**: 4-6 giờ  
**Ngày**: 2025-12-03

---

## 📋 PHẠM VI AUDIT

### 1. UI/UX LAYER (Mobile App)
- ✅ Giao diện có nhất quán không?
- ✅ Có nút bấm dư thừa/trùng lặp?
- ✅ User flow có hợp lý?
- ✅ Accessibility (màu sắc, font size, contrast)
- ✅ Loading states & error handling

### 2. FRONTEND LOGIC (React Native)
- ✅ State management (Zustand vs React Query)
- ✅ API calls optimization
- ✅ Component reusability
- ✅ Code duplication
- ✅ Performance (re-renders, memory leaks)

### 3. API LAYER (Frontend ↔ Backend)
- ✅ REST API design consistency
- ✅ Request/Response DTOs
- ✅ Error handling
- ✅ Pagination implementation
- ✅ Caching strategy

### 4. BACKEND LOGIC (.NET Core)
- ✅ Service layer logic
- ✅ Business rules validation
- ✅ Error handling patterns
- ✅ Code duplication
- ✅ Performance bottlenecks

### 5. DATABASE LAYER (SQL Server)
- ✅ Schema design
- ✅ Indexes efficiency
- ✅ Query optimization
- ✅ Stored procedures (nếu có)
- ✅ Data integrity

---

## 🎯 AUDIT PLAN - 5 PHASES

---

## PHASE 1: UI/UX AUDIT (1-2 giờ)

### Checklist:

#### 1.1 Navigation & User Flow
- [ ] Kiểm tra navigation stack - có route dư thừa?
- [ ] Bottom tab có quá nhiều tabs? (tối đa 5)
- [ ] Deep linking có hoạt động?
- [ ] Back button behavior có consistent?

**Files cần check**:
- `eatfitai-mobile/src/app/navigation/`
- `eatfitai-mobile/src/app/screens/`

**Công cụ**:
```bash
# Count số screens
find eatfitai-mobile/src/app/screens -name "*Screen.tsx" | wc -l

# Check navigation structure
grep -r "createNativeStackNavigator\|createBottomTabNavigator" eatfitai-mobile/src/app/navigation
```

---

#### 1.2 Component Consistency
- [ ] Button styles có nhất quán? (primary, secondary, danger)
- [ ] Input fields có validation UI consistent?
- [ ] Card components có reuse?
- [ ] Color palette có follow theme?

**Files cần check**:
- `eatfitai-mobile/src/components/`
- `eatfitai-mobile/src/theme/`

**Tìm duplicate components**:
```bash
# Tìm components tương tự
grep -r "const.*Button.*=" eatfitai-mobile/src/components
grep -r "const.*Card.*=" eatfitai-mobile/src/components
```

---

#### 1.3 Accessibility & UX
- [ ] Font sizes có đủ lớn? (minimum 14px)
- [ ] Color contrast có đạt WCAG AA?
- [ ] Touch targets có đủ lớn? (minimum 44x44px)
- [ ] Loading states có clear?
- [ ] Error messages có helpful?

**Test**:
- Bật Dark Mode → Check contrast
- Zoom 200% → Check text readability
- Tap các buttons → Check feedback (haptics?)

---

#### 1.4 Redundant Features Detection
- [ ] Có screens duplicate chức năng?
- [ ] Có buttons không dùng?
- [ ] Có modals/dialogs dư thừa?

**Ví dụ cần check**:
- `AddMealScreen` vs `QuickAddMealScreen` - Có trùng?
- `FoodSearchScreen` vs `CustomDishScreen` - Logic có overlap?

---

## PHASE 2: FRONTEND LOGIC AUDIT (1.5 giờ)

### Checklist:

#### 2.1 State Management Review
- [ ] Zustand stores có quá nhiều?
- [ ] React Query có được dùng đúng?
- [ ] Local state vs Global state - có hợp lý?
- [ ] State updates có optimize? (memo, useMemo, useCallback)

**Files cần check**:
- `eatfitai-mobile/src/stores/`
- `eatfitai-mobile/src/hooks/`

**Audit script**:
```bash
# Count Zustand stores
find eatfitai-mobile/src/stores -name "*.ts" | wc -l

# Check React Query usage
grep -r "useQuery\|useMutation" eatfitai-mobile/src --include="*.tsx" | wc -l

# Find useState in screens (should be minimal)
grep -r "useState" eatfitai-mobile/src/app/screens --include="*.tsx" | wc -l
```

**Recommendations**:
- Zustand: Chỉ cho session data (user, auth)
- React Query: Cho tất cả server data
- Local state: Chỉ cho UI state (modals, forms)

---

#### 2.2 API Calls Optimization
- [ ] Có duplicate API calls?
- [ ] Có missing error handling?
- [ ] Có implement retry logic?
- [ ] Có cache stale data?

**Files cần check**:
- `eatfitai-mobile/src/services/`
- `eatfitai-mobile/src/api/`

**Tìm issues**:
```bash
# Tìm API calls không có error handling
grep -A 5 "apiClient\." eatfitai-mobile/src/services/*.ts | grep -v "catch"

# Tìm duplicate endpoints
grep -r "'/api/" eatfitai-mobile/src/services | sort | uniq -d
```

---

#### 2.3 Component Performance
- [ ] Có components re-render không cần thiết?
- [ ] FlatList có optimize? (keyExtractor, getItemLayout)
- [ ] Images có lazy load?
- [ ] Heavy computations có useMemo?

**Performance audit**:
```bash
# Tìm FlatList không có optimization
grep -A 10 "<FlatList" eatfitai-mobile/src --include="*.tsx" | grep -v "keyExtractor\|getItemLayout"

# Tìm inline functions trong render (performance issue)
grep -r "onClick={() =>" eatfitai-mobile/src/app/screens
```

---

#### 2.4 Code Duplication
- [ ] Có logic duplicate giữa screens?
- [ ] Có utility functions duplicate?
- [ ] Có styles duplicate?

**Tìm duplication**:
```bash
# Tìm functions giống nhau
jscpd eatfitai-mobile/src --min-lines 10 --min-tokens 50

# Hoặc manual check
grep -r "const.*=.*async.*=>" eatfitai-mobile/src/app/screens | sort
```

---

## PHASE 3: API LAYER AUDIT (1 giờ)

### Checklist:

#### 3.1 REST API Design
- [ ] Endpoints có follow RESTful conventions?
- [ ] HTTP methods có đúng? (GET, POST, PUT, DELETE)
- [ ] URL naming có consistent?
- [ ] Versioning có implement?

**Backend endpoints audit**:
```bash
# List tất cả endpoints
grep -r "\[Http.*\]" eatfitai-backend/Controllers --include="*.cs" -A 1

# Check naming consistency
grep -r "\[Route(" eatfitai-backend/Controllers --include="*.cs"
```

**Expected patterns**:
- ✅ `GET /api/meal-diary` - List
- ✅ `GET /api/meal-diary/{id}` - Detail
- ✅ `POST /api/meal-diary` - Create
- ✅ `PUT /api/meal-diary/{id}` - Update
- ✅ `DELETE /api/meal-diary/{id}` - Delete

**Anti-patterns**:
- ❌ `GET /api/getMealDiary` - Verb in URL
- ❌ `POST /api/meal-diary/delete` - Wrong method

---

#### 3.2 Request/Response DTOs
- [ ] DTOs có validation attributes?
- [ ] Response có consistent structure?
- [ ] Error responses có standardized?
- [ ] Có pagination DTOs?

**Files cần check**:
- `eatfitai-backend/DTOs/`

**Validation check**:
```bash
# Tìm DTOs thiếu validation
grep -L "\[Required\]\|\[Range\]\|\[MaxLength\]" eatfitai-backend/DTOs/*.cs
```

---

#### 3.3 Error Handling Consistency
- [ ] Backend có return consistent error format?
- [ ] Frontend có handle tất cả error codes?
- [ ] Error messages có user-friendly?

**Backend error format check**:
```bash
# Check error responses
grep -r "StatusCode(500\|400\|404\|401" eatfitai-backend/Controllers --include="*.cs"
```

**Expected format**:
```json
{
  "error": {
    "code": "MEAL_NOT_FOUND",
    "message": "Meal diary entry not found",
    "details": {}
  }
}
```

---

#### 3.4 Pagination & Filtering
- [ ] List endpoints có pagination?
- [ ] Có filtering options?
- [ ] Có sorting options?
- [ ] Response có metadata (total, page, pageSize)?

**Check pagination**:
```bash
# Tìm endpoints trả về lists
grep -r "Task<.*IEnumerable\|Task<.*List" eatfitai-backend/Controllers --include="*.cs"
```

---

## PHASE 4: BACKEND LOGIC AUDIT (1.5 giờ)

### Checklist:

#### 4.1 Service Layer Logic
- [ ] Services có quá nhiều responsibilities?
- [ ] Business rules có centralized?
- [ ] Có duplicate logic giữa services?
- [ ] Validation có consistent?

**Files cần check**:
- `eatfitai-backend/Services/`

**Metrics**:
```bash
# Count lines per service (should be < 500)
wc -l eatfitai-backend/Services/*.cs | sort -n

# Find God Classes (> 1000 lines)
find eatfitai-backend/Services -name "*.cs" -exec wc -l {} \; | awk '$1 > 1000'
```

---

#### 4.2 Repository Pattern Usage
- [ ] Repositories có consistent interface?
- [ ] Có leak DbContext ra ngoài?
- [ ] Query logic có trong Repository hay Service?
- [ ] Có implement Unit of Work?

**Check**:
```bash
# Tìm DbContext injection ngoài Repository
grep -r "EatFitAIDbContext" eatfitai-backend/Services --include="*.cs"
```

---

#### 4.3 Error Handling & Logging
- [ ] Exceptions có được log?
- [ ] Có custom exceptions?
- [ ] Try-catch có swallow exceptions?
- [ ] Logging có structured?

**Find issues**:
```bash
# Tìm empty catch blocks
grep -A 2 "catch" eatfitai-backend --include="*.cs" | grep -B 1 "^\s*}$"

# Tìm generic Exception catch
grep -r "catch (Exception)" eatfitai-backend --include="*.cs"
```

---

#### 4.4 Performance Bottlenecks
- [ ] Có synchronous DB calls trong loops?
- [ ] Có N+1 queries?
- [ ] Có heavy computations trong request pipeline?
- [ ] Có missing async/await?

**Check**:
```bash
# Tìm sync DB calls
grep -r "\.Result\|\.Wait()" eatfitai-backend/Services --include="*.cs"

# Tìm loops với DB calls
grep -B 3 "foreach\|for (" eatfitai-backend/Services --include="*.cs" | grep -A 5 "await.*Async"
```

---

## PHASE 5: DATABASE AUDIT (1 giờ)

### Checklist:

#### 5.1 Schema Design Review
- [ ] Tables có normalized?
- [ ] Foreign Keys có đầy đủ?
- [ ] Data types có appropriate?
- [ ] Có redundant columns?

**Check**:
```sql
-- Tìm tables thiếu FK
SELECT t.name AS TableName
FROM sys.tables t
LEFT JOIN sys.foreign_keys fk ON t.object_id = fk.parent_object_id
WHERE fk.object_id IS NULL
  AND t.name NOT IN ('MealType', 'ActivityLevel', 'ServingUnit');

-- Tìm NVARCHAR(MAX) abuse
SELECT t.name AS TableName, c.name AS ColumnName, c.max_length
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
WHERE c.system_type_id = 231 -- NVARCHAR
  AND c.max_length = -1; -- MAX
```

---

#### 5.2 Index Effectiveness
- [ ] Indexes có được dùng?
- [ ] Có missing indexes?
- [ ] Có unused indexes?
- [ ] Index fragmentation?

**Check**:
```sql
-- Missing indexes
SELECT 
    OBJECT_NAME(d.object_id) AS TableName,
    d.equality_columns,
    d.inequality_columns,
    d.included_columns
FROM sys.dm_db_missing_index_details d
JOIN sys.dm_db_missing_index_groups g ON d.index_handle = g.index_handle
ORDER BY g.avg_user_impact DESC;

-- Unused indexes
SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE s.user_seeks = 0 AND s.user_scans = 0 AND s.user_updates > 0;
```

---

#### 5.3 Query Performance
- [ ] Slow queries có identify?
- [ ] Execution plans có optimize?
- [ ] Có missing statistics?

**Check**:
```sql
-- Top 10 slowest queries
SELECT TOP 10
    qs.execution_count,
    qs.total_elapsed_time / 1000000.0 AS total_elapsed_time_sec,
    qs.total_elapsed_time / qs.execution_count / 1000000.0 AS avg_elapsed_time_sec,
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY qs.total_elapsed_time DESC;
```

---

#### 5.4 Data Integrity
- [ ] Orphaned records có tồn tại?
- [ ] Soft delete có consistent?
- [ ] Audit trails có complete?

**Check**:
```sql
-- Tìm orphaned MealDiary (UserId không tồn tại)
SELECT COUNT(*) 
FROM MealDiary md
LEFT JOIN Users u ON md.UserId = u.UserId
WHERE u.UserId IS NULL;

-- Check soft delete consistency
SELECT 
    t.name AS TableName,
    CASE WHEN c.name IS NOT NULL THEN 'Yes' ELSE 'No' END AS HasIsDeleted
FROM sys.tables t
LEFT JOIN sys.columns c ON t.object_id = c.object_id AND c.name = 'IsDeleted'
WHERE t.name NOT IN ('sysdiagrams');
```

---

## 📊 DELIVERABLES

### 1. Audit Reports
- [ ] `UI_UX_AUDIT_REPORT.md` - UI/UX findings
- [ ] `FRONTEND_AUDIT_REPORT.md` - Frontend logic issues
- [ ] `API_AUDIT_REPORT.md` - API design issues
- [ ] `BACKEND_AUDIT_REPORT.md` - Backend logic issues
- [ ] `DATABASE_AUDIT_REPORT.md` - Database optimization

### 2. Optimization Plans
- [ ] `UI_OPTIMIZATION_PLAN.md` - UI improvements
- [ ] `CODE_REFACTORING_PLAN.md` - Code cleanup
- [ ] `PERFORMANCE_OPTIMIZATION_PLAN.md` - Performance fixes
- [ ] `DATABASE_OPTIMIZATION_PLAN.md` - DB tuning

### 3. Implementation Tasks
- [ ] Prioritized task list (Critical → Nice-to-have)
- [ ] Time estimates per task
- [ ] Dependencies mapping

---

## 🎯 SUCCESS CRITERIA

### Performance Metrics:
- [ ] API response time < 200ms (p95)
- [ ] Mobile app startup < 3s
- [ ] Screen transitions < 100ms
- [ ] Database queries < 100ms (p95)

### Code Quality Metrics:
- [ ] Code duplication < 5%
- [ ] Test coverage > 70%
- [ ] No critical security issues
- [ ] No performance bottlenecks

### UX Metrics:
- [ ] User flow < 3 taps to main features
- [ ] Error rate < 1%
- [ ] Crash rate < 0.1%

---

## 🚀 EXECUTION PLAN

### Week 1: Audit Phase
- **Day 1-2**: UI/UX + Frontend audit
- **Day 3**: API + Backend audit
- **Day 4**: Database audit
- **Day 5**: Consolidate findings

### Week 2: Planning Phase
- **Day 1-2**: Create optimization plans
- **Day 3**: Prioritize tasks
- **Day 4-5**: Review with team

### Week 3-4: Implementation Phase
- **Week 3**: Critical fixes
- **Week 4**: Nice-to-have improvements

---

## 📝 NEXT STEPS

1. **Review this plan** - Adjust scope if needed
2. **Allocate time** - Block calendar for audit
3. **Prepare tools** - Install analysis tools
4. **Start Phase 1** - Begin UI/UX audit

---

**Bạn muốn tôi bắt đầu từ Phase nào?**
- Phase 1: UI/UX Audit
- Phase 2: Frontend Logic Audit
- Phase 3: API Layer Audit
- Phase 4: Backend Logic Audit
- Phase 5: Database Audit

Hoặc tôi có thể chạy automated checks trước để có overview nhanh?
