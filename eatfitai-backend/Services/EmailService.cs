using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EatFitAI.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly MailSettings _settings;
        private readonly IHostEnvironment _environment;

        public EmailService(IOptions<MailSettings> options, IHostEnvironment environment)
        {
            _settings = options.Value;
            _environment = environment;
        }

        public async Task SendResetCodeAsync(string email, string code, DateTime expiresAt)
        {
            Console.WriteLine($"[EmailService] Attempting to send email to {email}. Config: Host='{_settings.Host}', User='{_settings.User}', Port={_settings.Port}, SSL={_settings.EnableSsl}");

            if (string.IsNullOrWhiteSpace(_settings.Host) ||
                string.IsNullOrWhiteSpace(_settings.User) ||
                string.IsNullOrWhiteSpace(_settings.Password) ||
                string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                const string message = "[EmailService] SMTP settings missing (Host, User, Password, or FromEmail is empty).";
                if (_environment.IsProduction())
                {
                    Console.WriteLine(message + " Rejecting send in Production.");
                    throw new InvalidOperationException("SMTP is not configured.");
                }

                Console.WriteLine(message + " Skipping real send in Development.");
                return;
            }

            try
            {
                // Remove any spaces from password (common issue with app passwords)
                var cleanPassword = _settings.Password.Replace(" ", "");
                Console.WriteLine($"[EmailService] Password length: {cleanPassword.Length} characters");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_settings.FromDisplayName, _settings.FromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "EatFitAI - Mã đặt lại mật khẩu";
                message.Body = new TextPart("plain")
                {
                    Text = BuildBody(code, expiresAt)
                };

                using var client = new SmtpClient();
                
                Console.WriteLine($"[EmailService] Connecting to SMTP server...");
                await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls);
                
                Console.WriteLine($"[EmailService] Authenticating...");
                await client.AuthenticateAsync(_settings.User, cleanPassword);
                
                Console.WriteLine($"[EmailService] Sending email...");
                await client.SendAsync(message);
                
                Console.WriteLine($"[EmailService] Disconnecting...");
                await client.DisconnectAsync(true);
                
                Console.WriteLine($"[EmailService] Email sent successfully to {email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] FAILED to send email: {ex.GetType().Name}");
                Console.WriteLine($"[EmailService] Error message: {ex.Message}");
                Console.WriteLine($"[EmailService] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[EmailService] Inner exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        private string BuildBody(string code, DateTime expiresAt)
        {
            return
$@"Bạn vừa yêu cầu đặt lại mật khẩu EatFitAI.

Mã đặt lại của bạn: {code}
Thời hạn: {expiresAt:yyyy-MM-dd HH:mm:ss} (UTC)

Nếu bạn không yêu cầu, hãy bỏ qua email này.";
        }

        /// <summary>
        /// Gửi mã xác minh email khi đăng ký
        /// </summary>
        public async Task SendVerificationCodeAsync(string email, string code, DateTime expiresAt)
        {
            Console.WriteLine($"[EmailService] Sending verification code to {email}");

            if (string.IsNullOrWhiteSpace(_settings.Host) ||
                string.IsNullOrWhiteSpace(_settings.User) ||
                string.IsNullOrWhiteSpace(_settings.Password) ||
                string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                const string message = "[EmailService] SMTP settings missing.";
                if (_environment.IsProduction())
                {
                    Console.WriteLine(message + " Rejecting send in Production.");
                    throw new InvalidOperationException("SMTP is not configured.");
                }

                Console.WriteLine(message + " Skipping real send in Development.");
                return;
            }

            try
            {
                var cleanPassword = _settings.Password.Replace(" ", "");
                
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_settings.FromDisplayName, _settings.FromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "EatFitAI - Mã xác minh email";
                message.Body = new TextPart("plain")
                {
                    Text = BuildVerificationBody(code, expiresAt)
                };

                using var client = new SmtpClient();
                await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_settings.User, cleanPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                Console.WriteLine($"[EmailService] Verification code sent to {email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] FAILED to send verification email: {ex.Message}");
                throw;
            }
        }

        private string BuildVerificationBody(string code, DateTime expiresAt)
        {
            return
$@"Chào mừng bạn đến với EatFitAI! 🥗

Mã xác minh email của bạn: {code}
Thời hạn: {expiresAt:yyyy-MM-dd HH:mm:ss} (UTC)

Nhập mã này vào ứng dụng để hoàn tất đăng ký.

Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.";
        }
    }
}

