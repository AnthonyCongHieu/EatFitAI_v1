using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class ChiSoCoThe
{
    public long MaChiSo { get; set; }

    public Guid MaNguoiDung { get; set; }

    public decimal? ChieuCaoCm { get; set; }

    public decimal? CanNangKg { get; set; }

    public string? MaMucDo { get; set; }

    public string? MaMucTieu { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public string? GhiChu { get; set; }

    public virtual MucDoVanDong? MaMucDoNavigation { get; set; }

    public virtual MucTieu? MaMucTieuNavigation { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;
}
