using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitDatabaseVietnamese : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BodyMetric_NguoiDung_UserId",
                table: "BodyMetric");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDish_NguoiDung_UserId",
                table: "CustomDish");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_CustomDish_CustomDishId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_Food_FoodId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_DiaryEntry_AiRecipe_AiRecipeId",
                table: "DiaryEntry");

            migrationBuilder.DropForeignKey(
                name: "FK_DiaryEntry_CustomDish_CustomDishId",
                table: "DiaryEntry");

            migrationBuilder.DropForeignKey(
                name: "FK_DiaryEntry_Food_FoodId",
                table: "DiaryEntry");

            migrationBuilder.DropForeignKey(
                name: "FK_DiaryEntry_NguoiDung_UserId",
                table: "DiaryEntry");

            migrationBuilder.DropForeignKey(
                name: "FK_NguoiDungVaiTro_NguoiDung_UserId",
                table: "NguoiDungVaiTro");

            migrationBuilder.DropForeignKey(
                name: "FK_NutritionTarget_NguoiDung_UserId",
                table: "NutritionTarget");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshToken_NguoiDung_UserId",
                table: "RefreshToken");

            migrationBuilder.DropForeignKey(
                name: "FK_UserProfile_NguoiDung_UserId",
                table: "UserProfile");

            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "NguoiDung");

            migrationBuilder.DropIndex(
                name: "UserNameIndex",
                table: "NguoiDung");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserProfile",
                table: "UserProfile");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NutritionTarget",
                table: "NutritionTarget");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Food",
                table: "Food");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DiaryEntry",
                table: "DiaryEntry");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DiaryEntry_ExactlyOneSource",
                table: "DiaryEntry");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CustomDish",
                table: "CustomDish");

            migrationBuilder.DropPrimaryKey(
                name: "PK_BodyMetric",
                table: "BodyMetric");

            migrationBuilder.RenameTable(
                name: "UserProfile",
                newName: "HoSoNguoiDung");

            migrationBuilder.RenameTable(
                name: "NutritionTarget",
                newName: "MucTieuDinhDuong");

            migrationBuilder.RenameTable(
                name: "Food",
                newName: "ThucPham");

            migrationBuilder.RenameTable(
                name: "DiaryEntry",
                newName: "NhatKyAnUong");

            migrationBuilder.RenameTable(
                name: "CustomDish",
                newName: "MonNguoiDung");

            migrationBuilder.RenameTable(
                name: "BodyMetric",
                newName: "ChiSoCoThe");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "VaiTroClaim",
                newName: "MaClaim");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "VaiTro",
                newName: "MaVaiTro");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "RefreshToken",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "RevokedByIp",
                table: "RefreshToken",
                newName: "ThuHoiBoiIP");

            migrationBuilder.RenameColumn(
                name: "RevokedAt",
                table: "RefreshToken",
                newName: "ThuHoiVao");

            migrationBuilder.RenameColumn(
                name: "ReplacedByToken",
                table: "RefreshToken",
                newName: "ThayTheBangToken");

            migrationBuilder.RenameColumn(
                name: "ReasonRevoked",
                table: "RefreshToken",
                newName: "LyDoThuHoi");

            migrationBuilder.RenameColumn(
                name: "ExpiresAt",
                table: "RefreshToken",
                newName: "HetHanVao");

            migrationBuilder.RenameColumn(
                name: "CreatedByIp",
                table: "RefreshToken",
                newName: "TaoBoiIP");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "RefreshToken",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "RefreshToken",
                newName: "MaRefreshToken");

            migrationBuilder.RenameIndex(
                name: "IX_RefreshToken_UserId",
                table: "RefreshToken",
                newName: "IX_RefreshToken_MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "NguoiDungVaiTro",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "NguoiDungClaim",
                newName: "MaClaim");

            migrationBuilder.RenameColumn(
                name: "UserName",
                table: "NguoiDung",
                newName: "TenDangNhap");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "NguoiDung",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "TwoFactorEnabled",
                table: "NguoiDung",
                newName: "KichHoatHaiYeuTo");

            migrationBuilder.RenameColumn(
                name: "SecurityStamp",
                table: "NguoiDung",
                newName: "DauAnToan");

            migrationBuilder.RenameColumn(
                name: "PhoneNumberConfirmed",
                table: "NguoiDung",
                newName: "SoDienThoaiXacNhan");

            migrationBuilder.RenameColumn(
                name: "PhoneNumber",
                table: "NguoiDung",
                newName: "SoDienThoai");

            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "NguoiDung",
                newName: "MatKhauHash");

            migrationBuilder.RenameColumn(
                name: "NormalizedUserName",
                table: "NguoiDung",
                newName: "TenDangNhapChuanHoa");

            migrationBuilder.RenameColumn(
                name: "NormalizedEmail",
                table: "NguoiDung",
                newName: "EmailChuanHoa");

            migrationBuilder.RenameColumn(
                name: "LockoutEnd",
                table: "NguoiDung",
                newName: "KetThucKhoa");

            migrationBuilder.RenameColumn(
                name: "LockoutEnabled",
                table: "NguoiDung",
                newName: "KichHoatKhoa");

            migrationBuilder.RenameColumn(
                name: "Gender",
                table: "NguoiDung",
                newName: "GioiTinh");

            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "NguoiDung",
                newName: "HoTen");

            migrationBuilder.RenameColumn(
                name: "EmailConfirmed",
                table: "NguoiDung",
                newName: "EmailXacNhan");

            migrationBuilder.RenameColumn(
                name: "DateOfBirth",
                table: "NguoiDung",
                newName: "NgaySinh");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "NguoiDung",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "ConcurrencyStamp",
                table: "NguoiDung",
                newName: "DauDongBo");

            migrationBuilder.RenameColumn(
                name: "AccessFailedCount",
                table: "NguoiDung",
                newName: "SoLanDangNhapThatBai");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "NguoiDung",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "HoSoNguoiDung",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "TargetWeightKg",
                table: "HoSoNguoiDung",
                newName: "CanNangMucTieuKg");

            migrationBuilder.RenameColumn(
                name: "HeightCm",
                table: "HoSoNguoiDung",
                newName: "ChieuCaoCm");

            migrationBuilder.RenameColumn(
                name: "Goal",
                table: "HoSoNguoiDung",
                newName: "MucTieu");

            migrationBuilder.RenameColumn(
                name: "Gender",
                table: "HoSoNguoiDung",
                newName: "GioiTinh");

            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "HoSoNguoiDung",
                newName: "HoTen");

            migrationBuilder.RenameColumn(
                name: "DateOfBirth",
                table: "HoSoNguoiDung",
                newName: "NgaySinh");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "HoSoNguoiDung",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "AvatarUrl",
                table: "HoSoNguoiDung",
                newName: "AnhDaiDienUrl");

            migrationBuilder.RenameColumn(
                name: "ActivityLevel",
                table: "HoSoNguoiDung",
                newName: "MucDoHoatDong");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "HoSoNguoiDung",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "MucTieuDinhDuong",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "MucTieuDinhDuong",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "ProteinGrams",
                table: "MucTieuDinhDuong",
                newName: "ProteinG");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "MucTieuDinhDuong",
                newName: "LaHoatDong");

            migrationBuilder.RenameColumn(
                name: "FatGrams",
                table: "MucTieuDinhDuong",
                newName: "FatG");

            migrationBuilder.RenameColumn(
                name: "EffectiveDate",
                table: "MucTieuDinhDuong",
                newName: "HieuLucTuNgay");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "MucTieuDinhDuong",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "CarbohydrateGrams",
                table: "MucTieuDinhDuong",
                newName: "CarbG");

            migrationBuilder.RenameColumn(
                name: "CaloriesKcal",
                table: "MucTieuDinhDuong",
                newName: "CaloKcal");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "MucTieuDinhDuong",
                newName: "MaMucTieuDD");

            migrationBuilder.RenameIndex(
                name: "IX_NutritionTarget_UserId_IsActive",
                table: "MucTieuDinhDuong",
                newName: "IX_MucTieuDinhDuong_MaNguoiDung_LaHoatDong");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "ThucPham",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "ServingSizeGrams",
                table: "ThucPham",
                newName: "KhoiLuongPhucVuGram");

            migrationBuilder.RenameColumn(
                name: "ProteinGrams",
                table: "ThucPham",
                newName: "Protein100g");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "ThucPham",
                newName: "TenThucPham");

            migrationBuilder.RenameColumn(
                name: "IsCustom",
                table: "ThucPham",
                newName: "LaTuDinhNghia");

            migrationBuilder.RenameColumn(
                name: "FatGrams",
                table: "ThucPham",
                newName: "Fat100g");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "ThucPham",
                newName: "MoTaKhauPhan");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "ThucPham",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "ThucPham",
                newName: "PhanLoai");

            migrationBuilder.RenameColumn(
                name: "CarbohydrateGrams",
                table: "ThucPham",
                newName: "Carb100g");

            migrationBuilder.RenameColumn(
                name: "CaloriesKcal",
                table: "ThucPham",
                newName: "Calo100g");

            migrationBuilder.RenameColumn(
                name: "Brand",
                table: "ThucPham",
                newName: "ThuongHieu");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ThucPham",
                newName: "MaThucPham");

            migrationBuilder.RenameIndex(
                name: "IX_Food_Name",
                table: "ThucPham",
                newName: "IX_ThucPham_TenThucPham");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "NhatKyAnUong",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "NhatKyAnUong",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "Source",
                table: "NhatKyAnUong",
                newName: "Nguon");

            migrationBuilder.RenameColumn(
                name: "QuantityGrams",
                table: "NhatKyAnUong",
                newName: "KhoiLuongGram");

            migrationBuilder.RenameColumn(
                name: "ProteinGrams",
                table: "NhatKyAnUong",
                newName: "Protein");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "NhatKyAnUong",
                newName: "GhiChu");

            migrationBuilder.RenameColumn(
                name: "MealDate",
                table: "NhatKyAnUong",
                newName: "NgayAn");

            migrationBuilder.RenameColumn(
                name: "MealCode",
                table: "NhatKyAnUong",
                newName: "MaBuaAn");

            migrationBuilder.RenameColumn(
                name: "ItemId",
                table: "NhatKyAnUong",
                newName: "MaMuc");

            migrationBuilder.RenameColumn(
                name: "FoodId",
                table: "NhatKyAnUong",
                newName: "MaThucPham");

            migrationBuilder.RenameColumn(
                name: "FatGrams",
                table: "NhatKyAnUong",
                newName: "Fat");

            migrationBuilder.RenameColumn(
                name: "CustomDishId",
                table: "NhatKyAnUong",
                newName: "MaMonNguoiDung");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "NhatKyAnUong",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "CarbohydrateGrams",
                table: "NhatKyAnUong",
                newName: "Carb");

            migrationBuilder.RenameColumn(
                name: "CaloriesKcal",
                table: "NhatKyAnUong",
                newName: "Calo");

            migrationBuilder.RenameColumn(
                name: "AiRecipeId",
                table: "NhatKyAnUong",
                newName: "MaCongThucAI");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "NhatKyAnUong",
                newName: "MaNhatKy");

            migrationBuilder.RenameIndex(
                name: "IX_DiaryEntry_UserId_MealDate_MealCode_ItemId_Source",
                table: "NhatKyAnUong",
                newName: "IX_NhatKyAnUong_MaNguoiDung_NgayAn_MaBuaAn_MaMuc_Nguon");

            migrationBuilder.RenameIndex(
                name: "IX_DiaryEntry_FoodId",
                table: "NhatKyAnUong",
                newName: "IX_NhatKyAnUong_MaThucPham");

            migrationBuilder.RenameIndex(
                name: "IX_DiaryEntry_CustomDishId",
                table: "NhatKyAnUong",
                newName: "IX_NhatKyAnUong_MaMonNguoiDung");

            migrationBuilder.RenameIndex(
                name: "IX_DiaryEntry_AiRecipeId",
                table: "NhatKyAnUong",
                newName: "IX_NhatKyAnUong_MaCongThucAI");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "MonNguoiDung",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "MonNguoiDung",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "ProteinGrams",
                table: "MonNguoiDung",
                newName: "Protein100g");

            migrationBuilder.RenameColumn(
                name: "PortionSizeGrams",
                table: "MonNguoiDung",
                newName: "KhoiLuongPhucVuGram");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "MonNguoiDung",
                newName: "TenMon");

            migrationBuilder.RenameColumn(
                name: "FatGrams",
                table: "MonNguoiDung",
                newName: "Fat100g");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "MonNguoiDung",
                newName: "MoTa");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "MonNguoiDung",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "CarbohydrateGrams",
                table: "MonNguoiDung",
                newName: "Carb100g");

            migrationBuilder.RenameColumn(
                name: "CaloriesKcal",
                table: "MonNguoiDung",
                newName: "Calo100g");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "MonNguoiDung",
                newName: "MaMonNguoiDung");

            migrationBuilder.RenameIndex(
                name: "IX_CustomDish_UserId",
                table: "MonNguoiDung",
                newName: "IX_MonNguoiDung_MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "WeightKg",
                table: "ChiSoCoThe",
                newName: "CanNangKg");

            migrationBuilder.RenameColumn(
                name: "WaistCm",
                table: "ChiSoCoThe",
                newName: "VongEoCm");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "ChiSoCoThe",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "RecordedAt",
                table: "ChiSoCoThe",
                newName: "NgayCapNhat");

            migrationBuilder.RenameColumn(
                name: "MuscleMassKg",
                table: "ChiSoCoThe",
                newName: "KhoiLuongCoKg");

            migrationBuilder.RenameColumn(
                name: "HipCm",
                table: "ChiSoCoThe",
                newName: "VongMongCm");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "ChiSoCoThe",
                newName: "NgayTao");

            migrationBuilder.RenameColumn(
                name: "BodyFatPercent",
                table: "ChiSoCoThe",
                newName: "TiLeMoCoThe");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ChiSoCoThe",
                newName: "MaChiSo");

            migrationBuilder.RenameIndex(
                name: "IX_BodyMetric_UserId_RecordedAt",
                table: "ChiSoCoThe",
                newName: "IX_ChiSoCoThe_MaNguoiDung_NgayCapNhat");

            migrationBuilder.AddPrimaryKey(
                name: "PK_HoSoNguoiDung",
                table: "HoSoNguoiDung",
                column: "MaNguoiDung");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MucTieuDinhDuong",
                table: "MucTieuDinhDuong",
                column: "MaMucTieuDD");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ThucPham",
                table: "ThucPham",
                column: "MaThucPham");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NhatKyAnUong",
                table: "NhatKyAnUong",
                column: "MaNhatKy");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MonNguoiDung",
                table: "MonNguoiDung",
                column: "MaMonNguoiDung");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ChiSoCoThe",
                table: "ChiSoCoThe",
                column: "MaChiSo");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "NguoiDung",
                column: "EmailChuanHoa",
                unique: true,
                filter: "[EmailChuanHoa] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "NguoiDung",
                column: "TenDangNhapChuanHoa",
                unique: true,
                filter: "[TenDangNhapChuanHoa] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_NK_ChiMotNguon",
                table: "NhatKyAnUong",
                sql: "(CASE WHEN [MaThucPham] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaMonNguoiDung] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [MaCongThucAI] IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_ChiSoCoThe_NguoiDung_MaNguoiDung",
                table: "ChiSoCoThe",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomDishIngredient_MonNguoiDung_CustomDishId",
                table: "CustomDishIngredient",
                column: "CustomDishId",
                principalTable: "MonNguoiDung",
                principalColumn: "MaMonNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomDishIngredient_ThucPham_FoodId",
                table: "CustomDishIngredient",
                column: "FoodId",
                principalTable: "ThucPham",
                principalColumn: "MaThucPham",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_HoSoNguoiDung_NguoiDung_MaNguoiDung",
                table: "HoSoNguoiDung",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MonNguoiDung_NguoiDung_MaNguoiDung",
                table: "MonNguoiDung",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MucTieuDinhDuong_NguoiDung_MaNguoiDung",
                table: "MucTieuDinhDuong",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiDungVaiTro_NguoiDung_MaNguoiDung",
                table: "NguoiDungVaiTro",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAnUong_AiRecipe_MaCongThucAI",
                table: "NhatKyAnUong",
                column: "MaCongThucAI",
                principalTable: "AiRecipe",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAnUong_MonNguoiDung_MaMonNguoiDung",
                table: "NhatKyAnUong",
                column: "MaMonNguoiDung",
                principalTable: "MonNguoiDung",
                principalColumn: "MaMonNguoiDung",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAnUong_NguoiDung_MaNguoiDung",
                table: "NhatKyAnUong",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAnUong_ThucPham_MaThucPham",
                table: "NhatKyAnUong",
                column: "MaThucPham",
                principalTable: "ThucPham",
                principalColumn: "MaThucPham",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshToken_NguoiDung_MaNguoiDung",
                table: "RefreshToken",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChiSoCoThe_NguoiDung_MaNguoiDung",
                table: "ChiSoCoThe");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_MonNguoiDung_CustomDishId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_ThucPham_FoodId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_HoSoNguoiDung_NguoiDung_MaNguoiDung",
                table: "HoSoNguoiDung");

            migrationBuilder.DropForeignKey(
                name: "FK_MonNguoiDung_NguoiDung_MaNguoiDung",
                table: "MonNguoiDung");

            migrationBuilder.DropForeignKey(
                name: "FK_MucTieuDinhDuong_NguoiDung_MaNguoiDung",
                table: "MucTieuDinhDuong");

            migrationBuilder.DropForeignKey(
                name: "FK_NguoiDungVaiTro_NguoiDung_MaNguoiDung",
                table: "NguoiDungVaiTro");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_AiRecipe_MaCongThucAI",
                table: "NhatKyAnUong");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_MonNguoiDung_MaMonNguoiDung",
                table: "NhatKyAnUong");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_NguoiDung_MaNguoiDung",
                table: "NhatKyAnUong");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_ThucPham_MaThucPham",
                table: "NhatKyAnUong");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshToken_NguoiDung_MaNguoiDung",
                table: "RefreshToken");

            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "NguoiDung");

            migrationBuilder.DropIndex(
                name: "UserNameIndex",
                table: "NguoiDung");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ThucPham",
                table: "ThucPham");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NhatKyAnUong",
                table: "NhatKyAnUong");

            migrationBuilder.DropCheckConstraint(
                name: "CK_NK_ChiMotNguon",
                table: "NhatKyAnUong");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MucTieuDinhDuong",
                table: "MucTieuDinhDuong");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MonNguoiDung",
                table: "MonNguoiDung");

            migrationBuilder.DropPrimaryKey(
                name: "PK_HoSoNguoiDung",
                table: "HoSoNguoiDung");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ChiSoCoThe",
                table: "ChiSoCoThe");

            migrationBuilder.RenameTable(
                name: "ThucPham",
                newName: "Food");

            migrationBuilder.RenameTable(
                name: "NhatKyAnUong",
                newName: "DiaryEntry");

            migrationBuilder.RenameTable(
                name: "MucTieuDinhDuong",
                newName: "NutritionTarget");

            migrationBuilder.RenameTable(
                name: "MonNguoiDung",
                newName: "CustomDish");

            migrationBuilder.RenameTable(
                name: "HoSoNguoiDung",
                newName: "UserProfile");

            migrationBuilder.RenameTable(
                name: "ChiSoCoThe",
                newName: "BodyMetric");

            migrationBuilder.RenameColumn(
                name: "MaClaim",
                table: "VaiTroClaim",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "MaVaiTro",
                table: "VaiTro",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "ThuHoiVao",
                table: "RefreshToken",
                newName: "RevokedAt");

            migrationBuilder.RenameColumn(
                name: "ThuHoiBoiIP",
                table: "RefreshToken",
                newName: "RevokedByIp");

            migrationBuilder.RenameColumn(
                name: "ThayTheBangToken",
                table: "RefreshToken",
                newName: "ReplacedByToken");

            migrationBuilder.RenameColumn(
                name: "TaoBoiIP",
                table: "RefreshToken",
                newName: "CreatedByIp");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "RefreshToken",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "RefreshToken",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "LyDoThuHoi",
                table: "RefreshToken",
                newName: "ReasonRevoked");

            migrationBuilder.RenameColumn(
                name: "HetHanVao",
                table: "RefreshToken",
                newName: "ExpiresAt");

            migrationBuilder.RenameColumn(
                name: "MaRefreshToken",
                table: "RefreshToken",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_RefreshToken_MaNguoiDung",
                table: "RefreshToken",
                newName: "IX_RefreshToken_UserId");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "NguoiDungVaiTro",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "MaClaim",
                table: "NguoiDungClaim",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "TenDangNhapChuanHoa",
                table: "NguoiDung",
                newName: "NormalizedUserName");

            migrationBuilder.RenameColumn(
                name: "TenDangNhap",
                table: "NguoiDung",
                newName: "UserName");

            migrationBuilder.RenameColumn(
                name: "SoLanDangNhapThatBai",
                table: "NguoiDung",
                newName: "AccessFailedCount");

            migrationBuilder.RenameColumn(
                name: "SoDienThoaiXacNhan",
                table: "NguoiDung",
                newName: "PhoneNumberConfirmed");

            migrationBuilder.RenameColumn(
                name: "SoDienThoai",
                table: "NguoiDung",
                newName: "PhoneNumber");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "NguoiDung",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgaySinh",
                table: "NguoiDung",
                newName: "DateOfBirth");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "NguoiDung",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "MatKhauHash",
                table: "NguoiDung",
                newName: "PasswordHash");

            migrationBuilder.RenameColumn(
                name: "KichHoatKhoa",
                table: "NguoiDung",
                newName: "LockoutEnabled");

            migrationBuilder.RenameColumn(
                name: "KichHoatHaiYeuTo",
                table: "NguoiDung",
                newName: "TwoFactorEnabled");

            migrationBuilder.RenameColumn(
                name: "KetThucKhoa",
                table: "NguoiDung",
                newName: "LockoutEnd");

            migrationBuilder.RenameColumn(
                name: "HoTen",
                table: "NguoiDung",
                newName: "FullName");

            migrationBuilder.RenameColumn(
                name: "GioiTinh",
                table: "NguoiDung",
                newName: "Gender");

            migrationBuilder.RenameColumn(
                name: "EmailXacNhan",
                table: "NguoiDung",
                newName: "EmailConfirmed");

            migrationBuilder.RenameColumn(
                name: "EmailChuanHoa",
                table: "NguoiDung",
                newName: "NormalizedEmail");

            migrationBuilder.RenameColumn(
                name: "DauDongBo",
                table: "NguoiDung",
                newName: "ConcurrencyStamp");

            migrationBuilder.RenameColumn(
                name: "DauAnToan",
                table: "NguoiDung",
                newName: "SecurityStamp");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "NguoiDung",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "ThuongHieu",
                table: "Food",
                newName: "Brand");

            migrationBuilder.RenameColumn(
                name: "TenThucPham",
                table: "Food",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "Protein100g",
                table: "Food",
                newName: "ProteinGrams");

            migrationBuilder.RenameColumn(
                name: "PhanLoai",
                table: "Food",
                newName: "Category");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "Food",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "Food",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "MoTaKhauPhan",
                table: "Food",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "LaTuDinhNghia",
                table: "Food",
                newName: "IsCustom");

            migrationBuilder.RenameColumn(
                name: "KhoiLuongPhucVuGram",
                table: "Food",
                newName: "ServingSizeGrams");

            migrationBuilder.RenameColumn(
                name: "Fat100g",
                table: "Food",
                newName: "FatGrams");

            migrationBuilder.RenameColumn(
                name: "Carb100g",
                table: "Food",
                newName: "CarbohydrateGrams");

            migrationBuilder.RenameColumn(
                name: "Calo100g",
                table: "Food",
                newName: "CaloriesKcal");

            migrationBuilder.RenameColumn(
                name: "MaThucPham",
                table: "Food",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_ThucPham_TenThucPham",
                table: "Food",
                newName: "IX_Food_Name");

            migrationBuilder.RenameColumn(
                name: "Protein",
                table: "DiaryEntry",
                newName: "ProteinGrams");

            migrationBuilder.RenameColumn(
                name: "Nguon",
                table: "DiaryEntry",
                newName: "Source");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "DiaryEntry",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "DiaryEntry",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayAn",
                table: "DiaryEntry",
                newName: "MealDate");

            migrationBuilder.RenameColumn(
                name: "MaThucPham",
                table: "DiaryEntry",
                newName: "FoodId");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "DiaryEntry",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "MaMuc",
                table: "DiaryEntry",
                newName: "ItemId");

            migrationBuilder.RenameColumn(
                name: "MaMonNguoiDung",
                table: "DiaryEntry",
                newName: "CustomDishId");

            migrationBuilder.RenameColumn(
                name: "MaCongThucAI",
                table: "DiaryEntry",
                newName: "AiRecipeId");

            migrationBuilder.RenameColumn(
                name: "MaBuaAn",
                table: "DiaryEntry",
                newName: "MealCode");

            migrationBuilder.RenameColumn(
                name: "KhoiLuongGram",
                table: "DiaryEntry",
                newName: "QuantityGrams");

            migrationBuilder.RenameColumn(
                name: "GhiChu",
                table: "DiaryEntry",
                newName: "Notes");

            migrationBuilder.RenameColumn(
                name: "Fat",
                table: "DiaryEntry",
                newName: "FatGrams");

            migrationBuilder.RenameColumn(
                name: "Carb",
                table: "DiaryEntry",
                newName: "CarbohydrateGrams");

            migrationBuilder.RenameColumn(
                name: "Calo",
                table: "DiaryEntry",
                newName: "CaloriesKcal");

            migrationBuilder.RenameColumn(
                name: "MaNhatKy",
                table: "DiaryEntry",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_NhatKyAnUong_MaThucPham",
                table: "DiaryEntry",
                newName: "IX_DiaryEntry_FoodId");

            migrationBuilder.RenameIndex(
                name: "IX_NhatKyAnUong_MaNguoiDung_NgayAn_MaBuaAn_MaMuc_Nguon",
                table: "DiaryEntry",
                newName: "IX_DiaryEntry_UserId_MealDate_MealCode_ItemId_Source");

            migrationBuilder.RenameIndex(
                name: "IX_NhatKyAnUong_MaMonNguoiDung",
                table: "DiaryEntry",
                newName: "IX_DiaryEntry_CustomDishId");

            migrationBuilder.RenameIndex(
                name: "IX_NhatKyAnUong_MaCongThucAI",
                table: "DiaryEntry",
                newName: "IX_DiaryEntry_AiRecipeId");

            migrationBuilder.RenameColumn(
                name: "ProteinG",
                table: "NutritionTarget",
                newName: "ProteinGrams");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "NutritionTarget",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "NutritionTarget",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "NutritionTarget",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "LaHoatDong",
                table: "NutritionTarget",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "HieuLucTuNgay",
                table: "NutritionTarget",
                newName: "EffectiveDate");

            migrationBuilder.RenameColumn(
                name: "FatG",
                table: "NutritionTarget",
                newName: "FatGrams");

            migrationBuilder.RenameColumn(
                name: "CarbG",
                table: "NutritionTarget",
                newName: "CarbohydrateGrams");

            migrationBuilder.RenameColumn(
                name: "CaloKcal",
                table: "NutritionTarget",
                newName: "CaloriesKcal");

            migrationBuilder.RenameColumn(
                name: "MaMucTieuDD",
                table: "NutritionTarget",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_MucTieuDinhDuong_MaNguoiDung_LaHoatDong",
                table: "NutritionTarget",
                newName: "IX_NutritionTarget_UserId_IsActive");

            migrationBuilder.RenameColumn(
                name: "TenMon",
                table: "CustomDish",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "Protein100g",
                table: "CustomDish",
                newName: "ProteinGrams");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "CustomDish",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "CustomDish",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "MoTa",
                table: "CustomDish",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "CustomDish",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "KhoiLuongPhucVuGram",
                table: "CustomDish",
                newName: "PortionSizeGrams");

            migrationBuilder.RenameColumn(
                name: "Fat100g",
                table: "CustomDish",
                newName: "FatGrams");

            migrationBuilder.RenameColumn(
                name: "Carb100g",
                table: "CustomDish",
                newName: "CarbohydrateGrams");

            migrationBuilder.RenameColumn(
                name: "Calo100g",
                table: "CustomDish",
                newName: "CaloriesKcal");

            migrationBuilder.RenameColumn(
                name: "MaMonNguoiDung",
                table: "CustomDish",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_MonNguoiDung_MaNguoiDung",
                table: "CustomDish",
                newName: "IX_CustomDish_UserId");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "UserProfile",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgaySinh",
                table: "UserProfile",
                newName: "DateOfBirth");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "UserProfile",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "MucTieu",
                table: "UserProfile",
                newName: "Goal");

            migrationBuilder.RenameColumn(
                name: "MucDoHoatDong",
                table: "UserProfile",
                newName: "ActivityLevel");

            migrationBuilder.RenameColumn(
                name: "HoTen",
                table: "UserProfile",
                newName: "FullName");

            migrationBuilder.RenameColumn(
                name: "GioiTinh",
                table: "UserProfile",
                newName: "Gender");

            migrationBuilder.RenameColumn(
                name: "ChieuCaoCm",
                table: "UserProfile",
                newName: "HeightCm");

            migrationBuilder.RenameColumn(
                name: "CanNangMucTieuKg",
                table: "UserProfile",
                newName: "TargetWeightKg");

            migrationBuilder.RenameColumn(
                name: "AnhDaiDienUrl",
                table: "UserProfile",
                newName: "AvatarUrl");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "UserProfile",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "VongMongCm",
                table: "BodyMetric",
                newName: "HipCm");

            migrationBuilder.RenameColumn(
                name: "VongEoCm",
                table: "BodyMetric",
                newName: "WaistCm");

            migrationBuilder.RenameColumn(
                name: "TiLeMoCoThe",
                table: "BodyMetric",
                newName: "BodyFatPercent");

            migrationBuilder.RenameColumn(
                name: "NgayTao",
                table: "BodyMetric",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NgayCapNhat",
                table: "BodyMetric",
                newName: "RecordedAt");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "BodyMetric",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "KhoiLuongCoKg",
                table: "BodyMetric",
                newName: "MuscleMassKg");

            migrationBuilder.RenameColumn(
                name: "CanNangKg",
                table: "BodyMetric",
                newName: "WeightKg");

            migrationBuilder.RenameColumn(
                name: "MaChiSo",
                table: "BodyMetric",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_ChiSoCoThe_MaNguoiDung_NgayCapNhat",
                table: "BodyMetric",
                newName: "IX_BodyMetric_UserId_RecordedAt");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Food",
                table: "Food",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DiaryEntry",
                table: "DiaryEntry",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NutritionTarget",
                table: "NutritionTarget",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CustomDish",
                table: "CustomDish",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserProfile",
                table: "UserProfile",
                column: "UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BodyMetric",
                table: "BodyMetric",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "NguoiDung",
                column: "NormalizedEmail",
                unique: true,
                filter: "[NormalizedEmail] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "NguoiDung",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DiaryEntry_ExactlyOneSource",
                table: "DiaryEntry",
                sql: "(CASE WHEN [FoodId] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [CustomDishId] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [AiRecipeId] IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_BodyMetric_NguoiDung_UserId",
                table: "BodyMetric",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomDish_NguoiDung_UserId",
                table: "CustomDish",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomDishIngredient_CustomDish_CustomDishId",
                table: "CustomDishIngredient",
                column: "CustomDishId",
                principalTable: "CustomDish",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomDishIngredient_Food_FoodId",
                table: "CustomDishIngredient",
                column: "FoodId",
                principalTable: "Food",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DiaryEntry_AiRecipe_AiRecipeId",
                table: "DiaryEntry",
                column: "AiRecipeId",
                principalTable: "AiRecipe",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DiaryEntry_CustomDish_CustomDishId",
                table: "DiaryEntry",
                column: "CustomDishId",
                principalTable: "CustomDish",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DiaryEntry_Food_FoodId",
                table: "DiaryEntry",
                column: "FoodId",
                principalTable: "Food",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DiaryEntry_NguoiDung_UserId",
                table: "DiaryEntry",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiDungVaiTro_NguoiDung_UserId",
                table: "NguoiDungVaiTro",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NutritionTarget_NguoiDung_UserId",
                table: "NutritionTarget",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshToken_NguoiDung_UserId",
                table: "RefreshToken",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserProfile_NguoiDung_UserId",
                table: "UserProfile",
                column: "UserId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
