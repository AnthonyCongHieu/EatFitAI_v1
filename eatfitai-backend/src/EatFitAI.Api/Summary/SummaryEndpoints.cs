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
        if (db.Database.IsSqlServer())
        {
            var row = await db.VwTongHopDinhDuongNgays.AsNoTracking()
                .FirstOrDefaultAsync(x => x.NguoiDungId == userId && x.NgayAn == d);
            if (row == null) return Results.Ok(new { date = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
            return Results.Ok(new { date = d, kcal = row.TongKcal, proteinG = row.TongProteinG, carbG = row.TongCarbG, fatG = row.TongFatG });
        }
        else
        {
            var totals = await db.NhatKyAnUongs.AsNoTracking()
                .Where(x => x.NguoiDungId == userId && x.NgayAn == d)
                .GroupBy(x => 1)
                .Select(g => new
                {
                    kcal = g.Sum(r => r.NangLuongKcal),
                    p = g.Sum(r => r.ProteinG),
                    c = g.Sum(r => r.CarbG),
                    f = g.Sum(r => r.FatG)
                }).FirstOrDefaultAsync();
            if (totals == null) return Results.Ok(new { date = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
            return Results.Ok(new { date = d, kcal = totals.kcal, proteinG = totals.p, carbG = totals.c, fatG = totals.f });
        }
    }

    private static async Task<IResult> GetWeek([FromQuery] DateOnly? date, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dt = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var isoWeek = ISOWeek.GetWeekOfYear(dt);
        var year = ISOWeek.GetYear(dt);
        var userId = GetUserId(user);

        if (db.Database.IsSqlServer())
        {
            var row = await db.VwTongHopDinhDuongTuans.AsNoTracking()
                .FirstOrDefaultAsync(x => x.NguoiDungId == userId && x.IsoWeek == isoWeek && x.Year == year);
            if (row == null) return Results.Ok(new { isoWeek, year, from = d, to = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
            return Results.Ok(new { isoWeek, year, from = row.TuNgay, to = row.DenNgay, kcal = row.TongKcal, proteinG = row.TongProteinG, carbG = row.TongCarbG, fatG = row.TongFatG });
        }
        else
        {
            var all = await db.NhatKyAnUongs.AsNoTracking()
                .Where(x => x.NguoiDungId == userId)
                .ToListAsync();
            var weekItems = all.Where(x => System.Globalization.ISOWeek.GetWeekOfYear(x.NgayAn.ToDateTime(TimeOnly.MinValue)) == isoWeek
                                        && System.Globalization.ISOWeek.GetYear(x.NgayAn.ToDateTime(TimeOnly.MinValue)) == year)
                                .ToList();
            if (weekItems.Count == 0)
                return Results.Ok(new { isoWeek, year, from = d, to = d, kcal = 0m, proteinG = 0m, carbG = 0m, fatG = 0m });
            var from = weekItems.Min(x => x.NgayAn);
            var to = weekItems.Max(x => x.NgayAn);
            var kcal = weekItems.Sum(x => x.NangLuongKcal);
            var p = weekItems.Sum(x => x.ProteinG);
            var c = weekItems.Sum(x => x.CarbG);
            var f = weekItems.Sum(x => x.FatG);
            return Results.Ok(new { isoWeek, year, from, to, kcal, proteinG = p, carbG = c, fatG = f });
        }
    }
}
