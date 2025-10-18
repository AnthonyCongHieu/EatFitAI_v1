using EatFitAI.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Data;

public class EatFitAIDbContext : DbContext
{
    public EatFitAIDbContext(DbContextOptions<EatFitAIDbContext> options) : base(options)
    {
    }

    public DbSet<NguoiDung> NguoiDungs => Set<NguoiDung>();
    public DbSet<ChiSoCoThe> ChiSoCoThes => Set<ChiSoCoThe>();
    public DbSet<MucDoVanDong> MucDoVanDongs => Set<MucDoVanDong>();
    public DbSet<MucTieu> MucTieus => Set<MucTieu>();
    public DbSet<MucTieuDinhDuong> MucTieuDinhDuongs => Set<MucTieuDinhDuong>();
    public DbSet<LoaiBuaAn> LoaiBuaAns => Set<LoaiBuaAn>();
    public DbSet<ThucPham> ThucPhams => Set<ThucPham>();
    public DbSet<MonNguoiDung> MonNguoiDungs => Set<MonNguoiDung>();
    public DbSet<CongThuc> CongThucs => Set<CongThuc>();
    public DbSet<NguyenLieuCongThuc> NguyenLieuCongThucs => Set<NguyenLieuCongThuc>();
    public DbSet<NhatKyAnUong> NhatKyAnUongs => Set<NhatKyAnUong>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // NguoiDung
        modelBuilder.Entity<NguoiDung>(e =>
        {
            e.ToTable("NguoiDung");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Email).HasColumnName("Email").IsRequired();
            e.Property(x => x.HoTen).HasColumnName("HoTen");
            e.Property(x => x.GioiTinh).HasColumnName("GioiTinh");
            e.Property(x => x.NgaySinh).HasColumnName("NgaySinh");
            e.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
            e.HasIndex(x => x.Email).IsUnique();
        });

        // ChiSoCoThe
        modelBuilder.Entity<ChiSoCoThe>(e =>
        {
            e.ToTable("ChiSoCoThe");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.NguoiDungId).HasColumnName("NguoiDungId");
            e.Property(x => x.NgayDo).HasColumnName("NgayDo");
            e.Property(x => x.CanNangKg).HasColumnName("CanNangKg").HasColumnType("decimal(9,2)");
            e.Property(x => x.ChieuCaoCm).HasColumnName("ChieuCaoCm").HasColumnType("decimal(9,2)");
            e.Property(x => x.VongEoCm).HasColumnName("VongEoCm").HasColumnType("decimal(9,2)");
            e.Property(x => x.VongHongCm).HasColumnName("VongHongCm").HasColumnType("decimal(9,2)");
            e.HasOne(x => x.NguoiDung).WithMany(x => x.ChiSoCoThes).HasForeignKey(x => x.NguoiDungId);
        });

        // MucDoVanDong
        modelBuilder.Entity<MucDoVanDong>(e =>
        {
            e.ToTable("MucDoVanDong");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Ma).HasColumnName("Ma").IsRequired();
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
            e.Property(x => x.HeSoTdee).HasColumnName("HeSoTDEE").HasColumnType("decimal(4,2)");
        });

        // MucTieu
        modelBuilder.Entity<MucTieu>(e =>
        {
            e.ToTable("MucTieu");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Ma).HasColumnName("Ma").IsRequired();
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
        });

        // MucTieuDinhDuong
        modelBuilder.Entity<MucTieuDinhDuong>(e =>
        {
            e.ToTable("MucTieuDinhDuong", t => t.HasCheckConstraint("CK_MucTieuDinhDuong_Nguon", "[Nguon] IN ('USER','AI')"));
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.NguoiDungId).HasColumnName("NguoiDungId");
            e.Property(x => x.MucTieuId).HasColumnName("MucTieuId");
            e.Property(x => x.Nguon).HasColumnName("Nguon").HasMaxLength(10);
            e.Property(x => x.LyDo).HasColumnName("LyDo");
            e.Property(x => x.HieuLucTuNgay).HasColumnName("HieuLucTuNgay");
            e.Property(x => x.NangLuongKcal).HasColumnName("NangLuongKcal").HasColumnType("decimal(10,2)");
            e.Property(x => x.ProteinG).HasColumnName("ProteinG").HasColumnType("decimal(9,2)");
            e.Property(x => x.CarbG).HasColumnName("CarbG").HasColumnType("decimal(9,2)");
            e.Property(x => x.FatG).HasColumnName("FatG").HasColumnType("decimal(9,2)");
            e.HasOne(x => x.NguoiDung).WithMany(x => x.MucTieuDinhDuongs).HasForeignKey(x => x.NguoiDungId);
            e.HasOne(x => x.MucTieu).WithMany().HasForeignKey(x => x.MucTieuId);
        });

        // LoaiBuaAn
        modelBuilder.Entity<LoaiBuaAn>(e =>
        {
            e.ToTable("LoaiBuaAn");
            e.HasKey(x => x.MaBuaAn);
            e.Property(x => x.MaBuaAn).HasColumnName("MaBuaAn").HasMaxLength(20);
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
            e.Property(x => x.ThuTu).HasColumnName("ThuTu");
        });

        // ThucPham
        modelBuilder.Entity<ThucPham>(e =>
        {
            e.ToTable("ThucPham");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
            e.Property(x => x.DonViMacDinh).HasColumnName("DonViMacDinh");
            e.Property(x => x.NangLuongKcalPer100g).HasColumnName("NangLuongKcalPer100g").HasColumnType("decimal(10,2)");
            e.Property(x => x.ProteinGPer100g).HasColumnName("ProteinGPer100g").HasColumnType("decimal(9,2)");
            e.Property(x => x.CarbGPer100g).HasColumnName("CarbGPer100g").HasColumnType("decimal(9,2)");
            e.Property(x => x.FatGPer100g).HasColumnName("FatGPer100g").HasColumnType("decimal(9,2)");
        });

        // MonNguoiDung
        modelBuilder.Entity<MonNguoiDung>(e =>
        {
            e.ToTable("MonNguoiDung");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.NguoiDungId).HasColumnName("NguoiDungId");
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
            e.Property(x => x.MoTa).HasColumnName("MoTa");
            e.Property(x => x.NangLuongKcalPer100g).HasColumnName("NangLuongKcalPer100g").HasColumnType("decimal(10,2)");
            e.Property(x => x.ProteinGPer100g).HasColumnName("ProteinGPer100g").HasColumnType("decimal(9,2)");
            e.Property(x => x.CarbGPer100g).HasColumnName("CarbGPer100g").HasColumnType("decimal(9,2)");
            e.Property(x => x.FatGPer100g).HasColumnName("FatGPer100g").HasColumnType("decimal(9,2)");
            e.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.NguoiDungId);
        });

        // CongThuc
        modelBuilder.Entity<CongThuc>(e =>
        {
            e.ToTable("CongThuc");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.NguoiDungId).HasColumnName("NguoiDungId");
            e.Property(x => x.Ten).HasColumnName("Ten").IsRequired();
            e.Property(x => x.MoTa).HasColumnName("MoTa");
            e.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.NguoiDungId);
        });

        // NguyenLieuCongThuc
        modelBuilder.Entity<NguyenLieuCongThuc>(e =>
        {
            e.ToTable("NguyenLieuCongThuc");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.CongThucId).HasColumnName("CongThucId");
            e.Property(x => x.ThucPhamId).HasColumnName("ThucPhamId");
            e.Property(x => x.KhoiLuongGram).HasColumnName("KhoiLuongGram").HasColumnType("decimal(9,2)");
            e.HasOne(x => x.CongThuc).WithMany(x => x.NguyenLieu).HasForeignKey(x => x.CongThucId);
            e.HasOne(x => x.ThucPham).WithMany().HasForeignKey(x => x.ThucPhamId);
        });

        // NhatKyAnUong
        modelBuilder.Entity<NhatKyAnUong>(e =>
        {
            e.ToTable("NhatKyAnUong");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.NguoiDungId, x.NgayAn, x.MaBuaAn, x.ItemId, x.Source }).IsUnique();
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.NguoiDungId).HasColumnName("NguoiDungId");
            e.Property(x => x.NgayAn).HasColumnName("NgayAn");
            e.Property(x => x.MaBuaAn).HasColumnName("MaBuaAn").HasMaxLength(20);
            e.Property(x => x.ItemId).HasColumnName("ItemId");
            e.Property(x => x.Source).HasColumnName("Source").HasMaxLength(30);
            e.Property(x => x.SoLuongGram).HasColumnName("SoLuongGram").HasColumnType("decimal(9,2)");
            e.Property(x => x.NangLuongKcal).HasColumnName("NangLuongKcal").HasColumnType("decimal(10,2)");
            e.Property(x => x.ProteinG).HasColumnName("ProteinG").HasColumnType("decimal(9,2)");
            e.Property(x => x.CarbG).HasColumnName("CarbG").HasColumnType("decimal(9,2)");
            e.Property(x => x.FatG).HasColumnName("FatG").HasColumnType("decimal(9,2)");
            e.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
            e.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.NguoiDungId);
        });
    }
}
