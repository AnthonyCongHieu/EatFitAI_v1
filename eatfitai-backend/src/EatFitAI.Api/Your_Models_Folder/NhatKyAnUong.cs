using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Your_Models_Folder;

public partial class NhatKyAnUong
{
    public long MaNhatKy { get; set; }

    public Guid MaNguoiDung { get; set; }

    public DateOnly NgayAn { get; set; }

    public string MaBuaAn { get; set; } = null!;

    public long? MaThucPham { get; set; }

    public long? MaMonNguoiDung { get; set; }

    public long? MaCongThuc { get; set; }

    public decimal KhoiLuongGram { get; set; }

    public decimal Calo { get; set; }

    public decimal Protein { get; set; }

    public decimal Carb { get; set; }

    public decimal Fat { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual LoaiBuaAn MaBuaAnNavigation { get; set; } = null!;

    public virtual CongThuc? MaCongThucNavigation { get; set; }

    public virtual MonNguoiDung? MaMonNguoiDungNavigation { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;

    public virtual ThucPham? MaThucPhamNavigation { get; set; }
}
