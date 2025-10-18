using EatFitAI.Api.CustomDishes;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Data;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Api.CustomDishesEndpoints;

public static class CustomDishesEndpoints
{
    public static RouteGroupBuilder MapCustomDishes(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/custom-dishes").RequireAuthorization();
        g.MapGet("/", List);
        g.MapGet("/{id:guid}", GetById);
        g.MapPost("/", Create);
        g.MapPut("/{id:guid}", Update);
        g.MapDelete("/{id:guid}", Delete);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> List(EatFitAIDbContext db, ClaimsPrincipal user, [FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;
        var userId = GetUserId(user);

        var q = db.MonNguoiDungs.AsNoTracking().Where(m => m.NguoiDungId == userId);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var like = $"%{query.Trim()}%";
            q = q.Where(m => EF.Functions.Like(m.Ten, like));
        }
        var totalItems = await q.CountAsync();
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        var items = await q.OrderBy(m => m.Ten)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new CustomDishDto(m.Id, m.Ten, m.MoTa, m.NangLuongKcalPer100g, m.ProteinGPer100g, m.CarbGPer100g, m.FatGPer100g))
            .ToListAsync();

        return Results.Ok(new { page, pageSize, totalItems, totalPages, items });
    }

    private static async Task<IResult> GetById([FromRoute] Guid id, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var userId = GetUserId(user);
        var m = await db.MonNguoiDungs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
        if (m == null) return Results.Problem(title: "Không tìm thấy món", statusCode: 404);
        return Results.Ok(new CustomDishDto(m.Id, m.Ten, m.MoTa, m.NangLuongKcalPer100g, m.ProteinGPer100g, m.CarbGPer100g, m.FatGPer100g));
    }

    private static async Task<IResult> Create([FromBody] CreateCustomDishRequest req,
        IValidator<CreateCustomDishRequest> validator,
        EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var val = await validator.ValidateAsync(req);
        if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());
        var userId = GetUserId(user);

        var e = new MonNguoiDung
        {
            Id = Guid.NewGuid(),
            NguoiDungId = userId,
            Ten = req.Ten,
            MoTa = req.MoTa,
            NangLuongKcalPer100g = req.NangLuongKcalPer100g,
            ProteinGPer100g = req.ProteinGPer100g,
            CarbGPer100g = req.CarbGPer100g,
            FatGPer100g = req.FatGPer100g
        };
        db.MonNguoiDungs.Add(e);
        await db.SaveChangesAsync();
        return Results.Created($"/api/custom-dishes/{e.Id}", new CustomDishDto(e.Id, e.Ten, e.MoTa, e.NangLuongKcalPer100g, e.ProteinGPer100g, e.CarbGPer100g, e.FatGPer100g));
    }

    private static async Task<IResult> Update([FromRoute] Guid id, [FromBody] UpdateCustomDishRequest req,
        IValidator<UpdateCustomDishRequest> validator,
        EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var val = await validator.ValidateAsync(req);
        if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());
        var userId = GetUserId(user);
        var m = await db.MonNguoiDungs.FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
        if (m == null) return Results.Problem(title: "Không tìm thấy món", statusCode: 404);

        if (!string.IsNullOrWhiteSpace(req.Ten)) m.Ten = req.Ten;
        if (req.MoTa != null) m.MoTa = req.MoTa;
        if (req.NangLuongKcalPer100g.HasValue) m.NangLuongKcalPer100g = req.NangLuongKcalPer100g.Value;
        if (req.ProteinGPer100g.HasValue) m.ProteinGPer100g = req.ProteinGPer100g.Value;
        if (req.CarbGPer100g.HasValue) m.CarbGPer100g = req.CarbGPer100g.Value;
        if (req.FatGPer100g.HasValue) m.FatGPer100g = req.FatGPer100g.Value;

        await db.SaveChangesAsync();
        return Results.Ok(new CustomDishDto(m.Id, m.Ten, m.MoTa, m.NangLuongKcalPer100g, m.ProteinGPer100g, m.CarbGPer100g, m.FatGPer100g));
    }

    private static async Task<IResult> Delete([FromRoute] Guid id, EatFitAIDbContext db, ClaimsPrincipal user)
    {
        var userId = GetUserId(user);
        var m = await db.MonNguoiDungs.FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
        if (m == null) return Results.Problem(title: "Không tìm thấy món", statusCode: 404);
        db.MonNguoiDungs.Remove(m);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
