using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.AdminAi;

public class UpdateGeminiKeyRequest
{
    [Required(ErrorMessage = "Tên Key là bắt buộc")]
    [MaxLength(100, ErrorMessage = "Tên Key không được vượt quá {1} ký tự")]
    public string KeyName { get; set; } = string.Empty;

    // Optional: Nếu có truyền giá trị mới thì cập nhật, không thì giữ nguyên key cũ đã mã hóa
    public string? ApiKey { get; set; }

    public bool IsActive { get; set; }
}
