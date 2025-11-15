using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.AI;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public interface IAiFoodMapService
    {
        Task<List<MappedFoodDto>> MapDetectionsAsync(IEnumerable<VisionDetectionDto> detections, CancellationToken cancellationToken = default);
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
    }
}
