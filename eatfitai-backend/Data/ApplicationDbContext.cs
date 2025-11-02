using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<BodyMetric> BodyMetrics { get; set; }
        public DbSet<ActivityLevel> ActivityLevels { get; set; }
        public DbSet<NutritionTarget> NutritionTargets { get; set; }
        public DbSet<FoodItem> FoodItems { get; set; }
        public DbSet<ServingUnit> ServingUnits { get; set; }
        public DbSet<FoodServing> FoodServings { get; set; }
        public DbSet<Recipe> Recipes { get; set; }
        public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
        public DbSet<UserDish> UserDishes { get; set; }
        public DbSet<UserDishIngredient> UserDishIngredients { get; set; }
        public DbSet<MealType> MealTypes { get; set; }
        public DbSet<MealDiary> MealDiaries { get; set; }
        public DbSet<UserFavoriteFood> UserFavoriteFoods { get; set; }
        public DbSet<UserRecentFood> UserRecentFoods { get; set; }
        public DbSet<AILog> AILogs { get; set; }
        public DbSet<AISuggestion> AISuggestions { get; set; }
        public DbSet<ImageDetection> ImageDetections { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure unique constraints
            modelBuilder.Entity<ActivityLevel>()
                .HasIndex(al => al.Name)
                .IsUnique();

            modelBuilder.Entity<ServingUnit>()
                .HasIndex(su => su.Name)
                .IsUnique();

            modelBuilder.Entity<MealType>()
                .HasIndex(mt => mt.Name)
                .IsUnique();

            modelBuilder.Entity<UserFavoriteFood>()
                .HasIndex(uff => new { uff.UserId, uff.FoodItemId })
                .IsUnique();

            modelBuilder.Entity<UserRecentFood>()
                .HasIndex(urf => new { urf.UserId, urf.FoodItemId })
                .IsUnique();

            modelBuilder.Entity<FoodServing>()
                .HasIndex(fs => new { fs.FoodItemId, fs.ServingUnitId })
                .IsUnique();

            // Configure check constraints
            modelBuilder.Entity<ActivityLevel>()
                .ToTable(al => al.HasCheckConstraint("CK_ActivityLevel_Positive", "ActivityFactor > 0"));

            modelBuilder.Entity<AISuggestion>()
                .ToTable(asg => asg.HasCheckConstraint("CK_AISuggestion_Conf", "Confidence >= 0 AND Confidence <= 1"));

            modelBuilder.Entity<FoodItem>()
                .ToTable(fi => {
                    fi.HasCheckConstraint("CK_FI_Cal_NonNeg", "CaloriesPer100g >= 0");
                    fi.HasCheckConstraint("CK_FI_C_NonNeg", "CarbPer100g >= 0");
                    fi.HasCheckConstraint("CK_FI_F_NonNeg", "FatPer100g >= 0");
                    fi.HasCheckConstraint("CK_FI_P_NonNeg", "ProteinPer100g >= 0");
                });

            modelBuilder.Entity<FoodServing>()
                .ToTable(fs => fs.HasCheckConstraint("CK_FoodServing_Positive", "GramsPerUnit > 0"));

            modelBuilder.Entity<ImageDetection>()
                .ToTable(id => id.HasCheckConstraint("CK_ImageDetection_Conf", "Confidence >= 0 AND Confidence <= 1"));

            modelBuilder.Entity<MealDiary>()
                .ToTable(md => {
                    md.HasCheckConstraint("CK_MealDiary_C_NonNeg", "Carb >= 0");
                    md.HasCheckConstraint("CK_MealDiary_Cal_NonNeg", "Calories >= 0");
                    md.HasCheckConstraint("CK_MealDiary_F_NonNeg", "Fat >= 0");
                    md.HasCheckConstraint("CK_MealDiary_Grams_NonNeg", "Grams >= 0");
                    md.HasCheckConstraint("CK_MealDiary_P_NonNeg", "Protein >= 0");
                    md.HasCheckConstraint("CK_MealDiary_Portion_Positive", "PortionQuantity IS NULL OR PortionQuantity > 0");
                });

            modelBuilder.Entity<RecipeIngredient>()
                .ToTable(ri => ri.HasCheckConstraint("CK_RecipeIngredient_Positive", "Grams >= 0"));

            modelBuilder.Entity<UserDishIngredient>()
                .ToTable(udi => udi.HasCheckConstraint("CK_UserDishIngredient_Positive", "Grams >= 0"));
        }
    }
}