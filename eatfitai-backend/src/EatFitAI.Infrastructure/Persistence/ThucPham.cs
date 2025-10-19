using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class ThucPham
{
    public long MaThucPham { get; set; }

    public string TenThucPham { get; set; } = null!;

    public string? PhanLoai { get; set; }

    public string? MoTaKhauPhan { get; set; }

    public decimal Calo100g { get; set; }

    public decimal Protein100g { get; set; }

    public decimal Carb100g { get; set; }

    public decimal Fat100g { get; set; }

    public string? HinhAnh { get; set; }

    public bool TrangThai { get; set; }

    public virtual ICollection<NguyenLieuCongThuc> NguyenLieuCongThucs { get; set; } = new List<NguyenLieuCongThuc>();

    public virtual ICollection<NhatKyAnUong> NhatKyAnUongs { get; set; } = new List<NhatKyAnUong>();
}
