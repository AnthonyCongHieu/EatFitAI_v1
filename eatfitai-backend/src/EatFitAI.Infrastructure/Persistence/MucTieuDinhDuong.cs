using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class MucTieuDinhDuong
{
    public long MaMucTieuDd { get; set; }

    public Guid MaNguoiDung { get; set; }

    public DateTime HieuLucTuNgay { get; set; }

    public int CaloKcal { get; set; }

    public decimal ProteinG { get; set; }

    public decimal CarbG { get; set; }

    public decimal FatG { get; set; }

    public string Nguon { get; set; } = null!;

    public string? LyDo { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;
}
