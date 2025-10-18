using EatFitAI.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task EnsureCreatedAndSeedAsync(this EatFitAIDbContext db, CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);

        await SeedLoaiBuaAnAsync(db, ct);
        await SeedMucDoVanDongAsync(db, ct);
        await SeedMucTieuAsync(db, ct);
        await SeedThucPhamAsync(db, ct);

        await CreateViewsAsync(db, ct);
    }

    private static async Task SeedLoaiBuaAnAsync(EatFitAIDbContext db, CancellationToken ct)
    {
        if (await db.LoaiBuaAns.AnyAsync(ct)) return;

        db.LoaiBuaAns.AddRange(new[]
        {
            new LoaiBuaAn { MaBuaAn = "SANG", Ten = "Bữa sáng", ThuTu = 1 },
            new LoaiBuaAn { MaBuaAn = "PHUSANG", Ten = "Bữa phụ sáng", ThuTu = 2 },
            new LoaiBuaAn { MaBuaAn = "TRUA", Ten = "Bữa trưa", ThuTu = 3 },
            new LoaiBuaAn { MaBuaAn = "PHUCHIEU", Ten = "Bữa phụ chiều", ThuTu = 4 },
            new LoaiBuaAn { MaBuaAn = "TOI", Ten = "Bữa tối", ThuTu = 5 },
            new LoaiBuaAn { MaBuaAn = "DEMDIEM", Ten = "Bữa đêm/điểm tâm", ThuTu = 6 },
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedMucDoVanDongAsync(EatFitAIDbContext db, CancellationToken ct)
    {
        if (await db.MucDoVanDongs.AnyAsync(ct)) return;

        db.MucDoVanDongs.AddRange(new[]
        {
            new MucDoVanDong { Ma = "SEDENTARY", Ten = "Ít vận động", HeSoTdee = 1.20m },
            new MucDoVanDong { Ma = "LIGHT", Ten = "Nhẹ", HeSoTdee = 1.375m },
            new MucDoVanDong { Ma = "MODERATE", Ten = "Vừa", HeSoTdee = 1.55m },
            new MucDoVanDong { Ma = "ACTIVE", Ten = "Năng động", HeSoTdee = 1.725m },
            new MucDoVanDong { Ma = "VERY_ACTIVE", Ten = "Rất năng động", HeSoTdee = 1.9m },
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedMucTieuAsync(EatFitAIDbContext db, CancellationToken ct)
    {
        if (await db.MucTieus.AnyAsync(ct)) return;

        db.MucTieus.AddRange(new[]
        {
            new MucTieu { Ma = "GIAM_CAN", Ten = "Giảm cân" },
            new MucTieu { Ma = "GIU_CAN", Ten = "Giữ cân" },
            new MucTieu { Ma = "TANG_CAN", Ten = "Tăng cân" },
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedThucPhamAsync(EatFitAIDbContext db, CancellationToken ct)
    {
        if (await db.ThucPhams.AnyAsync(ct)) return;

        var thucPham = new List<ThucPham>
        {
            // 15 mẫu chuẩn Việt (ước lượng per 100g)
            NewTP("Gạo trắng", 360, 7.0m, 79.0m, 0.6m),
            NewTP("Cơm trắng", 130, 2.4m, 28.2m, 0.3m),
            NewTP("Bún tươi", 110, 1.8m, 24.9m, 0.2m),
            NewTP("Bánh phở", 108, 2.0m, 25.0m, 0.3m),
            NewTP("Bánh mì", 265, 9.0m, 49.0m, 3.2m),
            NewTP("Ức gà", 165, 31.0m, 0m, 3.6m),
            NewTP("Thịt lợn nạc", 242, 27.0m, 0m, 14.0m),
            NewTP("Thịt bò nạc", 250, 26.0m, 0m, 15.0m),
            NewTP("Cá basa", 97, 18.0m, 0m, 2.6m),
            NewTP("Cá hồi", 208, 20.0m, 0m, 13.0m),
            NewTP("Trứng gà", 155, 13.0m, 1.1m, 11.0m),
            NewTP("Đậu phụ", 76, 8.0m, 1.9m, 4.8m),
            NewTP("Sữa tươi", 64, 3.4m, 5.0m, 3.6m),
            NewTP("Rau muống", 30, 2.6m, 5.6m, 0.4m),
            NewTP("Chuối", 89, 1.1m, 23.0m, 0.3m),
        };

        db.ThucPhams.AddRange(thucPham);
        await db.SaveChangesAsync(ct);

        static ThucPham NewTP(string ten, decimal kcal, decimal protein, decimal carb, decimal fat)
            => new()
            {
                Id = Guid.NewGuid(),
                Ten = ten,
                NangLuongKcalPer100g = kcal,
                ProteinGPer100g = protein,
                CarbGPer100g = carb,
                FatGPer100g = fat
            };
    }

    private static async Task CreateViewsAsync(EatFitAIDbContext db, CancellationToken ct)
    {
        // vw_TongHopDinhDuongNgay
        var sqlNgay = @"IF OBJECT_ID('dbo.vw_TongHopDinhDuongNgay', 'V') IS NOT NULL DROP VIEW dbo.vw_TongHopDinhDuongNgay;
CREATE VIEW dbo.vw_TongHopDinhDuongNgay AS
SELECT 
  NguoiDungId,
  NgayAn,
  SUM(NangLuongKcal) AS TongKcal,
  SUM(ProteinG) AS TongProteinG,
  SUM(CarbG) AS TongCarbG,
  SUM(FatG) AS TongFatG
FROM NhatKyAnUong
GROUP BY NguoiDungId, NgayAn;";

        // vw_TongHopDinhDuongTuan
        var sqlTuan = @"IF OBJECT_ID('dbo.vw_TongHopDinhDuongTuan', 'V') IS NOT NULL DROP VIEW dbo.vw_TongHopDinhDuongTuan;
CREATE VIEW dbo.vw_TongHopDinhDuongTuan AS
SELECT 
  NguoiDungId,
  DATEPART(isowk, CAST(NgayAn as date)) AS IsoWeek,
  DATEPART(year, CAST(NgayAn as date)) AS Year,
  MIN(NgayAn) AS TuNgay,
  MAX(NgayAn) AS DenNgay,
  SUM(NangLuongKcal) AS TongKcal,
  SUM(ProteinG) AS TongProteinG,
  SUM(CarbG) AS TongCarbG,
  SUM(FatG) AS TongFatG
FROM NhatKyAnUong
GROUP BY NguoiDungId, DATEPART(isowk, CAST(NgayAn as date)), DATEPART(year, CAST(NgayAn as date));";

        await db.Database.ExecuteSqlRawAsync(sqlNgay, ct);
        await db.Database.ExecuteSqlRawAsync(sqlTuan, ct);
    }
}

