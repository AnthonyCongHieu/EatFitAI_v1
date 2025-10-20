using System.Threading;
using System.Threading.Tasks;

namespace EatFitAI.Application.Data;

public interface IScriptRunner
{
    Task ApplyPendingScriptsAsync(CancellationToken cancellationToken = default);
}