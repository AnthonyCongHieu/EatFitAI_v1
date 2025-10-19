using System;
using System.Collections.Generic;
using EatFitAI.Domain.Entities;

namespace EatFitAI.Infrastructure.Persistence;

public partial class NguoiDung
{
    public int AccessFailedCount { get; set; }

    public DateTimeOffset? LockoutEnd { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
