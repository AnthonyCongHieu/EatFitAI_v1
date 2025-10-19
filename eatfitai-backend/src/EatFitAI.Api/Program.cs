using EatFitAI.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.IO;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Cau hinh Serilog de log ra console cho de theo doi
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EatFitAI API",
        Version = "v1",
        Description = "EatFitAI backend APIs"
    });
});

builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AppCors", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
                string.Equals(origin, "http://localhost:19006", StringComparison.OrdinalIgnoreCase) ||
                origin.StartsWith("exp://", StringComparison.OrdinalIgnoreCase))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["ConnectionStrings__Default"]
    ?? throw new InvalidOperationException("Connection string 'Default' was not found.");

builder.Services.AddDbContext<EatFitAiDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    var key = builder.Configuration["Jwt:Key"] ?? builder.Configuration["Jwt__Key"];
    var issuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["Jwt__Issuer"];
    var audience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["Jwt__Audience"];
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
        ValidateAudience = !string.IsNullOrWhiteSpace(audience),
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = string.IsNullOrWhiteSpace(key) ? null : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key!))
    };
});

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    // Middleware de sua chuoi OpenAPI -> 3.1.0
    app.Use(async (context, next) =>
    {
        if (string.Equals(context.Request.Path, "/swagger/v1/swagger.json", StringComparison.OrdinalIgnoreCase))
        {
            var originalBody = context.Response.Body;
            await using var tempStream = new MemoryStream();
            context.Response.Body = tempStream;

            await next();

            tempStream.Position = 0;
            var payload = await new StreamReader(tempStream).ReadToEndAsync();
            payload = payload.Replace("\"openapi\":\"3.0.1\"", "\"openapi\":\"3.1.0\"");
            var bytes = Encoding.UTF8.GetBytes(payload);
            context.Response.ContentLength = bytes.Length;
            context.Response.Body = originalBody;
            await context.Response.Body.WriteAsync(bytes);
        }
        else
        {
            await next();
        }
    });

    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "EatFitAI API v1");
        options.DocumentTitle = "EatFitAI API";
    });
}

app.UseCors("AppCors");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.MapGet("/", () => Results.Ok(new { message = "EatFitAI backend dang san sang" }));

app.Run();
