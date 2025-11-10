namespace EatFitAI.API.Contracts;

public sealed record NutritionSuggestRequest(
    string Sex,
    int Age,
    double HeightCm,
    double WeightKg,
    double ActivityLevel,
    string Goal
);

public sealed record NutritionSuggestResponse(
    int Calories,
    int Protein,
    int Carb,
    int Fat
);

public sealed record NutritionApplyRequest(
    int Calories,
    int Protein,
    int Carb,
    int Fat,
    DateOnly? EffectiveFrom
);

