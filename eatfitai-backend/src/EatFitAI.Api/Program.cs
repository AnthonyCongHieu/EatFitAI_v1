using Serilog;
using EatFitAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using EatFitAI.Infrastructure.Auth;
using EatFitAI.Api.Auth;
using AutoMapper;
using FluentValidation;
using EatFitAI.Api.Profile;
using EatFitAI.Api.ProfileEndpoints;
using EatFitAI.Api.BodyMetrics;
using EatFitAI.Api.NutritionTargets;
using EatFitAI.Api.DiaryEndpoints;
using EatFitAI.Api.SummaryEndpoints;
using EatFitAI.Api.Foods;
using EatFitAI.Api.CustomDishesEndpoints;

// Khởi tạo Serilog sớm để log trong quá trình bootstrap
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Gắn Serilog vào host (đọc cấu hình nếu có) - vì cần log tập trung
builder.Host.UseSerilog((ctx, lc) =>
    lc.ReadFrom.Configuration(ctx.Configuration)
      .WriteTo.Console());

// Kết nối DB + Health checks
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? "Server=localhost,1433;Database=EatFitAIDb;User Id=sa;Password=Your_strong_password123;TrustServerCertificate=True;";

builder.Services.AddDbContext<EatFitAIDbContext>(options =>
    options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));

// Identity + Lockout
builder.Services
    .AddIdentityCore<IdentityUser<Guid>>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 6;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddSignInManager()
    .AddEntityFrameworkStores<EatFitAIDbContext>()
    .AddDefaultTokenProviders();

// JWT Auth
var jwtKey = builder.Configuration["Jwt:Key"] ?? builder.Configuration["Jwt__Key"] ?? "dev_secret_key_change_me";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["Jwt__Issuer"] ?? "eatfitai";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["Jwt__Audience"] ?? "eatfitai.app";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

builder.Services.AddHealthChecks();

// AutoMapper + FluentValidation
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
builder.Services.AddValidatorsFromAssemblyContaining<UpdateProfileValidator>();


// CORS: cho phép app Expo (exp://*) và local web (localhost:19006)
const string CorsPolicyName = "Default";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.Equals(origin, "http://localhost:19006", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (origin.StartsWith("exp://", StringComparison.OrdinalIgnoreCase))
                    return true; // Cho expo dev client
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// OpenAPI (mặc định 3.x) để mô tả API rõ ràng
builder.Services.AddOpenApi();

var app = builder.Build();

// Bật CORS sớm cho tất cả route
app.UseCors(CorsPolicyName);

// Serilog request logging - theo dõi request/response cơ bản
app.UseSerilogRequestLogging();

// AuthN/Z
app.UseAuthentication();
app.UseAuthorization();

// Xuất JSON OpenAPI tại /openapi/v1.json
app.MapOpenApi();

// Swagger UI tại /swagger, trỏ tới JSON ở trên
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/openapi/v1.json", "EatFitAI API v1");
    c.RoutePrefix = "swagger";
});

// Health endpoint
app.MapHealthChecks("/health");

// Endpoint mẫu để kiểm tra nhanh
app.MapGet("/", () => Results.Ok(new { name = "EatFitAI Backend", status = "ok" }));
app.MapGet("/ping", () => Results.Ok(new { message = "pong" }));

// Quick verification endpoints
app.MapGet("/thucpham/count", async (EatFitAIDbContext db) =>
{
    var count = await db.ThucPhams.CountAsync();
    return Results.Ok(new { count });
});
app.MapGet("/buaan/list", async (EatFitAIDbContext db) =>
{
    var items = await db.LoaiBuaAns.OrderBy(x => x.ThuTu).ToListAsync();
    return Results.Ok(items);
});

// Khởi tạo DB và seed dữ liệu
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
    await db.EnsureCreatedAndSeedAsync();
}

// Map auth endpoints
app.MapAuth();

// Map B3 endpoints (require auth)
app.MapProfileEndpoints();
app.MapBodyMetrics();
app.MapNutritionTargets();
app.MapDiary();
app.MapSummaries();
app.MapFoods();
app.MapCustomDishes();

app.Run();


