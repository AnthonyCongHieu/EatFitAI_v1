using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net;
using System.Text;
using System.Reflection;
using Asp.Versioning;
using Asp.Versioning.ApiExplorer;
using EatFitAI.Api;
using EatFitAI.Api.Serialization;
using EatFitAI.Application.Auth;
using EatFitAI.Application.Configuration;
using EatFitAI.Application.Data;
using EatFitAI.Infrastructure.Auth;
using EatFitAI.Infrastructure.Data;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using EatFitAI.Application.Repositories;
using EatFitAI.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5100); // Mo HTTP co dinh cho web + mobile dev
});

builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection(DatabaseOptions.SectionName)); // Doc chuoi ket noi qua IOptions
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName)); // Doc cau hinh JWT cho auth

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
{
    var databaseOptions = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
    options.UseSqlServer(databaseOptions.Default) // Dung chung connection string cho EF schema + Dapper
        .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

builder.Services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<IScriptRunner, ScriptRunner>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();

// Repositories
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<IBodyMetricRepository, BodyMetricRepository>();
builder.Services.AddScoped<IDiaryRepository, DiaryRepository>();
builder.Services.AddScoped<IFoodRepository, FoodRepository>();
builder.Services.AddScoped<ICustomDishRepository, CustomDishRepository>();
builder.Services.AddScoped<INutritionTargetRepository, NutritionTargetRepository>();
builder.Services.AddScoped<ISummaryRepository, SummaryRepository>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
    });
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

// Add API versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

builder.Services.AddSwaggerGen(options =>
{
    // Include XML comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);

    // Add JWT Bearer authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
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
});

// Configure Swagger UI for API versioning
builder.Services.ConfigureOptions<ConfigureSwaggerOptions>();
builder.Services.AddAuthorization();

const string corsPolicyName = "FrontendCors";
var corsOriginsForLog = new[]
{
    "http://localhost:19006",
    "http://<LAN-IP>:19006",
    "exp://*"
};

builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin))
                {
                    return false;
                }

                if (origin.Equals("http://localhost:19006", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (origin.StartsWith("exp://", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                    uri.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase) &&
                    uri.Port == 19006 &&
                    IPAddress.TryParse(uri.Host, out _))
                {
                    return true; // Cho phep LAN-IP 19006 phuc vu Expo Go
                }

                return false;
            });
    });
});

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.Zero,
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = ClaimTypes.Role
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync(); // Tao DB + ap migrations khi khoi dong
    var scriptRunner = scope.ServiceProvider.GetRequiredService<IScriptRunner>();
    await scriptRunner.ApplyPendingScriptsAsync(); // Ap dung cac SP trong db/scripts
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        // Tra ProblemDetails 500 cho loi khong kiem soat
        await Results.Problem(statusCode: StatusCodes.Status500InternalServerError)
            .ExecuteAsync(context);
    });
});
app.UseStatusCodePages(async context =>
{
    var statusCode = context.HttpContext.Response.StatusCode;
    if (statusCode is StatusCodes.Status400BadRequest or StatusCodes.Status401Unauthorized or
        StatusCodes.Status403Forbidden or StatusCodes.Status404NotFound or StatusCodes.Status422UnprocessableEntity)
    {
        // Dam bao tra ProblemDetails thay vi HTML mac dinh
        await Results.Problem(statusCode: statusCode).ExecuteAsync(context.HttpContext);
    }
});

app.UseCors(corsPolicyName);

// Configure Swagger UI for API versioning
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    var provider = app.Services.GetRequiredService<IApiVersionDescriptionProvider>();
    foreach (var description in provider.ApiVersionDescriptions)
    {
        options.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json", description.GroupName.ToUpperInvariant());
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Text("ok", "text/plain"))
    .WithName("HealthCheck");

app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    app.Logger.LogInformation("API listening on {Url}", "http://localhost:5100");
    app.Logger.LogInformation("CORS origins: {Origins}", string.Join(", ", corsOriginsForLog));
});

app.Run();
