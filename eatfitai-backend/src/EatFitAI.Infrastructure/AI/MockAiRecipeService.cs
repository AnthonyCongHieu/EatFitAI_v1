using System.Security.Cryptography;
using System.Text;
using EatFitAI.Application.AI;
using EatFitAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.AI;

public class MockAiRecipeService : IAiRecipeService
{
    private readonly EatFitAIDbContext _db;
    public MockAiRecipeService(EatFitAIDbContext db) => _db = db;

    public async Task<IReadOnlyList<AiRecipeDto>> SuggestAsync(AiRecipeSuggestRequest request, CancellationToken ct = default)
    {
        var list = await _db.ThucPhams.AsNoTracking().OrderBy(t => t.Ten).ToListAsync(ct);
        var count = Math.Clamp(request.Count <= 0 ? 3 : request.Count, 1, 10);
        if (list.Count == 0) return Array.Empty<AiRecipeDto>();

        var seed = ComputeSeed(request.Query ?? "");
        var rnd = new Random(seed);
        var results = new List<AiRecipeDto>(count);
        for (int i = 0; i < count; i++)
        {
            var a = list[rnd.Next(list.Count)];
            var b = list[rnd.Next(list.Count)];
            var gramsA = 150m;
            var gramsB = 50m;
            var ing = new List<AiRecipeIngredient>
            {
                MakeIng(a, gramsA),
                MakeIng(b, gramsB)
            };
            var sumK = ing.Sum(x => x.Kcal);
            var sumP = ing.Sum(x => x.ProteinG);
            var sumC = ing.Sum(x => x.CarbG);
            var sumF = ing.Sum(x => x.FatG);
            var id = GuidFromSeed(seed + i);
            var name = $"{a.Ten} + {b.Ten}";
            var summary = $"Gợi ý công thức từ AI mock cho '{request.Query}'";
            results.Add(new AiRecipeDto(id, name, summary, Round2(sumK), Round2(sumP), Round2(sumC), Round2(sumF), ing));
        }
        return results;
    }

    private static AiRecipeIngredient MakeIng(EatFitAI.Domain.Entities.ThucPham tp, decimal grams)
    {
        var f = grams / 100m;
        return new AiRecipeIngredient(tp.Id, tp.Ten, grams,
            Round2(tp.NangLuongKcalPer100g * f), Round2(tp.ProteinGPer100g * f), Round2(tp.CarbGPer100g * f), Round2(tp.FatGPer100g * f));
    }

    private static int ComputeSeed(string s)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(s));
        return BitConverter.ToInt32(bytes, 0);
    }

    private static Guid GuidFromSeed(int seed)
    {
        var bytes = new byte[16];
        BitConverter.GetBytes(seed).CopyTo(bytes, 0);
        BitConverter.GetBytes(seed * 397).CopyTo(bytes, 4);
        BitConverter.GetBytes(seed ^ 0x9e3779b9).CopyTo(bytes, 8);
        BitConverter.GetBytes(~seed).CopyTo(bytes, 12);
        return new Guid(bytes);
    }

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}

