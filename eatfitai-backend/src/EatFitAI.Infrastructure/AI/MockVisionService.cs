using System.Security.Cryptography;
using System.Text;
using EatFitAI.Application.AI;
using EatFitAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.AI;

public class MockVisionService : IVisionService
{
    private readonly EatFitAIDbContext _db;
    public MockVisionService(EatFitAIDbContext db) => _db = db;

    public async Task<IReadOnlyList<AiVisionIngredient>> RecognizeIngredientsAsync(AiVisionIngredientsRequest request, CancellationToken ct = default)
    {
        var list = await _db.ThucPhams.AsNoTracking().OrderBy(t => t.Ten).ToListAsync(ct);
        if (list.Count == 0) return Array.Empty<AiVisionIngredient>();
        var maxItems = Math.Clamp(request.MaxItems <= 0 ? 5 : request.MaxItems, 1, 10);
        var seed = ComputeSeed(request.Image ?? string.Empty);
        var rnd = new Random(seed);
        var results = new List<AiVisionIngredient>(maxItems);
        for (int i = 0; i < maxItems; i++)
        {
            var tp = list[rnd.Next(list.Count)];
            var conf = 0.8m - (i * 0.05m);
            results.Add(new AiVisionIngredient(tp.Id, tp.Ten, conf));
        }
        return results;
    }

    private static int ComputeSeed(string s)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(s));
        return BitConverter.ToInt32(bytes, 0);
    }
}

