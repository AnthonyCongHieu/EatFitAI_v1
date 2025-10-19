using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Persistence;

public partial class EatFitAiDbContext : DbContext
{
    public EatFitAiDbContext()
    {
    }

    public EatFitAiDbContext(DbContextOptions<EatFitAiDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ChiSoCoThe> ChiSoCoThes { get; set; }

    public virtual DbSet<CongThuc> CongThucs { get; set; }

    public virtual DbSet<LoaiBuaAn> LoaiBuaAns { get; set; }

    public virtual DbSet<MonNguoiDung> MonNguoiDungs { get; set; }

    public virtual DbSet<MucDoVanDong> MucDoVanDongs { get; set; }

    public virtual DbSet<MucTieu> MucTieus { get; set; }

    public virtual DbSet<MucTieuDinhDuong> MucTieuDinhDuongs { get; set; }

    public virtual DbSet<NguoiDung> NguoiDungs { get; set; }

    public virtual DbSet<NguyenLieuCongThuc> NguyenLieuCongThucs { get; set; }

    public virtual DbSet<NhanDienAnh> NhanDienAnhs { get; set; }

    public virtual DbSet<NhatKyAi> NhatKyAis { get; set; }

    public virtual DbSet<NhatKyAnUong> NhatKyAnUongs { get; set; }

    public virtual DbSet<ThucPham> ThucPhams { get; set; }

    public virtual DbSet<VwTongHopDinhDuongNgay> VwTongHopDinhDuongNgays { get; set; }

    public virtual DbSet<VwTongHopDinhDuongTuan> VwTongHopDinhDuongTuans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ChiSoCoThe>(entity =>
        {
            entity.HasKey(e => e.MaChiSo).HasName("PK__ChiSoCoT__EBA18E15D8690B55");

            entity.ToTable("ChiSoCoThe");

            entity.Property(e => e.CanNangKg).HasColumnType("decimal(6, 2)");
            entity.Property(e => e.ChieuCaoCm).HasColumnType("decimal(6, 2)");
            entity.Property(e => e.GhiChu).HasMaxLength(200);
            entity.Property(e => e.MaMucDo)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.MaMucTieu)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.NgayCapNhat)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaMucDoNavigation).WithMany(p => p.ChiSoCoThes)
                .HasForeignKey(d => d.MaMucDo)
                .HasConstraintName("FK_ChiSoCoThe_MucDo");

            entity.HasOne(d => d.MaMucTieuNavigation).WithMany(p => p.ChiSoCoThes)
                .HasForeignKey(d => d.MaMucTieu)
                .HasConstraintName("FK_ChiSoCoThe_MucTieu");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.ChiSoCoThes)
                .HasForeignKey(d => d.MaNguoiDung)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiSoCoThe_NguoiDung");
        });

        modelBuilder.Entity<CongThuc>(entity =>
        {
            entity.HasKey(e => e.MaCongThuc).HasName("PK__CongThuc__6E223AF78A899BD5");

            entity.ToTable("CongThuc");

            entity.Property(e => e.HinhAnh).HasMaxLength(400);
            entity.Property(e => e.LoaiAmThuc).HasMaxLength(100);
            entity.Property(e => e.TenCongThuc).HasMaxLength(200);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);
        });

        modelBuilder.Entity<LoaiBuaAn>(entity =>
        {
            entity.HasKey(e => e.MaBuaAn).HasName("PK__LoaiBuaA__AE9738D94F24CFA5");

            entity.ToTable("LoaiBuaAn");

            entity.Property(e => e.MaBuaAn)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TenBuaAn).HasMaxLength(50);
        });

        modelBuilder.Entity<MonNguoiDung>(entity =>
        {
            entity.HasKey(e => e.MaMonNguoiDung).HasName("PK__MonNguoi__C8B7FDEC72AA874E");

            entity.ToTable("MonNguoiDung");

            entity.Property(e => e.Calo100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.Carb100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.Fat100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.GhiChu).HasMaxLength(200);
            entity.Property(e => e.NgayTao)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Protein100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.TenMon).HasMaxLength(200);

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.MonNguoiDungs)
                .HasForeignKey(d => d.MaNguoiDung)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MonNguoiDung_User");
        });

        modelBuilder.Entity<MucDoVanDong>(entity =>
        {
            entity.HasKey(e => e.MaMucDo).HasName("PK__MucDoVan__3EAECAA4672D2956");

            entity.ToTable("MucDoVanDong");

            entity.Property(e => e.MaMucDo)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.HeSoTdee)
                .HasColumnType("decimal(5, 3)")
                .HasColumnName("HeSoTDEE");
            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.TenMucDo).HasMaxLength(100);
        });

        modelBuilder.Entity<MucTieu>(entity =>
        {
            entity.HasKey(e => e.MaMucTieu).HasName("PK__MucTieu__E587A329A3CB009D");

            entity.ToTable("MucTieu");

            entity.Property(e => e.MaMucTieu)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.TenMucTieu).HasMaxLength(100);
        });

        modelBuilder.Entity<MucTieuDinhDuong>(entity =>
        {
            entity.HasKey(e => e.MaMucTieuDd).HasName("PK__MucTieuD__0DC0CD6A5F247546");

            entity.ToTable("MucTieuDinhDuong");

            entity.Property(e => e.MaMucTieuDd).HasColumnName("MaMucTieuDD");
            entity.Property(e => e.CarbG).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.FatG).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.HieuLucTuNgay)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.LyDo).HasMaxLength(200);
            entity.Property(e => e.NgayTao)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Nguon)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ProteinG).HasColumnType("decimal(8, 2)");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.MucTieuDinhDuongs)
                .HasForeignKey(d => d.MaNguoiDung)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MucTieuDD_NguoiDung");
        });

        modelBuilder.Entity<NguoiDung>(entity =>
        {
            entity.HasKey(e => e.MaNguoiDung).HasName("PK__NguoiDun__C539D762872DA823");

            entity.ToTable("NguoiDung");

            entity.HasIndex(e => e.Email, "UQ__NguoiDun__A9D105341FE903A1").IsUnique();

            entity.Property(e => e.MaNguoiDung).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.GioiTinh)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.HoTen).HasMaxLength(150);
            entity.Property(e => e.MatKhauHash).HasMaxLength(256);
            entity.Property(e => e.NgayCapNhat)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.NgayTao)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
        });

        modelBuilder.Entity<NguyenLieuCongThuc>(entity =>
        {
            entity.HasKey(e => e.MaNguyenLieu).HasName("PK__NguyenLi__C7519355A123C884");

            entity.ToTable("NguyenLieuCongThuc");

            entity.Property(e => e.KhoiLuongGram).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.MaCongThucNavigation).WithMany(p => p.NguyenLieuCongThucs)
                .HasForeignKey(d => d.MaCongThuc)
                .HasConstraintName("FK_NLCT_CongThuc");

            entity.HasOne(d => d.MaThucPhamNavigation).WithMany(p => p.NguyenLieuCongThucs)
                .HasForeignKey(d => d.MaThucPham)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NLCT_ThucPham");
        });

        modelBuilder.Entity<NhanDienAnh>(entity =>
        {
            entity.HasKey(e => e.MaNhanDien).HasName("PK__NhanDien__B0D88F6327A51B9F");

            entity.ToTable("NhanDienAnh");

            entity.Property(e => e.DoTinCay).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.MaGoiYai).HasColumnName("MaGoiYAI");
            entity.Property(e => e.Nhan).HasMaxLength(200);

            entity.HasOne(d => d.MaGoiYaiNavigation).WithMany(p => p.NhanDienAnhs)
                .HasForeignKey(d => d.MaGoiYai)
                .HasConstraintName("FK_NDAI_NKAI");
        });

        modelBuilder.Entity<NhatKyAi>(entity =>
        {
            entity.HasKey(e => e.MaGoiYai).HasName("PK__NhatKyAI__6E0EE849D7D5D368");

            entity.ToTable("NhatKyAI");

            entity.Property(e => e.MaGoiYai).HasColumnName("MaGoiYAI");
            entity.Property(e => e.KetQuaAi).HasColumnName("KetQuaAI");
            entity.Property(e => e.LoaiGoiY)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ThoiGianTao)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.NhatKyAis)
                .HasForeignKey(d => d.MaNguoiDung)
                .HasConstraintName("FK_NKAI_User");
        });

        modelBuilder.Entity<NhatKyAnUong>(entity =>
        {
            entity.HasKey(e => e.MaNhatKy).HasName("PK__NhatKyAn__E42EF42EEBA67BDE");

            entity.ToTable("NhatKyAnUong");

            entity.Property(e => e.Calo).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Carb).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Fat).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.KhoiLuongGram).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MaBuaAn)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.NgayTao)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Protein).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.MaBuaAnNavigation).WithMany(p => p.NhatKyAnUongs)
                .HasForeignKey(d => d.MaBuaAn)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NK_BuaAn");

            entity.HasOne(d => d.MaCongThucNavigation).WithMany(p => p.NhatKyAnUongs)
                .HasForeignKey(d => d.MaCongThuc)
                .HasConstraintName("FK_NK_CongThuc");

            entity.HasOne(d => d.MaMonNguoiDungNavigation).WithMany(p => p.NhatKyAnUongs)
                .HasForeignKey(d => d.MaMonNguoiDung)
                .HasConstraintName("FK_NK_MonND");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.NhatKyAnUongs)
                .HasForeignKey(d => d.MaNguoiDung)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NK_User");

            entity.HasOne(d => d.MaThucPhamNavigation).WithMany(p => p.NhatKyAnUongs)
                .HasForeignKey(d => d.MaThucPham)
                .HasConstraintName("FK_NK_ThucPham");
        });

        modelBuilder.Entity<ThucPham>(entity =>
        {
            entity.HasKey(e => e.MaThucPham).HasName("PK__ThucPham__3E4339C6BA4E7A09");

            entity.ToTable("ThucPham");

            entity.Property(e => e.Calo100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.Carb100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.Fat100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.HinhAnh).HasMaxLength(400);
            entity.Property(e => e.MoTaKhauPhan).HasMaxLength(100);
            entity.Property(e => e.PhanLoai).HasMaxLength(100);
            entity.Property(e => e.Protein100g).HasColumnType("decimal(8, 2)");
            entity.Property(e => e.TenThucPham).HasMaxLength(200);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);
        });

        modelBuilder.Entity<VwTongHopDinhDuongNgay>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_TongHopDinhDuongNgay");

            entity.Property(e => e.TongCalo).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<VwTongHopDinhDuongTuan>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_TongHopDinhDuongTuan");

            entity.Property(e => e.TongCalo).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TongProtein).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TuanBatDau).HasColumnType("datetime");
            entity.Property(e => e.TuanKetThuc).HasColumnType("datetime");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
