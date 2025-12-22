namespace EatFitAI.API.DTOs.Auth
{
    /// <summary>
    /// Request để đổi mật khẩu cho user đã đăng nhập
    /// </summary>
    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
