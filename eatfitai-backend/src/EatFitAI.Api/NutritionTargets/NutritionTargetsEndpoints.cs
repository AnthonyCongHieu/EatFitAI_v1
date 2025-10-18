using AutoMapper;
using EatFitAI.Api.Profile;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Data;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Api.NutritionTargets;

public static class NutritionTargetsEndpoints
{
    public static RouteGroupBuilder MapNutritionTargets(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/nutrition-targets").RequireAuthorization();
        g.MapGet("/current", GetCurrent);
        g.MapPost("/", Create);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> GetCurrent(EatFitAIDbContext db, IMapper mapper, ClaimsPrincipal user)
    {
        var userId = GetUserId(user);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var target = await db.MucTieuDinhDuongs.AsNoTracking()
            .Where(x => x.NguoiDungId == userId && x.HieuLucTuNgay <= today)
            .OrderByDescending(x => x.HieuLucTuNgay)
            .FirstOrDefaultAsync();
        if (target == null)
            return Results.Problem(title: "Chưa có mục tiêu dinh dưỡng", statusCode: 404);
        return Results.Ok(mapper.Map<NutritionTargetDto>(target));
    }

    private static async Task<IResult> Create([FromBody] CreateNutritionTargetRequest req,
        IValidator<CreateNutritionTargetRequest> validator,
        EatFitAIDbContext db,
        ClaimsPrincipal user)
    {
        var val = await validator.ValidateAsync(req);
        if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

        var userId = GetUserId(user);

        int? mucTieuId = null;
        if (!string.IsNullOrWhiteSpace(req.MucTieuMa))
        {
            var mt = await db.MucTieus.AsNoTracking().FirstOrDefaultAsync(x => x.Ma == req.MucTieuMa);
            if (mt == null)
                return Results.Problem(title: "MucTieuMa không hợp lệ", statusCode: 400);
            mucTieuId = mt.Id;
        }

        var entity = new MucTieuDinhDuong
        {
            Id = Guid.NewGuid(),
            NguoiDungId = userId,
            MucTieuId = mucTieuId,
            Nguon = req.Nguon,
            LyDo = req.LyDo,
            HieuLucTuNgay = req.HieuLucTuNgay,
            NangLuongKcal = req.NangLuongKcal,
            ProteinG = req.ProteinG,
            CarbG = req.CarbG,
            FatG = req.FatG
        };
        db.MucTieuDinhDuongs.Add(entity);
        await db.SaveChangesAsync();
        return Results.Created($"/api/nutrition-targets/current", new { message = "Đã tạo mục tiêu", id = entity.Id });
    }
}

