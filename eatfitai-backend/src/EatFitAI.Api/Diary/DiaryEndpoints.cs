using EatFitAI.Api.Diary;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Api.DiaryEndpoints;

public static class DiaryEndpoints
{
    public static RouteGroupBuilder MapDiary(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/diary").RequireAuthorization();
        g.MapGet("/", GetByDay);
        g.MapPost("/", Create);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> GetByDay([FromQuery] DateOnly? date, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var userId = GetUserId(user);
        var items = await db.NhatKyAnUongs.AsNoTracking()
            .Where(x => x.NguoiDungId == userId && x.NgayAn == d)
            .OrderBy(x => x.MaBuaAn).ThenBy(x => x.CreatedAt)
            .Select(x => new DiaryEntryDto(x.Id, x.NgayAn, x.MaBuaAn, x.Source, x.ItemId, x.SoLuongGram, x.NangLuongKcal, x.ProteinG, x.CarbG, x.FatG))
            .ToListAsync();
        return Results.Ok(new { date = d, items });
    }

    private static async Task<IResult> Create([FromBody] DiaryCreateRequest req,
        EatFitAIDbContext db,
        ClaimsPrincipal user)
    {
        if (req.SoLuongGram <= 0) return Results.Problem(title: "SoLuongGram phải > 0", statusCode: 400);
        var userId = GetUserId(user);

        // Validate meal type exists
        var bua = await db.LoaiBuaAns.FindAsync(req.MaBuaAn);
        if (bua == null) return Results.Problem(title: "MaBuaAn không hợp lệ", statusCode: 400);

        // Compute macros
        var (kcal, protein, carb, fat) = await ComputeMacrosAsync(db, req.Source, req.ItemId, req.SoLuongGram);
        if (kcal < 0) return Results.Problem(title: "Source/Item không hợp lệ hoặc thiếu dữ liệu", statusCode: 400);

        var entity = new NhatKyAnUong
        {
            Id = Guid.NewGuid(),
            NguoiDungId = userId,
            NgayAn = req.NgayAn,
            MaBuaAn = req.MaBuaAn,
            ItemId = req.ItemId,
            Source = req.Source.ToUpperInvariant(),
            SoLuongGram = Math.Round(req.SoLuongGram, 2, MidpointRounding.AwayFromZero),
            NangLuongKcal = Round2(kcal),
            ProteinG = Round2(protein),
            CarbG = Round2(carb),
            FatG = Round2(fat)
        };

        db.NhatKyAnUongs.Add(entity);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Results.Problem(title: "Trùng diary entry (unique)", statusCode: 409);
        }

        var dto = new DiaryEntryDto(entity.Id, entity.NgayAn, entity.MaBuaAn, entity.Source, entity.ItemId, entity.SoLuongGram, entity.NangLuongKcal, entity.ProteinG, entity.CarbG, entity.FatG);
        return Results.Created($"/api/diary?date={entity.NgayAn:yyyy-MM-dd}", dto);
    }

    private static async Task<(decimal kcal, decimal protein, decimal carb, decimal fat)> ComputeMacrosAsync(EatFitAIDbContext db, string source, Guid itemId, decimal grams)
    {
        var src = (source ?? string.Empty).ToUpperInvariant();
        decimal kcal = 0, protein = 0, carb = 0, fat = 0;
        if (src == "THUCPHAM")
        {
            var tp = await db.ThucPhams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == itemId);
            if (tp == null) return (-1, 0, 0, 0);
            var f = grams / 100m;
            kcal = tp.NangLuongKcalPer100g * f;
            protein = tp.ProteinGPer100g * f;
            carb = tp.CarbGPer100g * f;
            fat = tp.FatGPer100g * f;
        }
        else if (src == "MONNGUOIDUNG")
        {
            var mon = await db.MonNguoiDungs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == itemId);
            if (mon == null) return (-1, 0, 0, 0);
            var f = grams / 100m;
            kcal = mon.NangLuongKcalPer100g * f;
            protein = mon.ProteinGPer100g * f;
            carb = mon.CarbGPer100g * f;
            fat = mon.FatGPer100g * f;
        }
        else if (src == "CONGTHUC")
        {
            var ings = await db.NguyenLieuCongThucs.AsNoTracking().Where(x => x.CongThucId == itemId).ToListAsync();
            if (ings.Count == 0) return (-1, 0, 0, 0);
            decimal totalGram = 0, totalKcal = 0, totalProtein = 0, totalCarb = 0, totalFat = 0;
            var tpIds = ings.Select(i => i.ThucPhamId).ToList();
            var tpMap = await db.ThucPhams.AsNoTracking().Where(t => tpIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id);
            foreach (var i in ings)
            {
                if (!tpMap.TryGetValue(i.ThucPhamId, out var tp)) continue;
                var g = i.KhoiLuongGram;
                var f = g / 100m;
                totalGram += g;
                totalKcal += tp.NangLuongKcalPer100g * f;
                totalProtein += tp.ProteinGPer100g * f;
                totalCarb += tp.CarbGPer100g * f;
                totalFat += tp.FatGPer100g * f;
            }
            if (totalGram <= 0) return (-1, 0, 0, 0);
            var perGramKcal = totalKcal / totalGram;
            var perGramProtein = totalProtein / totalGram;
            var perGramCarb = totalCarb / totalGram;
            var perGramFat = totalFat / totalGram;
            kcal = perGramKcal * grams;
            protein = perGramProtein * grams;
            carb = perGramCarb * grams;
            fat = perGramFat * grams;
        }
        else
        {
            return (-1, 0, 0, 0);
        }
        return (Round2(kcal), Round2(protein), Round2(carb), Round2(fat));
    }

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}

