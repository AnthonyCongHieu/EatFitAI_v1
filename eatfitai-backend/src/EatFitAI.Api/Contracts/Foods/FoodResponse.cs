using System;

namespace EatFitAI.Api.Contracts.Foods;

public sealed class FoodResponse
{
    public long MaThucPham { get; init; }
    public string TenThucPham { get; init; } = string.Empty;
    public string? NhomThucPham { get; init; }
    public string? MoTaKhauPhan { get; init; }
    public decimal Calo100g { get; init; }
    public decimal Protein100g { get; init; }
    public decimal Carb100g { get; init; }
    public decimal Fat100g { get; init; }
    public string? HinhAnh { get; init; }
    public bool TrangThai { get; init; }
}

public sealed class PaginatedFoodResponse
{
    public IEnumerable<FoodResponse> Items { get; init; } = Array.Empty<FoodResponse>();
    public int TotalCount { get; init; }
    public int Offset { get; init; }
    public int Limit { get; init; }
}

