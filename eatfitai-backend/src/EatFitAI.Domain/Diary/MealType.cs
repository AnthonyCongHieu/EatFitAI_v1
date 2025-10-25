namespace EatFitAI.Domain.Diary;

public class MealType
{
    public string MaBuaAn { get; set; } = string.Empty;
    public string TenBuaAn { get; set; } = string.Empty;

    public ICollection<DiaryEntry> DiaryEntries { get; set; } = new List<DiaryEntry>();
}