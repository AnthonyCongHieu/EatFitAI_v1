using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class NhanDienAnh
{
    public long MaNhanDien { get; set; }

    public long MaGoiYai { get; set; }

    public string Nhan { get; set; } = null!;

    public decimal? DoTinCay { get; set; }

    public virtual NhatKyAi MaGoiYaiNavigation { get; set; } = null!;
}
