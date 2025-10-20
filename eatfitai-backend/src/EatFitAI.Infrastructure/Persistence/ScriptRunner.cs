using System.Data;
using Dapper;
using EatFitAI.Application.Data;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.RegularExpressions;

namespace EatFitAI.Infrastructure.Persistence;

public class ScriptRunner : IScriptRunner
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ILogger<ScriptRunner> _logger;
    private readonly string _scriptsDirectory;

    public ScriptRunner(
        ISqlConnectionFactory connectionFactory,
        ILogger<ScriptRunner> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
        _scriptsDirectory = Path.Combine(AppContext.BaseDirectory, "db", "scripts");
    }

    public async Task ApplyPendingScriptsAsync(CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(_scriptsDirectory))
        {
            _logger.LogWarning("Scripts directory missing: {Directory}", _scriptsDirectory);
            return;
        }

        var scriptFiles = Directory
            .GetFiles(_scriptsDirectory, "*.sql", SearchOption.TopDirectoryOnly)
            .OrderBy(Path.GetFileName)
            .ToList();

        if (scriptFiles.Count == 0)
        {
            _logger.LogInformation("No scripts found in {Directory}", _scriptsDirectory);
            return;
        }

        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var appliedFiles = (await connection.QueryAsync<string>(
                "SELECT FileName FROM ScriptHistory"))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var pendingScripts = scriptFiles
            .Where(file => !appliedFiles.Contains(Path.GetFileName(file)))
            .ToList();

        if (pendingScripts.Count == 0)
        {
            _logger.LogInformation("No pending scripts. ScriptHistory is up to date.");
            return;
        }

        foreach (var scriptPath in pendingScripts)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(scriptPath);
            var scriptContent = await File.ReadAllTextAsync(scriptPath, cancellationToken);

            _logger.LogInformation("Applying script {Script}", fileName);

            using var transaction = connection.BeginTransaction();
            try
            {
                foreach (var batch in SplitBatches(scriptContent))
                {
                    if (string.IsNullOrWhiteSpace(batch)) continue;
                    await connection.ExecuteAsync(batch, transaction: transaction, commandType: CommandType.Text);
                }

                await connection.ExecuteAsync(
                    "INSERT INTO ScriptHistory (FileName, AppliedAt) VALUES (@FileName, SYSUTCDATETIME())",
                    new { FileName = fileName },
                    transaction: transaction);

                transaction.Commit();
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                _logger.LogError(ex, "Failed to apply script {Script}", fileName);
                throw;
            }
        }

        _logger.LogInformation("Applied {Count} scripts", pendingScripts.Count);
    }

    private static IEnumerable<string> SplitBatches(string script)
    {
        var reader = new StringReader(script);
        var sb = new StringBuilder();
        string? line;
        while ((line = reader.ReadLine()) is not null)
        {
            if (Regex.IsMatch(line, @"^\s*GO\s*$", RegexOptions.IgnoreCase))
            {
                yield return sb.ToString();
                sb.Clear();
            }
            else
            {
                sb.AppendLine(line);
            }
        }
        if (sb.Length > 0)
        {
            yield return sb.ToString();
        }
    }
}
