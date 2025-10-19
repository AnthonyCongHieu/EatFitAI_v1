using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class VwTongHopDinhDuongTuan
{
    public Guid MaNguoiDung { get; set; }

    public DateTime? TuanBatDau { get; set; }

    public DateTime? TuanKetThuc { get; set; }

    public decimal? TongCalo { get; set; }

    public decimal? TongProtein { get; set; }

    public decimal? TongCarb { get; set; }

    public decimal? TongFat { get; set; }
}
