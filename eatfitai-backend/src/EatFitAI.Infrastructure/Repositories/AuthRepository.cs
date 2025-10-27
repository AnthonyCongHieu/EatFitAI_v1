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

        // Read dynamically to tolerate DB column type differences
        var row = await connection.QueryFirstOrDefaultAsync(sql, new { Email = email });
        if (row is null)
        {
            Console.WriteLine($"FindByEmailAsync: No user found for email {email}");
            return null;
        }

        // Access dynamic members safely
        Guid maNguoiDung = row.MaNguoiDung;
        string rowEmail = row.Email;
        object? mkh = null;
        try { mkh = row.MatKhauHash; } catch { mkh = null; }
        string? hoTen = null; try { hoTen = row.HoTen; } catch { hoTen = null; }
        string? gioiTinh = null; try { gioiTinh = row.GioiTinh; } catch { gioiTinh = null; }
        DateTime? ngaySinh = null; try { ngaySinh = row.NgaySinh; } catch { ngaySinh = null; }
        DateTime ngayTao = row.NgayTao;
        DateTime ngayCapNhat = row.NgayCapNhat;

        byte[] matKhauBytes = mkh switch
        {
            byte[] b => b,
            string s => Encoding.UTF8.GetBytes(s),
            _ => Array.Empty<byte>()
        };

        var user = new NguoiDung
        {
            MaNguoiDung = maNguoiDung,
            Email = rowEmail,
            MatKhauHash = matKhauBytes,
            HoTen = hoTen,
            GioiTinh = gioiTinh,
            NgaySinh = ngaySinh.HasValue ? DateOnly.FromDateTime(ngaySinh.Value) : null,
            NgayTao = ngayTao,
            NgayCapNhat = ngayCapNhat
        };

        Console.WriteLine($"FindByEmailAsync: User {user.Email} found, MatKhauHash type: {user.MatKhauHash?.GetType()?.Name ?? "null"}, length: {user.MatKhauHash?.Length ?? 0}");
        return user;
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
