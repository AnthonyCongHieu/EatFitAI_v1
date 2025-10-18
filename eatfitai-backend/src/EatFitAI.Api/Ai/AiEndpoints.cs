using EatFitAI.Application.AI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.AiEndpoints;

public static class AiEndpoints
{
    public static RouteGroupBuilder MapAi(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/ai").RequireAuthorization();

        g.MapPost("/nutrition/recalculate", async ([FromBody] AiNutritionRecalculateRequest req, IAiNutritionService svc) =>
        {
            if (req.WeightKg <= 0 || req.HeightCm <= 0 || req.Age <= 0)
                return Results.Problem(title: "Dữ liệu không hợp lệ", statusCode: 400);
            var res = await svc.RecalculateAsync(req);
            return Results.Ok(res);
        });

        g.MapPost("/recipes/suggest", async ([FromBody] AiRecipeSuggestRequest req, IAiRecipeService svc) =>
        {
            var res = await svc.SuggestAsync(req);
            return Results.Ok(res);
        });

        g.MapPost("/vision/ingredients", async ([FromBody] AiVisionIngredientsRequest req, IVisionService svc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Image))
                return Results.Problem(title: "Thiếu ảnh (url/base64)", statusCode: 400);
            var res = await svc.RecognizeIngredientsAsync(req);
            return Results.Ok(res);
        });

        return g;
    }
}

