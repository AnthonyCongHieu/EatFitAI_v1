using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class VwTongHopDinhDuongNgay
{
    public Guid MaNguoiDung { get; set; }

    public DateOnly NgayAn { get; set; }

    public decimal? TongCalo { get; set; }

    public decimal? TongProtein { get; set; }

    public decimal? TongCarb { get; set; }

    public decimal? TongFat { get; set; }
}
