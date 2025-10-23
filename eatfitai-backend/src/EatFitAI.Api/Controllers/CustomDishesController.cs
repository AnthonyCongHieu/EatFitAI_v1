using System.Data;
using System.Text.Json;
using Dapper;
using EatFitAI.Api.Contracts.CustomDishes;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/custom-dishes")]
[Authorize]
public sealed class CustomDishesController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public CustomDishesController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomDishCreateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var ingredientsJson = JsonSerializer.Serialize(request.Ingredients.Select(x => new
        {
            foodId = x.FoodId,
            name = x.Name,
            quantityGrams = x.QuantityGrams,
            caloriesKcal = x.CaloriesKcal,
            proteinGrams = x.ProteinGrams,
            carbohydrateGrams = x.CarbohydrateGrams,
            fatGrams = x.FatGrams
        }));

        var row = await conn.QuerySingleAsync<DishDb>(
            "sp_MonNguoiDung_TaoMon",
            new
            {
                UserId = userId,
                request.Name,
                request.Description,
                IngredientsJson = ingredientsJson
            },
            commandType: CommandType.StoredProcedure);

        var response = new CustomDishResponse
        {
            Id = row.Id,
            Name = row.Name,
            Description = row.Description,
            PortionSizeGrams = row.PortionSizeGrams,
            CaloriesKcal = row.CaloriesKcal,
            ProteinGrams = row.ProteinGrams,
            CarbohydrateGrams = row.CarbohydrateGrams,
            FatGrams = row.FatGrams
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<DishDb>(
            "sp_MonNguoiDung_LayDanhSach",
            new { UserId = userId },
            commandType: CommandType.StoredProcedure);

        var items = rows.Select(row => new CustomDishResponse
        {
            Id = row.Id,
            Name = row.Name,
            Description = row.Description,
            PortionSizeGrams = row.PortionSizeGrams,
            CaloriesKcal = row.CaloriesKcal,
            ProteinGrams = row.ProteinGrams,
            CarbohydrateGrams = row.CarbohydrateGrams,
            FatGrams = row.FatGrams
        });

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        using var multi = await conn.QueryMultipleAsync(
            "sp_MonNguoiDung_LayTheoId",
            new { UserId = userId, Id = id },
            commandType: CommandType.StoredProcedure);

        var header = await multi.ReadSingleOrDefaultAsync<DishDb>();
        if (header is null) return NotFound();
        var ingredients = (await multi.ReadAsync<IngredientDb>()).ToList();

        var response = new CustomDishDetailResponse
        {
            Id = header.Id,
            Name = header.Name,
            Description = header.Description,
            PortionSizeGrams = header.PortionSizeGrams,
            CaloriesKcal = header.CaloriesKcal,
            ProteinGrams = header.ProteinGrams,
            CarbohydrateGrams = header.CarbohydrateGrams,
            FatGrams = header.FatGrams,
            Ingredients = ingredients.Select(i => new CustomDishIngredientResponse
            {
                Id = i.Id,
                FoodId = i.FoodId,
                Name = i.Name,
                QuantityGrams = i.QuantityGrams,
                CaloriesKcal = i.CaloriesKcal,
                ProteinGrams = i.ProteinGrams,
                CarbohydrateGrams = i.CarbohydrateGrams,
                FatGrams = i.FatGrams
            }).ToList()
        };

        return Ok(response);
    }

    private sealed class DishDb
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal PortionSizeGrams { get; set; }
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    private sealed class IngredientDb
    {
        public Guid Id { get; set; }
        public Guid CustomDishId { get; set; }
        public Guid? FoodId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal QuantityGrams { get; set; }
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
    }
}
