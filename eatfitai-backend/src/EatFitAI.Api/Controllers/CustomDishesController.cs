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
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            PortionSizeGrams = totalGrams,
            CaloriesKcal = totalCalories,
            ProteinGrams = totalProtein,
            CarbohydrateGrams = totalCarbs,
            FatGrams = totalFat,
            CreatedAt = DateTime.UtcNow
        };

        // Add ingredients
        foreach (var ingredient in request.Ingredients)
        {
            customDish.Ingredients.Add(new Domain.Foods.CustomDishIngredient
            {
                Id = Guid.NewGuid(),
                FoodId = ingredient.FoodId,
                Name = ingredient.Name,
                QuantityGrams = ingredient.QuantityGrams,
                CaloriesKcal = ingredient.CaloriesKcal,
                ProteinGrams = ingredient.ProteinGrams,
                CarbohydrateGrams = ingredient.CarbohydrateGrams,
                FatGrams = ingredient.FatGrams
            });
        }

        await _customDishRepository.AddAsync(customDish, cancellationToken);
        await _customDishRepository.SaveChangesAsync(cancellationToken);

        var response = new CustomDishResponse
        {
            Id = customDish.Id,
            Name = customDish.Name,
            Description = customDish.Description,
            PortionSizeGrams = customDish.PortionSizeGrams,
            CaloriesKcal = customDish.CaloriesKcal,
            ProteinGrams = customDish.ProteinGrams,
            CarbohydrateGrams = customDish.CarbohydrateGrams,
            FatGrams = customDish.FatGrams
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
            Id = dish.Id,
            Name = dish.Name,
            Description = dish.Description,
            PortionSizeGrams = dish.PortionSizeGrams,
            CaloriesKcal = dish.CaloriesKcal,
            ProteinGrams = dish.ProteinGrams,
            CarbohydrateGrams = dish.CarbohydrateGrams,
            FatGrams = dish.FatGrams
        });

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var dish = await _customDishRepository.GetByIdAsync(id, userId, cancellationToken);

        if (dish is null) return NotFound();

        var response = new CustomDishDetailResponse
        {
            Id = dish.Id,
            Name = dish.Name,
            Description = dish.Description,
            PortionSizeGrams = dish.PortionSizeGrams,
            CaloriesKcal = dish.CaloriesKcal,
            ProteinGrams = dish.ProteinGrams,
            CarbohydrateGrams = dish.CarbohydrateGrams,
            FatGrams = dish.FatGrams,
            Ingredients = dish.Ingredients.Select(i => new CustomDishIngredientResponse
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
