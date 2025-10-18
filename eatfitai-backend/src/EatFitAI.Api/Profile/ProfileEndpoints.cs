using AutoMapper;
using EatFitAI.Api.Profile;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Data;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Api.ProfileEndpoints;

public static class ProfileEndpoints
{
    public static RouteGroupBuilder MapProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/profile").RequireAuthorization();
        g.MapGet("/me", GetMe);
        g.MapPut("/me", UpdateMe);
        return g;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub")!);

    private static async Task<IResult> GetMe(EatFitAIDbContext db, IMapper mapper, ClaimsPrincipal user)
    {
        var userId = GetUserId(user);
        var entity = await db.NguoiDungs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (entity == null)
            return Results.Problem(title: "Không tìm thấy hồ sơ", statusCode: 404);
        var dto = mapper.Map<ProfileDto>(entity);
        return Results.Ok(dto);
    }

    private static async Task<IResult> UpdateMe([FromBody] UpdateProfileRequest req,
        IValidator<UpdateProfileRequest> validator,
        EatFitAIDbContext db,
        ClaimsPrincipal user)
    {
        var val = await validator.ValidateAsync(req);
        if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

        var userId = GetUserId(user);
        var entity = await db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == userId);
        if (entity == null)
            return Results.Problem(title: "Không tìm thấy hồ sơ", statusCode: 404);

        entity.HoTen = req.HoTen ?? entity.HoTen;
        entity.GioiTinh = req.GioiTinh ?? entity.GioiTinh;
        entity.NgaySinh = req.NgaySinh ?? entity.NgaySinh;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Cập nhật thành công" });
    }
}

