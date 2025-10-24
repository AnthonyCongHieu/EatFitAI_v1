using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UnifyDbContextVietnameseMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AiRecipe_NguoiDung_UserId",
                table: "AiRecipe");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_MonNguoiDung_CustomDishId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomDishIngredient_ThucPham_FoodId",
                table: "CustomDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_AiRecipe_MaCongThucAI",
                table: "NhatKyAnUong");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ScriptHistory",
                table: "ScriptHistory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CustomDishIngredient",
                table: "CustomDishIngredient");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AiRecipe",
                table: "AiRecipe");

            migrationBuilder.RenameTable(
                name: "ScriptHistory",
                newName: "LichSuCapNhat");

            migrationBuilder.RenameTable(
                name: "CustomDishIngredient",
                newName: "NguyenLieuMonNguoiDung");

            migrationBuilder.RenameTable(
                name: "AiRecipe",
                newName: "NhatKyAI");

            migrationBuilder.RenameColumn(
                name: "FileName",
                table: "LichSuCapNhat",
                newName: "TenFile");

            migrationBuilder.RenameColumn(
                name: "AppliedAt",
                table: "LichSuCapNhat",
                newName: "ThoiGianApDung");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "LichSuCapNhat",
                newName: "MaLichSu");

            migrationBuilder.RenameIndex(
                name: "IX_ScriptHistory_FileName",
                table: "LichSuCapNhat",
                newName: "IX_LichSuCapNhat_TenFile");

            migrationBuilder.RenameColumn(
                name: "QuantityGrams",
                table: "NguyenLieuMonNguoiDung",
                newName: "KhoiLuongGram");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "NguyenLieuMonNguoiDung",
                newName: "TenNguyenLieu");

            migrationBuilder.RenameColumn(
                name: "FoodId",
                table: "NguyenLieuMonNguoiDung",
                newName: "MaThucPham");

            migrationBuilder.RenameColumn(
                name: "CustomDishId",
                table: "NguyenLieuMonNguoiDung",
                newName: "MaMonNguoiDung");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "NguyenLieuMonNguoiDung",
                newName: "MaNguyenLieu");

            migrationBuilder.RenameIndex(
                name: "IX_CustomDishIngredient_FoodId",
                table: "NguyenLieuMonNguoiDung",
                newName: "IX_NguyenLieuMonNguoiDung_MaThucPham");

            migrationBuilder.RenameIndex(
                name: "IX_CustomDishIngredient_CustomDishId",
                table: "NguyenLieuMonNguoiDung",
                newName: "IX_NguyenLieuMonNguoiDung_MaMonNguoiDung");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "NhatKyAI",
                newName: "MaNguoiDung");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "NhatKyAI",
                newName: "TenGoiY");

            migrationBuilder.RenameColumn(
                name: "Summary",
                table: "NhatKyAI",
                newName: "TomTat");

            migrationBuilder.RenameColumn(
                name: "StepsJson",
                table: "NhatKyAI",
                newName: "BuocCheBienJson");

            migrationBuilder.RenameColumn(
                name: "IngredientsJson",
                table: "NhatKyAI",
                newName: "NguyenLieuJson");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "NhatKyAI",
                newName: "ThoiGianTao");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "NhatKyAI",
                newName: "MaGoiYAI");

            migrationBuilder.RenameIndex(
                name: "IX_AiRecipe_UserId",
                table: "NhatKyAI",
                newName: "IX_NhatKyAI_MaNguoiDung");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LichSuCapNhat",
                table: "LichSuCapNhat",
                column: "MaLichSu");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NguyenLieuMonNguoiDung",
                table: "NguyenLieuMonNguoiDung",
                column: "MaNguyenLieu");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NhatKyAI",
                table: "NhatKyAI",
                column: "MaGoiYAI");

            migrationBuilder.AddForeignKey(
                name: "FK_NguyenLieuMonNguoiDung_MonNguoiDung_MaMonNguoiDung",
                table: "NguyenLieuMonNguoiDung",
                column: "MaMonNguoiDung",
                principalTable: "MonNguoiDung",
                principalColumn: "MaMonNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NguyenLieuMonNguoiDung_ThucPham_MaThucPham",
                table: "NguyenLieuMonNguoiDung",
                column: "MaThucPham",
                principalTable: "ThucPham",
                principalColumn: "MaThucPham",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAI_NguoiDung_MaNguoiDung",
                table: "NhatKyAI",
                column: "MaNguoiDung",
                principalTable: "NguoiDung",
                principalColumn: "MaNguoiDung",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NhatKyAnUong_NhatKyAI_MaCongThucAI",
                table: "NhatKyAnUong",
                column: "MaCongThucAI",
                principalTable: "NhatKyAI",
                principalColumn: "MaGoiYAI",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NguyenLieuMonNguoiDung_MonNguoiDung_MaMonNguoiDung",
                table: "NguyenLieuMonNguoiDung");

            migrationBuilder.DropForeignKey(
                name: "FK_NguyenLieuMonNguoiDung_ThucPham_MaThucPham",
                table: "NguyenLieuMonNguoiDung");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAI_NguoiDung_MaNguoiDung",
                table: "NhatKyAI");

            migrationBuilder.DropForeignKey(
                name: "FK_NhatKyAnUong_NhatKyAI_MaCongThucAI",
                table: "NhatKyAnUong");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NhatKyAI",
                table: "NhatKyAI");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NguyenLieuMonNguoiDung",
                table: "NguyenLieuMonNguoiDung");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LichSuCapNhat",
                table: "LichSuCapNhat");

            migrationBuilder.RenameTable(
                name: "NhatKyAI",
                newName: "AiRecipe");

            migrationBuilder.RenameTable(
                name: "NguyenLieuMonNguoiDung",
                newName: "CustomDishIngredient");

            migrationBuilder.RenameTable(
                name: "LichSuCapNhat",
                newName: "ScriptHistory");

            migrationBuilder.RenameColumn(
                name: "TomTat",
                table: "AiRecipe",
                newName: "Summary");

            migrationBuilder.RenameColumn(
                name: "ThoiGianTao",
                table: "AiRecipe",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "TenGoiY",
                table: "AiRecipe",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "NguyenLieuJson",
                table: "AiRecipe",
                newName: "IngredientsJson");

            migrationBuilder.RenameColumn(
                name: "MaNguoiDung",
                table: "AiRecipe",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "BuocCheBienJson",
                table: "AiRecipe",
                newName: "StepsJson");

            migrationBuilder.RenameColumn(
                name: "MaGoiYAI",
                table: "AiRecipe",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_NhatKyAI_MaNguoiDung",
                table: "AiRecipe",
                newName: "IX_AiRecipe_UserId");

            migrationBuilder.RenameColumn(
                name: "TenNguyenLieu",
                table: "CustomDishIngredient",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "MaThucPham",
                table: "CustomDishIngredient",
                newName: "FoodId");

            migrationBuilder.RenameColumn(
                name: "MaMonNguoiDung",
                table: "CustomDishIngredient",
                newName: "CustomDishId");

            migrationBuilder.RenameColumn(
                name: "KhoiLuongGram",
                table: "CustomDishIngredient",
                newName: "QuantityGrams");

            migrationBuilder.RenameColumn(
                name: "MaNguyenLieu",
                table: "CustomDishIngredient",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_NguyenLieuMonNguoiDung_MaThucPham",
                table: "CustomDishIngredient",
                newName: "IX_CustomDishIngredient_FoodId");

            migrationBuilder.RenameIndex(
                name: "IX_NguyenLieuMonNguoiDung_MaMonNguoiDung",
                table: "CustomDishIngredient",
                newName: "IX_CustomDishIngredient_CustomDishId");

            migrationBuilder.RenameColumn(
                name: "ThoiGianApDung",
                table: "ScriptHistory",
                newName: "AppliedAt");

            migrationBuilder.RenameColumn(
                name: "TenFile",
                table: "ScriptHistory",
                newName: "FileName");

            migrationBuilder.RenameColumn(
                name: "MaLichSu",
                table: "ScriptHistory",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_LichSuCapNhat_TenFile",
                table: "ScriptHistory",
                newName: "IX_ScriptHistory_FileName");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AiRecipe",
                table: "AiRecipe",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CustomDishIngredient",
                table: "CustomDishIngredient",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ScriptHistory",
                table: "ScriptHistory",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecipe_NguoiDung_UserId",
                table: "AiRecipe",
                column: "UserId",
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
                name: "FK_NhatKyAnUong_AiRecipe_MaCongThucAI",
                table: "NhatKyAnUong",
                column: "MaCongThucAI",
                principalTable: "AiRecipe",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
