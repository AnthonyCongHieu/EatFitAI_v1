using FluentValidation;

namespace EatFitAI.Api.Profile;

public class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.HoTen).MaximumLength(200);
        RuleFor(x => x.GioiTinh).Must(g => string.IsNullOrWhiteSpace(g) || g is "Nam" or "Nu" or "Khac")
            .WithMessage("GioiTinh phải là Nam/Nu/Khac hoặc để trống");
    }
}

public class BodyMetricsValidator : AbstractValidator<BodyMetricsRequest>
{
    public BodyMetricsValidator()
    {
        RuleFor(x => x.CanNangKg).GreaterThan(0).When(x => x.CanNangKg.HasValue);
        RuleFor(x => x.ChieuCaoCm).GreaterThan(0).When(x => x.ChieuCaoCm.HasValue);
        RuleFor(x => x.VongEoCm).GreaterThanOrEqualTo(0).When(x => x.VongEoCm.HasValue);
        RuleFor(x => x.VongHongCm).GreaterThanOrEqualTo(0).When(x => x.VongHongCm.HasValue);
        RuleFor(x => x.MucDoVanDongMa).MaximumLength(50);
        RuleFor(x => x.MucTieuMa).MaximumLength(50);
    }
}

public class CreateNutritionTargetValidator : AbstractValidator<CreateNutritionTargetRequest>
{
    public CreateNutritionTargetValidator()
    {
        RuleFor(x => x.Nguon).NotEmpty().Must(n => n is "USER" or "AI");
        RuleFor(x => x.HieuLucTuNgay).NotEmpty();
        RuleFor(x => x.NangLuongKcal).GreaterThan(0);
        RuleFor(x => x.ProteinG).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CarbG).GreaterThanOrEqualTo(0);
        RuleFor(x => x.FatG).GreaterThanOrEqualTo(0);
    }
}

