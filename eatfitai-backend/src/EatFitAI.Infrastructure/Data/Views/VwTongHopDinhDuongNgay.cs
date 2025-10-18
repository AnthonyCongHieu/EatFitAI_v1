namespace EatFitAI.Infrastructure.Data.Views;

public class VwTongHopDinhDuongNgay
{
    public Guid NguoiDungId { get; set; }
    public DateOnly NgayAn { get; set; }
    public decimal TongKcal { get; set; }
    public decimal TongProteinG { get; set; }
    public decimal TongCarbG { get; set; }
    public decimal TongFatG { get; set; }
}

