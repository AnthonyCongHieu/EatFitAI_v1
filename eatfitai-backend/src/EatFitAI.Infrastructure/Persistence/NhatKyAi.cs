using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class NhatKyAi
{
    public long MaGoiYai { get; set; }

    public Guid? MaNguoiDung { get; set; }

    public string LoaiGoiY { get; set; } = null!;

    public string DuLieuDauVao { get; set; } = null!;

    public string? KetQuaAi { get; set; }

    public DateTime ThoiGianTao { get; set; }

    public int? ThoiLuongXuLyMs { get; set; }

    public virtual NguoiDung? MaNguoiDungNavigation { get; set; }

    public virtual ICollection<NhanDienAnh> NhanDienAnhs { get; set; } = new List<NhanDienAnh>();
}
