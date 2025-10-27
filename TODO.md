# TODO: Fix Compile Errors in Backend Controllers

## 1. Update DiaryContracts.cs
- [ ] Replace `MaMonAn` in `DiaryCreateRequest` with `MaThucPham`, `MaMonNguoiDung`, `MaCongThuc` (all `long?` and at least one required).

## 2. Update DiaryController.cs
- [ ] In `Create` method: Replace `request.ItemId` and `request.Source` with `request.MaThucPham`, `request.MaMonNguoiDung`, `request.MaCongThuc`.
- [ ] Change `request.QuantityGrams` to `request.KhoiLuongGram`, `request.MealDate` to `request.NgayAn`, `request.MealCode` to `request.MaBuaAn`.
- [ ] Update response mappings in `Create` and `Update` to use `MaNhatKy`, `NgayAn`, etc., remove `Id`, `MealDate`, `ItemId`, `Source`, `FoodId`, `CustomDishId`, `AiRecipeId`.
- [ ] In `GetByDate`: Update response to match `DiaryEntryResponse` fields.
- [ ] In `Update`: Similar changes for request and response.

## 3. Update SummaryController.cs
- [ ] In `Day` method: Change `MealDate` to `NgayAn`, `TotalCaloriesKcal` to `TongCalo`, etc. in `DaySummaryResponse`.
- [ ] In `Week` method: Update `WeekSummaryItem` mappings similarly.

## 4. Check FoodsController.cs and NutritionTargetsController.cs
- [ ] Verify if mappings already match; update if necessary.

## 5. Build and Test
- [ ] Run build to check for remaining errors.
- [ ] Fix any additional issues.
