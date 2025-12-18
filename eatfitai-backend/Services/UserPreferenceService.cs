using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public interface IUserPreferenceService
    {
        Task<UserPreferenceDto> GetUserPreferenceAsync(Guid userId, CancellationToken ct = default);
        Task UpdateUserPreferenceAsync(Guid userId, UserPreferenceDto dto, CancellationToken ct = default);
    }

    public class UserPreferenceService : IUserPreferenceService
    {
        private readonly ApplicationDbContext _db;

        public UserPreferenceService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<UserPreferenceDto> GetUserPreferenceAsync(Guid userId, CancellationToken ct = default)
        {
            var pref = await _db.UserPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId, ct);

            if (pref == null)
            {
                return new UserPreferenceDto
                {
                    DietaryRestrictions = new List<string>(),
                    Allergies = new List<string>(),
                    PreferredMealsPerDay = 3,
                    PreferredCuisine = null
                };
            }

            return new UserPreferenceDto
            {
                DietaryRestrictions = DeserializeList(pref.DietaryRestrictions),
                Allergies = DeserializeList(pref.Allergies),
                PreferredMealsPerDay = pref.PreferredMealsPerDay,
                PreferredCuisine = pref.PreferredCuisine
            };
        }

        public async Task UpdateUserPreferenceAsync(Guid userId, UserPreferenceDto dto, CancellationToken ct = default)
        {
            var pref = await _db.UserPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId, ct);

            if (pref == null)
            {
                pref = new UserPreference
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                await _db.UserPreferences.AddAsync(pref, ct);
            }

            pref.DietaryRestrictions = SerializeList(dto.DietaryRestrictions);
            pref.Allergies = SerializeList(dto.Allergies);
            pref.PreferredMealsPerDay = dto.PreferredMealsPerDay;
            pref.PreferredCuisine = dto.PreferredCuisine;
            pref.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
        }

        private List<string> DeserializeList(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private string SerializeList(List<string>? list)
        {
            if (list == null || !list.Any()) return "[]";
            return JsonSerializer.Serialize(list);
        }
    }
}
