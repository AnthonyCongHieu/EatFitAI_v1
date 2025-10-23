using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class CongThuc
{
    public long MaCongThuc { get; set; }

    public string TenCongThuc { get; set; } = null!;

    public string? LoaiAmThuc { get; set; }

    public int? ThoiGianUocTinhPhut { get; set; }

    public string? HuongDan { get; set; }

    public string? HinhAnh { get; set; }

    public bool TrangThai { get; set; }

    public virtual ICollection<NguyenLieuCongThuc> NguyenLieuCongThucs { get; set; } = new List<NguyenLieuCongThuc>();

    public virtual ICollection<NhatKyAnUong> NhatKyAnUongs { get; set; } = new List<NhatKyAnUong>();
}
