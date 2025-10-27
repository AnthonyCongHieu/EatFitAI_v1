using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Contracts.CustomDishes;

public class CustomDishResponse
{
    public long MaMonNguoiDung { get; init; }
    public string TenMon { get; init; } = string.Empty;
    public string? GhiChu { get; init; }
    public decimal Calo100g { get; init; }
    public decimal Protein100g { get; init; }
    public decimal Carb100g { get; init; }
    public decimal Fat100g { get; init; }
    public DateTime NgayTao { get; init; }
}

public sealed class CustomDishDetailResponse : CustomDishResponse
{
    public List<CustomDishIngredientResponse> NguyenLieu { get; init; } = new();
}

public sealed class CustomDishIngredientResponse
{
    public long MaNguyenLieu { get; init; }
    public long? MaThucPham { get; init; }
    public string Ten { get; init; } = string.Empty;
    public decimal KhoiLuongGram { get; init; }
    public decimal Calo { get; init; }
    public decimal Protein { get; init; }
    public decimal Carb { get; init; }
    public decimal Fat { get; init; }
}
