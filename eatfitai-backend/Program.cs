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
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        var scanDemoSeedOptions = ParseScanDemoSeedOptions(args);

        static string? TryGetOptionValue(string[] cliArgs, string optionName)
        {
            for (var index = 0; index < cliArgs.Length - 1; index += 1)
            {
                if (!string.Equals(cliArgs[index], optionName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var value = cliArgs[index + 1];
                if (!string.IsNullOrWhiteSpace(value) && !value.StartsWith("--", StringComparison.Ordinal))
                {
                    return value.Trim();
                }
            }

            return null;
        }

        static ScanDemoSeedOptions? ParseScanDemoSeedOptions(string[] cliArgs)
        {
            var enabled = cliArgs.Any(arg => string.Equals(arg, "--seed-scan-demo", StringComparison.OrdinalIgnoreCase))
                || string.Equals(Environment.GetEnvironmentVariable("EATFITAI_SEED_SCAN_DEMO"), "1", StringComparison.OrdinalIgnoreCase);

            if (!enabled)
            {
                return null;
            }

            var email = TryGetOptionValue(cliArgs, "--demo-email")
                ?? Environment.GetEnvironmentVariable("EATFITAI_DEMO_EMAIL")
                ?? "scan-demo@redacted.local";
            var password = TryGetOptionValue(cliArgs, "--demo-password")
                ?? Environment.GetEnvironmentVariable("EATFITAI_DEMO_PASSWORD")
                ?? "SET_IN_SEED_SCRIPT";
            var displayName = TryGetOptionValue(cliArgs, "--demo-display-name")
                ?? Environment.GetEnvironmentVariable("EATFITAI_DEMO_DISPLAY_NAME")
                ?? "Scan Demo Reliability";

            return new ScanDemoSeedOptions
            {
                Email = email,
                Password = password,
                DisplayName = displayName,
            };
        }

        // User Secrets will be loaded automatically in Development by CreateBuilder

        // Render.com cung cấp PORT env var, ưu tiên dùng nó
        var port = Environment.GetEnvironmentVariable("PORT") ?? "10000";
        var configuredUrls = builder.Configuration.GetValue<string>("Urls");
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PORT")))
        {
            builder.WebHost.UseUrls($"http://+:{port}");
        }
        else if (!string.IsNullOrWhiteSpace(configuredUrls))
        {
            builder.WebHost.UseUrls(configuredUrls);
        }

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });
builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();


// CORS from config (supports exact match and simple wildcard suffix/prefix, e.g. exp://* or http://localhost:*)
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>()?
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x.Trim())
    .ToArray()
    ?? Array.Empty<string>();

var devAllowedOrigins = builder.Configuration
    .GetSection("DevAllowedOrigins")
    .Get<string[]>()?
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x.Trim())
    .ToArray()
    ?? Array.Empty<string>();

if (devAllowedOrigins.Length == 0)
{
    devAllowedOrigins = new[]
    {
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://10.0.2.2:*",
        "exp://*",
    };
}

if (allowedOrigins.Length == 0)
{
    if (!builder.Environment.IsProduction())
    {
        allowedOrigins = devAllowedOrigins;
    }
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

        if (rule.Contains('*'))
        {
            var regexPattern = "^" + Regex.Escape(rule).Replace("\\*", ".*") + "$";
            if (Regex.IsMatch(origin, regexPattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
            {
                return true;
            }
        }
    }

    return false;
}

static bool IsPlaceholderSecret(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return true;
    }

    return string.Equals(value, "default-secret-key", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForProductionUse", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse", StringComparison.OrdinalIgnoreCase);
}

static bool HasConfiguredValue(string? value) => !IsPlaceholderSecret(value);

static bool HasConfiguredHttpsUrl(string? value)
{
    if (!HasConfiguredValue(value)
        || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
        || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    return !LooksLocalUrl(value);
}

static bool LooksLocalUrl(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
    {
        return false;
    }

    return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("0.0.0.0", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("10.0.2.2", StringComparison.OrdinalIgnoreCase);
}

static bool LooksLocalConnectionString(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    return value.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || value.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || value.Contains("Server=.", StringComparison.OrdinalIgnoreCase);
}

static string GetConnectionMode(string host, int port)
{
    if (host.EndsWith(".pooler.supabase.com", StringComparison.OrdinalIgnoreCase))
    {
        return port switch
        {
            5432 => "supavisor-session",
            6543 => "supavisor-transaction",
            _ => "supavisor-custom"
        };
    }

    if (host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase))
    {
        return "supabase-direct";
    }

    return "custom";
}

static string GetSanitizedConnectionSummary(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return "connectionString=<missing>";
    }

    try
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        return string.Join(
            ";",
            new[]
            {
                $"host={builder.Host}",
                $"port={builder.Port}",
                $"database={builder.Database}",
                $"username={builder.Username}",
                $"sslmode={builder.SslMode}",
                $"timeout={builder.Timeout}",
                $"commandTimeout={builder.CommandTimeout}",
                $"keepalive={builder.KeepAlive}",
                $"mode={GetConnectionMode(builder.Host ?? string.Empty, builder.Port)}"
            });
    }
    catch
    {
        return "connectionString=<unparseable>";
    }
}

static void EnsureRequiredProductionConfiguration(
    WebApplicationBuilder builder,
    string[] productionAllowedOrigins)
{
    if (!builder.Environment.IsProduction())
    {
        return;
    }

    var errors = new List<string>();

    void RequireValue(string key)
    {
        if (IsPlaceholderSecret(builder.Configuration[key]))
        {
            errors.Add(key);
        }
    }

    void RequireHttpsUrl(string key)
    {
        var value = builder.Configuration[key];
        if (IsPlaceholderSecret(value)
            || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || LooksLocalUrl(value))
        {
            errors.Add(key);
        }
    }

    var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
    if (IsPlaceholderSecret(defaultConnection) || LooksLocalConnectionString(defaultConnection))
    {
        errors.Add("ConnectionStrings:DefaultConnection");
    }

    if (productionAllowedOrigins.Length == 0)
    {
        errors.Add("AllowedOrigins");
    }

    RequireValue("Jwt:Key");
    RequireHttpsUrl("AIProvider:VisionBaseUrl");

    if (errors.Count > 0)
    {
        throw new InvalidOperationException(
            $"Missing or invalid production configuration: {string.Join(", ", errors.Distinct())}");
    }
}

static IReadOnlyList<string> GetMissingOptionalProductionConfiguration(WebApplicationBuilder builder)
{
    var warnings = new List<string>();

    if (!builder.Environment.IsProduction())
    {
        return warnings;
    }

    void AddWarning(string integrationName, params string[] missingKeys)
    {
        if (missingKeys.Length > 0)
        {
            warnings.Add($"{integrationName}: {string.Join(", ", missingKeys)}");
        }
    }

    var missingStorage = new List<string>();
    if (!HasConfiguredHttpsUrl(builder.Configuration["Supabase:Url"]))
    {
        missingStorage.Add("Supabase:Url");
    }

    if (!HasConfiguredValue(builder.Configuration["Supabase:ServiceRoleKey"]))
    {
        missingStorage.Add("Supabase:ServiceRoleKey");
    }

    if (!HasConfiguredValue(builder.Configuration["Supabase:UserFoodBucket"]))
    {
        missingStorage.Add("Supabase:UserFoodBucket");
    }

    AddWarning("Supabase storage uploads disabled", missingStorage.ToArray());

    var missingGoogle = new[]
    {
        "Google:WebClientId",
        "Google:AndroidClientId",
        "Google:IosClientId"
    }
        .Where(key => !HasConfiguredValue(builder.Configuration[key]))
        .ToArray();
    AddWarning("Google sign-in disabled", missingGoogle);

    var missingBrevo = new List<string>();
    foreach (var key in new[] { "Brevo:ApiKey", "Brevo:SenderEmail" })
    {
        if (!HasConfiguredValue(builder.Configuration[key]))
        {
            missingBrevo.Add(key);
        }
    }

    AddWarning("Brevo email flows disabled", missingBrevo.ToArray());

    return warnings;
}

EnsureRequiredProductionConfiguration(builder, allowedOrigins);

var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var databaseHealthTimeout =
    builder.Configuration.GetValue<TimeSpan?>("HealthChecks:DatabaseTimeout")
    ?? TimeSpan.FromSeconds(10);
var sanitizedConnectionSummary = GetSanitizedConnectionSummary(defaultConnectionString);
var optionalProductionWarnings = GetMissingOptionalProductionConfiguration(builder);

builder.Services.AddCors(o =>
{
    // Development: controlled allow-list for local/dev clients
    o.AddPolicy("DevCors", p => p
        .SetIsOriginAllowed(origin => IsOriginAllowed(origin, devAllowedOrigins))
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());

    // Production: Strict whitelist
    o.AddPolicy("ProdCors", p => p
        .SetIsOriginAllowed(origin => IsOriginAllowed(origin, allowedOrigins))
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
// Sử dụng PostgreSQL (Supabase) thay vì SQL Server
builder.Services.AddDbContext<EatFitAIDbContext>(options =>
    options.UseNpgsql(defaultConnectionString, npgsql =>
        npgsql.EnableRetryOnFailure()));

// Add ApplicationDbContext (custom with WeeklyCheckIns)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(defaultConnectionString, npgsql =>
        npgsql.EnableRetryOnFailure()));

// Caching for features like password reset
builder.Services.AddMemoryCache();

// Email settings & service
builder.Services.Configure<BrevoOptions>(builder.Configuration.GetSection("Brevo"));
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.AddHttpClient<IEmailService, EmailService>();
builder.Services.AddScoped<ISupabaseStorageService, SupabaseStorageService>();

// Add AutoMapper
builder.Services.AddAutoMapper(_ => { }, typeof(MappingProfile));

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
builder.Services.AddScoped<IAiCorrectionService, AiCorrectionService>();
builder.Services.AddSingleton<IAiHealthService, AiHealthService>();
builder.Services.AddHostedService<AiHealthBackgroundService>();
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

// Security & AI Pool Services
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IGeminiPoolManager, GeminiPoolManager>();

// Health checks (used by HealthController and readiness endpoints)
builder.Services.AddHealthChecks()
    .AddNpgSql(
        defaultConnectionString!,
        name: "postgres",
        timeout: databaseHealthTimeout,
        tags: new[] { "ready", "db" });

var jwtKey = builder.Configuration["Jwt:Key"];
if (IsPlaceholderSecret(jwtKey))
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or insecure. Configure a strong secret via appsettings or user-secrets.");
}

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Supabase uses HS256 (Symmetric) to sign JWTs. We MUST use SymmetricSecurityKey, NOT Authority.
        // options.Authority = builder.Configuration["Jwt:Issuer"] ?? "https://bjlmndmafrajjysenpbm.supabase.co/auth/v1";
        options.RequireHttpsMetadata = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
            
            // Bật validate Issuer/Audience để chặn token từ app khác
            ValidateIssuer = true,
            ValidIssuers = new[] 
            { 
                builder.Configuration["Jwt:Issuer"] ?? "EatFitAI",
                "https://bjlmndmafrajjysenpbm.supabase.co/auth/v1"
            },
            ValidateAudience = true,
            ValidAudiences = new[]
            {
                builder.Configuration["Jwt:Audience"] ?? "EatFitAI",
                "authenticated"
            },
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var identity = context.Principal?.Identity as System.Security.Claims.ClaimsIdentity;
                if (identity != null)
                {
                    // Map Supabase user_metadata.role to .NET ClaimTypes.Role
                    var userMetadataClaim = identity.FindFirst("user_metadata");
                    if (userMetadataClaim != null)
                    {
                        try
                        {
                            var md = System.Text.Json.JsonDocument.Parse(userMetadataClaim.Value);
                            if (md.RootElement.TryGetProperty("role", out var roleElement))
                            {
                                identity.AddClaim(new System.Security.Claims.Claim(
                                    System.Security.Claims.ClaimTypes.Role, 
                                    roleElement.GetString()!));
                            }
                        }
                        catch { /* Ignore parsing errors */ }
                    }
                }
                return Task.CompletedTask;
            }
        };
    });

// Add Authorization
builder.Services.AddAuthorization();

var app = builder.Build();
var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
startupLogger.LogInformation(
    "Configured PostgreSQL target: {ConnectionSummary}",
    sanitizedConnectionSummary);

foreach (var warning in optionalProductionWarnings)
{
    startupLogger.LogWarning("{Warning}", warning);
}

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    if (scanDemoSeedOptions != null)
    {
        await DatabaseSeeder.SeedAsync(services);
        var seedResult = await ScanDemoReliabilitySeeder.SeedAsync(services, scanDemoSeedOptions);
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            action = "seed-scan-demo",
            scanDemoSeedOptions.Email,
            scanDemoSeedOptions.DisplayName,
            seedResult
        }, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
        return;
    }

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

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Serve static files (for uploaded images under wwwroot)
app.UseStaticFiles();

app.MapControllers();

// Health endpoints handled by HealthController (no MapGet duplicates)


// Discovery endpoint - cho mobile app tự động tìm backend trong LAN
app.MapGet("/discovery", () => Results.Ok(new { 
    appId = "eatfitai", 
    version = "1.0", 
    apiPort = 5247 
}));

await app.RunAsync();
    }
}
