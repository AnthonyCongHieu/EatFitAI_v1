using System;
using System.Collections.Generic;

namespace EatFitAI.Infrastructure.Persistence;

public partial class NguyenLieuCongThuc
{
    public long MaNguyenLieu { get; set; }

    public long MaCongThuc { get; set; }

    public long MaThucPham { get; set; }

    public decimal KhoiLuongGram { get; set; }

    public virtual CongThuc MaCongThucNavigation { get; set; } = null!;

    public virtual ThucPham MaThucPhamNavigation { get; set; } = null!;
}
