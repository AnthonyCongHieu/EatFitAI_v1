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
            food = await _foodRepository.GetByIdAsync(request.ItemId, cancellationToken);
            if (food == null) return NotFound("Food not found");
        }
        else if (request.Source == "custom-dish")
        {
            customDish = await _customDishRepository.GetByIdAsync(request.ItemId, userId, cancellationToken);
            if (customDish == null) return NotFound("Custom dish not found");
        }
        else if (request.Source == "ai-recipe")
        {
            aiRecipe = await _context.AiRecipes.FindAsync(request.ItemId, cancellationToken);
            if (aiRecipe == null) return NotFound("AI recipe not found");
        }

        // Calculate nutrition values based on quantity
        decimal calories = 0, protein = 0, carbs = 0, fat = 0;

        if (food != null)
        {
            var ratio = request.QuantityGrams / 100m;
            calories = food.CaloriesKcal * ratio;
            protein = food.ProteinGrams * ratio;
            carbs = food.CarbohydrateGrams * ratio;
            fat = food.FatGrams * ratio;
        }
        else if (customDish != null)
        {
            var ratio = request.QuantityGrams / customDish.PortionSizeGrams;
            calories = customDish.CaloriesKcal * ratio;
            protein = customDish.ProteinGrams * ratio;
            carbs = customDish.CarbohydrateGrams * ratio;
            fat = customDish.FatGrams * ratio;
        }
        else if (aiRecipe != null)
        {
            var ratio = request.QuantityGrams / 100m; // Assuming 100g portion for AI recipes
            calories = aiRecipe.CaloriesKcal * ratio;
            protein = aiRecipe.ProteinGrams * ratio;
            carbs = aiRecipe.CarbohydrateGrams * ratio;
            fat = aiRecipe.FatGrams * ratio;
        }

        var diaryEntry = new DiaryEntry
        {
            UserId = userId,
            MealDate = request.MealDate,
            MealCode = request.MealCode,
            FoodId = food?.Id,
            CustomDishId = customDish?.Id,
            AiRecipeId = aiRecipe?.Id,
            ItemId = request.ItemId,
            Source = request.Source,
            QuantityGrams = request.QuantityGrams,
            CaloriesKcal = calories,
            ProteinGrams = protein,
            CarbohydrateGrams = carbs,
            FatGrams = fat,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _diaryRepository.AddAsync(diaryEntry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        var response = new DiaryEntryResponse
        {
            Id = diaryEntry.Id,
            MealDate = diaryEntry.MealDate,
            MealCode = diaryEntry.MealCode,
            FoodId = diaryEntry.FoodId,
            CustomDishId = diaryEntry.CustomDishId,
            AiRecipeId = diaryEntry.AiRecipeId,
            ItemId = diaryEntry.ItemId,
            Source = diaryEntry.Source,
            QuantityGrams = diaryEntry.QuantityGrams,
            CaloriesKcal = diaryEntry.CaloriesKcal,
            ProteinGrams = diaryEntry.ProteinGrams,
            CarbohydrateGrams = diaryEntry.CarbohydrateGrams,
            FatGrams = diaryEntry.FatGrams,
            Notes = diaryEntry.Notes
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
            Id = entry.Id,
            MealDate = entry.MealDate,
            MealCode = entry.MealCode,
            FoodId = entry.FoodId,
            CustomDishId = entry.CustomDishId,
            AiRecipeId = entry.AiRecipeId,
            ItemId = entry.ItemId,
            Source = entry.Source,
            QuantityGrams = entry.QuantityGrams,
            CaloriesKcal = entry.CaloriesKcal,
            ProteinGrams = entry.ProteinGrams,
            CarbohydrateGrams = entry.CarbohydrateGrams,
            FatGrams = entry.FatGrams,
            Notes = entry.Notes
        });

        return Ok(items);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
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

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] DiaryUpdateRequest request, CancellationToken cancellationToken)
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
        entry.QuantityGrams = request.QuantityGrams ?? entry.QuantityGrams;
        entry.Notes = request.Notes ?? entry.Notes;
        entry.UpdatedAt = DateTime.UtcNow;

        // Recalculate nutrition if quantity changed
        if (request.QuantityGrams.HasValue)
        {
            decimal ratio = 0;

            if (entry.Source == "food")
            {
                var food = await _foodRepository.GetByIdAsync(entry.ItemId, cancellationToken);
                if (food != null)
                {
                    ratio = request.QuantityGrams.Value / 100m;
                    entry.CaloriesKcal = food.CaloriesKcal * ratio;
                    entry.ProteinGrams = food.ProteinGrams * ratio;
                    entry.CarbohydrateGrams = food.CarbohydrateGrams * ratio;
                    entry.FatGrams = food.FatGrams * ratio;
                }
            }
            else if (entry.Source == "custom-dish")
            {
                var customDish = await _customDishRepository.GetByIdAsync(entry.ItemId, userId, cancellationToken);
                if (customDish != null)
                {
                    ratio = request.QuantityGrams.Value / customDish.PortionSizeGrams;
                    entry.CaloriesKcal = customDish.CaloriesKcal * ratio;
                    entry.ProteinGrams = customDish.ProteinGrams * ratio;
                    entry.CarbohydrateGrams = customDish.CarbohydrateGrams * ratio;
                    entry.FatGrams = customDish.FatGrams * ratio;
                }
            }
            else if (entry.Source == "ai-recipe")
            {
                var aiRecipe = await _context.AiRecipes.FindAsync(entry.ItemId, cancellationToken);
                if (aiRecipe != null)
                {
                    ratio = request.QuantityGrams.Value / 100m;
                    entry.CaloriesKcal = aiRecipe.CaloriesKcal * ratio;
                    entry.ProteinGrams = aiRecipe.ProteinGrams * ratio;
                    entry.CarbohydrateGrams = aiRecipe.CarbohydrateGrams * ratio;
                    entry.FatGrams = aiRecipe.FatGrams * ratio;
                }
            }
        }

        await _diaryRepository.UpdateAsync(entry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        var response = new DiaryEntryResponse
        {
            Id = entry.Id,
            MealDate = entry.MealDate,
            MealCode = entry.MealCode,
            FoodId = entry.FoodId,
            CustomDishId = entry.CustomDishId,
            AiRecipeId = entry.AiRecipeId,
            ItemId = entry.ItemId,
            Source = entry.Source,
            QuantityGrams = entry.QuantityGrams,
            CaloriesKcal = entry.CaloriesKcal,
            ProteinGrams = entry.ProteinGrams,
            CarbohydrateGrams = entry.CarbohydrateGrams,
            FatGrams = entry.FatGrams,
            Notes = entry.Notes
        };

        return Ok(response);
    }

}
