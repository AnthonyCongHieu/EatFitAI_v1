using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class MucTieu
{
    public string MaMucTieu { get; set; } = null!;

    public string TenMucTieu { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<ChiSoCoThe> ChiSoCoThes { get; set; } = new List<ChiSoCoThe>();
}
