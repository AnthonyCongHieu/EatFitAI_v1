using EatFitAI.Api.Contracts.Profile;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController : ControllerBase
{
    private readonly IProfileRepository _profileRepository;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(IProfileRepository profileRepository, ILogger<ProfileController> logger)
    {
        _profileRepository = profileRepository;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);

        if (profile is null)
        {
            return Ok(new ProfileResponse
            {
                UserId = userId
            });
        }

        return Ok(ToResponse(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] ProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);

        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId,
                FullName = request.FullName ?? string.Empty,
                Gender = request.Gender ?? string.Empty,
                DateOfBirth = request.DateOfBirth,
                HeightCm = request.HeightCm,
                TargetWeightKg = request.TargetWeightKg,
                ActivityLevel = request.ActivityLevel ?? string.Empty,
                Goal = request.Goal ?? string.Empty,
                AvatarUrl = request.AvatarUrl,
                CreatedAt = DateTime.UtcNow
            };
        }
        else
        {
            profile.FullName = request.FullName ?? profile.FullName;
            profile.Gender = request.Gender ?? profile.Gender;
            profile.DateOfBirth = request.DateOfBirth ?? profile.DateOfBirth;
            profile.HeightCm = request.HeightCm ?? profile.HeightCm;
            profile.TargetWeightKg = request.TargetWeightKg ?? profile.TargetWeightKg;
            profile.ActivityLevel = request.ActivityLevel ?? profile.ActivityLevel;
            profile.Goal = request.Goal ?? profile.Goal;
            profile.AvatarUrl = request.AvatarUrl ?? profile.AvatarUrl;
            profile.UpdatedAt = DateTime.UtcNow;
        }

        await _profileRepository.UpdateAsync(profile, cancellationToken);
        await _profileRepository.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(profile));
    }

    private static ProfileResponse ToResponse(UserProfile profile)
    {
        return new ProfileResponse
        {
            UserId = profile.UserId,
            FullName = profile.FullName,
            Gender = profile.Gender,
            DateOfBirth = profile.DateOfBirth,
            HeightCm = profile.HeightCm,
            TargetWeightKg = profile.TargetWeightKg,
            ActivityLevel = profile.ActivityLevel,
            Goal = profile.Goal,
            AvatarUrl = profile.AvatarUrl
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
