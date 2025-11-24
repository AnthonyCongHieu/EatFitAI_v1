using System.Net;
using System.Net.Mail;
using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly MailSettings _settings;

        public EmailService(IOptions<MailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task SendResetCodeAsync(string email, string code, DateTime expiresAt)
        {
            Console.WriteLine($"[EmailService] Attempting to send email to {email}. Config: Host='{_settings.Host}', User='{_settings.User}', Port={_settings.Port}, SSL={_settings.EnableSsl}");

            if (string.IsNullOrWhiteSpace(_settings.Host) ||
                string.IsNullOrWhiteSpace(_settings.User) ||
                string.IsNullOrWhiteSpace(_settings.Password) ||
                string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                Console.WriteLine("[EmailService] SMTP settings missing (Host, User, Password, or FromEmail is empty), skipping real send.");
                return;
            }

            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(_settings.User, _settings.Password),
                UseDefaultCredentials = false,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            var message = new MailMessage
            {
                From = new MailAddress(_settings.FromEmail, _settings.FromDisplayName),
                Subject = "EatFitAI - Mã đặt lại mật khẩu",
                Body = BuildBody(code, expiresAt),
                IsBodyHtml = false
            };
            message.To.Add(email);

            await client.SendMailAsync(message);
        }

        private string BuildBody(string code, DateTime expiresAt)
        {
            return
$@"Bạn vừa yêu cầu đặt lại mật khẩu EatFitAI.

Mã đặt lại của bạn: {code}
Thời hạn: {expiresAt:yyyy-MM-dd HH:mm:ss} (UTC)

Nếu bạn không yêu cầu, hãy bỏ qua email này.";
        }
    }
}
