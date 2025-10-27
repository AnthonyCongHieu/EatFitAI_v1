using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCustomSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CongThuc",
                columns: table => new
                {
                    MaCongThuc = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenCongThuc = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LoaiMon = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThoiGianUocTinhPhut = table.Column<int>(type: "int", nullable: true),
                    HuongDanCheBien = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HinhAnh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrangThai = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CongThuc", x => x.MaCongThuc);
                });

            migrationBuilder.CreateTable(
                name: "LichSuCapNhat",
                columns: table => new
                {
                    MaLichSu = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenFile = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ThoiGianApDung = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LichSuCapNhat", x => x.MaLichSu);
                });

            migrationBuilder.CreateTable(
                name: "LoaiBuaAn",
                columns: table => new
                {
                    MaBuaAn = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenBuaAn = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoaiBuaAn", x => x.MaBuaAn);
                });

            migrationBuilder.CreateTable(
                name: "MucDoVanDong",
                columns: table => new
                {
                    MaMucDo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenMucDo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MoTa = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HeSoTDEE = table.Column<decimal>(type: "decimal(5,3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MucDoVanDong", x => x.MaMucDo);
                });

            migrationBuilder.CreateTable(
                name: "MucTieu",
                columns: table => new
                {
                    MaMucTieu = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenMucTieu = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MoTa = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MucTieu", x => x.MaMucTieu);
                });

            migrationBuilder.CreateTable(
                name: "NguoiDung",
                columns: table => new
                {
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MatKhauHash = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    HoTen = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GioiTinh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgaySinh = table.Column<DateTime>(type: "date", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguoiDung", x => x.MaNguoiDung);
                });

            migrationBuilder.CreateTable(
                name: "ThucPham",
                columns: table => new
                {
                    MaThucPham = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenThucPham = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NhomThucPham = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MoTaKhauPhan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Calo100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Protein100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Carb100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Fat100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    HinhAnh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrangThai = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThucPham", x => x.MaThucPham);
                });

            migrationBuilder.CreateTable(
                name: "ChiSoCoThe",
                columns: table => new
                {
                    MaChiSo = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CanNangKg = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    PhanTramMoCoThe = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    KhoiLuongCoKg = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    VongEoCm = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    VongMongCm = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GhiChu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActivityLevelMaMucDo = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    GoalMaMucTieu = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChiSoCoThe", x => x.MaChiSo);
                    table.ForeignKey(
                        name: "FK_ChiSoCoThe_MucDoVanDong_ActivityLevelMaMucDo",
                        column: x => x.ActivityLevelMaMucDo,
                        principalTable: "MucDoVanDong",
                        principalColumn: "MaMucDo");
                    table.ForeignKey(
                        name: "FK_ChiSoCoThe_MucTieu_GoalMaMucTieu",
                        column: x => x.GoalMaMucTieu,
                        principalTable: "MucTieu",
                        principalColumn: "MaMucTieu");
                    table.ForeignKey(
                        name: "FK_ChiSoCoThe_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HoSoNguoiDung",
                columns: table => new
                {
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MucDoVanDong = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnhDaiDienUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgaySinh = table.Column<DateTime>(type: "date", nullable: true),
                    HoTen = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GioiTinh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MucTieu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChieuCaoCm = table.Column<decimal>(type: "decimal(9,2)", nullable: true),
                    CanNangMucTieuKg = table.Column<decimal>(type: "decimal(9,2)", nullable: true),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoSoNguoiDung", x => x.MaNguoiDung);
                    table.ForeignKey(
                        name: "FK_HoSoNguoiDung_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonNguoiDung",
                columns: table => new
                {
                    MaMonNguoiDung = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenMon = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Calo100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Protein100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Carb100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Fat100g = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    GhiChu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonNguoiDung", x => x.MaMonNguoiDung);
                    table.ForeignKey(
                        name: "FK_MonNguoiDung_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MucTieuDinhDuong",
                columns: table => new
                {
                    MaMucTieuDD = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HieuLucTuNgay = table.Column<DateTime>(type: "date", nullable: false),
                    CaloKcal = table.Column<int>(type: "int", nullable: false),
                    ProteinG = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    CarbG = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    FatG = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Nguon = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LyDo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MucTieuDinhDuong", x => x.MaMucTieuDD);
                    table.ForeignKey(
                        name: "FK_MucTieuDinhDuong_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NhatKyAI",
                columns: table => new
                {
                    MaGoiYAI = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LoaiDeXuat = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DuLieuDauVao = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KetQuaAI = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThoiGianTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ThoiLuongXuLyMs = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhatKyAI", x => x.MaGoiYAI);
                    table.ForeignKey(
                        name: "FK_NhatKyAI_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RefreshToken",
                columns: table => new
                {
                    MaRefreshToken = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    HetHanVao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ThuHoiVao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ThayTheBangToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TaoBoiIP = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThuHoiBoiIP = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LyDoThuHoi = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshToken", x => x.MaRefreshToken);
                    table.ForeignKey(
                        name: "FK_RefreshToken_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NguyenLieuCongThuc",
                columns: table => new
                {
                    MaNguyenLieu = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaCongThuc = table.Column<long>(type: "bigint", nullable: false),
                    MaThucPham = table.Column<long>(type: "bigint", nullable: false),
                    KhoiLuongGram = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    RecipeMaCongThuc = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguyenLieuCongThuc", x => x.MaNguyenLieu);
                    table.ForeignKey(
                        name: "FK_NguyenLieuCongThuc_CongThuc_RecipeMaCongThuc",
                        column: x => x.RecipeMaCongThuc,
                        principalTable: "CongThuc",
                        principalColumn: "MaCongThuc");
                    table.ForeignKey(
                        name: "FK_NguyenLieuCongThuc_ThucPham_MaThucPham",
                        column: x => x.MaThucPham,
                        principalTable: "ThucPham",
                        principalColumn: "MaThucPham",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NguyenLieuMonNguoiDung",
                columns: table => new
                {
                    MaNguyenLieu = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaMonNguoiDung = table.Column<long>(type: "bigint", nullable: false),
                    MaThucPham = table.Column<long>(type: "bigint", nullable: false),
                    TenNguyenLieu = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KhoiLuongGram = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    CaloKcal = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ProteinG = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    CarbG = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    FatG = table.Column<decimal>(type: "decimal(9,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguyenLieuMonNguoiDung", x => x.MaNguyenLieu);
                    table.ForeignKey(
                        name: "FK_NguyenLieuMonNguoiDung_MonNguoiDung_MaMonNguoiDung",
                        column: x => x.MaMonNguoiDung,
                        principalTable: "MonNguoiDung",
                        principalColumn: "MaMonNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NguyenLieuMonNguoiDung_ThucPham_MaThucPham",
                        column: x => x.MaThucPham,
                        principalTable: "ThucPham",
                        principalColumn: "MaThucPham",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NhatKyAnUong",
                columns: table => new
                {
                    MaNhatKy = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NgayAn = table.Column<DateTime>(type: "date", nullable: false),
                    MaBuaAn = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    MaThucPham = table.Column<long>(type: "bigint", nullable: true),
                    MaMonNguoiDung = table.Column<long>(type: "bigint", nullable: true),
                    MaCongThuc = table.Column<long>(type: "bigint", nullable: true),
                    KhoiLuongGram = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Calo = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Protein = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Carb = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    Fat = table.Column<decimal>(type: "decimal(9,2)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    MealTypeMaBuaAn = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhatKyAnUong", x => x.MaNhatKy);
                    table.CheckConstraint("CK_NK_ChiMotNguon", "(CASE WHEN [MaThucPham] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaMonNguoiDung] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaCongThuc] IS NOT NULL THEN 1 ELSE 0 END) = 1");
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_CongThuc_MaCongThuc",
                        column: x => x.MaCongThuc,
                        principalTable: "CongThuc",
                        principalColumn: "MaCongThuc",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_LoaiBuaAn_MaBuaAn",
                        column: x => x.MaBuaAn,
                        principalTable: "LoaiBuaAn",
                        principalColumn: "MaBuaAn",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_LoaiBuaAn_MealTypeMaBuaAn",
                        column: x => x.MealTypeMaBuaAn,
                        principalTable: "LoaiBuaAn",
                        principalColumn: "MaBuaAn");
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_MonNguoiDung_MaMonNguoiDung",
                        column: x => x.MaMonNguoiDung,
                        principalTable: "MonNguoiDung",
                        principalColumn: "MaMonNguoiDung",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NhatKyAnUong_ThucPham_MaThucPham",
                        column: x => x.MaThucPham,
                        principalTable: "ThucPham",
                        principalColumn: "MaThucPham",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NhanDienAnh",
                columns: table => new
                {
                    MaNhanDien = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaGoiYAI = table.Column<long>(type: "bigint", nullable: false),
                    Nhan = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DoTinCay = table.Column<decimal>(type: "decimal(5,4)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhanDienAnh", x => x.MaNhanDien);
                    table.ForeignKey(
                        name: "FK_NhanDienAnh_NhatKyAI_MaGoiYAI",
                        column: x => x.MaGoiYAI,
                        principalTable: "NhatKyAI",
                        principalColumn: "MaGoiYAI",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChiSoCoThe_ActivityLevelMaMucDo",
                table: "ChiSoCoThe",
                column: "ActivityLevelMaMucDo");

            migrationBuilder.CreateIndex(
                name: "IX_ChiSoCoThe_GoalMaMucTieu",
                table: "ChiSoCoThe",
                column: "GoalMaMucTieu");

            migrationBuilder.CreateIndex(
                name: "IX_ChiSoCoThe_MaNguoiDung_NgayCapNhat",
                table: "ChiSoCoThe",
                columns: new[] { "MaNguoiDung", "NgayCapNhat" });

            migrationBuilder.CreateIndex(
                name: "IX_LichSuCapNhat_TenFile",
                table: "LichSuCapNhat",
                column: "TenFile",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonNguoiDung_MaNguoiDung",
                table: "MonNguoiDung",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_MucTieuDinhDuong_MaNguoiDung",
                table: "MucTieuDinhDuong",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_NguoiDung_Email",
                table: "NguoiDung",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NguyenLieuCongThuc_MaThucPham",
                table: "NguyenLieuCongThuc",
                column: "MaThucPham");

            migrationBuilder.CreateIndex(
                name: "IX_NguyenLieuCongThuc_RecipeMaCongThuc",
                table: "NguyenLieuCongThuc",
                column: "RecipeMaCongThuc");

            migrationBuilder.CreateIndex(
                name: "IX_NguyenLieuMonNguoiDung_MaMonNguoiDung",
                table: "NguyenLieuMonNguoiDung",
                column: "MaMonNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_NguyenLieuMonNguoiDung_MaThucPham",
                table: "NguyenLieuMonNguoiDung",
                column: "MaThucPham");

            migrationBuilder.CreateIndex(
                name: "IX_NhanDienAnh_MaGoiYAI",
                table: "NhanDienAnh",
                column: "MaGoiYAI");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAI_MaNguoiDung",
                table: "NhatKyAI",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MaBuaAn",
                table: "NhatKyAnUong",
                column: "MaBuaAn");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MaCongThuc",
                table: "NhatKyAnUong",
                column: "MaCongThuc");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MaMonNguoiDung",
                table: "NhatKyAnUong",
                column: "MaMonNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MaNguoiDung_NgayAn_MaBuaAn_MaThucPham_MaMonNguoiDung_MaCongThuc",
                table: "NhatKyAnUong",
                columns: new[] { "MaNguoiDung", "NgayAn", "MaBuaAn", "MaThucPham", "MaMonNguoiDung", "MaCongThuc" },
                unique: true,
                filter: "[MaThucPham] IS NOT NULL AND [MaMonNguoiDung] IS NOT NULL AND [MaCongThuc] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MaThucPham",
                table: "NhatKyAnUong",
                column: "MaThucPham");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyAnUong_MealTypeMaBuaAn",
                table: "NhatKyAnUong",
                column: "MealTypeMaBuaAn");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshToken_MaNguoiDung",
                table: "RefreshToken",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshToken_Token",
                table: "RefreshToken",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ThucPham_TenThucPham",
                table: "ThucPham",
                column: "TenThucPham");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChiSoCoThe");

            migrationBuilder.DropTable(
                name: "HoSoNguoiDung");

            migrationBuilder.DropTable(
                name: "LichSuCapNhat");

            migrationBuilder.DropTable(
                name: "MucTieuDinhDuong");

            migrationBuilder.DropTable(
                name: "NguyenLieuCongThuc");

            migrationBuilder.DropTable(
                name: "NguyenLieuMonNguoiDung");

            migrationBuilder.DropTable(
                name: "NhanDienAnh");

            migrationBuilder.DropTable(
                name: "NhatKyAnUong");

            migrationBuilder.DropTable(
                name: "RefreshToken");

            migrationBuilder.DropTable(
                name: "MucDoVanDong");

            migrationBuilder.DropTable(
                name: "MucTieu");

            migrationBuilder.DropTable(
                name: "NhatKyAI");

            migrationBuilder.DropTable(
                name: "CongThuc");

            migrationBuilder.DropTable(
                name: "LoaiBuaAn");

            migrationBuilder.DropTable(
                name: "MonNguoiDung");

            migrationBuilder.DropTable(
                name: "ThucPham");

            migrationBuilder.DropTable(
                name: "NguoiDung");
        }
    }
}
