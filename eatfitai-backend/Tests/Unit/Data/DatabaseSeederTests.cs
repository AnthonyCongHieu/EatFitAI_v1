using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Data;

public class DatabaseSeederTests
{
    [Fact]
    public async Task SeedAsync_SeedsEveryYolo11mCleanV1LabelMap()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var foodCount = await context.FoodItems.CountAsync();
        var labels = await context.AiLabelMaps
            .Select(map => map.Label)
            .ToListAsync();

        Assert.True(foodCount > 0, $"Expected seed food items before AI label maps; labelCount={labels.Count}.");
        Assert.Equal(ExpectedYolo11mCleanV1Labels.Length, labels.Count);
        foreach (var expectedLabel in ExpectedYolo11mCleanV1Labels)
        {
            Assert.Contains(expectedLabel, labels);
        }

        Assert.DoesNotContain("apple", labels);
    }

    private static readonly string[] ExpectedYolo11mCleanV1Labels =
    [
        "banh_mi",
        "pho",
        "bun",
        "bot_chien",
        "goi_cuon",
        "fried_rice",
        "com_tam",
        "thit_kho",
        "ca_kho",
        "canh",
        "banh_beo",
        "banh_bo",
        "banh_bot_loc",
        "banh_can",
        "banh_canh",
        "banh_chung",
        "banh_cong",
        "banh_cuon",
        "banh_da_lon",
        "banh_duc",
        "banh_khot",
        "banh_tet",
        "banh_xeo",
        "banh_trang",
        "banh_trang_tron",
        "bo_kho",
        "bo_la_lot",
        "bun_bo_hue",
        "bun_cha",
        "bun_dau",
        "bun_mam",
        "bun_rieu",
        "cha_gio",
        "hu_tieu",
        "lau",
        "mi_quang",
        "cao_lau",
        "xoi",
        "chao_long",
        "sup_cua",
        "bitter_melon_soup",
        "caramelized_fish_clay_pot",
        "chicken_rice",
        "pumpkin_soup",
        "purple_yam_soup",
        "steamed_pork_belly_taro",
        "sizzling_beef_steak",
        "hollow_fried_sesame_donut",
        "nuoc_cham",
        "rice",
        "noodles",
        "chicken",
        "beef",
        "pork",
        "pork_belly",
        "pork_rib",
        "grilled_pork_belly",
        "fish",
        "shrimp",
        "crab",
        "squid",
        "egg",
        "fried_egg",
        "tofu",
        "tempeh",
        "tomato",
        "cucumber",
        "carrot",
        "potato",
        "sweet_potato",
        "spinach",
        "water_spinach",
        "bokchoy",
        "cabbage",
        "cauliflower",
        "broccoli",
        "eggplant",
        "bitter_gourd",
        "bottle_gourd",
        "pumpkin",
        "radish",
        "long_beans",
        "beans",
        "peas",
        "mushroom",
        "chayote",
        "corn",
        "onion",
        "shallot",
        "green_onion",
        "garlic",
        "chili",
        "ginger",
        "galangal",
        "lemongrass",
        "leek",
        "lime_leaf",
        "coriander_seed",
        "fennel_seed",
        "star_anise",
        "cinnamon",
        "clove",
        "turmeric",
        "bell_pepper",
        "lime",
    ];

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "EatFitAI.API.Tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
