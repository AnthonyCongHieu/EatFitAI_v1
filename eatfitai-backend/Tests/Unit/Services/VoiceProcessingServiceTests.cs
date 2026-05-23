using EatFitAI.DTOs;
using EatFitAI.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class VoiceProcessingServiceTests
{
    private readonly VoiceProcessingService _service = new(NullLogger<VoiceProcessingService>.Instance);

    [Fact]
    public async Task ParseCommandAsync_NaturalVietnameseAddFood_ExtractsMealFoodAndWeight()
    {
        var command = await _service.ParseCommandAsync("Sáng nay mình ăn một quả chuối khoảng một trăm gam");

        Assert.Equal(VoiceIntent.ADD_FOOD, command.Intent);
        Assert.Equal(MealType.Breakfast, command.Entities.MealType);
        Assert.Equal("chuoi", command.Entities.FoodName);
        Assert.Equal(100m, command.Entities.Weight);
        Assert.True(command.ReviewRequired);
    }

    [Fact]
    public async Task ParseCommandAsync_SttNoisyAddFood_ExtractsBananaLunch()
    {
        var command = await _service.ParseCommandAsync("Thêm MOT tram cram banana B U A chua.");

        Assert.Equal(VoiceIntent.ADD_FOOD, command.Intent);
        Assert.Equal(MealType.Lunch, command.Entities.MealType);
        Assert.Equal("banana", command.Entities.FoodName);
        Assert.Equal(100m, command.Entities.Weight);
    }

    [Fact]
    public async Task ParseCommandAsync_MultiFoodAddFood_ExtractsItemsAndSharedMeal()
    {
        var command = await _service.ParseCommandAsync("ăn 100g cơm và 150g ức gà bữa trưa");

        Assert.Equal(VoiceIntent.ADD_FOOD, command.Intent);
        Assert.Equal(MealType.Lunch, command.Entities.MealType);
        Assert.NotNull(command.Entities.Foods);
        Assert.Collection(
            command.Entities.Foods!,
            first =>
            {
                Assert.Equal("com", first.FoodName);
                Assert.Equal(100m, first.Weight);
            },
            second =>
            {
                Assert.Equal("uc ga", second.FoodName);
                Assert.Equal(150m, second.Weight);
            });
    }

    [Theory]
    [InlineData("tôi nặng 70 kg", 70)]
    [InlineData("mình nặng 70 ký", 70)]
    [InlineData("hôm nay cân 69.8", 69.8)]
    [InlineData("ghi cân 70,5 kg", 70.5)]
    public async Task ParseCommandAsync_WeightVariants_ExtractWeight(string text, decimal expectedWeight)
    {
        var command = await _service.ParseCommandAsync(text);

        Assert.Equal(VoiceIntent.LOG_WEIGHT, command.Intent);
        Assert.Equal(expectedWeight, command.Entities.Weight);
    }

    [Fact]
    public async Task ParseCommandAsync_NoteVariant_RemovesMealWordsFromNote()
    {
        var command = await _service.ParseCommandAsync("ghi chú bữa trưa hơi mặn");

        Assert.Equal(VoiceIntent.ADD_NOTE, command.Intent);
        Assert.Equal(MealType.Lunch, command.Entities.MealType);
        Assert.Equal("hơi mặn", command.Entities.NoteText);
    }

    [Fact]
    public async Task ParseCommandAsync_QueryMealVariant_ExtractsMealAndDate()
    {
        var command = await _service.ParseCommandAsync("bữa trưa hôm nay tôi đã ăn gì");

        Assert.Equal(VoiceIntent.QUERY_MEAL, command.Intent);
        Assert.Equal(MealType.Lunch, command.Entities.MealType);
        Assert.Equal(0, command.Entities.DateOffsetDays);
    }

    [Fact]
    public async Task ParseCommandAsync_RepeatMealVariant_ExtractsSourceAndTarget()
    {
        var command = await _service.ParseCommandAsync("ăn lại bữa trưa hôm qua");

        Assert.Equal(VoiceIntent.REPEAT_MEAL, command.Intent);
        Assert.Equal(MealType.Lunch, command.Entities.MealType);
        Assert.Equal(-1, command.Entities.SourceDateOffsetDays);
        Assert.Equal(0, command.Entities.TargetDateOffsetDays);
    }

    [Fact]
    public async Task ParseCommandAsync_NutritionVariant_MapsFatSynonym()
    {
        var command = await _service.ParseCommandAsync("hôm nay tôi nạp bao nhiêu chất béo");

        Assert.Equal(VoiceIntent.ASK_NUTRITION, command.Intent);
        Assert.Equal("fat", command.Entities.Nutrient);
        Assert.Equal(0, command.Entities.DateOffsetDays);
    }
}
