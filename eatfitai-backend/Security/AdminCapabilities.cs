using System.Security.Claims;

namespace EatFitAI.API.Security;

public static class AdminCapabilityClaims
{
    public const string Capability = "eatfit.capability";
    public const string PlatformRole = "eatfit.platform_role";
    public const string AccessState = "eatfit.access_state";
}

public static class AdminAccessStates
{
    public const string Active = "active";
    public const string Suspended = "suspended";
    public const string Deactivated = "deactivated";
}

public static class PlatformRoles
{
    public const string User = "user";
    public const string SuperAdmin = "super_admin";
    public const string OpsAdmin = "ops_admin";
    public const string SupportAdmin = "support_admin";
    public const string ContentAdmin = "content_admin";
    public const string ReadOnlyAuditor = "read_only_auditor";

    public static string Normalize(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            "admin" => SuperAdmin,
            "owner" => SuperAdmin,
            "superadmin" => SuperAdmin,
            "super_admin" => SuperAdmin,
            "ops" => OpsAdmin,
            "ops_admin" => OpsAdmin,
            "support" => SupportAdmin,
            "support_admin" => SupportAdmin,
            "content" => ContentAdmin,
            "content_admin" => ContentAdmin,
            "auditor" => ReadOnlyAuditor,
            "read_only_auditor" => ReadOnlyAuditor,
            "readonly_auditor" => ReadOnlyAuditor,
            "user" => User,
            _ => User,
        };
    }

    public static bool IsAdminRole(string? role)
    {
        var normalized = Normalize(role);
        return normalized != User;
    }

    public static string ResolveEffectiveRole(ClaimsPrincipal principal, string? persistedRole)
    {
        _ = principal;
        return string.IsNullOrWhiteSpace(persistedRole)
            ? User
            : Normalize(persistedRole);
    }

    public static string ResolveRoleFromClaims(ClaimsPrincipal principal)
    {
        var candidateClaims = new[]
        {
            principal.FindFirstValue(AdminCapabilityClaims.PlatformRole),
            principal.FindFirstValue("app_metadata.role"),
            principal.FindFirstValue("user_metadata.role"),
            principal.FindFirstValue("role"),
        };

        foreach (var candidate in candidateClaims)
        {
            var normalized = Normalize(candidate);
            if (IsAdminRole(normalized))
            {
                return normalized;
            }
        }

        var directRoleClaim = principal.Claims
            .Where(claim => claim.Type == ClaimTypes.Role)
            .Select(claim => Normalize(claim.Value))
            .FirstOrDefault(IsAdminRole);

        return string.IsNullOrWhiteSpace(directRoleClaim)
            ? User
            : directRoleClaim;
    }
}

public static class AdminCapabilities
{
    public const string Access = "admin.access";
    public const string UsersRead = "users.read";
    public const string UsersWrite = "users.write";
    public const string UsersRoleManage = "users.role.manage";
    public const string UsersDeactivate = "users.deactivate";
    public const string SupportRead = "support.read";
    public const string MealsRead = "meals.read";
    public const string MealsDelete = "meals.delete";
    public const string FoodsRead = "foods.read";
    public const string FoodsWrite = "foods.write";
    public const string MasterDataRead = "master-data.read";
    public const string MasterDataWrite = "master-data.write";
    public const string RuntimeRead = "runtime.read";
    public const string RuntimeKeysManage = "runtime.keys.manage";
    public const string RuntimeKeysDelete = "runtime.keys.delete";
    public const string AuditRead = "audit.read";
    public const string SettingsRead = "settings.read";

    public static IReadOnlyList<string> GetForRole(string? role)
    {
        return PlatformRoles.Normalize(role) switch
        {
            PlatformRoles.SuperAdmin => All,
            PlatformRoles.OpsAdmin => new[]
            {
                Access,
                UsersRead,
                UsersWrite,
                UsersDeactivate,
                SupportRead,
                MealsRead,
                MealsDelete,
                FoodsRead,
                FoodsWrite,
                MasterDataRead,
                MasterDataWrite,
                RuntimeRead,
                RuntimeKeysManage,
                RuntimeKeysDelete,
                AuditRead,
                SettingsRead,
            },
            PlatformRoles.SupportAdmin => new[]
            {
                Access,
                UsersRead,
                UsersWrite,
                SupportRead,
                MealsRead,
                FoodsRead,
                MasterDataRead,
                AuditRead,
                RuntimeRead,
                SettingsRead,
            },
            PlatformRoles.ContentAdmin => new[]
            {
                Access,
                FoodsRead,
                FoodsWrite,
                MasterDataRead,
                MasterDataWrite,
                MealsRead,
                RuntimeRead,
                AuditRead,
                SettingsRead,
            },
            PlatformRoles.ReadOnlyAuditor => new[]
            {
                Access,
                UsersRead,
                SupportRead,
                MealsRead,
                FoodsRead,
                MasterDataRead,
                RuntimeRead,
                AuditRead,
                SettingsRead,
            },
            _ => Array.Empty<string>(),
        };
    }

    public static readonly IReadOnlyList<string> All = new[]
    {
        Access,
        UsersRead,
        UsersWrite,
        UsersRoleManage,
        UsersDeactivate,
        SupportRead,
        MealsRead,
        MealsDelete,
        FoodsRead,
        FoodsWrite,
        MasterDataRead,
        MasterDataWrite,
        RuntimeRead,
        RuntimeKeysManage,
        RuntimeKeysDelete,
        AuditRead,
        SettingsRead,
    };
}

public static class AdminPolicies
{
    public const string Access = "AdminAccess";
    public const string UsersRead = "AdminUsersRead";
    public const string UsersWrite = "AdminUsersWrite";
    public const string UsersRoleManage = "AdminUsersRoleManage";
    public const string UsersDeactivate = "AdminUsersDeactivate";
    public const string SupportRead = "AdminSupportRead";
    public const string MealsRead = "AdminMealsRead";
    public const string MealsDelete = "AdminMealsDelete";
    public const string FoodsRead = "AdminFoodsRead";
    public const string FoodsWrite = "AdminFoodsWrite";
    public const string MasterDataRead = "AdminMasterDataRead";
    public const string MasterDataWrite = "AdminMasterDataWrite";
    public const string RuntimeRead = "AdminRuntimeRead";
    public const string RuntimeKeysManage = "AdminRuntimeKeysManage";
    public const string RuntimeKeysDelete = "AdminRuntimeKeysDelete";
    public const string AuditRead = "AdminAuditRead";
    public const string SettingsRead = "AdminSettingsRead";
}

public static class AdminClaimsIdentityExtensions
{
    public static bool HasCapability(this ClaimsPrincipal principal, string capability)
    {
        return principal.Claims.Any(claim =>
            claim.Type == AdminCapabilityClaims.Capability
            && string.Equals(claim.Value, capability, StringComparison.OrdinalIgnoreCase));
    }
}
