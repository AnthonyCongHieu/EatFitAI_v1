using EatFitAI.Domain.Ai;
using EatFitAI.Domain.Auth;
using EatFitAI.Domain.Diary;
using EatFitAI.Domain.Foods;
using EatFitAI.Domain.Metadata;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EatFitAI.Infrastructure.Persistence;

public class AppDbContext : DbContext
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

    public DbSet<NguoiDung> NguoiDung => Set<NguoiDung>();
    public DbSet<UserProfile> HoSoNguoiDung => Set<UserProfile>();
    public DbSet<BodyMetric> ChiSoCoThe => Set<BodyMetric>();
    public DbSet<NutritionTarget> MucTieuDinhDuong => Set<NutritionTarget>();
    public DbSet<Food> ThucPham => Set<Food>();
    public DbSet<CustomDish> MonNguoiDung => Set<CustomDish>();
    public DbSet<CustomDishIngredient> NguyenLieuMonNguoiDung => Set<CustomDishIngredient>();
    public DbSet<DiaryEntry> NhatKyAnUong => Set<DiaryEntry>();
    public DbSet<Recipe> CongThuc => Set<Recipe>();
    public DbSet<RefreshToken> RefreshToken => Set<RefreshToken>();
    public DbSet<MealType> LoaiBuaAn => Set<MealType>();
    public DbSet<ActivityLevel> MucDoVanDong => Set<ActivityLevel>();
    public DbSet<Goal> MucTieu => Set<Goal>();
    public DbSet<RecipeIngredient> NguyenLieuCongThuc => Set<RecipeIngredient>();
    public DbSet<AiRecipe> NhatKyAI => Set<AiRecipe>();
    public DbSet<ImageRecognition> NhanDienAnh => Set<ImageRecognition>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<NguoiDung>(entity =>
        {
            entity.ToTable("NguoiDung");
            entity.HasKey(u => u.MaNguoiDung);
            entity.Property(u => u.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(u => u.Email).HasColumnName("Email");
            entity.Property(u => u.MatKhauHash).HasColumnName("MatKhauHash");
            entity.Property(u => u.HoTen).HasColumnName("HoTen");
            entity.Property(u => u.GioiTinh).HasColumnName("GioiTinh");
            entity.Property(u => u.NgaySinh).HasColumnName("NgaySinh").HasConversion(NullableDateOnlyConverter).HasColumnType("date");
            entity.Property(u => u.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(u => u.NgayCapNhat).HasColumnName("NgayCapNhat").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(u => u.Email).IsUnique();
        });

        builder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("HoSoNguoiDung");
            entity.HasKey(x => x.MaNguoiDung);
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.MucDoVanDong).HasColumnName("MucDoVanDong");
            entity.Property(x => x.AnhDaiDienUrl).HasColumnName("AnhDaiDienUrl");
            entity.Property(x => x.NgaySinh).HasColumnName("NgaySinh").HasConversion(NullableDateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.HoTen).HasColumnName("HoTen");
            entity.Property(x => x.GioiTinh).HasColumnName("GioiTinh");
            entity.Property(x => x.MucTieu).HasColumnName("MucTieu");
            entity.Property(x => x.ChieuCaoCm).HasColumnName("ChieuCaoCm").HasColumnType("decimal(9,2)");
            entity.Property(x => x.CanNangMucTieuKg).HasColumnName("CanNangMucTieuKg").HasColumnType("decimal(9,2)");
            entity.Property(x => x.NgayCapNhat).HasColumnName("NgayCapNhat");
            entity.Property(x => x.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<UserProfile>(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<BodyMetric>(entity =>
        {
            entity.ToTable("ChiSoCoThe");
            entity.HasKey(x => x.MaChiSo);
            entity.Property(x => x.MaChiSo).HasColumnName("MaChiSo");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.CanNangKg).HasColumnName("CanNangKg").HasColumnType("decimal(6,2)");
            entity.Property(x => x.PhanTramMoCoThe).HasColumnName("PhanTramMoCoThe").HasColumnType("decimal(5,2)");
            entity.Property(x => x.KhoiLuongCoKg).HasColumnName("KhoiLuongCoKg").HasColumnType("decimal(6,2)");
            entity.Property(x => x.VongEoCm).HasColumnName("VongEoCm").HasColumnType("decimal(6,2)");
            entity.Property(x => x.VongMongCm).HasColumnName("VongMongCm").HasColumnType("decimal(6,2)");
            entity.Property(x => x.NgayCapNhat).HasColumnName("NgayCapNhat");
            entity.Property(x => x.GhiChu).HasColumnName("GhiChu");
            entity.HasIndex(x => new { x.MaNguoiDung, x.NgayCapNhat });
            entity.HasOne(x => x.User)
                .WithMany(u => u.BodyMetrics)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<NutritionTarget>(entity =>
        {
            entity.ToTable("MucTieuDinhDuong");
            entity.HasKey(x => x.MaMucTieuDD);
            entity.Property(x => x.MaMucTieuDD).HasColumnName("MaMucTieuDD");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.HieuLucTuNgay).HasColumnName("HieuLucTuNgay").HasConversion(DateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.CaloKcal).HasColumnName("CaloKcal").HasColumnType("int");
            entity.Property(x => x.ProteinG).HasColumnName("ProteinG");
            ConfigureMacroColumns(entity.Property(x => x.ProteinG));
            entity.Property(x => x.CarbG).HasColumnName("CarbG");
            ConfigureMacroColumns(entity.Property(x => x.CarbG));
            entity.Property(x => x.FatG).HasColumnName("FatG");
            ConfigureMacroColumns(entity.Property(x => x.FatG));
            entity.Property(x => x.Nguon).HasColumnName("Nguon");
            entity.Property(x => x.LyDo).HasColumnName("LyDo");
            entity.Property(x => x.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.NutritionTargets)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Food>(entity =>
        {
            entity.ToTable("ThucPham");
            entity.HasKey(x => x.MaThucPham);
            entity.Property(x => x.MaThucPham).HasColumnName("MaThucPham");
            entity.Property(x => x.TenThucPham).HasColumnName("TenThucPham");
            entity.Property(x => x.NhomThucPham).HasColumnName("NhomThucPham");
            entity.Property(x => x.MoTaKhauPhan).HasColumnName("MoTaKhauPhan");
            entity.Property(x => x.Calo100g).HasColumnName("Calo100g");
            ConfigureMacroColumns(entity.Property(x => x.Calo100g), isKcal: true);
            entity.Property(x => x.Protein100g).HasColumnName("Protein100g");
            ConfigureMacroColumns(entity.Property(x => x.Protein100g));
            entity.Property(x => x.Carb100g).HasColumnName("Carb100g");
            ConfigureMacroColumns(entity.Property(x => x.Carb100g));
            entity.Property(x => x.Fat100g).HasColumnName("Fat100g");
            ConfigureMacroColumns(entity.Property(x => x.Fat100g));
            entity.Property(x => x.HinhAnh).HasColumnName("HinhAnh");
            entity.Property(x => x.TrangThai).HasColumnName("TrangThai");
            entity.HasIndex(x => x.TenThucPham);
        });

        builder.Entity<CustomDish>(entity =>
        {
            entity.ToTable("MonNguoiDung");
            entity.HasKey(x => x.MaMonNguoiDung);
            entity.Property(x => x.MaMonNguoiDung).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.TenMon).HasColumnName("TenMon");
            entity.Property(x => x.Calo100g).HasColumnName("Calo100g");
            ConfigureMacroColumns(entity.Property(x => x.Calo100g), isKcal: true);
            entity.Property(x => x.Protein100g).HasColumnName("Protein100g");
            ConfigureMacroColumns(entity.Property(x => x.Protein100g));
            entity.Property(x => x.Carb100g).HasColumnName("Carb100g");
            ConfigureMacroColumns(entity.Property(x => x.Carb100g));
            entity.Property(x => x.Fat100g).HasColumnName("Fat100g");
            ConfigureMacroColumns(entity.Property(x => x.Fat100g));
            entity.Property(x => x.GhiChu).HasColumnName("GhiChu");
            entity.Property(x => x.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.CustomDishes)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CustomDishIngredient>(entity =>
        {
            entity.ToTable("NguyenLieuMonNguoiDung");
            entity.HasKey(x => x.MaNguyenLieu);
            entity.Property(x => x.MaNguyenLieu).HasColumnName("MaNguyenLieu");
            entity.Property(x => x.MaMonNguoiDung).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.MaThucPham).HasColumnName("MaThucPham");
            entity.Property(x => x.TenNguyenLieu).HasColumnName("TenNguyenLieu");
            entity.Property(x => x.CaloKcal).HasColumnName("CaloKcal");
            ConfigureMacroColumns(entity.Property(x => x.CaloKcal), isKcal: true);
            entity.Property(x => x.ProteinG).HasColumnName("ProteinG");
            ConfigureMacroColumns(entity.Property(x => x.ProteinG));
            entity.Property(x => x.CarbG).HasColumnName("CarbG");
            ConfigureMacroColumns(entity.Property(x => x.CarbG));
            entity.Property(x => x.FatG).HasColumnName("FatG");
            ConfigureMacroColumns(entity.Property(x => x.FatG));
            entity.Property(x => x.KhoiLuongGram).HasColumnName("KhoiLuongGram").HasColumnType("decimal(9,2)");
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.Ingredients)
                .HasForeignKey(x => x.MaMonNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.CustomDishIngredients)
                .HasForeignKey(x => x.MaThucPham)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Recipe>(entity =>
        {
            entity.ToTable("CongThuc");
            entity.HasKey(x => x.MaCongThuc);
            entity.Property(x => x.MaCongThuc).HasColumnName("MaCongThuc");
            entity.Property(x => x.TenCongThuc).HasColumnName("TenCongThuc");
            entity.Property(x => x.LoaiMon).HasColumnName("LoaiMon");
            entity.Property(x => x.ThoiGianUocTinhPhut).HasColumnName("ThoiGianUocTinhPhut");
            entity.Property(x => x.HuongDanCheBien).HasColumnName("HuongDanCheBien");
            entity.Property(x => x.HinhAnh).HasColumnName("HinhAnh");
            entity.Property(x => x.TrangThai).HasColumnName("TrangThai");
        });

        builder.Entity<DiaryEntry>(entity =>
        {
            entity.ToTable("NhatKyAnUong", table =>
            {
                table.HasCheckConstraint("CK_NK_ChiMotNguon",
                    "(CASE WHEN [MaThucPham] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaMonNguoiDung] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaCongThuc] IS NOT NULL THEN 1 ELSE 0 END) = 1");
            });
            entity.HasKey(x => x.MaNhatKy);
            entity.Property(x => x.MaNhatKy).HasColumnName("MaNhatKy");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.NgayAn).HasColumnName("NgayAn").HasConversion(DateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.MaBuaAn).HasColumnName("MaBuaAn").HasMaxLength(32);
            entity.Property(x => x.MaThucPham).HasColumnName("MaThucPham");
            entity.Property(x => x.MaMonNguoiDung).HasColumnName("MaMonNguoiDung");
            entity.Property(x => x.MaCongThuc).HasColumnName("MaCongThuc");
            entity.Property(x => x.KhoiLuongGram).HasColumnName("KhoiLuongGram").HasColumnType("decimal(10,2)");
            entity.Property(x => x.Calo).HasColumnName("Calo");
            ConfigureMacroColumns(entity.Property(x => x.Calo), isKcal: true);
            entity.Property(x => x.Protein).HasColumnName("Protein");
            ConfigureMacroColumns(entity.Property(x => x.Protein));
            entity.Property(x => x.Carb).HasColumnName("Carb");
            ConfigureMacroColumns(entity.Property(x => x.Carb));
            entity.Property(x => x.Fat).HasColumnName("Fat");
            ConfigureMacroColumns(entity.Property(x => x.Fat));
            entity.Property(x => x.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => new { x.MaNguoiDung, x.NgayAn, x.MaBuaAn, x.MaThucPham, x.MaMonNguoiDung, x.MaCongThuc }).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(u => u.DiaryEntries)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.DiaryEntries)
                .HasForeignKey(x => x.MaThucPham)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.DiaryEntries)
                .HasForeignKey(x => x.MaMonNguoiDung)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Recipe)
                .WithMany(r => r.DiaryEntries)
                .HasForeignKey(x => x.MaCongThuc)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<MealType>()
                .WithMany(mt => mt.DiaryEntries)
                .HasForeignKey(x => x.MaBuaAn)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshToken");
            entity.HasKey(x => x.MaRefreshToken);
            entity.Property(x => x.MaRefreshToken).HasColumnName("MaRefreshToken");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.Token).HasColumnName("Token");
            entity.Property(x => x.NgayTao).HasColumnName("NgayTao").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(x => x.HetHanVao).HasColumnName("HetHanVao");
            entity.Property(x => x.ThuHoiVao).HasColumnName("ThuHoiVao");
            entity.Property(x => x.ThayTheBangToken).HasColumnName("ThayTheBangToken");
            entity.Property(x => x.TaoBoiIP).HasColumnName("TaoBoiIP");
            entity.Property(x => x.ThuHoiBoiIP).HasColumnName("ThuHoiBoiIP");
            entity.Property(x => x.LyDoThuHoi).HasColumnName("LyDoThuHoi");
            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.Cascade);
        });


        builder.Entity<AiRecipe>(entity =>
        {
            entity.ToTable("NhatKyAI");
            entity.HasKey(x => x.MaGoiYAI);
            entity.Property(x => x.MaGoiYAI).HasColumnName("MaGoiYAI");
            entity.Property(x => x.MaNguoiDung).HasColumnName("MaNguoiDung");
            entity.Property(x => x.LoaiDeXuat).HasColumnName("LoaiDeXuat");
            entity.Property(x => x.DuLieuDauVao).HasColumnName("DuLieuDauVao");
            entity.Property(x => x.KetQuaAI).HasColumnName("KetQuaAI");
            entity.Property(x => x.ThoiGianTao).HasColumnName("ThoiGianTao");
            entity.Property(x => x.ThoiLuongXuLyMs).HasColumnName("ThoiLuongXuLyMs");
            entity.HasOne(x => x.User)
                .WithMany(u => u.AiRecipes)
                .HasForeignKey(x => x.MaNguoiDung)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ImageRecognition>(entity =>
        {
            entity.ToTable("NhanDienAnh");
            entity.HasKey(x => x.MaNhanDien);
            entity.Property(x => x.MaNhanDien).HasColumnName("MaNhanDien");
            entity.Property(x => x.MaGoiYAI).HasColumnName("MaGoiYAI");
            entity.Property(x => x.Nhan).HasColumnName("Nhan");
            entity.Property(x => x.DoTinCay).HasColumnName("DoTinCay").HasColumnType("decimal(5,4)");
            entity.HasOne(x => x.AiRecipe)
                .WithMany(ar => ar.ImageRecognitions)
                .HasForeignKey(x => x.MaGoiYAI)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<MealType>(entity =>
        {
            entity.ToTable("LoaiBuaAn");
            entity.HasKey(x => x.MaBuaAn);
            entity.Property(x => x.MaBuaAn).HasColumnName("MaBuaAn");
            entity.Property(x => x.TenBuaAn).HasColumnName("TenBuaAn");
        });

        builder.Entity<ActivityLevel>(entity =>
        {
            entity.ToTable("MucDoVanDong");
            entity.HasKey(x => x.MaMucDo);
            entity.Property(x => x.MaMucDo).HasColumnName("MaMucDo");
            entity.Property(x => x.TenMucDo).HasColumnName("TenMucDo");
            entity.Property(x => x.MoTa).HasColumnName("MoTa");
            entity.Property(x => x.HeSoTDEE).HasColumnName("HeSoTDEE").HasColumnType("decimal(5,3)");
        });

        builder.Entity<Goal>(entity =>
        {
            entity.ToTable("MucTieu");
            entity.HasKey(x => x.MaMucTieu);
            entity.Property(x => x.MaMucTieu).HasColumnName("MaMucTieu");
            entity.Property(x => x.TenMucTieu).HasColumnName("TenMucTieu");
            entity.Property(x => x.MoTa).HasColumnName("MoTa");
        });

        builder.Entity<RecipeIngredient>(entity =>
        {
            entity.ToTable("NguyenLieuCongThuc");
            entity.HasKey(x => x.MaNguyenLieu);
            entity.Property(x => x.MaNguyenLieu).HasColumnName("MaNguyenLieu");
            entity.Property(x => x.MaCongThuc).HasColumnName("MaCongThuc");
            entity.Property(x => x.MaThucPham).HasColumnName("MaThucPham");
            entity.Property(x => x.KhoiLuongGram).HasColumnName("KhoiLuongGram").HasColumnType("decimal(10,2)");
            // Note: Recipe navigation property may need to be added if Recipe class exists
            entity.HasOne(x => x.Food)
                .WithMany()
                .HasForeignKey(x => x.MaThucPham)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureMacroColumns(PropertyBuilder<decimal> propertyBuilder, bool isKcal = false)
    {
        var columnType = isKcal ? "decimal(10,2)" : "decimal(9,2)";
        propertyBuilder.HasColumnType(columnType);
    }
}
