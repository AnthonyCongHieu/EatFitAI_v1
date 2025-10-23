using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class MucDoVanDong
{
    public string MaMucDo { get; set; } = null!;

    public string TenMucDo { get; set; } = null!;

    public string? MoTa { get; set; }

    public decimal HeSoTdee { get; set; }

    public virtual ICollection<ChiSoCoThe> ChiSoCoThes { get; set; } = new List<ChiSoCoThe>();
}
