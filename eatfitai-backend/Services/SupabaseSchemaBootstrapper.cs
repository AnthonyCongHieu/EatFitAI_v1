using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class SupabaseSchemaBootstrapper
{
    private static readonly SemaphoreSlim SchemaInitLock = new(1, 1);
    private static bool _schemaInitialized;

    private readonly ApplicationDbContext _context;
    private readonly ILogger<SupabaseSchemaBootstrapper> _logger;

    public SupabaseSchemaBootstrapper(
        ApplicationDbContext context,
        ILogger<SupabaseSchemaBootstrapper> logger)
    {
        _context = context;
        _logger = logger;
    }

    public static string SchemaSql => """
        ALTER TABLE IF EXISTS "UserPreference"
            ADD COLUMN IF NOT EXISTS "Allergies" text NULL;

        ALTER TABLE IF EXISTS "AILog"
            ADD COLUMN IF NOT EXISTS "DurationMs" integer NULL;

        NOTIFY pgrst, 'reload schema';
        """;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        if (_schemaInitialized || !_context.Database.IsRelational())
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
