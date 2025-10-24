using EatFitAI.Api.Contracts.NutritionTargets;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Nutrition;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/nutrition-targets")]
[Authorize]
public sealed class NutritionTargetsController : ControllerBase
{
    private readonly INutritionTargetRepository _nutritionTargetRepository;

    public NutritionTargetsController(INutritionTargetRepository nutritionTargetRepository)
    {
        _nutritionTargetRepository = nutritionTargetRepository;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var target = await _nutritionTargetRepository.GetCurrentAsync(userId, cancellationToken);

        if (target is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Chua co muc tieu dinh duong");
        }

        return Ok(ToResponse(target));
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertNutritionTargetRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        // First, try to get the current target
        var existingTarget = await _nutritionTargetRepository.GetCurrentAsync(userId, cancellationToken);

        if (existingTarget != null)
        {
            // Update existing
            existingTarget.CaloriesKcal = request.CaloriesKcal;
            existingTarget.ProteinGrams = request.ProteinGrams;
            existingTarget.CarbohydrateGrams = request.CarbohydrateGrams;
            existingTarget.FatGrams = request.FatGrams;
            existingTarget.EffectiveDate = request.EffectiveDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            existingTarget.UpdatedAt = DateTime.UtcNow;

            await _nutritionTargetRepository.UpdateAsync(existingTarget, cancellationToken);
        }
        else
        {
            // Create new
            var newTarget = new NutritionTarget
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EffectiveDate = request.EffectiveDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                CaloriesKcal = request.CaloriesKcal,
                ProteinGrams = request.ProteinGrams,
                CarbohydrateGrams = request.CarbohydrateGrams,
                FatGrams = request.FatGrams,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _nutritionTargetRepository.AddAsync(newTarget, cancellationToken);
            existingTarget = newTarget;
        }

        await _nutritionTargetRepository.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(existingTarget!));
    }

    private static NutritionTargetResponse ToResponse(NutritionTarget target)
    {
        return new NutritionTargetResponse
        {
            Id = target.Id,
            EffectiveDate = target.EffectiveDate,
            CaloriesKcal = target.CaloriesKcal,
            ProteinGrams = target.ProteinGrams,
            CarbohydrateGrams = target.CarbohydrateGrams,
            FatGrams = target.FatGrams,
            IsActive = target.IsActive
        };
    }

    private sealed class NutritionTargetDb
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
