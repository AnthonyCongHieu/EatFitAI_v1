using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.Foods;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/foods")]
[Authorize]
public sealed class FoodsController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public FoodsController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] int offset = 0, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var items = await conn.QueryAsync<FoodResponse>(
            "sp_ThucPham_TimKiem",
            new { Query = query, Offset = offset, Limit = limit },
            commandType: CommandType.StoredProcedure);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var item = await conn.QuerySingleOrDefaultAsync<FoodResponse>(
            "sp_ThucPham_LayTheoId",
            new { Id = id },
            commandType: CommandType.StoredProcedure);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }
}
