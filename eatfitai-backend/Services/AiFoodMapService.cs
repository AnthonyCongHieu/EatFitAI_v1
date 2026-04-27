using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
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
        private const decimal CatalogMinConfidence = 0.60m;

        private readonly EatFitAIDbContext _db;
        private readonly IMediaUrlResolver _mediaUrlResolver;

        public AiFoodMapService(EatFitAIDbContext db, IMediaUrlResolver mediaUrlResolver)
        {
            _db = db;
            _mediaUrlResolver = mediaUrlResolver;
        }

        public async Task<List<MappedFoodDto>> MapDetectionsAsync(IEnumerable<VisionDetectionDto> detections, CancellationToken cancellationToken = default)
        {
            if (detections is null) throw new System.ArgumentNullException(nameof(detections));

            var list = detections.ToList();
            if (list.Count == 0)
            {
                return new List<MappedFoodDto>();
            }

            var normalizedLabels = list
                .Select(d => (
                    Original: d,
                    ExactKey: (d.Label ?? string.Empty).Trim().ToLowerInvariant(),
                    SearchKey: NormalizeSearchKey(d.Label)))
                .ToList();

            var labelKeys = normalizedLabels
                .Select(x => x.ExactKey)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .ToList();

            var rows = await _db.vw_AiFoodMaps
                .Where(v => labelKeys.Contains(v.Label))
                .ToListAsync(cancellationToken);

            var byLabel = rows
                .GroupBy(r => r.Label)
                .ToDictionary(g => g.Key, g => g.First());

            var catalogResolutions = await ResolveCatalogCandidatesAsync(normalizedLabels
                .Where(x => !string.IsNullOrWhiteSpace(x.SearchKey))
                .Select(x => x.SearchKey)
                .Distinct()
                .ToList(), cancellationToken);

            var result = new List<MappedFoodDto>(list.Count);

            foreach (var (original, exactKey, searchKey) in normalizedLabels)
            {
                if (!string.IsNullOrWhiteSpace(exactKey) && byLabel.TryGetValue(exactKey, out var row))
                {
                    var confDec = (decimal)original.Confidence;
                    if (confDec >= row.MinConfidence
                        && row.FoodItemId.HasValue
                        && HasUsableNutrition(
                            row.CaloriesPer100g,
                            row.ProteinPer100g,
                            row.CarbPer100g,
                            row.FatPer100g))
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

                if ((decimal)original.Confidence >= CatalogMinConfidence
                    && !string.IsNullOrWhiteSpace(searchKey)
                    && catalogResolutions.TryGetValue(searchKey, out var catalogMatch))
                {
                    result.Add(new MappedFoodDto
                    {
                        Label = original.Label,
                        Confidence = original.Confidence,
                        FoodItemId = catalogMatch.FoodItemId,
                        FoodName = catalogMatch.FoodName,
                        CaloriesPer100g = catalogMatch.CaloriesPer100g,
                        ProteinPer100g = catalogMatch.ProteinPer100g,
                        FatPer100g = catalogMatch.FatPer100g,
                        CarbPer100g = catalogMatch.CarbPer100g,
                        ThumbNail = _mediaUrlResolver.NormalizePublicUrl(catalogMatch.ThumbNail)
                    });
                    continue;
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

            var mappedFoodIds = result
                .Where(r => r.FoodItemId.HasValue)
                .Select(r => r.FoodItemId!.Value)
                .Distinct()
                .ToList();

            if (mappedFoodIds.Any())
            {
                var thumbnails = await _db.FoodItems
                    .Where(f => mappedFoodIds.Contains(f.FoodItemId))
                    .Select(f => new { f.FoodItemId, f.ThumbNail })
                    .ToDictionaryAsync(x => x.FoodItemId, x => x.ThumbNail, cancellationToken);

                foreach (var item in result)
                {
                    if (item.FoodItemId.HasValue && thumbnails.TryGetValue(item.FoodItemId.Value, out var thumb))
                    {
                        item.ThumbNail = _mediaUrlResolver.NormalizePublicUrl(thumb);
                    }
                }
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

        private async Task<Dictionary<string, FoodCatalogMatch>> ResolveCatalogCandidatesAsync(
            IReadOnlyCollection<string> searchKeys,
            CancellationToken cancellationToken)
        {
            if (searchKeys.Count == 0)
            {
                return new Dictionary<string, FoodCatalogMatch>();
            }

            var candidates = await _db.FoodItems
                .AsNoTracking()
                .Where(food =>
                    food.IsActive &&
                    !food.IsDeleted &&
                    food.CaloriesPer100g > 0 &&
                    (food.ProteinPer100g > 0 || food.CarbPer100g > 0 || food.FatPer100g > 0) &&
                    food.ProteinPer100g >= 0 &&
                    food.CarbPer100g >= 0 &&
                    food.FatPer100g >= 0)
                .Select(food => new FoodCatalogMatch
                {
                    FoodItemId = food.FoodItemId,
                    FoodName = food.FoodName,
                    FoodNameEn = food.FoodNameEn,
                    FoodNameUnsigned = food.FoodNameUnsigned,
                    CaloriesPer100g = food.CaloriesPer100g,
                    ProteinPer100g = food.ProteinPer100g,
                    CarbPer100g = food.CarbPer100g,
                    FatPer100g = food.FatPer100g,
                    ThumbNail = food.ThumbNail,
                    CredibilityScore = food.CredibilityScore
                })
                .ToListAsync(cancellationToken);

            candidates = candidates
                .Where(candidate => HasUsableNutrition(
                    candidate.CaloriesPer100g,
                    candidate.ProteinPer100g,
                    candidate.CarbPer100g,
                    candidate.FatPer100g))
                .ToList();

            var result = new Dictionary<string, FoodCatalogMatch>();
            foreach (var key in searchKeys)
            {
                var match = candidates
                    .Select(candidate => new
                    {
                        Candidate = candidate,
                        Score = ScoreCatalogMatch(key, candidate)
                    })
                    .Where(match => match.Score > 0)
                    .OrderByDescending(match => match.Score)
                    .ThenByDescending(match => match.Candidate.CredibilityScore)
                    .ThenBy(match => match.Candidate.FoodName.Length)
                    .Select(match => match.Candidate)
                    .FirstOrDefault();

                if (match != null)
                {
                    result[key] = match;
                }
            }

            return result;
        }

        private static int ScoreCatalogMatch(string labelKey, FoodCatalogMatch candidate)
        {
            if (labelKey.Length < 4)
            {
                return 0;
            }

            var names = new[]
            {
                candidate.FoodName,
                candidate.FoodNameUnsigned,
                candidate.FoodNameEn
            }
                .Select(NormalizeSearchKey)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct()
                .ToList();

            if (names.Any(name => name.Equals(labelKey, System.StringComparison.Ordinal)))
            {
                return 1000;
            }

            if (names.Any(name => name.StartsWith(labelKey + " ", System.StringComparison.Ordinal)))
            {
                return 900;
            }

            if (names.Any(name => name.Contains(" " + labelKey + " ", System.StringComparison.Ordinal)
                || name.EndsWith(" " + labelKey, System.StringComparison.Ordinal)))
            {
                return 800;
            }

            if (names.Any(name => name.Contains(labelKey, System.StringComparison.Ordinal)))
            {
                return 700;
            }

            return 0;
        }

        private static bool HasUsableNutrition(
            decimal? caloriesPer100g,
            decimal? proteinPer100g,
            decimal? carbPer100g,
            decimal? fatPer100g)
        {
            return caloriesPer100g.HasValue
                && caloriesPer100g.Value > 0
                && proteinPer100g.GetValueOrDefault() >= 0
                && carbPer100g.GetValueOrDefault() >= 0
                && fatPer100g.GetValueOrDefault() >= 0
                && (proteinPer100g.GetValueOrDefault() > 0
                    || carbPer100g.GetValueOrDefault() > 0
                    || fatPer100g.GetValueOrDefault() > 0);
        }

        private static string NormalizeSearchKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var lower = RemoveDiacritics(value.Trim().ToLowerInvariant());
            var builder = new StringBuilder(lower.Length);
            var lastWasSpace = true;

            foreach (var c in lower)
            {
                if (char.IsLetterOrDigit(c))
                {
                    builder.Append(c);
                    lastWasSpace = false;
                }
                else if (!lastWasSpace)
                {
                    builder.Append(' ');
                    lastWasSpace = true;
                }
            }

            var normalized = builder.ToString().Trim();
            return normalized switch
            {
                "beef" or "raw beef" or "beef meat" => "thit bo",
                "ga" or "chicken" or "raw chicken" or "chicken meat" => "thit ga",
                _ => normalized
            };
        }

        private static string RemoveDiacritics(string value)
        {
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(c == 'đ' ? 'd' : c);
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private sealed class FoodCatalogMatch
        {
            public int FoodItemId { get; init; }
            public string FoodName { get; init; } = string.Empty;
            public string? FoodNameEn { get; init; }
            public string? FoodNameUnsigned { get; init; }
            public decimal CaloriesPer100g { get; init; }
            public decimal ProteinPer100g { get; init; }
            public decimal CarbPer100g { get; init; }
            public decimal FatPer100g { get; init; }
            public string? ThumbNail { get; init; }
            public int CredibilityScore { get; init; }
        }
    }
}
