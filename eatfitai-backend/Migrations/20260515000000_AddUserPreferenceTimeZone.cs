using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    public partial class AddUserPreferenceTimeZone : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "UserPreference"
                    ADD COLUMN IF NOT EXISTS "TimeZoneId" character varying(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "UserPreference"
                    DROP COLUMN IF EXISTS "TimeZoneId";
                """);
        }
    }
}
