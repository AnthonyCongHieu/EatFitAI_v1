using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.CustomDishes;

public record CustomDishDto(Guid Id, string Ten, string? MoTa,
    decimal NangLuongKcalPer100g,
    decimal ProteinGPer100g,
    decimal CarbGPer100g,
    decimal FatGPer100g);

public record CreateCustomDishRequest(
    [Required] string Ten,
    string? MoTa,
    decimal NangLuongKcalPer100g,
    decimal ProteinGPer100g,
    decimal CarbGPer100g,
    decimal FatGPer100g
);

public record UpdateCustomDishRequest(
    string? Ten,
    string? MoTa,
    decimal? NangLuongKcalPer100g,
    decimal? ProteinGPer100g,
    decimal? CarbGPer100g,
    decimal? FatGPer100g
);

