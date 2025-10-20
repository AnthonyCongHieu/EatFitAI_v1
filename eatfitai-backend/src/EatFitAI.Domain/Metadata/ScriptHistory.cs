namespace EatFitAI.Domain.Metadata;

public class ScriptHistory
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }
}
