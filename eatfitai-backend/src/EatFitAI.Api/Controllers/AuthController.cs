using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Net.Http;
using System.Text.Json;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly EatFitAiDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(EatFitAiDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string Name, string Email, string Password);

    public record AuthUser(string Id, string Email, string? Name);
    public record AuthResponse(string AccessToken, string? RefreshToken, AuthUser User);

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email/password không hợp lệ");

        var user = await _db.NguoiDungs.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user is null)
            return Unauthorized();

        var inputHash = SHA256.HashData(Encoding.UTF8.GetBytes(req.Password));
        if (!inputHash.SequenceEqual(user.MatKhauHash))
            return Unauthorized();

        var (accessToken, refreshToken) = GenerateTokens(user.MaNguoiDung.ToString(), user.Email, user.HoTen);
        return Ok(new AuthResponse(accessToken, refreshToken, new AuthUser(user.MaNguoiDung.ToString(), user.Email, user.HoTen)));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Thiếu email/password");

        var exists = await _db.NguoiDungs.AnyAsync(u => u.Email == req.Email);
        if (exists)
            return Conflict("Email đã tồn tại");

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(req.Password));
        var entity = new NguoiDung
        {
            Email = req.Email,
            MatKhauHash = hash,
            HoTen = string.IsNullOrWhiteSpace(req.Name) ? null : req.Name,
            NgayTao = DateTime.UtcNow,
            NgayCapNhat = DateTime.UtcNow,
        };
        _db.NguoiDungs.Add(entity);
        await _db.SaveChangesAsync();

        var (accessToken, refreshToken) = GenerateTokens(entity.MaNguoiDung.ToString(), entity.Email, entity.HoTen);
        return Ok(new AuthResponse(accessToken, refreshToken, new AuthUser(entity.MaNguoiDung.ToString(), entity.Email, entity.HoTen)));
    }

    [HttpPost("refresh")]
    public ActionResult<AuthResponse> Refresh([FromBody] Dictionary<string, string> body)
    {
        var refreshToken = body.TryGetValue("refreshToken", out var rt) ? rt : null;
        if (string.IsNullOrEmpty(refreshToken)) return BadRequest("Thiếu refreshToken");

        // Demo: không kiểm tra refresh token, chỉ cấp token mới ngắn hạn
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? Guid.NewGuid().ToString();
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? "unknown@eatfit.ai";
        var name = User.FindFirstValue("name");
        var (access, newRefresh) = GenerateTokens(sub, email, name, TimeSpan.FromMinutes(15));
        return Ok(new AuthResponse(access, newRefresh, new AuthUser(sub, email, name)));
    }

    private (string accessToken, string refreshToken) GenerateTokens(string userId, string email, string? name, TimeSpan? accessLifetime = null)
    {
        var issuer = _config["Jwt:Issuer"] ?? _config["Jwt__Issuer"] ?? "EatFitAI.Api";
        var audience = _config["Jwt:Audience"] ?? _config["Jwt__Audience"] ?? "EatFitAI.Client";
        var key = _config["Jwt:Key"] ?? _config["Jwt__Key"] ?? throw new InvalidOperationException("Missing JWT key");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
        };
        if (!string.IsNullOrWhiteSpace(name)) claims.Add(new Claim("name", name!));

        var minutesStr = _config["Jwt:AccessTokenMinutes"] ?? _config["Jwt__AccessTokenMinutes"];
        var resolvedLifetime = accessLifetime ?? (int.TryParse(minutesStr, out var m) && m > 0 ? TimeSpan.FromMinutes(m) : TimeSpan.FromMinutes(15));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(resolvedLifetime),
            signingCredentials: credentials
        );

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return (accessToken, refreshToken);
    }

    [HttpGet("google")]
    public IActionResult GoogleStart([FromQuery(Name = "redirect_uri")] string redirectUri)
    {
        if (string.IsNullOrWhiteSpace(redirectUri))
            return BadRequest("Missing redirect_uri");

        var clientId = _config["Auth__Google__ClientId_Web"];
        if (string.IsNullOrWhiteSpace(clientId))
            return StatusCode(500, "Missing Google ClientId (Auth__Google__ClientId_Web)");

        var callbackUrl = $"{Request.Scheme}://{Request.Host}/api/auth/google/callback";
        var state = Convert.ToBase64String(Encoding.UTF8.GetBytes(redirectUri));
        var authUrl =
            $"https://accounts.google.com/o/oauth2/v2/auth?client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(callbackUrl)}&response_type=code&scope={Uri.EscapeDataString("openid email profile")}&access_type=offline&prompt=consent&state={Uri.EscapeDataString(state)}";
        return Redirect(authUrl);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code, [FromQuery] string state)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            return BadRequest("Missing code/state");

        string redirectUri;
        try
        {
            redirectUri = Encoding.UTF8.GetString(Convert.FromBase64String(state));
        }
        catch
        {
            return BadRequest("Invalid state");
        }

        var clientId = _config["Auth__Google__ClientId_Web"];
        var clientSecret = _config["Auth__Google__ClientSecret_Web"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            return StatusCode(500, "Missing Google client configuration");

        var callbackUrl = $"{Request.Scheme}://{Request.Host}/api/auth/google/callback";

        using var http = new HttpClient();
        var tokenReq = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = callbackUrl,
        });

        var tokenResp = await http.PostAsync("https://oauth2.googleapis.com/token", tokenReq);
        if (!tokenResp.IsSuccessStatusCode)
        {
            var raw = await tokenResp.Content.ReadAsStringAsync();
            return StatusCode(502, $"Google token exchange failed: {raw}");
        }

        var payload = JsonDocument.Parse(await tokenResp.Content.ReadAsStringAsync()).RootElement;
        var idToken = payload.TryGetProperty("id_token", out var idEl) ? idEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(idToken))
            return StatusCode(502, "Missing id_token");

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(idToken);
        var email = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value
                    ?? jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
        var name = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return StatusCode(502, "Google id_token missing email");

        var user = await _db.NguoiDungs.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            user = new NguoiDung
            {
                Email = email,
                HoTen = name,
                MatKhauHash = RandomNumberGenerator.GetBytes(32),
                NgayTao = DateTime.UtcNow,
                NgayCapNhat = DateTime.UtcNow,
            };
            _db.NguoiDungs.Add(user);
            await _db.SaveChangesAsync();
        }

        var (access, refresh) = GenerateTokens(user.MaNguoiDung.ToString(), user.Email, user.HoTen);
        var location = $"{redirectUri}#accessToken={Uri.EscapeDataString(access)}&refreshToken={Uri.EscapeDataString(refresh)}";
        return Redirect(location);
    }
}


