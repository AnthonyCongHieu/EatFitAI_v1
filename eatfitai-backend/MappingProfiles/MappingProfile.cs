using AutoMapper;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Models;

namespace EatFitAI.API.MappingProfiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<User, UserDto>();
            CreateMap<BodyMetric, BodyMetricDto>();

            // Auth mappings
            CreateMap<User, AuthResponse>()
                .ForMember(dest => dest.Token, opt => opt.Ignore())
                .ForMember(dest => dest.ExpiresAt, opt => opt.Ignore());

            // Food mappings
            CreateMap<FoodItem, FoodItemDto>();
            CreateMap<FoodServing, FoodServingDto>()
                .ForMember(dest => dest.ServingUnitName, opt => opt.MapFrom(src => src.ServingUnit!.Name))
                .ForMember(dest => dest.ServingUnitSymbol, opt => opt.MapFrom(src => src.ServingUnit!.Symbol));

            // MealDiary mappings
            CreateMap<MealDiary, MealDiaryDto>()
                .ForMember(dest => dest.MealTypeName, opt => opt.MapFrom(src => src.MealType!.Name))
                .ForMember(dest => dest.FoodItemName, opt => opt.MapFrom(src => src.FoodItem!.FoodName))
                .ForMember(dest => dest.UserDishName, opt => opt.MapFrom(src => src.UserDish!.DishName))
                .ForMember(dest => dest.RecipeName, opt => opt.MapFrom(src => src.Recipe!.RecipeName))
                .ForMember(dest => dest.ServingUnitName, opt => opt.MapFrom(src => src.ServingUnit!.Name))
                .ForMember(dest => dest.ServingUnitSymbol, opt => opt.MapFrom(src => src.ServingUnit!.Symbol));

            CreateMap<CreateMealDiaryRequest, MealDiary>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(_ => false));

            CreateMap<UpdateMealDiaryRequest, MealDiary>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
        }
    }
}