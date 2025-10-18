using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using EatFitAI.Api.Auth;
using EatFitAI.Domain.Entities;
using EatFitAI.Infrastructure.Auth;
using EatFitAI.Infrastructure.Data;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Api.Auth;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/register", Register)
         .WithName("Register")
         .Produces<AuthResponse>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        g.MapPost("/login", Login)
         .WithName("Login")
         .Produces<AuthResponse>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest)
         .ProducesProblem(StatusCodes.Status401Unauthorized);

        g.MapPost("/refresh", Refresh)
         .WithName("Refresh")
         .Produces<AuthResponse>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status401Unauthorized);

        g.MapPost("/google", GoogleSignIn)
         .WithName("GoogleSignIn")
         .Produces<AuthResponse>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest)
         .ProducesProblem(StatusCodes.Status401Unauthorized);

        return g;
    }

    private static async Task<IResult> Register([FromBody] RegisterRequest req,
        UserManager<IdentityUser<Guid>> userManager,
        IJwtTokenService tokenService,
        EatFitAIDbContext db,
        HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return Results.Problem(title: "Invalid input", detail: "Email và mật khẩu là bắt buộc", statusCode: 400);
        }

        var existingUser = await userManager.FindByEmailAsync(req.Email);
        if (existingUser != null)
        {
            return Results.Problem(title: "Email đã tồn tại", statusCode: 400);
        }

        var user = new IdentityUser<Guid>
        {
            Id = Guid.NewGuid(),
            Email = req.Email,
            UserName = req.Email,
            EmailConfirmed = true
        };
        var create = await userManager.CreateAsync(user, req.Password);
        if (!create.Succeeded)
        {
            var first = create.Errors.FirstOrDefault()?.Description ?? "Lỗi tạo người dùng";
            return Results.Problem(title: "Đăng ký thất bại", detail: first, statusCode: 400);
        }

        // Create profile NguoiDung with same Id
        if (!await db.NguoiDungs.AnyAsync(x => x.Id == user.Id))
        {
            db.NguoiDungs.Add(new NguoiDung
            {
                Id = user.Id,
                Email = req.Email,
                HoTen = req.HoTen
            });
            await db.SaveChangesAsync();
        }

        var pair = await tokenService.IssueAsync(user, http.Connection.RemoteIpAddress?.ToString());
        return Results.Ok(ToAuthResponse(pair));
    }

    private static async Task<IResult> Login([FromBody] LoginRequest req,
        UserManager<IdentityUser<Guid>> userManager,
        SignInManager<IdentityUser<Guid>> signInManager,
        IJwtTokenService tokenService,
        HttpContext http)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user == null)
            return Results.Problem(title: "Sai email hoặc mật khẩu", statusCode: 401);

        var result = await signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return Results.Problem(title: "Tài khoản bị khóa tạm thời", detail: "Thử lại sau", statusCode: 401);
        if (!result.Succeeded)
            return Results.Problem(title: "Sai email hoặc mật khẩu", statusCode: 401);

        var pair = await tokenService.IssueAsync(user, http.Connection.RemoteIpAddress?.ToString());
        return Results.Ok(ToAuthResponse(pair));
    }

    private static async Task<IResult> Refresh([FromBody] RefreshRequest req,
        IJwtTokenService tokenService,
        HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Results.Problem(title: "Thiếu refresh token", statusCode: 401);

        var (user, token) = await tokenService.ValidateRefreshAsync(req.RefreshToken);
        if (user == null || token == null)
            return Results.Problem(title: "Refresh token không hợp lệ", statusCode: 401);
        if (token.RevokedAt != null)
            return Results.Problem(title: "Refresh token đã bị thu hồi", detail: "Có thể bị tái sử dụng", statusCode: 401);
        if (token.ExpiresAt < DateTime.UtcNow)
            return Results.Problem(title: "Refresh token hết hạn", statusCode: 401);

        var rotated = await tokenService.RotateAsync(user, token, http.Connection.RemoteIpAddress?.ToString());
        return Results.Ok(ToAuthResponse(rotated));
    }

    private static async Task<IResult> GoogleSignIn([FromBody] GoogleRequest req,
        IConfiguration config,
        UserManager<IdentityUser<Guid>> userManager,
        IJwtTokenService tokenService,
        EatFitAIDbContext db,
        HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.IdToken))
            return Results.Problem(title: "Thiếu id_token", statusCode: 400);

        var clientIds = new[]
        {
            config["Auth:Google:ClientId:Web"] ?? config["Auth__Google__ClientId_Web"],
            config["Auth:Google:ClientId:Android"] ?? config["Auth__Google__ClientId_Android"]
        };
        var validAudience = clientIds.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
        if (validAudience.Count == 0)
            return Results.Problem(title: "Chưa cấu hình Google ClientId", statusCode: 400);

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = validAudience
            });
        }
        catch (Exception ex)
        {
            var allowMock = (config["Auth:Google:AllowMock"] ?? config["Auth__Google__AllowMock"])?.Equals("true", StringComparison.OrdinalIgnoreCase) == true;
            if (!allowMock)
                return Results.Problem(title: "Google token không hợp lệ", detail: ex.Message, statusCode: 401);

            // Dev/mock mode: decode without signature validation and check audience only
            var handler = new JwtSecurityTokenHandler();
            if (!handler.CanReadToken(req.IdToken))
                return Results.Problem(title: "id_token không đọc được (mock)", statusCode: 401);
            var jwt = handler.ReadJwtToken(req.IdToken);
            var aud = jwt.Audiences.FirstOrDefault();
            var emailClaim = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            if (string.IsNullOrEmpty(aud) || !validAudience.Contains(aud) || string.IsNullOrEmpty(emailClaim))
                return Results.Problem(title: "Mock id_token không hợp lệ", statusCode: 401);
            payload = new GoogleJsonWebSignature.Payload { Email = emailClaim, Name = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value };
        }

        var email = payload.Email;
        if (string.IsNullOrEmpty(email))
            return Results.Problem(title: "Thiếu email trong token", statusCode: 400);

        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new IdentityUser<Guid>
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                EmailConfirmed = true
            };
            var created = await userManager.CreateAsync(user);
            if (!created.Succeeded)
            {
                var err = created.Errors.FirstOrDefault()?.Description ?? "Không tạo được tài khoản";
                return Results.Problem(title: "Đăng nhập Google thất bại", detail: err, statusCode: 400);
            }
            if (!await db.NguoiDungs.AnyAsync(x => x.Id == user.Id))
            {
                db.NguoiDungs.Add(new NguoiDung { Id = user.Id, Email = email, HoTen = payload.Name });
                await db.SaveChangesAsync();
            }
        }

        var pair = await tokenService.IssueAsync(user, http.Connection.RemoteIpAddress?.ToString());
        return Results.Ok(ToAuthResponse(pair));
    }

    private static AuthResponse ToAuthResponse(TokenPair p)
        => new(p.AccessToken, p.RefreshToken, "Bearer", (int)(p.AccessExpiresAt - DateTime.UtcNow).TotalSeconds);
}
