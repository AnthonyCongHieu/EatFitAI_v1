# Fix Chicken Recipe Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Recipe Suggestions screen so entering `Gà` returns production-ready Vietnamese chicken recipes instead of the “Không tìm thấy công thức nào phù hợp” empty state.

**Architecture:** Debug the full path from mobile payload → backend ingredient normalization → recipe matching → production-guide filtering → seeded DB readiness. Do not disable the production-guide gate and do not add generic UI fallback as the primary fix; fix the first layer that drops valid chicken recipes.

**Tech Stack:** React Native / Expo mobile app, .NET 9 backend, EF Core InMemory tests, Supabase/Postgres production DB, Cloudflare R2 recipe images.

---

## Current Evidence

Screenshot shows `D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\ai\RecipeSuggestionsScreen.tsx` rendering an empty response for chip `Gà`.

Code review evidence:

- `D:\EatFitAI_v1\eatfitai-backend\Data\AiVisionLabelCatalog.cs` already maps `gà` / `ga` to generic ingredient label `chicken`.
- `D:\EatFitAI_v1\eatfitai-backend\Data\RecipeIngredientEligibility.cs` treats `chicken` as an ingredient.
- `D:\EatFitAI_v1\eatfitai-backend\Data\SeedData\vietnamese_recipe_catalog.v1.json` contains multiple chicken recipes using ingredient key `chicken`, including `Phở gà`, `Lẩu gà`, `Cơm gà`, `Gà kho gừng`, `Gà xào sả ớt`, `Gà hấp sả`, `Gà nướng sả`, `Cháo gà`.
- Therefore, if the live app returns zero for `Gà`, likely breakpoints are:
  1. backend connected DB has not been seeded/deployed with the new recipe catalog,
  2. recipes exist but are filtered out by `RecipeSuggestionService.EnrichWithProductionGuidesAsync`,
  3. `RecipeGuideService` returns fallback/missing guides because seeded guide fields are absent or stale in runtime DB,
  4. `AllRecipesWithIngredients` cache is serving pre-seed data after deploy,
  5. mobile request payload differs from expected `{ availableIngredients: ['Gà'], ingredientHints: [{ name: 'Gà', foodItemId: null }] }`.

Do not assume which one is root cause until the tests/audit below identify it.

---

## Files and Responsibilities

- Modify: `D:\EatFitAI_v1\eatfitai-backend\Tests\Unit\Services\RecipeSuggestionServiceTests.cs`
  - Add a regression/integration-style test proving `Gà` returns seeded chicken recipes with production guides.
- Modify if needed: `D:\EatFitAI_v1\eatfitai-backend\Services\RecipeSuggestionService.cs`
  - Add low-risk structured diagnostics only if the regression test cannot identify the failing layer from assertions.
  - Apply minimal matching/guide/cache fix after root cause is confirmed.
- Modify if needed: `D:\EatFitAI_v1\eatfitai-backend\Data\DatabaseSeeder.cs`
  - Only if seeded recipes lack production guide fields, ingredients, image paths, or deploy-time cache invalidation safety.
- Modify: `D:\EatFitAI_v1\eatfitai-mobile\__tests__\aiService.test.ts`
  - Add a request-builder regression test for Vietnamese `Gà` chip payload.
- Modify only if payload test fails: `D:\EatFitAI_v1\eatfitai-mobile\src\services\aiService.ts`
  - Preserve Vietnamese text and selected chips exactly; avoid stale `foodItemId` leakage.
- Optional create: `D:\EatFitAI_v1\scripts\cloud\audit_recipe_suggestions.py`
  - Read-only production/Supabase audit for chicken recipe readiness before/after deploy.

Do not modify unrelated Mochi tutorial files currently dirty in the working tree.

---

### Task 1: Add backend regression test for `Gà` recipe suggestions

**Files:**
- Modify: `D:\EatFitAI_v1\eatfitai-backend\Tests\Unit\Services\RecipeSuggestionServiceTests.cs`

- [ ] **Step 1: Add a test that seeds the real catalog and queries `Gà`**

Add a new `[Fact]` near the existing suggestion tests. The exact implementation can share helpers from this file or create local scoped services, but the assertion must cover the full seed + guide gate behavior:

```csharp
[Fact]
public async Task SuggestRecipesAsync_VietnameseChickenIngredient_ReturnsProductionReadyChickenRecipes()
{
    await SeedDatabaseAsync();

    var chicken = new FoodItem
    {
        FoodName = "Thịt gà",
        FoodNameUnsigned = "thit ga ga chicken",
        FoodNameEn = "Chicken meat",
        CaloriesPer100g = 165,
        ProteinPer100g = 31,
        CarbPer100g = 0,
        FatPer100g = 3.6m,
        IsActive = true,
        IsDeleted = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    await _context.FoodItems.AddAsync(chicken);

    var recipe = new Recipe
    {
        RecipeName = "Gà kho gừng",
        Description = "Món gà production-ready",
        ImageUrl = "recipe-images/v1/thumb/ga-kho-gung.webp",
        CookTimeMinutes = 35,
        Difficulty = "Dễ",
        ServingCount = 2,
        InstructionsJson = "[\"Sơ chế gà và gừng.\",\"Ướp gà với gia vị.\",\"Kho nhỏ lửa đến khi thấm.\"]",
        SourceUrlsJson = "[\"https://monngonmoingay.com/?s=ga+kho+gung\"]",
        VideoUrl = "https://www.youtube.com/watch?v=abc123",
        EnhancedAt = DateTime.UtcNow,
        IsDeleted = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    await _context.Recipes.AddAsync(recipe);
    await _context.SaveChangesAsync();

    await _context.RecipeIngredients.AddAsync(new RecipeIngredient
    {
        RecipeId = recipe.RecipeId,
        FoodItemId = chicken.FoodItemId,
        Grams = 150
    });
    await _context.SaveChangesAsync();

    var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
    {
        Mode = "auto",
        AvailableIngredients = new List<string> { "Gà" },
        IngredientHints = new List<RecipeIngredientHintDto>
        {
            new() { Name = "Gà", FoodItemId = null, Confidence = null }
        },
        MaxResults = 12
    });

    Assert.Contains(result, item => item.RecipeName == "Gà kho gừng");
    var chickenRecipe = Assert.Single(result.Where(item => item.RecipeName == "Gà kho gừng"));
    Assert.Equal("stored", chickenRecipe.GuideStatus);
    Assert.NotNull(chickenRecipe.ImageVariants);
    Assert.Equal("recipe-images/v1/medium/ga-kho-gung.webp", chickenRecipe.ImageVariants!.MediumUrl);
    Assert.Contains("Thịt gà", chickenRecipe.MatchedIngredients);
    Assert.NotEmpty(chickenRecipe.SourceUrls);
    Assert.NotNull(chickenRecipe.YoutubeVideo);
}
```

- [ ] **Step 2: Run the targeted backend test and record failure**

Run:

```powershell
dotnet test D:\EatFitAI_v1\eatfitai-backend\EatFitAI.API.Tests.csproj --filter "FullyQualifiedName~RecipeSuggestionServiceTests" --no-restore
```

Expected before fix if the bug is in matching/guide logic: the new test fails with an empty result or missing `GuideStatus`/image variants.

- [ ] **Step 3: If the simple fixture passes, add a seed-integrated test**

If Step 2 passes, the local service logic is sound and the screenshot is more likely DB/deploy/cache. Add a second test using `DatabaseSeeder.SeedAsync` and the real Vietnamese catalog. Assert that `AvailableIngredients = ["Gà"]` returns at least one recipe whose name contains `gà` and whose guide is non-fallback.

---

### Task 2: Add mobile request-builder regression test for Vietnamese chip input

**Files:**
- Modify: `D:\EatFitAI_v1\eatfitai-mobile\__tests__\aiService.test.ts`

- [ ] **Step 1: Add test for `Gà` payload**

Add this test near the existing `buildRecipeSuggestionRequest` tests:

```ts
it('buildRecipeSuggestionRequest preserves Vietnamese chicken chip without stale ids', () => {
  const request = buildRecipeSuggestionRequest({
    ingredients: ['Gà'],
    availableFoodItemIds: [123],
    ingredientHints: [{ name: 'Gà', foodItemId: null, confidence: null }],
    mode: 'auto',
    maxResults: 12,
  });

  expect(request).toEqual({
    mode: 'auto',
    availableIngredients: ['Gà'],
    ingredientHints: [{ name: 'Gà', foodItemId: null, confidence: null }],
    maxResults: 12,
  });
});
```

- [ ] **Step 2: Run mobile targeted test**

Run:

```powershell
cd D:\EatFitAI_v1\eatfitai-mobile
npm test -- --runInBand __tests__/aiService.test.ts
```

Expected: test passes. If it fails, fix `D:\EatFitAI_v1\eatfitai-mobile\src\services\aiService.ts` so manual chips do not leak stale `availableFoodItemIds` and Vietnamese text remains unchanged.

---

### Task 3: Identify exact backend drop-off layer

**Files:**
- Modify if needed: `D:\EatFitAI_v1\eatfitai-backend\Services\RecipeSuggestionService.cs`

- [ ] **Step 1: If backend test fails, add temporary structured count assertions first**

Before changing logic, inspect these values inside `SuggestRecipesAsync` while running the failing test:

```csharp
// Evidence to inspect while debugging, not necessarily permanent:
// mode
// useDailyRecommendation
// query.NameKeys
// query.FoodItemIds
// recipesWithIngredients.Count
// recipeIngredients.Count per candidate
// matchCount per candidate
// sortedSuggestions.Count before EnrichWithProductionGuidesAsync
// result.Count after EnrichWithProductionGuidesAsync
```

Use debugger or short-lived log statements. Remove noisy temporary logs before final verification unless they are intentionally low-volume production diagnostics.

- [ ] **Step 2: Apply exactly one minimal fix based on the evidence**

Use this decision table:

| Evidence | Minimal fix |
|---|---|
| `query.NameKeys` does not contain `chicken` for input `Gà` | Extend alias expansion in `RecipeSuggestionService.ExpandAliasKeys` or `RecipeIngredientEligibility` so Vietnamese alias `gà` resolves to `chicken`. |
| `query.NameKeys` contains `chicken`, but no recipe ingredients are eligible | Fix `RecipeIngredientEligibility.IsIngredientFood` or seed ingredient `FoodNameUnsigned` so `Thịt gà` remains an ingredient. |
| candidates exist before guide enrichment, but zero after | Fix seeded guide fields or `RecipeGuideService.BuildStoredGuide`/freshness handling; do not disable `IsProductionGuide`. |
| local tests pass, production fails | deploy backend seed, clear/restart backend cache, and audit Supabase rows; do not change mobile UI as the primary fix. |

- [ ] **Step 3: Re-run targeted backend test after the minimal fix**

Run:

```powershell
dotnet test D:\EatFitAI_v1\eatfitai-backend\EatFitAI.API.Tests.csproj --filter "FullyQualifiedName~RecipeSuggestionServiceTests" --no-restore
```

Expected: new `Gà` test passes and existing recipe tests still pass.

---

### Task 4: Add read-only production/Supabase audit before deploy writes

**Files:**
- Optional create: `D:\EatFitAI_v1\scripts\cloud\audit_recipe_suggestions.py`

- [ ] **Step 1: Add a read-only audit script only if local tests pass but device still shows empty**

The script should require `SUPABASE_DB_PASSWORD` or `PGPASSWORD`; without it, print a clear message and exit non-zero. Query only; do not update rows.

Core SQL checks:

```sql
select count(*) as chicken_recipe_count
from public."Recipe" r
join public."RecipeIngredient" ri on ri."RecipeId" = r."RecipeId"
join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
where r."IsDeleted" = false
  and f."IsActive" = true
  and f."IsDeleted" = false
  and (
    lower(coalesce(f."FoodName", '')) like '%gà%'
    or lower(coalesce(f."FoodNameUnsigned", '')) like '%ga%'
    or lower(coalesce(f."FoodNameEn", '')) like '%chicken%'
  );

select r."RecipeName", r."ImageUrl", r."InstructionsJson", r."SourceUrlsJson", r."VideoUrl", r."EnhancedAt"
from public."Recipe" r
where lower(r."RecipeName") like '%gà%'
order by r."RecipeName";
```

- [ ] **Step 2: Run audit locally without secrets to confirm safe failure**

Run:

```powershell
python D:\EatFitAI_v1\scripts\cloud\audit_recipe_suggestions.py --ingredient "Gà"
```

Expected without secrets: exits with a clear missing-secret message and performs no DB write.

- [ ] **Step 3: Run audit with Supabase secret only after user provides permission/secret**

Expected production-ready DB state:

- chicken recipes exist,
- their `ImageUrl` uses `recipe-images/v1/thumb/*.webp`,
- `InstructionsJson` has at least 3 steps,
- `SourceUrlsJson` has at least one HTTPS URL,
- `VideoUrl` is HTTPS YouTube,
- `EnhancedAt` is not null.

---

### Task 5: Verify on backend, script, and mobile smoke

**Files:**
- No new files unless a failing test requires minimal code changes.

- [ ] **Step 1: Run backend full tests**

```powershell
dotnet test D:\EatFitAI_v1\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore
```

Expected: all backend tests pass.

- [ ] **Step 2: Run script tests to ensure catalog/image sync remains safe**

```powershell
python -m py_compile D:\EatFitAI_v1\scripts\cloud\food_catalog_image_sync.py
python -m unittest scripts.cloud.test_food_catalog_image_sync
```

Expected: all image sync tests pass.

- [ ] **Step 3: Run mobile aiService test**

```powershell
cd D:\EatFitAI_v1\eatfitai-mobile
npm test -- --runInBand __tests__/aiService.test.ts
```

Expected: request builder and recipe payload normalization tests pass.

- [ ] **Step 4: Manual smoke on device/emulator**

Open Recipe Suggestions screen and test:

1. Add chip `Gà`.
2. Tap `Khám phá công thức`.
3. Expected: recipe cards appear, including at least one chicken recipe such as `Gà kho gừng`, `Cơm gà`, `Phở gà`, or `Gà xào sả ớt`.
4. Open one recipe detail.
5. Expected: medium image is used, instructions/source/video exist, and no fallback guide state is shown.

---

## Regression Risks

- Disabling guide filtering would make the screenshot disappear but violate the production-ready requirement. Do not do that.
- Treating finished dishes as ingredients again can re-break `ingredient_combo` logic.
- Adding broad fuzzy matching for `gà` can accidentally match finished dishes like `Cơm gà`; prefer existing alias mapping to `chicken`.
- Production cache may hide a successful seed for up to the cache TTL or until backend restart. Include restart/cache-clear in deploy verification.
- Do not map incorrect Drive images to close-enough dishes; the current image sync correctly leaves three mismatches unresolved.

---

## Rollout Decision

If local regression tests pass but production audit fails, the fix is operational:

1. Deploy backend with Vietnamese seed catalog.
2. Restart backend to clear `AllRecipesWithIngredients` memory cache.
3. Run read-only Supabase audit.
4. Only then run R2 upload / DB relink steps after secrets are explicitly provided.

If local regression tests fail, fix the failing code path first, then deploy.
