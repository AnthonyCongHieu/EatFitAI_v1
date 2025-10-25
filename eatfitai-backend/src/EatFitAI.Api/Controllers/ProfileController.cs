using EatFitAI.Api.Contracts.Profile;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController : ControllerBase
{
    private readonly IProfileRepository _profileRepository;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(IProfileRepository profileRepository, ILogger<ProfileController> logger)
    {
        _profileRepository = profileRepository;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);

        if (profile is null)
        {
            return Ok(new ProfileResponse
            {
                MaNguoiDung = userId
            });
        }

        return Ok(ToResponse(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] ProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);

        if (profile == null)
        {
            profile = new UserProfile
            {
                MaNguoiDung = userId,
                HoTen = request.HoTen ?? string.Empty,
                GioiTinh = request.GioiTinh ?? string.Empty,
                NgaySinh = request.NgaySinh,
                ChieuCaoCm = request.ChieuCaoCm,
                CanNangMucTieuKg = request.CanNangMucTieuKg,
                MucDoVanDong = request.MucDoVanDong ?? string.Empty,
                MucTieu = request.MucTieu ?? string.Empty,
                AnhDaiDienUrl = request.AnhDaiDienUrl,
                NgayTao = DateTime.UtcNow
            };
        }
        else
        {
            profile.HoTen = request.HoTen ?? profile.HoTen;
            profile.GioiTinh = request.GioiTinh ?? profile.GioiTinh;
            profile.NgaySinh = request.NgaySinh ?? profile.NgaySinh;
            profile.ChieuCaoCm = request.ChieuCaoCm ?? profile.ChieuCaoCm;
            profile.CanNangMucTieuKg = request.CanNangMucTieuKg ?? profile.CanNangMucTieuKg;
            profile.MucDoVanDong = request.MucDoVanDong ?? profile.MucDoVanDong;
            profile.MucTieu = request.MucTieu ?? profile.MucTieu;
            profile.AnhDaiDienUrl = request.AnhDaiDienUrl ?? profile.AnhDaiDienUrl;
            profile.NgayCapNhat = DateTime.UtcNow;
        }

        await _profileRepository.UpdateAsync(profile, cancellationToken);
        await _profileRepository.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(profile));
    }

    private static ProfileResponse ToResponse(UserProfile profile)
    {
        return new ProfileResponse
        {
            MaNguoiDung = profile.MaNguoiDung,
            HoTen = profile.HoTen,
            GioiTinh = profile.GioiTinh,
            NgaySinh = profile.NgaySinh,
            ChieuCaoCm = profile.ChieuCaoCm,
            CanNangMucTieuKg = profile.CanNangMucTieuKg,
            MucDoVanDong = profile.MucDoVanDong,
            MucTieu = profile.MucTieu,
            AnhDaiDienUrl = profile.AnhDaiDienUrl
        };
    }

    private sealed class ProfileDb
    {
        public Guid MaNguoiDung { get; set; }
        public string? HoTen { get; set; }
        public string? GioiTinh { get; set; }
        public DateTime? NgaySinh { get; set; }
        public decimal? ChieuCaoCm { get; set; }
        public decimal? CanNangMucTieuKg { get; set; }
        public string? MucDoVanDong { get; set; }
        public string? MucTieu { get; set; }
        public string? AnhDaiDienUrl { get; set; }
    }
}
