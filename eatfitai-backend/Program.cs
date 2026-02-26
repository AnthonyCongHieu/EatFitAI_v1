using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Data;
using EatFitAI.API.MappingProfiles;
using EatFitAI.API.Middleware;
using EatFitAI.API.Repositories;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.Options;
using EatFitAI.Services; // Voice processing service
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // User Secrets will be loaded automatically in Development by CreateBuilder

        // Configure listening URLs from configuration (e.g., appsettings.*.json)
        var configuredUrls = builder.Configuration.GetValue<string>("Urls");
        if (!string.IsNullOrWhiteSpace(configuredUrls))
        {
            builder.WebHost.UseUrls(configuredUrls);
        }

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();


<<<<<<< Updated upstream
// CORS - Environment-aware configuration
=======
// CORS from config (supports exact match and simple wildcard suffix/prefix, e.g. exp://* or http://localhost:*)
>>>>>>> Stashed changes
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>()?
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x.Trim())
    .ToArray()
    ?? Array.Empty<string>();

<<<<<<< Updated upstream
builder.Services.AddCors(o =>
{
    // Development: Allow all origins for easier testing
    o.AddPolicy("DevCors", p => p
        .SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());

    // Production: Strict whitelist
    o.AddPolicy("ProdCors", p => p
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// Rate Limiting - Prevent brute force and abuse
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Auth endpoints: 10 requests per minute (prevent brute force)
    options.AddFixedWindowLimiter("AuthPolicy", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });

    // AI endpoints: 20 requests per minute (expensive operations)
    options.AddFixedWindowLimiter("AIPolicy", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 20;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 5;
    });

    // General API: 100 requests per minute
    options.AddFixedWindowLimiter("GeneralPolicy", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 100;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 10;
    });
});
=======
if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    allowedOrigins = new[]
    {
        "http://localhost:*",
        "http://10.0.2.2:*",
        "exp://*",
    };
}

static bool IsOriginAllowed(string origin, string[] rules)
{
    if (string.IsNullOrWhiteSpace(origin))
    {
        return false;
    }

    foreach (var rule in rules)
    {
        if (string.IsNullOrWhiteSpace(rule))
        {
            continue;
        }

        if (string.Equals(origin, rule, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (rule.EndsWith("*", StringComparison.Ordinal))
        {
            var prefix = rule[..^1];
            if (origin.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
    }

    return false;
}

builder.Services.AddCors(o => o.AddPolicy("AppCors",
    p => p.SetIsOriginAllowed(origin => IsOriginAllowed(origin, allowedOrigins))
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()));
>>>>>>> Stashed changes

// Add Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EatFitAI API",
        Version = "v1",
        Description = "API for EatFitAI nutrition tracking application"
    });

    // Add JWT Bearer token support
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT with Bearer into field",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Use full type names to avoid schema ID conflicts (duplicate class names across namespaces)
    c.CustomSchemaIds(type => type.FullName);

    // Only include MVC controller actions in Swagger (exclude minimal APIs if any cause issues)
    c.DocInclusionPredicate((docName, apiDesc) =>
        apiDesc.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor);

    // Map newer BCL date/time types for Swagger
    c.MapType<DateOnly>(() => new OpenApiSchema { Type = "string", Format = "date" });
    c.MapType<DateOnly?>(() => new OpenApiSchema { Type = "string", Format = "date", Nullable = true });
    c.MapType<TimeOnly>(() => new OpenApiSchema { Type = "string", Format = "time" });
    c.MapType<TimeOnly?>(() => new OpenApiSchema { Type = "string", Format = "time", Nullable = true });
});

// Add DbContext (scaffolded from DB)
builder.Services.AddDbContext<EatFitAIDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add ApplicationDbContext (custom with WeeklyCheckIns)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Caching for features like password reset
builder.Services.AddMemoryCache();

// Mail settings & service
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<IEmailService, EmailService>();

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// Add Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(BaseRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IMealDiaryRepository, MealDiaryRepository>();
builder.Services.AddScoped<IFoodItemRepository, FoodItemRepository>();
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();
builder.Services.AddScoped<IUserFoodItemRepository, UserFoodItemRepository>();

// Add Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IMealDiaryService, MealDiaryService>();
builder.Services.AddScoped<IFoodService, FoodService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IUserFoodItemService, UserFoodItemService>();
builder.Services.AddScoped<IAiFoodMapService, AiFoodMapService>();
builder.Services.AddScoped<IUserPreferenceService, UserPreferenceService>();
builder.Services.AddScoped<IRecipeSuggestionService, RecipeSuggestionService>();
builder.Services.AddScoped<INutritionInsightService, NutritionInsightService>();
builder.Services.AddScoped<AIReviewService>(); // AI Weekly Review
builder.Services.AddScoped<IVisionCacheService, VisionCacheService>();
builder.Services.AddScoped<IStreakService, StreakService>();  // Profile 2026 - Streak tracking

// Voice AI service
builder.Services.AddScoped<IVoiceProcessingService, VoiceProcessingService>();

// HttpClient for external AI provider proxy
builder.Services.AddHttpClient();
// Nutrition + AI logging services
builder.Services.AddScoped<INutritionCalcService, NutritionCalcService>();
builder.Services.AddScoped<IAiLogService, AiLogService>();

// Lookup cache service (Singleton for shared cache)
builder.Services.AddSingleton<ILookupCacheService, LookupCacheService>();

// Health checks (used by HealthController and readiness endpoints)
builder.Services.AddHealthChecks()
    .AddSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "sql",
        timeout: TimeSpan.FromSeconds(3));

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) ||
    string.Equals(jwtKey, "default-secret-key", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(jwtKey, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or insecure. Configure a strong secret via appsettings or user-secrets.");
}

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.ASCII.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// Add Authorization
builder.Services.AddAuthorization();

var app = builder.Build();

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        await DatabaseSeeder.SeedAsync(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}


// Add custom middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(o =>
    {
        o.SwaggerEndpoint("/swagger/v1/swagger.json", "EatFitAI v1");
        o.RoutePrefix = "swagger"; // -> /swagger và /swagger/index.html
    });
}
else if (app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
    // In Production, configure a tighter CORS policy via appsettings.Production.json
}

// Add routing
app.UseRouting();

<<<<<<< Updated upstream
// Rate Limiting middleware (must be before CORS and Auth)
app.UseRateLimiter();

// CORS - Use environment-appropriate policy
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCors");
}
else
{
    app.UseCors("ProdCors");
}
=======
app.UseCors("AppCors");
>>>>>>> Stashed changes

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Serve static files (for uploaded images under wwwroot)
app.UseStaticFiles();

app.MapControllers();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapGet("/health/ready", async (EatFitAI.API.DbScaffold.Data.EatFitAIDbContext db) =>
{
    try
    {
        await db.Database.ExecuteSqlRawAsync("SELECT 1");
        return Results.Ok(new { status = "ready" });
    }
    catch
    {
        return Results.Problem(title: "DB not ready", statusCode: 503);
    }
});
// Simple health endpoint for mobile ping
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Discovery endpoint - cho mobile app tự động tìm backend trong LAN
app.MapGet("/discovery", () => Results.Ok(new { 
    appId = "eatfitai", 
    version = "1.0", 
    apiPort = 5247 
}));

await app.RunAsync();
    }
}
