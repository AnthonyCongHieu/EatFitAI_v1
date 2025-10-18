using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Diary;

public record DiaryCreateRequest(
    DateOnly NgayAn,
    string MaBuaAn,
    string Source,
    Guid ItemId,
    decimal SoLuongGram
);

public record DiaryEntryDto(
    Guid Id,
    DateOnly NgayAn,
    string MaBuaAn,
    string Source,
    Guid ItemId,
    decimal SoLuongGram,
    decimal NangLuongKcal,
    decimal ProteinG,
    decimal CarbG,
    decimal FatG
);

