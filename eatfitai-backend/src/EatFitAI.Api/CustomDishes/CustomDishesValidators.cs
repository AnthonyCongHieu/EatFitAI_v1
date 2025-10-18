using FluentValidation;

namespace EatFitAI.Api.CustomDishes;

public class CreateCustomDishValidator : AbstractValidator<CreateCustomDishRequest>
{
    public CreateCustomDishValidator()
    {
        RuleFor(x => x.Ten).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NangLuongKcalPer100g).GreaterThan(0);
        RuleFor(x => x.ProteinGPer100g).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CarbGPer100g).GreaterThanOrEqualTo(0);
        RuleFor(x => x.FatGPer100g).GreaterThanOrEqualTo(0);
    }
}

public class UpdateCustomDishValidator : AbstractValidator<UpdateCustomDishRequest>
{
    public UpdateCustomDishValidator()
    {
        RuleFor(x => x.Ten).MaximumLength(200);
        RuleFor(x => x.NangLuongKcalPer100g).GreaterThan(0).When(x => x.NangLuongKcalPer100g.HasValue);
        RuleFor(x => x.ProteinGPer100g).GreaterThanOrEqualTo(0).When(x => x.ProteinGPer100g.HasValue);
        RuleFor(x => x.CarbGPer100g).GreaterThanOrEqualTo(0).When(x => x.CarbGPer100g.HasValue);
        RuleFor(x => x.FatGPer100g).GreaterThanOrEqualTo(0).When(x => x.FatGPer100g.HasValue);
    }
}

