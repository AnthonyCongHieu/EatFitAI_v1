using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class MediaVariantHelperTests
    {
        [Fact]
        public void FromThumbUrl_DerivesCatalogMediumUrl()
        {
            var variants = MediaVariantHelper.FromThumbUrl(
                "https://media.example.com/food-images/v2/thumb/42.webp");

            Assert.NotNull(variants);
            Assert.Equal("https://media.example.com/food-images/v2/thumb/42.webp", variants.ThumbUrl);
            Assert.Equal("https://media.example.com/food-images/v2/medium/42.webp", variants.MediumUrl);
        }

        [Fact]
        public void FromThumbUrl_DerivesNestedUserFoodMediumUrl()
        {
            var variants = MediaVariantHelper.FromThumbUrl(
                "https://media.example.com/user-food/v2/userid/thumb/image.webp");

            Assert.NotNull(variants);
            Assert.Equal(
                "https://media.example.com/user-food/v2/userid/medium/image.webp",
                variants.MediumUrl);
        }

        [Fact]
        public void FromThumbUrl_DerivesNestedAvatarMediumUrl()
        {
            var variants = MediaVariantHelper.FromThumbUrl(
                "https://media.example.com/user-food/avatars/v2/userid/thumb/image.webp");

            Assert.NotNull(variants);
            Assert.Equal(
                "https://media.example.com/user-food/avatars/v2/userid/medium/image.webp",
                variants.MediumUrl);
        }
    }
}
