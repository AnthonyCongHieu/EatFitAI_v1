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
                MaThucPham = f.MaThucPham,
                TenThucPham = f.TenThucPham,
                NhomThucPham = f.NhomThucPham,
                MoTaKhauPhan = f.MoTaKhauPhan,
                Calo100g = f.Calo100g,
                Protein100g = f.Protein100g,
                Carb100g = f.Carb100g,
                Fat100g = f.Fat100g,
                HinhAnh = f.HinhAnh,
                TrangThai = f.TrangThai
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
            MaThucPham = food.MaThucPham,
            TenThucPham = food.TenThucPham,
            NhomThucPham = food.NhomThucPham,
            MoTaKhauPhan = food.MoTaKhauPhan,
            Calo100g = food.Calo100g,
            Protein100g = food.Protein100g,
            Carb100g = food.Carb100g,
            Fat100g = food.Fat100g,
            HinhAnh = food.HinhAnh,
            TrangThai = food.TrangThai
        };

        return Ok(response);
    }
}
