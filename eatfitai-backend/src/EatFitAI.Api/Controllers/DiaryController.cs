using EatFitAI.Api.Contracts.Diary;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Ai;
using EatFitAI.Domain.Diary;
using EatFitAI.Domain.Foods;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/diary")]
[Authorize]
public sealed class DiaryController : ControllerBase
{
    private readonly IDiaryRepository _diaryRepository;
    private readonly IFoodRepository _foodRepository;
    private readonly ICustomDishRepository _customDishRepository;
    private readonly AppDbContext _context;

    public DiaryController(
        IDiaryRepository diaryRepository,
        IFoodRepository foodRepository,
        ICustomDishRepository customDishRepository,
        AppDbContext context)
    {
        _diaryRepository = diaryRepository;
        _foodRepository = foodRepository;
        _customDishRepository = customDishRepository;
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DiaryCreateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        // Determine the source entity based on ItemId and Source
        Food? food = null;
        CustomDish? customDish = null;
        AiRecipe? aiRecipe = null;

        if (request.Source == "food")
        {
            food = await _foodRepository.GetByIdAsync((long)request.ItemId, cancellationToken);
            if (food == null) return NotFound("Food not found");
        }
        else if (request.Source == "custom-dish")
        {
            customDish = await _customDishRepository.GetByIdAsync((long)request.ItemId, userId, cancellationToken);
            if (customDish == null) return NotFound("Custom dish not found");
        }
        else if (request.Source == "ai-recipe")
        {
            aiRecipe = await _context.NhatKyAI.FindAsync(request.ItemId, cancellationToken);
            if (aiRecipe == null) return NotFound("AI recipe not found");
        }

        // Calculate nutrition values based on quantity
        decimal calories = 0, protein = 0, carbs = 0, fat = 0;

        if (food != null)
        {
            var ratio = request.QuantityGrams / 100m;
            calories = food.Calo100g * ratio;
            protein = food.Protein100g * ratio;
            carbs = food.Carb100g * ratio;
            fat = food.Fat100g * ratio;
        }
        else if (customDish != null)
        {
            var ratio = request.QuantityGrams / 100m; // Domain uses 100g as standard
            calories = customDish.Calo100g * ratio;
            protein = customDish.Protein100g * ratio;
            carbs = customDish.Carb100g * ratio;
            fat = customDish.Fat100g * ratio;
        }
        else if (aiRecipe != null)
        {
            // AI recipes don't have nutrition data in the domain model
            // This would need to be parsed from KetQuaAI JSON or handled differently
            calories = 0;
            protein = 0;
            carbs = 0;
            fat = 0;
        }

        var diaryEntry = new DiaryEntry
        {
            MaNguoiDung = userId,
            NgayAn = request.MealDate,
            MaBuaAn = request.MealCode,
            MaThucPham = food?.MaThucPham,
            MaMonNguoiDung = customDish?.MaMonNguoiDung,
            MaCongThuc = aiRecipe?.MaGoiYAI,
            KhoiLuongGram = request.QuantityGrams,
            Calo = calories,
            Protein = protein,
            Carb = carbs,
            Fat = fat,
            NgayTao = DateTime.UtcNow
        };

        await _diaryRepository.AddAsync(diaryEntry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        var response = new DiaryEntryResponse
        {
            Id = diaryEntry.MaNhatKy,
            MealDate = diaryEntry.NgayAn,
            MealCode = diaryEntry.MaBuaAn,
            FoodId = diaryEntry.MaThucPham,
            CustomDishId = diaryEntry.MaMonNguoiDung,
            AiRecipeId = diaryEntry.MaCongThuc,
            ItemId = diaryEntry.MaThucPham ?? diaryEntry.MaMonNguoiDung ?? diaryEntry.MaCongThuc ?? 0,
            Source = request.Source, // Need to determine source from the IDs
            QuantityGrams = diaryEntry.KhoiLuongGram,
            CaloriesKcal = diaryEntry.Calo,
            ProteinGrams = diaryEntry.Protein,
            CarbohydrateGrams = diaryEntry.Carb,
            FatGrams = diaryEntry.Fat,
            Notes = null // Domain doesn't have notes
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetByDate([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var entries = await _diaryRepository.GetByDateAsync(userId, date, cancellationToken);

        var items = entries.Select(entry => new DiaryEntryResponse
        {
            Id = entry.MaNhatKy,
            MealDate = entry.NgayAn,
            MealCode = entry.MaBuaAn,
            FoodId = entry.MaThucPham,
            CustomDishId = entry.MaMonNguoiDung,
            AiRecipeId = entry.MaCongThuc,
            ItemId = entry.MaThucPham ?? entry.MaMonNguoiDung ?? entry.MaCongThuc ?? 0,
            Source = entry.MaThucPham.HasValue ? "food" : entry.MaMonNguoiDung.HasValue ? "custom-dish" : "ai-recipe",
            QuantityGrams = entry.KhoiLuongGram,
            CaloriesKcal = entry.Calo,
            ProteinGrams = entry.Protein,
            CarbohydrateGrams = entry.Carb,
            FatGrams = entry.Fat,
            Notes = null // Domain doesn't have notes
        });

        return Ok(items);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete([FromRoute] long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var entry = await _diaryRepository.GetByIdAsync(id, userId, cancellationToken);

        if (entry == null)
        {
            return NotFound();
        }

        await _diaryRepository.DeleteAsync(entry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update([FromRoute] long id, [FromBody] DiaryUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        var entry = await _diaryRepository.GetByIdAsync(id, userId, cancellationToken);

        if (entry == null)
        {
            return NotFound();
        }

        // Update allowed fields
        entry.KhoiLuongGram = request.QuantityGrams ?? entry.KhoiLuongGram;

        // Recalculate nutrition if quantity changed
        if (request.QuantityGrams.HasValue)
        {
            decimal ratio = 0;

            if (entry.MaThucPham.HasValue)
            {
                var food = await _foodRepository.GetByIdAsync(entry.MaThucPham.Value, cancellationToken);
                if (food != null)
                {
                    ratio = request.QuantityGrams.Value / 100m;
                    entry.Calo = food.Calo100g * ratio;
                    entry.Protein = food.Protein100g * ratio;
                    entry.Carb = food.Carb100g * ratio;
                    entry.Fat = food.Fat100g * ratio;
                }
            }
            else if (entry.MaMonNguoiDung.HasValue)
            {
                var customDish = await _customDishRepository.GetByIdAsync(entry.MaMonNguoiDung.Value, userId, cancellationToken);
                if (customDish != null)
                {
                    ratio = request.QuantityGrams.Value / 100m; // Domain uses 100g as standard
                    entry.Calo = customDish.Calo100g * ratio;
                    entry.Protein = customDish.Protein100g * ratio;
                    entry.Carb = customDish.Carb100g * ratio;
                    entry.Fat = customDish.Fat100g * ratio;
                }
            }
            else if (entry.MaCongThuc.HasValue)
            {
                // AI recipes don't have nutrition data in domain model
                // This would need to be handled differently
            }
        }

        await _diaryRepository.UpdateAsync(entry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        var response = new DiaryEntryResponse
        {
            Id = entry.MaNhatKy,
            MealDate = entry.NgayAn,
            MealCode = entry.MaBuaAn,
            FoodId = entry.MaThucPham,
            CustomDishId = entry.MaMonNguoiDung,
            AiRecipeId = entry.MaCongThuc,
            ItemId = entry.MaThucPham ?? entry.MaMonNguoiDung ?? entry.MaCongThuc ?? 0,
            Source = entry.MaThucPham.HasValue ? "food" : entry.MaMonNguoiDung.HasValue ? "custom-dish" : "ai-recipe",
            QuantityGrams = entry.KhoiLuongGram,
            CaloriesKcal = entry.Calo,
            ProteinGrams = entry.Protein,
            CarbohydrateGrams = entry.Carb,
            FatGrams = entry.Fat,
            Notes = null // Domain doesn't have notes
        };

        return Ok(response);
    }

}
