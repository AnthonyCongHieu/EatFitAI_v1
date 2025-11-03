using AutoMapper;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.MappingProfiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<User, UserDto>();
            CreateMap<BodyMetric, BodyMetricDto>()
                .ForMember(dest => dest.MeasuredDate, opt => opt.MapFrom(src => src.MeasuredDate.ToDateTime(TimeOnly.MinValue)));

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
                .ForMember(dest => dest.ServingUnitSymbol, opt => opt.MapFrom(src => src.ServingUnit!.Symbol))
                .ForMember(dest => dest.EatenDate, opt => opt.MapFrom(src => src.EatenDate.ToDateTime(TimeOnly.MinValue)));

            CreateMap<CreateMealDiaryRequest, MealDiary>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.EatenDate, opt => opt.MapFrom(src => DateOnly.FromDateTime(src.EatenDate)));

            CreateMap<UpdateMealDiaryRequest, MealDiary>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.EatenDate, opt =>
                    {
                        opt.Condition(src => src.EatenDate.HasValue);
                        opt.MapFrom(src => src.EatenDate.HasValue ? DateOnly.FromDateTime(src.EatenDate.Value) : default);
                    })
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
        }
    }
}
