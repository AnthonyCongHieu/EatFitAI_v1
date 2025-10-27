using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Contracts.Summary;

public sealed class DaySummaryResponse
{
    public DateOnly NgayAn { get; init; }
    public decimal TongCalo { get; init; }
    public decimal TongProtein { get; init; }
    public decimal TongCarb { get; init; }
    public decimal TongFat { get; init; }
}

public sealed class WeekSummaryItem
{
    public DateOnly NgayAn { get; init; }
    public decimal TongCalo { get; init; }
    public decimal TongProtein { get; init; }
    public decimal TongCarb { get; init; }
    public decimal TongFat { get; init; }
}

public sealed class WeekSummaryResponse
{
    public DateOnly TuanBatDau { get; init; }
    public DateOnly TuanKetThuc { get; init; }
    public List<WeekSummaryItem> Days { get; init; } = new();
}

