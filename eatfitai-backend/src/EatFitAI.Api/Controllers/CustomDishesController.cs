using System.Data;
using System.Text.Json;
using Dapper;
using EatFitAI.Api.Contracts.CustomDishes;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using EatFitAI.Application.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/custom-dishes")]
[Authorize]
public sealed class CustomDishesController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ICustomDishRepository _customDishRepository;

    public CustomDishesController(ISqlConnectionFactory connectionFactory, ICustomDishRepository customDishRepository)
    {
        _connectionFactory = connectionFactory;
        _customDishRepository = customDishRepository;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomDishCreateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        // Calculate totals from ingredients
        var totalCalories = request.Ingredients.Sum(i => i.CaloriesKcal);
        var totalProtein = request.Ingredients.Sum(i => i.ProteinGrams);
        var totalCarbs = request.Ingredients.Sum(i => i.CarbohydrateGrams);
        var totalFat = request.Ingredients.Sum(i => i.FatGrams);
        var totalGrams = request.Ingredients.Sum(i => i.QuantityGrams);

        var customDish = new Domain.Foods.CustomDish
        {
            MaMonNguoiDung = 0, // Will be set by database
            MaNguoiDung = userId,
            TenMon = request.Name,
            Calo100g = totalCalories / (totalGrams / 100m), // Per 100g
            Protein100g = totalProtein / (totalGrams / 100m),
            Carb100g = totalCarbs / (totalGrams / 100m),
            Fat100g = totalFat / (totalGrams / 100m),
            GhiChu = request.Description,
            NgayTao = DateTime.UtcNow
        };

        // Add ingredients - Note: Domain model doesn't have ingredients collection
        // This would need to be handled differently, perhaps through stored procedures

        await _customDishRepository.AddAsync(customDish, cancellationToken);
        await _customDishRepository.SaveChangesAsync(cancellationToken);

        var response = new CustomDishResponse
        {
            Id = customDish.MaMonNguoiDung,
            Name = customDish.TenMon,
            Description = customDish.GhiChu,
            PortionSizeGrams = 100, // Standard 100g portion
            CaloriesKcal = customDish.Calo100g,
            ProteinGrams = customDish.Protein100g,
            CarbohydrateGrams = customDish.Carb100g,
            FatGrams = customDish.Fat100g
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var dishes = await _customDishRepository.GetByUserIdAsync(userId, cancellationToken);

        var items = dishes.Select(dish => new CustomDishResponse
        {
            Id = dish.MaMonNguoiDung,
            Name = dish.TenMon,
            Description = dish.GhiChu,
            PortionSizeGrams = 100, // Standard 100g portion
            CaloriesKcal = dish.Calo100g,
            ProteinGrams = dish.Protein100g,
            CarbohydrateGrams = dish.Carb100g,
            FatGrams = dish.Fat100g
        });

        return Ok(items);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById([FromRoute] long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var dish = await _customDishRepository.GetByIdAsync(id, userId, cancellationToken);

        if (dish is null) return NotFound();

        var response = new CustomDishDetailResponse
        {
            Id = dish.MaMonNguoiDung,
            Name = dish.TenMon,
            Description = dish.GhiChu,
            PortionSizeGrams = 100, // Standard 100g portion
            CaloriesKcal = dish.Calo100g,
            ProteinGrams = dish.Protein100g,
            CarbohydrateGrams = dish.Carb100g,
            FatGrams = dish.Fat100g,
            Ingredients = new List<CustomDishIngredientResponse>() // Domain doesn't have ingredients
        };

        return Ok(response);
    }

    private sealed class DishDb
    {
        public long MaMonNguoiDung { get; set; }
        public Guid MaNguoiDung { get; set; }
        public string TenMon { get; set; } = string.Empty;
        public string? GhiChu { get; set; }
        public decimal KhoiLuongGram { get; set; }
        public decimal Calo100g { get; set; }
        public decimal Protein100g { get; set; }
        public decimal Carb100g { get; set; }
        public decimal Fat100g { get; set; }
        public DateTime NgayTao { get; set; }
        public DateTime? NgayCapNhat { get; set; }
    }

    private sealed class IngredientDb
    {
        public long MaNguyenLieu { get; set; }
        public long MaMonNguoiDung { get; set; }
        public long? MaThucPham { get; set; }
        public string TenNguyenLieu { get; set; } = string.Empty;
        public decimal KhoiLuongGram { get; set; }
        public decimal Calo { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
    }
}
