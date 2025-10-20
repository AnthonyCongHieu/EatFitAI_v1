using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net;
using System.Text;
using EatFitAI.Api.Serialization;
using EatFitAI.Application.Auth;
using EatFitAI.Application.Configuration;
using EatFitAI.Application.Data;
using EatFitAI.Domain.Users;
using EatFitAI.Infrastructure.Auth;
using EatFitAI.Infrastructure.Data;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

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
    options.UseSqlServer(databaseOptions.Default); // Dung chung connection string cho EF schema + Dapper
});

var identityBuilder = builder.Services.AddIdentityCore<NguoiDung>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
});

identityBuilder = identityBuilder.AddRoles<IdentityRole<Guid>>();
identityBuilder.AddEntityFrameworkStores<AppDbContext>();
identityBuilder.AddSignInManager();
identityBuilder.AddDefaultTokenProviders();

builder.Services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<IScriptRunner, ScriptRunner>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
    });
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
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
