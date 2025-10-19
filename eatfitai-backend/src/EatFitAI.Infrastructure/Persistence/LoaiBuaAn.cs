using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class LoaiBuaAn
{
    public string MaBuaAn { get; set; } = null!;

    public string TenBuaAn { get; set; } = null!;

    public virtual ICollection<NhatKyAnUong> NhatKyAnUongs { get; set; } = new List<NhatKyAnUong>();
}
