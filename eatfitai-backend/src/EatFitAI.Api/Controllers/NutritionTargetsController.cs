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
            existingTarget.CaloKcal = request.CaloKcal;
            existingTarget.ProteinG = request.ProteinG;
            existingTarget.CarbG = request.CarbG;
            existingTarget.FatG = request.FatG;
            existingTarget.HieuLucTuNgay = request.EffectiveDate.HasValue ? DateOnly.FromDateTime(request.EffectiveDate.Value) : DateOnly.FromDateTime(DateTime.UtcNow);
            existingTarget.NgayTao = DateTime.UtcNow;

            await _nutritionTargetRepository.UpdateAsync(existingTarget, cancellationToken);
        }
        else
        {
            // Create new
            var newTarget = new NutritionTarget
            {
                MaMucTieuDD = 0, // Will be set by database
                MaNguoiDung = userId,
                HieuLucTuNgay = request.EffectiveDate.HasValue ? DateOnly.FromDateTime(request.EffectiveDate.Value) : DateOnly.FromDateTime(DateTime.UtcNow),
                CaloKcal = request.CaloKcal,
                ProteinG = request.ProteinG,
                CarbG = request.CarbG,
                FatG = request.FatG,
                Nguon = "User",
                NgayTao = DateTime.UtcNow
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
            Id = target.MaMucTieuDD,
            EffectiveDate = target.HieuLucTuNgay.ToDateTime(TimeOnly.MinValue),
            CaloKcal = target.CaloKcal,
            ProteinG = target.ProteinG,
            CarbG = target.CarbG,
            FatG = target.FatG,
            Nguon = target.Nguon
        };
    }

    private sealed class NutritionTargetDb
    {
        public long MaMucTieuDD { get; set; }
        public Guid MaNguoiDung { get; set; }
        public DateTime HieuLucTuNgay { get; set; }
        public int CaloKcal { get; set; }
        public decimal ProteinG { get; set; }
        public decimal CarbG { get; set; }
        public decimal FatG { get; set; }
        public string Nguon { get; set; } = string.Empty;
        public string? LyDo { get; set; }
        public DateTime NgayTao { get; set; }
    }
}
