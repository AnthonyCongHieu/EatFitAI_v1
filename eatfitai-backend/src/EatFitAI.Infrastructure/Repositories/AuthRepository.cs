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
