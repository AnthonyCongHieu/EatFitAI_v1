using EatFitAI.Api.Contracts.Foods;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Foods;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/foods")]
[Authorize]
public sealed class FoodsController : ControllerBase
{
    private readonly IFoodRepository _foodRepository;

    public FoodsController(IFoodRepository foodRepository)
    {
        _foodRepository = foodRepository;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] int offset = 0, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        (IEnumerable<Food> items, int totalCount) = await _foodRepository.SearchAsync(query, offset, limit, cancellationToken);

        var response = new PaginatedFoodResponse
        {
            Items = items.Select(f => new FoodResponse
            {
                Id = f.Id,
                Name = f.Name,
                Description = f.Description,
                Brand = f.Brand,
                Category = f.Category,
                ServingSizeGrams = f.ServingSizeGrams,
                CaloriesKcal = f.CaloriesKcal,
                ProteinGrams = f.ProteinGrams,
                CarbohydrateGrams = f.CarbohydrateGrams,
                FatGrams = f.FatGrams,
                IsCustom = f.IsCustom
            }).ToList(),
            TotalCount = totalCount,
            Offset = offset,
            Limit = limit
        };

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var food = await _foodRepository.GetByIdAsync(id, cancellationToken);
        if (food == null)
        {
            return NotFound();
        }

        var response = new FoodResponse
        {
            Id = food.Id,
            Name = food.Name,
            Description = food.Description,
            Brand = food.Brand,
            Category = food.Category,
            ServingSizeGrams = food.ServingSizeGrams,
            CaloriesKcal = food.CaloriesKcal,
            ProteinGrams = food.ProteinGrams,
            CarbohydrateGrams = food.CarbohydrateGrams,
            FatGrams = food.FatGrams,
            IsCustom = food.IsCustom
        };

        return Ok(response);
    }
}
