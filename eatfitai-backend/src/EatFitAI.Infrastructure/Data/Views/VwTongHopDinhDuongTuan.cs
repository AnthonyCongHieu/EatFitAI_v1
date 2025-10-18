namespace EatFitAI.Infrastructure.Data.Views;

public class VwTongHopDinhDuongTuan
{
    public Guid NguoiDungId { get; set; }
    public int IsoWeek { get; set; }
    public int Year { get; set; }
    public DateOnly TuNgay { get; set; }
    public DateOnly DenNgay { get; set; }
    public decimal TongKcal { get; set; }
    public decimal TongProteinG { get; set; }
    public decimal TongCarbG { get; set; }
    public decimal TongFatG { get; set; }
}

