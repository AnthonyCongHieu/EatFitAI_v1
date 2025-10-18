using EatFitAI.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Api.Foods;

public static class FoodsEndpoints
{
    public static RouteGroupBuilder MapFoods(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/foods");

        g.MapGet("/search", Search);
        g.MapGet("/{id:guid}", GetById);
        g.MapGet("/search-all", SearchAll);

        return g;
    }

    private static async Task<IResult> Search(EatFitAIDbContext db, [FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var q = db.ThucPhams.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var like = $"%{query.Trim()}%";
            q = q.Where(tp => EF.Functions.Like(tp.Ten, like));
        }

        var totalItems = await q.CountAsync();
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        var items = await q
            .OrderBy(tp => tp.Ten)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(tp => new
            {
                tp.Id,
                tp.Ten,
                tp.DonViMacDinh,
                tp.NangLuongKcalPer100g,
                tp.ProteinGPer100g,
                tp.CarbGPer100g,
                tp.FatGPer100g
            })
            .ToListAsync();

        return Results.Ok(new { page, pageSize, totalItems, totalPages, items });
    }

    private static async Task<IResult> GetById([FromRoute] Guid id, EatFitAIDbContext db)
    {
        var tp = await db.ThucPhams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (tp == null) return Results.Problem(title: "Không tìm thấy thực phẩm", statusCode: 404);
        return Results.Ok(new
        {
            tp.Id,
            tp.Ten,
            tp.DonViMacDinh,
            tp.NangLuongKcalPer100g,
            tp.ProteinGPer100g,
            tp.CarbGPer100g,
            tp.FatGPer100g
        });
    }

    // Combined search across ThucPham (public) and MonNguoiDung (current user), unified pagination
    private static async Task<IResult> SearchAll(EatFitAIDbContext db, System.Security.Claims.ClaimsPrincipal user,
        [FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var like = string.IsNullOrWhiteSpace(query) ? null : $"%{query.Trim()}%";

        var tpQ = db.ThucPhams.AsNoTracking();
        if (!string.IsNullOrEmpty(like)) tpQ = tpQ.Where(t => EF.Functions.Like(t.Ten, like));

        var monQ = db.MonNguoiDungs.AsNoTracking().Where(_ => false);
        if (user?.Identity?.IsAuthenticated == true)
        {
            var sub = user.FindFirst("sub")?.Value ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(sub, out var userId))
            {
                monQ = db.MonNguoiDungs.AsNoTracking().Where(m => m.NguoiDungId == userId);
                if (!string.IsNullOrEmpty(like)) monQ = monQ.Where(m => EF.Functions.Like(m.Ten, like));
            }
        }

        var countTpTask = tpQ.CountAsync();
        var countMonTask = monQ.CountAsync();
        await Task.WhenAll(countTpTask, countMonTask);
        var totalItems = countTpTask.Result + countMonTask.Result;
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        if (totalItems == 0)
        {
            return Results.Ok(new { page, pageSize, totalItems, totalPages, items = Array.Empty<object>() });
        }

        var takeUpTo = page * pageSize;
        var tpItemsTask = tpQ.OrderBy(t => t.Ten).Take(takeUpTo).Select(t => new
        {
            t.Id,
            Ten = t.Ten,
            DonViMacDinh = t.DonViMacDinh,
            t.NangLuongKcalPer100g,
            t.ProteinGPer100g,
            t.CarbGPer100g,
            t.FatGPer100g,
            Source = "THUCPHAM"
        }).ToListAsync();
        var monItemsTask = monQ.OrderBy(m => m.Ten).Take(takeUpTo).Select(m => new
        {
            m.Id,
            Ten = m.Ten,
            DonViMacDinh = (string?)"100g",
            NangLuongKcalPer100g = m.NangLuongKcalPer100g,
            ProteinGPer100g = m.ProteinGPer100g,
            CarbGPer100g = m.CarbGPer100g,
            FatGPer100g = m.FatGPer100g,
            Source = "MONNGUOIDUNG"
        }).ToListAsync();

        await Task.WhenAll(tpItemsTask, monItemsTask);
        var merged = tpItemsTask.Result.Concat(monItemsTask.Result)
            .OrderBy(x => x.Ten, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
        var skip = (page - 1) * pageSize;
        var pageItems = merged.Skip(skip).Take(pageSize).ToList();

        return Results.Ok(new { page, pageSize, totalItems, totalPages, items = pageItems });
    }
}
