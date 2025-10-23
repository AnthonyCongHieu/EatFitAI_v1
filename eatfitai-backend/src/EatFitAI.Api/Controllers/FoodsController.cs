using EatFitAI.Api.Contracts.Foods;
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
    private readonly AppDbContext _context;

    public FoodsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] int offset = 0, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var queryable = _context.Foods.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            queryable = queryable.Where(f => f.Name.Contains(query) || f.Brand.Contains(query) || f.Category.Contains(query));
        }

        var totalCount = await queryable.CountAsync(cancellationToken);

        var items = await queryable
            .OrderBy(f => f.Name)
            .Skip(offset)
            .Take(limit)
            .Select(f => new FoodResponse
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
            })
            .ToListAsync(cancellationToken);

        var response = new PaginatedFoodResponse
        {
            Items = items,
            TotalCount = totalCount,
            Offset = offset,
            Limit = limit
        };

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var food = await _context.Foods.FindAsync(new object[] { id }, cancellationToken);
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
