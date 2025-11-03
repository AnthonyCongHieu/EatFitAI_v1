using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;

        public AuthService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            Console.WriteLine($"[AuthService] Starting registration for email: {request.Email}");

            try
            {
                // Check if email already exists
                Console.WriteLine($"[AuthService] Checking if email exists: {request.Email}");
                if (await _userRepository.EmailExistsAsync(request.Email))
                {
                    Console.WriteLine($"[AuthService] Email already exists: {request.Email}");
                    throw new InvalidOperationException("Email already exists");
                }
                Console.WriteLine($"[AuthService] Email check passed for: {request.Email}");

                // Create new user
                var user = new User
                {
                    UserId = Guid.NewGuid(),
                    Email = request.Email,
                    PasswordHash = HashPassword(request.Password),
                    DisplayName = request.DisplayName,
                    CreatedAt = DateTime.UtcNow
                };

                Console.WriteLine($"[AuthService] Creating user with ID: {user.UserId}");
                await _userRepository.AddAsync(user);
                Console.WriteLine($"[AuthService] User added to repository");

                Console.WriteLine($"[AuthService] Saving changes to database");
                await _context.SaveChangesAsync();
                Console.WriteLine($"[AuthService] User saved to database");

                // Generate JWT token
                Console.WriteLine($"[AuthService] Generating JWT token");
                var token = GenerateJwtToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hours
                Console.WriteLine($"[AuthService] JWT token generated: {token?.Substring(0, Math.Min(20, token.Length))}...");

                // Generate refresh token
                var refreshToken = GenerateRefreshToken();
                var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30); // 30 days
                Console.WriteLine($"[AuthService] Refresh token generated: {refreshToken?.Substring(0, Math.Min(20, refreshToken.Length))}...");

                var response = new AuthResponse
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    DisplayName = user.DisplayName ?? string.Empty,
                    Token = token,
                    ExpiresAt = expiresAt,
                    RefreshToken = refreshToken,
                    RefreshTokenExpiresAt = refreshTokenExpiresAt
                };

                Console.WriteLine($"[AuthService] AuthResponse created: UserId={response.UserId}, Email={response.Email}, DisplayName={response.DisplayName}, Token present={!string.IsNullOrEmpty(response.Token)}, ExpiresAt={response.ExpiresAt}, RefreshToken present={!string.IsNullOrEmpty(response.RefreshToken)}, RefreshTokenExpiresAt={response.RefreshTokenExpiresAt}");

                Console.WriteLine($"[AuthService] Registration completed successfully for email: {request.Email}");
                return response;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Error during registration for email: {request.Email}, Exception: {ex.Message}, StackTrace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hours

            // Generate refresh token
            var refreshToken = GenerateRefreshToken();
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30); // 30 days

            return new AuthResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                DisplayName = user.DisplayName ?? string.Empty,
                Token = token,
                ExpiresAt = expiresAt,
                RefreshToken = refreshToken,
                RefreshTokenExpiresAt = refreshTokenExpiresAt
            };
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<Guid?> GetUserIdFromTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadToken(token) as JwtSecurityToken;

                var userIdClaim = jwtToken?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return userId;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email)
                }),
                Expires = DateTime.UtcNow.AddHours(24),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private bool VerifyPassword(string password, string? hashedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword))
                return false;

            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hashedInput = Convert.ToBase64String(hashedBytes);

            return hashedInput == hashedPassword;
        }

        public async Task LogoutAsync(string refreshToken)
        {
            // In a real implementation, you would invalidate the refresh token
            // For now, we'll just return as logout is typically handled client-side
            // by discarding the tokens
            await Task.CompletedTask;
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            // Placeholder implementation for refresh token functionality
            // In a real implementation, you would:
            // 1. Validate the refresh token against stored tokens
            // 2. Check if the token is expired
            // 3. Generate new JWT and refresh tokens
            // 4. Update stored refresh token

            // For now, return a basic response indicating the functionality is not fully implemented
            // This prevents exceptions while maintaining API contract

            // TODO: Implement proper refresh token storage and validation
            // This would typically involve:
            // - A RefreshToken entity/model
            // - Database storage of refresh tokens with expiration
            // - Token validation logic
            // - Secure token generation and storage

            throw new NotImplementedException("Refresh token functionality is not yet fully implemented. Requires token storage infrastructure.");
        }

        public async Task<AuthResponse> GoogleLoginAsync(string idToken)
        {
            // In a real implementation, you would validate the Google ID token
            // and create/login the user. For now, we'll throw an exception
            // as this requires Google OAuth integration
            throw new NotImplementedException("Google login functionality requires OAuth integration");
        }
    }
}
