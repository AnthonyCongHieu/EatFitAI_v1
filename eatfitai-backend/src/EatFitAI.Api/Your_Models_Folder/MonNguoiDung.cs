using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class MonNguoiDung
{
    public long MaMonNguoiDung { get; set; }

    public Guid MaNguoiDung { get; set; }

    public string TenMon { get; set; } = null!;

    public decimal Calo100g { get; set; }

    public decimal Protein100g { get; set; }

    public decimal Carb100g { get; set; }

    public decimal Fat100g { get; set; }

    public string? GhiChu { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;

    public virtual ICollection<NhatKyAnUong> NhatKyAnUongs { get; set; } = new List<NhatKyAnUong>();
}
