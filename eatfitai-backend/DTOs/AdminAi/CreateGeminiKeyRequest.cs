using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.AdminAi;

public class CreateGeminiKeyRequest
{
    [Required(ErrorMessage = "Tên Key là bắt buộc")]
    [MaxLength(100, ErrorMessage = "Tên Key không được vượt quá {1} ký tự")]
    public string KeyName { get; set; } = string.Empty;

    [Required(ErrorMessage = "API Key là bắt buộc")]
    public string ApiKey { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
