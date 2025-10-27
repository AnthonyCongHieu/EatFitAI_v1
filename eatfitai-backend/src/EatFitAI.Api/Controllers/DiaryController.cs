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
using System.Text.Json;

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

    private sealed class AiRecipeResult
    {
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DiaryCreateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        // Determine the source entity based on MaThucPham, MaMonNguoiDung, MaCongThuc
        Food? food = null;
        CustomDish? customDish = null;
        AiRecipe? aiRecipe = null;

        if (request.MaThucPham.HasValue)
        {
            food = await _foodRepository.GetByIdAsync(request.MaThucPham.Value, cancellationToken);
            if (food == null) return NotFound("Food not found");
        }
        else if (request.MaMonNguoiDung.HasValue)
        {
            customDish = await _customDishRepository.GetByIdAsync(request.MaMonNguoiDung.Value, userId, cancellationToken);
            if (customDish == null) return NotFound("Custom dish not found");
        }
        else if (request.MaCongThuc.HasValue)
        {
            aiRecipe = await _context.NhatKyAI.FindAsync(request.MaCongThuc.Value, cancellationToken);
            if (aiRecipe == null) return NotFound("AI recipe not found");
        }
        else
        {
            return BadRequest("At least one of MaThucPham, MaMonNguoiDung, or MaCongThuc must be provided");
        }

        // Calculate nutrition values based on quantity
        decimal calories = 0, protein = 0, carbs = 0, fat = 0;

        if (food != null)
        {
            var ratio = request.KhoiLuongGram / 100m;
            calories = food.Calo100g * ratio;
            protein = food.Protein100g * ratio;
            carbs = food.Carb100g * ratio;
            fat = food.Fat100g * ratio;
        }
        else if (customDish != null)
        {
            var ratio = request.KhoiLuongGram / 100m; // Domain uses 100g as standard
            calories = customDish.Calo100g * ratio;
            protein = customDish.Protein100g * ratio;
            carbs = customDish.Carb100g * ratio;
            fat = customDish.Fat100g * ratio;
        }
        else if (aiRecipe != null)
        {
            // Parse nutrition data from KetQuaAI JSON
            if (!string.IsNullOrEmpty(aiRecipe.KetQuaAI))
            {
                try
                {
                    var aiResult = JsonSerializer.Deserialize<AiRecipeResult>(aiRecipe.KetQuaAI);
                    if (aiResult != null)
                    {
                        var ratio = request.KhoiLuongGram / 100m; // Assuming AI recipes provide per 100g values
                        calories = aiResult.CaloriesKcal * ratio;
                        protein = aiResult.ProteinGrams * ratio;
                        carbs = aiResult.CarbohydrateGrams * ratio;
                        fat = aiResult.FatGrams * ratio;
                    }
                    else
                    {
                        calories = 0;
                        protein = 0;
                        carbs = 0;
                        fat = 0;
                    }
                }
                catch (JsonException)
                {
                    // If JSON parsing fails, set nutrition to 0
                    calories = 0;
                    protein = 0;
                    carbs = 0;
                    fat = 0;
                }
            }
            else
            {
                calories = 0;
                protein = 0;
                carbs = 0;
                fat = 0;
            }
        }

        var diaryEntry = new DiaryEntry
        {
            MaNguoiDung = userId,
            NgayAn = request.NgayAn,
            MaBuaAn = request.MaBuaAn,
            MaThucPham = food?.MaThucPham,
            MaMonNguoiDung = customDish?.MaMonNguoiDung,
            MaCongThuc = aiRecipe?.MaGoiYAI,
            KhoiLuongGram = request.KhoiLuongGram,
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
            MaNhatKy = diaryEntry.MaNhatKy,
            NgayAn = diaryEntry.NgayAn,
            MaBuaAn = diaryEntry.MaBuaAn,
            MaThucPham = diaryEntry.MaThucPham,
            MaMonNguoiDung = diaryEntry.MaMonNguoiDung,
            MaCongThuc = diaryEntry.MaCongThuc,
            KhoiLuongGram = diaryEntry.KhoiLuongGram,
            Calo = diaryEntry.Calo,
            Protein = diaryEntry.Protein,
            Carb = diaryEntry.Carb,
            Fat = diaryEntry.Fat,
            NgayTao = diaryEntry.NgayTao,
            GhiChu = request.GhiChu
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
            MaNhatKy = entry.MaNhatKy,
            NgayAn = entry.NgayAn,
            MaBuaAn = entry.MaBuaAn,
            MaThucPham = entry.MaThucPham,
            MaMonNguoiDung = entry.MaMonNguoiDung,
            MaCongThuc = entry.MaCongThuc,
            KhoiLuongGram = entry.KhoiLuongGram,
            Calo = entry.Calo,
            Protein = entry.Protein,
            Carb = entry.Carb,
            Fat = entry.Fat,
            NgayTao = entry.NgayTao,
            GhiChu = null
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
        entry.KhoiLuongGram = request.KhoiLuongGram ?? entry.KhoiLuongGram;

        // Recalculate nutrition if quantity changed
        if (request.KhoiLuongGram.HasValue)
        {
            decimal ratio = 0;

            if (entry.MaThucPham.HasValue)
            {
                var food = await _foodRepository.GetByIdAsync(entry.MaThucPham.Value, cancellationToken);
                if (food != null)
                {
                    ratio = request.KhoiLuongGram.Value / 100m;
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
                    ratio = request.KhoiLuongGram.Value / 100m; // Domain uses 100g as standard
                    entry.Calo = customDish.Calo100g * ratio;
                    entry.Protein = customDish.Protein100g * ratio;
                    entry.Carb = customDish.Carb100g * ratio;
                    entry.Fat = customDish.Fat100g * ratio;
                }
            }
            else if (entry.MaCongThuc.HasValue)
            {
                var aiRecipe = await _context.NhatKyAI.FindAsync(entry.MaCongThuc.Value, cancellationToken);
                if (aiRecipe != null && !string.IsNullOrEmpty(aiRecipe.KetQuaAI))
                {
                    try
                    {
                        var aiResult = JsonSerializer.Deserialize<AiRecipeResult>(aiRecipe.KetQuaAI);
                        if (aiResult != null)
                        {
                            decimal aiRatio = request.KhoiLuongGram.Value / 100m; // Assuming AI recipes provide per 100g values
                            entry.Calo = aiResult.CaloriesKcal * aiRatio;
                            entry.Protein = aiResult.ProteinGrams * aiRatio;
                            entry.Carb = aiResult.CarbohydrateGrams * aiRatio;
                            entry.Fat = aiResult.FatGrams * aiRatio;
                        }
                    }
                    catch (JsonException)
                    {
                        // If JSON parsing fails, keep existing values or set to 0
                        entry.Calo = 0;
                        entry.Protein = 0;
                        entry.Carb = 0;
                        entry.Fat = 0;
                    }
                }
                else
                {
                    entry.Calo = 0;
                    entry.Protein = 0;
                    entry.Carb = 0;
                    entry.Fat = 0;
                }
            }
        }

        await _diaryRepository.UpdateAsync(entry, cancellationToken);
        await _diaryRepository.SaveChangesAsync(cancellationToken);

        var response = new DiaryEntryResponse
        {
            MaNhatKy = entry.MaNhatKy,
            NgayAn = entry.NgayAn,
            MaBuaAn = entry.MaBuaAn,
            MaThucPham = entry.MaThucPham,
            MaMonNguoiDung = entry.MaMonNguoiDung,
            MaCongThuc = entry.MaCongThuc,
            KhoiLuongGram = entry.KhoiLuongGram,
            Calo = entry.Calo,
            Protein = entry.Protein,
            Carb = entry.Carb,
            Fat = entry.Fat,
            NgayTao = entry.NgayTao,
            GhiChu = null
        };

        return Ok(response);
    }

}
