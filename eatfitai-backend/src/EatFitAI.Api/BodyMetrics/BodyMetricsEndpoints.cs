using AutoMapper;
using EatFitAI.Api.Profile;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Data;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Api.BodyMetrics;

public static class BodyMetricsEndpoints
{
    public static RouteGroupBuilder MapBodyMetrics(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/body-metrics").RequireAuthorization();
        g.MapPost("/", Create);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> Create([FromBody] BodyMetricsRequest req,
        IValidator<BodyMetricsRequest> validator,
        EatFitAIDbContext db,
        ClaimsPrincipal user)
    {
        var val = await validator.ValidateAsync(req);
        if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

        var userId = GetUserId(user);
        var entity = new ChiSoCoThe
        {
            Id = Guid.NewGuid(),
            NguoiDungId = userId,
            NgayDo = req.NgayDo ?? DateOnly.FromDateTime(DateTime.UtcNow),
            CanNangKg = req.CanNangKg,
            ChieuCaoCm = req.ChieuCaoCm,
            VongEoCm = req.VongEoCm,
            VongHongCm = req.VongHongCm
        };
        db.ChiSoCoThes.Add(entity);
        await db.SaveChangesAsync();

        var suggestion = await BuildSuggestionAsync(db, userId, req);
        var res = new BodyMetricsResponse(entity.Id, entity.NgayDo, entity.CanNangKg, entity.ChieuCaoCm, entity.VongEoCm, entity.VongHongCm, suggestion);
        return Results.Ok(res);
    }

    private static async Task<NutritionSuggestion> BuildSuggestionAsync(EatFitAIDbContext db, Guid userId, BodyMetricsRequest req)
    {
        var nguoiDung = await db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == userId);
        var latest = await db.ChiSoCoThes.Where(x => x.NguoiDungId == userId)
            .OrderByDescending(x => x.NgayDo).FirstOrDefaultAsync();
        var weight = req.CanNangKg ?? latest?.CanNangKg ?? 60m;
        var height = req.ChieuCaoCm ?? latest?.ChieuCaoCm ?? 170m;
        var age = 30;
        if (nguoiDung?.NgaySinh is DateOnly dob)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            age = Math.Max(0, today.Year - dob.Year - (today < new DateOnly(today.Year, dob.Month, dob.Day) ? 1 : 0));
        }
        var sex = nguoiDung?.GioiTinh?.ToLowerInvariant();
        var bmr = CalcBmr(weight, height, age, sex);

        // Activity factor
        var mdvdMa = req.MucDoVanDongMa ?? "MODERATE";
        var mdvd = await db.MucDoVanDongs.AsNoTracking().FirstOrDefaultAsync(x => x.Ma == mdvdMa);
        var heSo = mdvd?.HeSoTdee ?? 1.55m;
        var tdee = bmr * heSo;

        // Goal adjustment
        var mtMa = (req.MucTieuMa ?? string.Empty).ToUpperInvariant();
        decimal adj = mtMa switch { "GIAM_CAN" => 0.85m, "TANG_CAN" => 1.15m, _ => 1.0m };
        var kcal = tdee * adj;

        // Macros: protein 1.8g/kg, fat 25% kcal, carb remainder
        var proteinG = DecimalRound(weight * 1.8m);
        var fatG = DecimalRound((kcal * 0.25m) / 9m);
        var carbG = DecimalRound((kcal - (proteinG * 4m) - (fatG * 9m)) / 4m);

        return new NutritionSuggestion(
            DecimalRound(bmr), DecimalRound(tdee), DecimalRound(kcal),
            proteinG, carbG, fatG,
            mdvd?.Ma, mdvd?.HeSoTdee, string.IsNullOrWhiteSpace(mtMa) ? null : mtMa);
    }

    private static decimal CalcBmr(decimal weightKg, decimal heightCm, int ageYears, string? sex)
    {
        // Mifflin-St Jeor
        var s = (sex == "nam" || sex == "male" || sex == "m") ? 5m : -161m;
        var bmr = (10m * weightKg) + (6.25m * heightCm) - (5m * ageYears) + s;
        return bmr;
    }

    private static decimal DecimalRound(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}

