using System;
using System.Collections.Generic;
using EatFitAI.API.DbScaffold.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.DbScaffold.Data;

public partial class EatFitAIDbContext : DbContext
{
    public EatFitAIDbContext(DbContextOptions<EatFitAIDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AILog> AILogs { get; set; }

    public virtual DbSet<AISuggestion> AISuggestions { get; set; }

    public virtual DbSet<ActivityLevel> ActivityLevels { get; set; }

    public virtual DbSet<BodyMetric> BodyMetrics { get; set; }

    public virtual DbSet<FoodItem> FoodItems { get; set; }

    public virtual DbSet<FoodServing> FoodServings { get; set; }

    public virtual DbSet<ImageDetection> ImageDetections { get; set; }

    public virtual DbSet<MealDiary> MealDiaries { get; set; }

    public virtual DbSet<MealType> MealTypes { get; set; }

    public virtual DbSet<NutritionTarget> NutritionTargets { get; set; }

    public virtual DbSet<Recipe> Recipes { get; set; }

    public virtual DbSet<RecipeIngredient> RecipeIngredients { get; set; }

    public virtual DbSet<ServingUnit> ServingUnits { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserDish> UserDishes { get; set; }

    public virtual DbSet<UserDishIngredient> UserDishIngredients { get; set; }

    public virtual DbSet<UserFavoriteFood> UserFavoriteFoods { get; set; }

    public virtual DbSet<UserFoodItem> UserFoodItems { get; set; }

    public virtual DbSet<UserRecentFood> UserRecentFoods { get; set; }

    public virtual DbSet<vw_DailyMacroShare> vw_DailyMacroShares { get; set; }

    public virtual DbSet<vw_DailyNutritionTotal> vw_DailyNutritionTotals { get; set; }

    public virtual DbSet<vw_MonthlyTotal> vw_MonthlyTotals { get; set; }

    public virtual DbSet<vw_TargetProgress> vw_TargetProgresses { get; set; }

    public virtual DbSet<vw_WeeklyNutritionTotal> vw_WeeklyNutritionTotals { get; set; }
    public virtual DbSet<vw_AiFoodMap> vw_AiFoodMaps { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AILog>(entity =>
        {
            entity.ToTable("AILog");

            entity.Property(e => e.Action).HasMaxLength(50);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.User).WithMany(p => p.AILogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AILog_User");
        });

        modelBuilder.Entity<AISuggestion>(entity =>
        {
            entity.ToTable("AISuggestion");

            entity.HasIndex(e => e.AILogId, "IX_AISuggestion_AILog");

            entity.Property(e => e.Confidence).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.AILog).WithMany(p => p.AISuggestions)
                .HasForeignKey(d => d.AILogId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AISuggestion_AILog");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.AISuggestions)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AISuggestion_FoodItem");
        });

        modelBuilder.Entity<ActivityLevel>(entity =>
        {
            entity.ToTable("ActivityLevel");

            entity.HasIndex(e => e.Name, "UQ_ActivityLevel_Name").IsUnique();

            entity.Property(e => e.ActivityFactor).HasColumnType("decimal(4, 2)");
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<BodyMetric>(entity =>
        {
            entity.ToTable("BodyMetric");

            entity.Property(e => e.HeightCm).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Note).HasMaxLength(200);
            entity.Property(e => e.WeightKg).HasColumnType("decimal(5, 2)");

            entity.HasOne(d => d.User).WithMany(p => p.BodyMetrics)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BodyMetric_User");
        });

        modelBuilder.Entity<FoodItem>(entity =>
        {
            entity.ToTable("FoodItem");

            entity.HasIndex(e => e.FoodName, "IX_FoodItem_Name").HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.CaloriesPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CarbPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.FatPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FoodName).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ProteinPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ThumbNail).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
        });

        modelBuilder.Entity<FoodServing>(entity =>
        {
            entity.ToTable("FoodServing");

            entity.HasIndex(e => new { e.FoodItemId, e.ServingUnitId }, "UQ_FoodServing").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.GramsPerUnit).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.FoodServings)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FoodServing_FoodItem");

            entity.HasOne(d => d.ServingUnit).WithMany(p => p.FoodServings)
                .HasForeignKey(d => d.ServingUnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FoodServing_ServingUnit");
        });

        modelBuilder.Entity<ImageDetection>(entity =>
        {
            entity.ToTable("ImageDetection");

            entity.Property(e => e.Confidence).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.Label).HasMaxLength(200);

            entity.HasOne(d => d.AILog).WithMany(p => p.ImageDetections)
                .HasForeignKey(d => d.AILogId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ImageDetection_AILog");
        });

        modelBuilder.Entity<MealDiary>(entity =>
        {
            entity.ToTable("MealDiary");

            entity.HasIndex(e => e.EatenDate, "IX_MealDiary_EatenDate").HasFilter("([IsDeleted]=(0))");

            entity.HasIndex(e => new { e.UserId, e.EatenDate }, "IX_MealDiary_UserDate").HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Calories).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Carb).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Fat).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Grams).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.PhotoUrl).HasMaxLength(500);
            entity.Property(e => e.PortionQuantity).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Protein).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.SourceMethod).HasMaxLength(30);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.FoodItemId)
                .HasConstraintName("FK_MealDiary_FoodItem");

            entity.HasOne(d => d.MealType).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.MealTypeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MealDiary_MealType");

            entity.HasOne(d => d.Recipe).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.RecipeId)
                .HasConstraintName("FK_MealDiary_Recipe");

            entity.HasOne(d => d.ServingUnit).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.ServingUnitId)
                .HasConstraintName("FK_MealDiary_ServingUnit");

            entity.HasOne(d => d.UserDish).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.UserDishId)
                .HasConstraintName("FK_MealDiary_UserDish");

            entity.HasOne(d => d.User).WithMany(p => p.MealDiaries)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MealDiary_User");
        });

        modelBuilder.Entity<MealType>(entity =>
        {
            entity.ToTable("MealType");

            entity.HasIndex(e => e.Name, "UQ_MealType_Name").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(50);
        });

        modelBuilder.Entity<NutritionTarget>(entity =>
        {
            entity.ToTable("NutritionTarget");

            entity.HasOne(d => d.ActivityLevel).WithMany(p => p.NutritionTargets)
                .HasForeignKey(d => d.ActivityLevelId)
                .HasConstraintName("FK_NutritionTarget_ActivityLevel");

            entity.HasOne(d => d.User).WithMany(p => p.NutritionTargets)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NutritionTarget_User");
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.ToTable("Recipe");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.RecipeName).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.ToTable("RecipeIngredient");

            entity.HasIndex(e => e.RecipeId, "IX_RecipeIngredient_Recipe");

            entity.Property(e => e.Grams).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.RecipeIngredients)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecipeIngredient_FoodItem");

            entity.HasOne(d => d.Recipe).WithMany(p => p.RecipeIngredients)
                .HasForeignKey(d => d.RecipeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecipeIngredient_Recipe");
        });

        modelBuilder.Entity<ServingUnit>(entity =>
        {
            entity.ToTable("ServingUnit");

            entity.HasIndex(e => e.Name, "UQ_ServingUnit_Name").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Symbol).HasMaxLength(20);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();

            entity.Property(e => e.UserId).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DisplayName).HasMaxLength(150);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.PasswordHash).HasMaxLength(256);
        });

        modelBuilder.Entity<UserDish>(entity =>
        {
            entity.ToTable("UserDish");

            entity.HasIndex(e => new { e.UserId, e.DishName }, "IX_UserDish_UserName").HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.DishName).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.User).WithMany(p => p.UserDishes)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserDish_User");
        });

        modelBuilder.Entity<UserDishIngredient>(entity =>
        {
            entity.ToTable("UserDishIngredient");

            entity.Property(e => e.Grams).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.UserDishIngredients)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserDishIngredient_FoodItem");

            entity.HasOne(d => d.UserDish).WithMany(p => p.UserDishIngredients)
                .HasForeignKey(d => d.UserDishId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserDishIngredient_UserDish");
        });

        modelBuilder.Entity<UserFavoriteFood>(entity =>
        {
            entity.ToTable("UserFavoriteFood");

            entity.HasIndex(e => e.UserId, "IX_UserFavoriteFood_User");

            entity.HasIndex(e => new { e.UserId, e.FoodItemId }, "UQ_UserFavoriteFood").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.FoodItem).WithMany(p => p.UserFavoriteFoods)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserFavoriteFood_FoodItem");

            entity.HasOne(d => d.User).WithMany(p => p.UserFavoriteFoods)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserFavoriteFood_User");
        });

        modelBuilder.Entity<UserFoodItem>(entity =>
        {
            entity.ToTable("UserFoodItem", tb => tb.HasTrigger("tr_UserFoodItem_SetUpdatedAt"));

            entity.HasIndex(e => new { e.UserId, e.FoodName }, "UQ_UserFoodItem_User_Name").IsUnique();

            entity.Property(e => e.CaloriesPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CarbPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.FatPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FoodName).HasMaxLength(255);
            entity.Property(e => e.ProteinPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.UnitType)
                .HasMaxLength(2)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.User).WithMany(p => p.UserFoodItems)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserFoodItem_User");
        });

        modelBuilder.Entity<UserRecentFood>(entity =>
        {
            entity.ToTable("UserRecentFood");

            entity.HasIndex(e => e.UserId, "IX_UserRecentFood_User");

            entity.HasIndex(e => new { e.UserId, e.FoodItemId }, "UQ_UserRecentFood").IsUnique();

            entity.Property(e => e.LastUsedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.UsedCount).HasDefaultValue(1);

            entity.HasOne(d => d.FoodItem).WithMany(p => p.UserRecentFoods)
                .HasForeignKey(d => d.FoodItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserRecentFood_FoodItem");

            entity.HasOne(d => d.User).WithMany(p => p.UserRecentFoods)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserRecentFood_User");
        });

        modelBuilder.Entity<vw_DailyMacroShare>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_DailyMacroShare");

            entity.Property(e => e.CarbShare).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.FatShare).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.ProteinShare).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.TotalCalories).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<vw_DailyNutritionTotal>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_DailyNutritionTotals");

            entity.Property(e => e.TotalCalories).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<vw_MonthlyTotal>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_MonthlyTotals");

            entity.Property(e => e.TotalCalories).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<vw_TargetProgress>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_TargetProgress");

            entity.Property(e => e.TotalCalories).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<vw_WeeklyNutritionTotal>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_WeeklyNutritionTotals");

            entity.Property(e => e.TotalCalories).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalCarb).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalFat).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.TotalProtein).HasColumnType("decimal(38, 2)");
        });

        modelBuilder.Entity<vw_AiFoodMap>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_AiFoodMap");

            entity.Property(e => e.CaloriesPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ProteinPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FatPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CarbPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MinConfidence).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Label).HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
