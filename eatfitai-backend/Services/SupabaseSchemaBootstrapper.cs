using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public sealed class SupabaseSchemaBootstrapper
{
    private static readonly SemaphoreSlim SchemaInitLock = new(1, 1);
    private static bool _schemaInitialized;

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<SupabaseSchemaBootstrapper> _logger;

    public SupabaseSchemaBootstrapper(
        ApplicationDbContext context,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<SupabaseSchemaBootstrapper> logger)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public static string SchemaSql => """
        ALTER TABLE IF EXISTS "UserPreference"
            ADD COLUMN IF NOT EXISTS "DietaryRestrictions" text NULL,
            ADD COLUMN IF NOT EXISTS "Allergies" text NULL,
            ADD COLUMN IF NOT EXISTS "PreferredMealsPerDay" integer NOT NULL DEFAULT 3,
            ADD COLUMN IF NOT EXISTS "PreferredCuisine" character varying(100) NULL,
            ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC');

        ALTER TABLE IF EXISTS "AILog"
            ADD COLUMN IF NOT EXISTS "InputJson" text NULL,
            ADD COLUMN IF NOT EXISTS "OutputJson" text NULL,
            ADD COLUMN IF NOT EXISTS "DurationMs" integer NULL;

        NOTIFY pgrst, 'reload schema';
        """;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default, bool force = false)
    {
        if (_schemaInitialized || !_context.Database.IsRelational())
        {
            return;
        }

        if (!SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(_configuration, _environment, force))
        {
            return;
        }

        await SchemaInitLock.WaitAsync(cancellationToken);
        try
        {
            if (_schemaInitialized || !_context.Database.IsRelational())
            {
                return;
            }

            if (!SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(_configuration, _environment, force))
            {
                return;
            }

            await _context.Database.ExecuteSqlRawAsync(SchemaSql, cancellationToken);
            _schemaInitialized = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure Supabase schema drift repair.");
            throw;
        }
        finally
        {
            SchemaInitLock.Release();
        }
    }
}
