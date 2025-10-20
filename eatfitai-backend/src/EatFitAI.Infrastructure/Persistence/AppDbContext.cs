using EatFitAI.Domain.Ai;
using EatFitAI.Domain.Auth;
using EatFitAI.Domain.Diary;
using EatFitAI.Domain.Foods;
using EatFitAI.Domain.Metadata;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EatFitAI.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<NguoiDung, IdentityRole<Guid>, Guid>
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

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<BodyMetric> BodyMetrics => Set<BodyMetric>();
    public DbSet<NutritionTarget> NutritionTargets => Set<NutritionTarget>();
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<CustomDish> CustomDishes => Set<CustomDish>();
    public DbSet<CustomDishIngredient> CustomDishIngredients => Set<CustomDishIngredient>();
    public DbSet<DiaryEntry> DiaryEntries => Set<DiaryEntry>();
    public DbSet<AiRecipe> AiRecipes => Set<AiRecipe>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ScriptHistory> ScriptHistory => Set<ScriptHistory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<NguoiDung>(entity =>
        {
            entity.ToTable("NguoiDung");
            entity.HasIndex(u => u.NormalizedEmail).IsUnique();
        });

        builder.Entity<IdentityRole<Guid>>().ToTable("VaiTro");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("NguoiDungVaiTro");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("NguoiDungClaim");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("NguoiDungLogin");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("VaiTroClaim");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("NguoiDungToken");

        builder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfile");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.DateOfBirth).HasConversion(NullableDateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.HeightCm).HasColumnType("decimal(9,2)");
            entity.Property(x => x.TargetWeightKg).HasColumnType("decimal(9,2)");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<UserProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<BodyMetric>(entity =>
        {
            entity.ToTable("BodyMetric");
            entity.Property(x => x.WeightKg).HasColumnType("decimal(9,2)");
            entity.Property(x => x.BodyFatPercent).HasColumnType("decimal(9,2)");
            entity.Property(x => x.MuscleMassKg).HasColumnType("decimal(9,2)");
            entity.Property(x => x.WaistCm).HasColumnType("decimal(9,2)");
            entity.Property(x => x.HipCm).HasColumnType("decimal(9,2)");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => new { x.UserId, x.RecordedAt });
            entity.HasOne(x => x.User)
                .WithMany(u => u.BodyMetrics)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<NutritionTarget>(entity =>
        {
            entity.ToTable("NutritionTarget");
            entity.Property(x => x.EffectiveDate).HasConversion(DateOnlyConverter).HasColumnType("date");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => new { x.UserId, x.IsActive });
            entity.HasOne(x => x.User)
                .WithMany(u => u.NutritionTargets)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Food>(entity =>
        {
            entity.ToTable("Food");
            entity.Property(x => x.ServingSizeGrams).HasColumnType("decimal(9,2)");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => x.Name);
        });

        builder.Entity<CustomDish>(entity =>
        {
            entity.ToTable("CustomDish");
            entity.Property(x => x.PortionSizeGrams).HasColumnType("decimal(9,2)");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.CustomDishes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CustomDishIngredient>(entity =>
        {
            entity.ToTable("CustomDishIngredient");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.QuantityGrams).HasColumnType("decimal(9,2)");
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.Ingredients)
                .HasForeignKey(x => x.CustomDishId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.CustomDishIngredients)
                .HasForeignKey(x => x.FoodId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AiRecipe>(entity =>
        {
            entity.ToTable("AiRecipe");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.AiRecipes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DiaryEntry>(entity =>
        {
            entity.ToTable("DiaryEntry", table =>
            {
                table.HasCheckConstraint("CK_DiaryEntry_ExactlyOneSource",
                    "(CASE WHEN [FoodId] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [CustomDishId] IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN [AiRecipeId] IS NOT NULL THEN 1 ELSE 0 END) = 1");
            });
            entity.Property(x => x.MealDate).HasConversion(DateOnlyConverter).HasColumnType("date");
            entity.Property(x => x.MealCode).HasMaxLength(32);
            entity.Property(x => x.Source).HasMaxLength(32);
            entity.Property(x => x.QuantityGrams).HasColumnType("decimal(9,2)");
            ConfigureMacroColumns(entity.Property(x => x.CaloriesKcal), isKcal: true);
            ConfigureMacroColumns(entity.Property(x => x.ProteinGrams));
            ConfigureMacroColumns(entity.Property(x => x.CarbohydrateGrams));
            ConfigureMacroColumns(entity.Property(x => x.FatGrams));
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => new { x.UserId, x.MealDate, x.MealCode, x.ItemId, x.Source }).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(u => u.DiaryEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Food)
                .WithMany(f => f.DiaryEntries)
                .HasForeignKey(x => x.FoodId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CustomDish)
                .WithMany(d => d.DiaryEntries)
                .HasForeignKey(x => x.CustomDishId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.AiRecipe)
                .WithMany(r => r.DiaryEntries)
                .HasForeignKey(x => x.AiRecipeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshToken");
            entity.HasIndex(x => x.Token).IsUnique();
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ScriptHistory>(entity =>
        {
            entity.ToTable("ScriptHistory");
            entity.Property(x => x.FileName).HasMaxLength(260);
            entity.Property(x => x.AppliedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(x => x.FileName).IsUnique();
        });
    }

    private static void ConfigureMacroColumns(PropertyBuilder<decimal> propertyBuilder, bool isKcal = false)
    {
        var columnType = isKcal ? "decimal(10,2)" : "decimal(9,2)";
        propertyBuilder.HasColumnType(columnType);
    }
}
