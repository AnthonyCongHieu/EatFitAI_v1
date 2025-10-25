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
                Id = f.MaThucPham,
                Name = f.TenThucPham,
                Description = f.MoTaKhauPhan,
                Brand = f.NhomThucPham,
                Category = f.NhomThucPham,
                ServingSizeGrams = 100, // Standard serving size
                CaloriesKcal = f.Calo100g,
                ProteinGrams = f.Protein100g,
                CarbohydrateGrams = f.Carb100g,
                FatGrams = f.Fat100g,
                IsCustom = false // Domain foods are not custom
            }).ToList(),
            TotalCount = totalCount,
            Offset = offset,
            Limit = limit
        };

        return Ok(response);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById([FromRoute] long id, CancellationToken cancellationToken)
    {
        var food = await _foodRepository.GetByIdAsync(id, cancellationToken);
        if (food == null)
        {
            return NotFound();
        }

        var response = new FoodResponse
        {
            Id = food.MaThucPham,
            Name = food.TenThucPham,
            Description = food.MoTaKhauPhan,
            Brand = food.NhomThucPham,
            Category = food.NhomThucPham,
            ServingSizeGrams = 100, // Standard serving size
            CaloriesKcal = food.Calo100g,
            ProteinGrams = food.Protein100g,
            CarbohydrateGrams = food.Carb100g,
            FatGrams = food.Fat100g,
            IsCustom = false // Domain foods are not custom
        };

        return Ok(response);
    }
}
