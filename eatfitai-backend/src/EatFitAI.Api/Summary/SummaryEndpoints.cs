using EatFitAI.Infrastructure.Data;
using EatFitAI.Infrastructure.Data.Views;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Claims;

namespace EatFitAI.Api.SummaryEndpoints;

public static class SummaryEndpoints
{
    public static RouteGroupBuilder MapSummaries(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/summary").RequireAuthorization();
        g.MapGet("/day", GetDay);
        g.MapGet("/week", GetWeek);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> GetDay([FromQuery] DateOnly? date, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var userId = GetUserId(user);
        var row = await db.VwTongHopDinhDuongNgays.AsNoTracking()
            .FirstOrDefaultAsync(x => x.NguoiDungId == userId && x.NgayAn == d);
        if (row == null) return Results.Ok(new { date = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
        return Results.Ok(new { date = d, kcal = row.TongKcal, proteinG = row.TongProteinG, carbG = row.TongCarbG, fatG = row.TongFatG });
    }

    private static async Task<IResult> GetWeek([FromQuery] DateOnly? date, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dt = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var isoWeek = ISOWeek.GetWeekOfYear(dt);
        var year = ISOWeek.GetYear(dt);
        var userId = GetUserId(user);

        var row = await db.VwTongHopDinhDuongTuans.AsNoTracking()
            .FirstOrDefaultAsync(x => x.NguoiDungId == userId && x.IsoWeek == isoWeek && x.Year == year);
        if (row == null) return Results.Ok(new { isoWeek, year, from = d, to = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
        return Results.Ok(new { isoWeek, year, from = row.TuNgay, to = row.DenNgay, kcal = row.TongKcal, proteinG = row.TongProteinG, carbG = row.TongCarbG, fatG = row.TongFatG });
    }
}

