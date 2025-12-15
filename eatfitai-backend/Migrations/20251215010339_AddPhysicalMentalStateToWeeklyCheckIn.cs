using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    /// <summary>
    /// Add physical and mental state fields to WeeklyCheckIn for enhanced tracking
    /// </summary>
    public partial class AddPhysicalMentalStateToWeeklyCheckIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SleepQuality",
                table: "WeeklyCheckIns",
                type: "int",
                nullable: true,
                comment: "Sleep quality rating 1-5 (1=poor, 5=excellent)");

            migrationBuilder.AddColumn<int>(
                name: "HungerLevel",
                table: "WeeklyCheckIns",
                type: "int",
                nullable: true,
                comment: "Hunger level 1-5 (1=always full, 5=very hungry)");

            migrationBuilder.AddColumn<int>(
                name: "StressLevel",
                table: "WeeklyCheckIns",
                type: "int",
                nullable: true,
                comment: "Stress level 1-5 (1=low, 5=very high)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SleepQuality",
                table: "WeeklyCheckIns");

            migrationBuilder.DropColumn(
                name: "HungerLevel",
                table: "WeeklyCheckIns");

            migrationBuilder.DropColumn(
                name: "StressLevel",
                table: "WeeklyCheckIns");
        }
    }
}
