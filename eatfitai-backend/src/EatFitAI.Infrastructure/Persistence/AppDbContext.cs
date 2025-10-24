using EatFitAI.Domain.Ai;
using EatFitAI.Domain.Auth;
using EatFitAI.Domain.Diary;
using EatFitAI.Domain.Foods;
using EatFitAI.Domain.Metadata;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EatFitAI.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<NguoiDung, IdentityRole<Guid>, Guid>
{
    private static readonly ValueConverter<DateOnly, DateTime> DateOnlyConverter = new(
        dateOnly => dateOnly.ToDateTime(TimeOnly.MinValue),
        dateTime => DateOnly.FromDateTime(dateTime));

    private static readonly ValueConverter<DateOnly?, DateTime?> NullableDateOnlyConverter = new(
        dateOnly => dateOnly.HasValue ? dateOnly.Value.ToDateTime(TimeOnly.MinValue) : null,
        dateTime => dateTime.HasValue ? DateOnly.FromDateTime(dateTime.Value) : null);

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<BodyMetric> BodyMetrics => Set<BodyMetric>();
    public DbSet<NutritionTarget> NutritionTargets => Set<NutritionTarget>();
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<CustomDish> CustomDishes => Set<CustomDish>();
    public DbSet<CustomDishIngredient> CustomDishIngredients => Set<CustomDishIngredient>();
    public DbSet<DiaryEntry> DiaryEntries => Set<DiaryEntry>();
    public DbSet<AiRecipe> AiRecipes => Set<AiRecipe>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ScriptHistory> ScriptHistory => Set<ScriptHistory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<NguoiDung>(entity =>
        {
            entity.ToTable("NguoiDung");
            entity.Property(u => u.Id).HasColumnName("MaNguoiDung");
            entity.Property(u => u.FullName).HasColumnName("HoTen");
            entity.Property(u => u.Gender).HasColumnName("GioiTinh");
            entity.Property(u => u.DateOfBirth).HasColumnName("NgaySinh");
            entity.Property(u => u.CreatedAt).HasColumnName("NgayTao");
            entity.Property(u => u.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.Property(u => u.UserName).HasColumnName("TenDangNhap");
            entity.Property(u => u.NormalizedUserName).HasColumnName("TenDangNhapChuanHoa");
            entity.Property(u => u.Email).HasColumnName("Email");
            entity.Property(u => u.NormalizedEmail).HasColumnName("EmailChuanHoa");
            entity.Property(u => u.EmailConfirmed).HasColumnName("EmailXacNhan");
            entity.Property(u => u.PasswordHash).HasColumnName("MatKhauHash");
            entity.Property(u => u.SecurityStamp).HasColumnName("DauAnToan");
            entity.Property(u => u.ConcurrencyStamp).HasColumnName("DauDongBo");
            entity.Property(u => u.PhoneNumber).HasColumnName("SoDienThoai");
            entity.Property(u => u.PhoneNumberConfirmed).HasColumnName("SoDienThoaiXacNhan");
            entity.Property(u => u.TwoFactorEnabled).HasColumnName("KichHoatHaiYeuTo");
            entity.Property(u => u.LockoutEnd).HasColumnName("KetThucKhoa");
            entity.Property(u => u.LockoutEnabled).HasColumnName("KichHoatKhoa");
            entity.Property(u => u.AccessFailedCount).HasColumnName("SoLanDangNhapThatBai");
            entity.HasIndex(u => u.NormalizedEmail).IsUnique();
        });

        builder.Entity<IdentityRole<Guid>>().ToTable("VaiTro").Property(r => r.Id).HasColumnName("MaVaiTro");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("NguoiDungVaiTro").Property(ur => ur.UserId).HasColumnName("MaNguoiDung");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("NguoiDungClaim").Property(uc => uc.Id).HasColumnName("MaClaim");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("NguoiDungLogin");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("VaiTroClaim").Property(rc => rc.Id).HasColumnName("MaClaim");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("NguoiDungToken");

        builder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("HoSoNguoiDung");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.FullName).HasColumnName("HoTen");
            entity.Property(x => x.Gender).HasColumnName("GioiTinh");
            entity.Property(x => x.DateOfBirth).HasColumnName("NgaySinh").HasConversion(NullableDateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.HeightCm).HasColumnName("ChieuCaoCm").HasColumnType("decimal(9,2)");
            entity.Property(x => x.TargetWeightKg).HasColumnName("CanNangMucTieuKg").HasColumnType("decimal(9,2)");
            entity.Property(x => x.ActivityLevel).HasColumnName("MucDoHoatDong");
            entity.Property(x => x.Goal).HasColumnName("MucTieu");
            entity.Property(x => x.AvatarUrl).HasColumnName("AnhDaiDienUrl");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.HasOne(x => x.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<UserProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<BodyMetric>(entity =>
        {
            entity.ToTable("ChiSoCoThe");
            entity.Property(x => x.Id).HasColumnName("MaChiSo");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.RecordedAt).HasColumnName("NgayCapNhat");
            entity.Property(x => x.WeightKg).HasColumnName("CanNangKg").HasColumnType("decimal(9,2)");
            entity.Property(x => x.BodyFatPercent).HasColumnName("TiLeMoCoThe").HasColumnType("decimal(9,2)");
            entity.Property(x => x.MuscleMassKg).HasColumnName("KhoiLuongCoKg").HasColumnType("decimal(9,2)");
            entity.Property(x => x.WaistCm).HasColumnName("VongEoCm").HasColumnType("decimal(9,2)");
            entity.Property(x => x.HipCm).HasColumnName("VongMongCm").HasColumnType("decimal(9,2)");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => new { x.UserId, x.RecordedAt });
            entity.HasOne(x => x.User)
                .WithMany(u => u.BodyMetrics)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<NutritionTarget>(entity =>
        {
            entity.ToTable("MucTieuDinhDuong");
            entity.Property(x => x.Id).HasColumnName("MaMucTieuDD");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.EffectiveDate).HasColumnName("HieuLucTuNgay").HasConversion(DateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.CaloriesKcal).HasColumnName("CaloKcal");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            entity.Property(x => x.ProteinGrams).HasColumnName("ProteinG");
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            entity.Property(x => x.CarbohydrateGrams).HasColumnName("CarbG");
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            entity.Property(x => x.FatGrams).HasColumnName("FatG");
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.IsActive).HasColumnName("LaHoatDong");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.HasIndex(x => new { x.UserId, x.IsActive });
            entity.HasOne(x => x.User)
                .WithMany(u => u.NutritionTargets)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Food>(entity =>
        {
            entity.ToTable("ThucPham");
            entity.Property(x => x.Id).HasColumnName("MaThucPham");
            entity.Property(x => x.Name).HasColumnName("TenThucPham");
            entity.Property(x => x.Description).HasColumnName("MoTaKhauPhan");
            entity.Property(x => x.Brand).HasColumnName("ThuongHieu");
            entity.Property(x => x.Category).HasColumnName("PhanLoai");
            entity.Property(x => x.ServingSizeGrams).HasColumnName("KhoiLuongPhucVuGram").HasColumnType("decimal(9,2)");
            entity.Property(x => x.CaloriesKcal).HasColumnName("Calo100g");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            entity.Property(x => x.ProteinGrams).HasColumnName("Protein100g");
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            entity.Property(x => x.CarbohydrateGrams).HasColumnName("Carb100g");
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            entity.Property(x => x.FatGrams).HasColumnName("Fat100g");
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.IsCustom).HasColumnName("LaTuDinhNghia");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.HasIndex(x => x.Name);
        });

        builder.Entity<CustomDish>(entity =>
        {
            entity.ToTable("MonNguoiDung");
            entity.Property(x => x.Id).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.Name).HasColumnName("TenMon");
            entity.Property(x => x.Description).HasColumnName("MoTa");
            entity.Property(x => x.PortionSizeGrams).HasColumnName("KhoiLuongPhucVuGram").HasColumnType("decimal(9,2)");
            entity.Property(x => x.CaloriesKcal).HasColumnName("Calo100g");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            entity.Property(x => x.ProteinGrams).HasColumnName("Protein100g");
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            entity.Property(x => x.CarbohydrateGrams).HasColumnName("Carb100g");
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            entity.Property(x => x.FatGrams).HasColumnName("Fat100g");
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.HasOne(x => x.User)
                .WithMany(u => u.CustomDishes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CustomDishIngredient>(entity =>
        {
            entity.ToTable("NguyenLieuMonNguoiDung");
            entity.Property(x => x.Id).HasColumnName("MaNguyenLieu");
            entity.Property(x => x.CustomDishId).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.FoodId).HasColumnName("MaThucPham");
            entity.Property(x => x.Name).HasColumnName("TenNguyenLieu");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.QuantityGrams).HasColumnName("KhoiLuongGram").HasColumnType("decimal(9,2)");
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.Ingredients)
                .HasForeignKey(x => x.CustomDishId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.CustomDishIngredients)
                .HasForeignKey(x => x.FoodId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AiRecipe>(entity =>
        {
            entity.ToTable("NhatKyAI");
            entity.Property(x => x.Id).HasColumnName("MaGoiYAI");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.Title).HasColumnName("TenGoiY");
            entity.Property(x => x.Summary).HasColumnName("TomTat");
            entity.Property(x => x.IngredientsJson).HasColumnName("NguyenLieuJson");
            entity.Property(x => x.StepsJson).HasColumnName("BuocCheBienJson");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasColumnName("ThoiGianTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.AiRecipes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DiaryEntry>(entity =>
        {
            entity.ToTable("NhatKyAnUong", table =>
            {
                table.HasCheckConstraint("CK_NK_ChiMotNguon",
                    "(CASE WHEN [MaThucPham] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaMonNguoiDung] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaCongThucAI] IS NOT NULL THEN 1 ELSE 0 END) = 1");
            });
            entity.Property(x => x.Id).HasColumnName("MaNhatKy");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.MealDate).HasColumnName("NgayAn").HasConversion(DateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.MealCode).HasColumnName("MaBuaAn").HasMaxLength(32);
            entity.Property(x => x.FoodId).HasColumnName("MaThucPham");
            entity.Property(x => x.CustomDishId).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.AiRecipeId).HasColumnName("MaCongThucAI");
            entity.Property(x => x.ItemId).HasColumnName("MaMuc");
            entity.Property(x => x.Source).HasColumnName("Nguon").HasMaxLength(32);
            entity.Property(x => x.QuantityGrams).HasColumnName("KhoiLuongGram").HasColumnType("decimal(9,2)");
            entity.Property(x => x.CaloriesKcal).HasColumnName("Calo");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            entity.Property(x => x.ProteinGrams).HasColumnName("Protein");
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            entity.Property(x => x.CarbohydrateGrams).HasColumnName("Carb");
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            entity.Property(x => x.FatGrams).HasColumnName("Fat");
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.Notes).HasColumnName("GhiChu");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            entity.HasIndex(x => new { x.UserId, x.MealDate, x.MealCode, x.ItemId, x.Source }).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(u => u.DiaryEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.DiaryEntries)
                .HasForeignKey(x => x.FoodId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.DiaryEntries)
                .HasForeignKey(x => x.CustomDishId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.AiRecipe)
                .WithMany(r => r.DiaryEntries)
                .HasForeignKey(x => x.AiRecipeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshToken");
            entity.Property(x => x.Id).HasColumnName("MaRefreshToken");
            entity.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            entity.Property(x => x.Token).HasColumnName("Token");
            entity.Property(x => x.CreatedAt).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.ExpiresAt).HasColumnName("HetHanVao");
            entity.Property(x => x.RevokedAt).HasColumnName("ThuHoiVao");
            entity.Property(x => x.ReplacedByToken).HasColumnName("ThayTheBangToken");
            entity.Property(x => x.CreatedByIp).HasColumnName("TaoBoiIP");
            entity.Property(x => x.RevokedByIp).HasColumnName("ThuHoiBoiIP");
            entity.Property(x => x.ReasonRevoked).HasColumnName("LyDoThuHoi");
            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ScriptHistory>(entity =>
        {
            entity.ToTable("LichSuCapNhat");
            entity.Property(x => x.Id).HasColumnName("MaLichSu");
            entity.Property(x => x.FileName).HasColumnName("TenFile").HasMaxLength(260);
            entity.Property(x => x.AppliedAt).HasColumnName("ThoiGianApDung").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => x.FileName).IsUnique();
        });
    }

    private static void ConfigureMacroColumns(PropertyBuilder<decimal> propertyBuilder, bool isKcal = false)
    {
        var columnType = isKcal ? "decimal(10,2)" : "decimal(9,2)";
        propertyBuilder.HasColumnType(columnType);
    }
}
