using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations.EatFitAIDb
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NutritionTarget_UserId",
                table: "NutritionTarget");

            migrationBuilder.DropIndex(
                name: "IX_BodyMetric_UserId",
                table: "BodyMetric");

            migrationBuilder.DropIndex(
                name: "IX_AILog_UserId",
                table: "AILog");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteFood_User_CreatedAt",
                table: "UserFavoriteFood",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTarget_User_EffectiveWindow",
                table: "NutritionTarget",
                columns: new[] { "UserId", "EffectiveFrom", "EffectiveTo" });

            migrationBuilder.CreateIndex(
                name: "IX_BodyMetric_User_MeasuredDate",
                table: "BodyMetric",
                columns: new[] { "UserId", "MeasuredDate" });

            migrationBuilder.CreateIndex(
                name: "IX_AILog_User_Action_CreatedAt",
                table: "AILog",
                columns: new[] { "UserId", "Action", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserFavoriteFood_User_CreatedAt",
                table: "UserFavoriteFood");

            migrationBuilder.DropIndex(
                name: "IX_NutritionTarget_User_EffectiveWindow",
                table: "NutritionTarget");

            migrationBuilder.DropIndex(
                name: "IX_BodyMetric_User_MeasuredDate",
                table: "BodyMetric");

            migrationBuilder.DropIndex(
                name: "IX_AILog_User_Action_CreatedAt",
                table: "AILog");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTarget_UserId",
                table: "NutritionTarget",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BodyMetric_UserId",
                table: "BodyMetric",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AILog_UserId",
                table: "AILog",
                column: "UserId");
        }
    }
}
