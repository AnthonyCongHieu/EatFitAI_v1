using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations.EatFitAIDb
{
    /// <inheritdoc />
    public partial class AddCredibilityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "FoodItem",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "ReliabilityScore",
                table: "FoodItem",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "FoodItem",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedBy",
                table: "FoodItem",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "ReliabilityScore",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "VerifiedBy",
                table: "FoodItem");
        }
    }
}
