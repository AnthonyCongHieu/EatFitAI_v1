using AutoMapper;
using EatFitAI.Domain.Entities;
using EatFitAI.Api.Profile;

namespace EatFitAI.Api.Mapping;

public class MappingProfile : AutoMapper.Profile
{
    public MappingProfile()
    {
        CreateMap<NguoiDung, ProfileDto>();
        CreateMap<MucTieuDinhDuong, NutritionTargetDto>();
    }
}
