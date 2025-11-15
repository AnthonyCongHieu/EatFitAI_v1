using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public interface IAiFoodMapService
    {
        Task<List<MappedFoodDto>> MapDetectionsAsync(IEnumerable<VisionDetectionDto> detections, CancellationToken cancellationToken = default);
        Task TeachLabelAsync(TeachLabelRequestDto request, CancellationToken cancellationToken = default);
    }

    public sealed class AiFoodMapService : IAiFoodMapService
    {
        private readonly EatFitAIDbContext _db;
        public AiFoodMapService(EatFitAIDbContext db) => _db = db;

        public async Task<List<MappedFoodDto>> MapDetectionsAsync(IEnumerable<VisionDetectionDto> detections, CancellationToken cancellationToken = default)
        {
            if (detections is null) throw new System.ArgumentNullException(nameof(detections));

            var list = detections.ToList();
            if (list.Count == 0)
            {
                return new List<MappedFoodDto>();
            }

            var normalizedLabels = list
                .Select(d => (Original: d, Normalized: (d.Label ?? string.Empty).Trim().ToLowerInvariant()))
                .ToList();

            var labelKeys = normalizedLabels
                .Select(x => x.Normalized)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .ToList();

            var rows = await _db.vw_AiFoodMaps
                .Where(v => labelKeys.Contains(v.Label))
                .ToListAsync(cancellationToken);

            var byLabel = rows
                .GroupBy(r => r.Label)
                .ToDictionary(g => g.Key, g => g.First());

            var result = new List<MappedFoodDto>(list.Count);

            foreach (var (original, normalized) in normalizedLabels)
            {
                if (!string.IsNullOrWhiteSpace(normalized) && byLabel.TryGetValue(normalized, out var row))
                {
                    var confDec = (decimal)original.Confidence;
                    if (confDec >= row.MinConfidence)
                    {
                        result.Add(new MappedFoodDto
                        {
                            Label = original.Label,
                            Confidence = original.Confidence,
                            FoodItemId = row.FoodItemId,
                            FoodName = row.FoodName,
                            CaloriesPer100g = row.CaloriesPer100g,
                            ProteinPer100g = row.ProteinPer100g,
                            FatPer100g = row.FatPer100g,
                            CarbPer100g = row.CarbPer100g
                        });
                        continue;
                    }
                }

                result.Add(new MappedFoodDto
                {
                    Label = original.Label,
                    Confidence = original.Confidence,
                    FoodItemId = null,
                    FoodName = null,
                    CaloriesPer100g = null,
                    ProteinPer100g = null,
                    FatPer100g = null,
                    CarbPer100g = null
                });
            }

            return result;
        }

        public async Task TeachLabelAsync(TeachLabelRequestDto request, CancellationToken cancellationToken = default)
        {
            if (request == null) throw new System.ArgumentNullException(nameof(request));
            if (string.IsNullOrWhiteSpace(request.Label))
            {
                throw new System.ArgumentException("Label is required", nameof(request.Label));
            }

            var normalized = request.Label.Trim().ToLowerInvariant();
            var minConfidence = request.MinConfidence ?? 0.60m;

            var existing = await _db.Set<AiLabelMap>()
                .FirstOrDefaultAsync(x => x.Label == normalized, cancellationToken);

            if (existing == null)
            {
                existing = new AiLabelMap
                {
                    Label = normalized,
                    FoodItemId = request.FoodItemId,
                    MinConfidence = minConfidence,
                    CreatedAt = System.DateTime.UtcNow
                };
                await _db.AddAsync(existing, cancellationToken);
            }
            else
            {
                existing.FoodItemId = request.FoodItemId;
                existing.MinConfidence = minConfidence;
            }

            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}
