using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Data;
using EatFitAI.API.MappingProfiles;
using EatFitAI.API.Middleware;
using EatFitAI.API.Repositories;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
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


// CORS from config
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(o => o.AddPolicy("DevCors",
    p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

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

// HttpClient for external AI provider proxy
builder.Services.AddHttpClient();
// Nutrition + AI logging services
builder.Services.AddScoped<INutritionCalcService, NutritionCalcService>();
builder.Services.AddScoped<IAiLogService, AiLogService>();

// Health checks (used by HealthController and readiness endpoints)
builder.Services.AddHealthChecks()
    .AddSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "sql",
        timeout: TimeSpan.FromSeconds(3));

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "default-secret-key")),
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

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Serve static files (for uploaded images under wwwroot)
app.UseStaticFiles();

app.MapControllers();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapGet("/health/ready", async (EatFitAI.API.DbScaffold.Data.EatFitAIDbContext db) => { try { await db.Database.ExecuteSqlRawAsync("SELECT 1"); return Results.Ok(new { status = "ready" }); } catch (Exception ex) { return Results.Problem(title: "DB not ready", detail: ex.Message, statusCode: 503); } });
// Simple health endpoint for mobile ping
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

await app.RunAsync();
    }
}
