using System.Text;
using System.Data;
using Dapper;
using EatFitAI.Application.Data;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;

namespace EatFitAI.Infrastructure.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public AuthRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<NguoiDung?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = "EXEC [dbo].[sp_Auth_DangNhap] @Email";

        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await connection.QueryFirstOrDefaultAsync<NguoiDung>(sql, new { Email = email });

        // Fix: Convert MatKhauHash from string to byte[] if needed
        if (result != null && result.MatKhauHash != null && result.MatKhauHash.GetType() == typeof(string))
        {
            var hashString = (string)(object)result.MatKhauHash;
            result.MatKhauHash = Encoding.UTF8.GetBytes(hashString);
        }

        // Log for debugging
        if (result != null)
        {
            Console.WriteLine($"FindByEmailAsync: User {result.Email} found, MatKhauHash type: {result.MatKhauHash?.GetType()?.Name ?? "null"}, length: {result.MatKhauHash?.Length ?? 0}");
        }
        else
        {
            Console.WriteLine($"FindByEmailAsync: No user found for email {email}");
        }

        return result;
    }
    public async Task<NguoiDung?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        const string sql = "EXEC [dbo].[sp_Auth_LayTheoId] @MaNguoiDung";

        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await connection.QueryFirstOrDefaultAsync<NguoiDung>(sql, new { MaNguoiDung = userId });

        return result;
    }

    public async Task<NguoiDung> CreateUserAsync(string email, byte[] passwordHash, string? hoTen, CancellationToken cancellationToken = default)
    {
        const string sql = "EXEC [dbo].[sp_Auth_DangKy] @Email, @MatKhauHash, @HoTen";

        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await connection.QueryFirstAsync<NguoiDung>(sql, new
        {
            Email = email,
            MatKhauHash = passwordHash,
            HoTen = hoTen
        });

        return result;
    }
}
