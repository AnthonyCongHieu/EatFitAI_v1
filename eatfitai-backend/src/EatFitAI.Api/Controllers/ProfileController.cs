using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.Profile;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(ISqlConnectionFactory connectionFactory, ILogger<ProfileController> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleOrDefaultAsync<ProfileDb>(
            "sp_Profile_Get",
            new { UserId = userId },
            commandType: CommandType.StoredProcedure);

        if (row is null)
        {
            return Ok(new ProfileResponse
            {
                UserId = userId
            });
        }

        return Ok(ToResponse(row));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] ProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleAsync<ProfileDb>(
            "sp_Profile_Update",
            new
            {
                UserId = userId,
                request.FullName,
                request.Gender,
                DateOfBirth = request.DateOfBirth?.ToDateTime(TimeOnly.MinValue),
                request.HeightCm,
                request.TargetWeightKg,
                request.ActivityLevel,
                request.Goal,
                request.AvatarUrl
            },
            commandType: CommandType.StoredProcedure);

        return Ok(ToResponse(row));
    }

    private static ProfileResponse ToResponse(ProfileDb db)
    {
        return new ProfileResponse
        {
            UserId = db.UserId,
            FullName = db.FullName,
            Gender = db.Gender,
            DateOfBirth = db.DateOfBirth.HasValue ? DateOnly.FromDateTime(db.DateOfBirth.Value) : null,
            HeightCm = db.HeightCm,
            TargetWeightKg = db.TargetWeightKg,
            ActivityLevel = db.ActivityLevel,
            Goal = db.Goal,
            AvatarUrl = db.AvatarUrl
        };
    }

    private sealed class ProfileDb
    {
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public decimal? HeightCm { get; set; }
        public decimal? TargetWeightKg { get; set; }
        public string? ActivityLevel { get; set; }
        public string? Goal { get; set; }
        public string? AvatarUrl { get; set; }
    }
}

