using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class NguoiDung
{
    public Guid MaNguoiDung { get; set; }

    public string Email { get; set; } = null!;

    public byte[] MatKhauHash { get; set; } = null!;

    public string? HoTen { get; set; }

    public string? GioiTinh { get; set; }

    public DateOnly? NgaySinh { get; set; }

    public DateTime NgayTao { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public virtual ICollection<ChiSoCoThe> ChiSoCoThes { get; set; } = new List<ChiSoCoThe>();

    public virtual ICollection<MonNguoiDung> MonNguoiDungs { get; set; } = new List<MonNguoiDung>();

    public virtual ICollection<MucTieuDinhDuong> MucTieuDinhDuongs { get; set; } = new List<MucTieuDinhDuong>();

    public virtual ICollection<NhatKyAi> NhatKyAis { get; set; } = new List<NhatKyAi>();

    public virtual ICollection<NhatKyAnUong> NhatKyAnUongs { get; set; } = new List<NhatKyAnUong>();
}
