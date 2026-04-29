using System;
using System.Collections.Generic;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Data;

public partial class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AILog> AILogs { get; set; }

    public virtual DbSet<AiCorrectionEvent> AiCorrectionEvents { get; set; }

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

    public virtual DbSet<TelemetryEvent> TelemetryEvents { get; set; }

    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<UserAccessControl> UserAccessControls { get; set; }
    public virtual DbSet<PasswordResetCode> PasswordResetCodes { get; set; }

    public virtual DbSet<UserDish> UserDishes { get; set; }

    public virtual DbSet<UserDishIngredient> UserDishIngredients { get; set; }

    public virtual DbSet<UserFavoriteFood> UserFavoriteFoods { get; set; }

    public virtual DbSet<UserFoodItem> UserFoodItems { get; set; }

    public virtual DbSet<UserRecentFood> UserRecentFoods { get; set; }
    public virtual DbSet<AiLabelMap> AiLabelMaps { get; set; }
    public virtual DbSet<UserPreference> UserPreferences { get; set; }
    public virtual DbSet<GeminiKey> GeminiKeys { get; set; }
    public virtual DbSet<AdminAuditEvent> AdminAuditEvents { get; set; }
    public virtual DbSet<WaterIntake> WaterIntakes { get; set; }

    public virtual DbSet<vw_DailyMacroShare> vw_DailyMacroShares { get; set; }

    public virtual DbSet<vw_DailyNutritionTotal> vw_DailyNutritionTotals { get; set; }

    public virtual DbSet<vw_MonthlyTotal> vw_MonthlyTotals { get; set; }

    public virtual DbSet<vw_TargetProgress> vw_TargetProgresses { get; set; }

    public virtual DbSet<vw_WeeklyNutritionTotal> vw_WeeklyNutritionTotals { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AILog>(entity =>
        {
            entity.ToTable("AILog");

            entity.HasIndex(e => new { e.UserId, e.Action, e.CreatedAt }, "IX_AILog_User_Action_CreatedAt");

            entity.Property(e => e.Action).HasMaxLength(50);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.HasOne(d => d.User).WithMany(p => p.AILogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AILog_User");
        });

        modelBuilder.Entity<AiCorrectionEvent>(entity =>
        {
            entity.ToTable("AiCorrectionEvent");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_AiCorrectionEvent_User_CreatedAt");
            entity.HasIndex(e => new { e.Label, e.CreatedAt }, "IX_AiCorrectionEvent_Label_CreatedAt");
            entity.HasIndex(e => new { e.Source, e.CreatedAt }, "IX_AiCorrectionEvent_Source_CreatedAt");

            entity.Property(e => e.Label).HasMaxLength(200);
            entity.Property(e => e.SelectedFoodName).HasMaxLength(255);
            entity.Property(e => e.DetectedConfidence).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.Source).HasMaxLength(100);
            entity.Property(e => e.ClientTimestamp).HasPrecision(3);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AiCorrectionEvent_User");
        });

        modelBuilder.Entity<AISuggestion>(entity =>
        {
            entity.ToTable("AISuggestion");

            entity.HasIndex(e => e.AILogId, "IX_AISuggestion_AILog");

            entity.Property(e => e.Confidence).HasColumnType("decimal(5, 4)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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

            entity.HasIndex(e => new { e.UserId, e.MeasuredDate }, "IX_BodyMetric_User_MeasuredDate");

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

            entity.HasIndex(e => e.FoodName, "IX_FoodItem_Name").HasFilter("\"IsDeleted\" = false");

            entity.Property(e => e.Barcode).HasMaxLength(64);
            entity.Property(e => e.CaloriesPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CarbPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.FatPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FoodName).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ProteinPer100g).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ThumbNail).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
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

            entity.HasIndex(e => e.EatenDate, "IX_MealDiary_EatenDate").HasFilter("\"IsDeleted\" = false");

            entity.HasIndex(e => new { e.UserId, e.EatenDate }, "IX_MealDiary_UserDate").HasFilter("\"IsDeleted\" = false");

            entity.Property(e => e.Calories).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Carb).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.Fat).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Grams).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.PhotoUrl).HasMaxLength(500);
            entity.Property(e => e.PortionQuantity).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Protein).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.SourceMethod).HasMaxLength(30);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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

            entity.HasIndex(e => new { e.UserId, e.EffectiveFrom, e.EffectiveTo }, "IX_NutritionTarget_User_EffectiveWindow");

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
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.RecipeName).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
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
            entity.ToTable("Users");
            entity.HasKey(e => e.UserId);
            entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();

            entity.Property(e => e.UserId).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.EmailVerified)
                .HasColumnName("IsEmailVerified");

            entity.Property(e => e.AvatarUrl).HasColumnType("text");
            entity.Property(e => e.DisplayName).HasMaxLength(150);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.PasswordHash).HasMaxLength(256);
            entity.Property(e => e.Role).HasMaxLength(80).HasDefaultValue("user");
            entity.Property(e => e.TargetWeightKg).HasColumnType("numeric");
            entity.Property(e => e.VerificationCode)
                .HasColumnName("EmailVerificationToken");

            entity.Property(e => e.VerificationCodeExpiry)
                .HasColumnName("EmailVerificationExpiry");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<UserDish>(entity =>
        {
            entity.ToTable("UserDish");

            entity.HasIndex(e => new { e.UserId, e.DishName }, "IX_UserDish_UserName").HasFilter("\"IsDeleted\" = false");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.DishName).HasMaxLength(255);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_UserFavoriteFood_User_CreatedAt");

            entity.HasIndex(e => new { e.UserId, e.FoodItemId }, "UQ_UserFavoriteFood").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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
            entity.ToTable("UserFoodItem");

            entity.HasIndex(e => new { e.UserId, e.FoodName }, "UQ_UserFoodItem_User_Name").IsUnique();

            entity.Property(e => e.CaloriesPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CarbPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.FatPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FoodName).HasMaxLength(255);
            entity.Property(e => e.ProteinPer100).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.UnitType)
                .HasMaxLength(2);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
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

        modelBuilder.Entity<AiLabelMap>(entity =>
        {
            entity.ToTable("AiLabelMap");

            entity.HasKey(e => e.Label);

            entity.Property(e => e.Label)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.MinConfidence)
                .HasColumnType("decimal(5, 2)")
                .HasDefaultValue(0.60m);

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.ToTable("UserPreference");

            entity.HasKey(e => e.UserPreferenceId);

            entity.Property(e => e.DietaryRestrictions).IsUnicode(true);
            entity.Property(e => e.Allergies).IsUnicode(true);
            entity.Property(e => e.PreferredCuisine).HasMaxLength(100);

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.HasOne(d => d.User).WithOne(p => p.UserPreference)
                .HasForeignKey<UserPreference>(d => d.UserId)
                .HasConstraintName("FK_UserPreference_User");
        });

        modelBuilder.Entity<GeminiKey>(entity =>
        {
            entity.ToTable("GeminiKeys");

            entity.HasIndex(e => e.KeyName, "UQ_GeminiKeys_KeyName").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<AdminAuditEvent>(entity =>
        {
            entity.ToTable("AdminAuditEvent");

            entity.HasKey(e => e.AdminAuditEventId);

            entity.HasIndex(e => e.OccurredAt, "IX_AdminAuditEvent_OccurredAt");
            entity.HasIndex(e => new { e.Action, e.Entity }, "IX_AdminAuditEvent_Action_Entity");
            entity.HasIndex(e => e.RequestId, "IX_AdminAuditEvent_RequestId");
            entity.HasIndex(e => e.CorrelationId, "IX_AdminAuditEvent_CorrelationId");

            entity.Property(e => e.AdminAuditEventId)
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.Actor).HasMaxLength(256);
            entity.Property(e => e.ActorId).HasMaxLength(120);
            entity.Property(e => e.ActorEmail).HasMaxLength(256);
            entity.Property(e => e.Action).HasMaxLength(120);
            entity.Property(e => e.EffectiveRole).HasMaxLength(80);
            entity.Property(e => e.Entity).HasMaxLength(120);
            entity.Property(e => e.EntityId).HasMaxLength(120);
            entity.Property(e => e.Severity).HasMaxLength(40);
            entity.Property(e => e.Outcome).HasMaxLength(40);
            entity.Property(e => e.RequestId).HasMaxLength(120);
            entity.Property(e => e.CorrelationId).HasMaxLength(120);
            entity.Property(e => e.Environment).HasMaxLength(80);
            entity.Property(e => e.OccurredAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<UserAccessControl>(entity =>
        {
            entity.ToTable("UserAccessControl");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.AccessState)
                .HasMaxLength(40)
                .HasDefaultValue("active");
            entity.Property(e => e.SuspendedBy).HasMaxLength(256);
            entity.Property(e => e.DeactivatedBy).HasMaxLength(256);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<PasswordResetCode>(entity =>
        {
            entity.ToTable("PasswordResetCode");
            entity.HasKey(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt, "IX_PasswordResetCode_ExpiresAt");
            entity.HasIndex(e => e.ConsumedAt, "IX_PasswordResetCode_ConsumedAt");
            entity.Property(e => e.CodeHash).HasMaxLength(88);
            entity.Property(e => e.ExpiresAt).HasPrecision(3);
            entity.Property(e => e.ConsumedAt).HasPrecision(3);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        modelBuilder.Entity<TelemetryEvent>(entity =>
        {
            entity.ToTable("TelemetryEvent");

            entity.HasKey(e => e.TelemetryEventId);

            entity.HasIndex(e => e.OccurredAt, "IX_TelemetryEvent_OccurredAt");
            entity.HasIndex(e => new { e.UserId, e.OccurredAt }, "IX_TelemetryEvent_UserId_OccurredAt");
            entity.HasIndex(e => new { e.Category, e.OccurredAt }, "IX_TelemetryEvent_Category_OccurredAt");

            entity.Property(e => e.TelemetryEventId)
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.Property(e => e.Category).HasMaxLength(60);
            entity.Property(e => e.Screen).HasMaxLength(120);
            entity.Property(e => e.Flow).HasMaxLength(120);
            entity.Property(e => e.Step).HasMaxLength(120);
            entity.Property(e => e.Status).HasMaxLength(60);
            entity.Property(e => e.SessionId).HasMaxLength(120);
            entity.Property(e => e.RequestId).HasMaxLength(120);
            entity.Property(e => e.MetadataJson).HasColumnType("text");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_TelemetryEvent_User");
        });

        modelBuilder.Entity<WaterIntake>(entity =>
        {
            entity.ToTable("WaterIntake");

            entity.HasKey(e => e.WaterIntakeId);

            entity.HasIndex(e => new { e.UserId, e.IntakeDate }, "UQ_WaterIntake_User_Date").IsUnique();
            entity.HasIndex(e => new { e.UserId, e.IntakeDate }, "IX_WaterIntake_UserDate");

            entity.Property(e => e.AmountMl).HasDefaultValue(0);
            entity.Property(e => e.TargetMl).HasDefaultValue(2000);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_WaterIntake_User");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

