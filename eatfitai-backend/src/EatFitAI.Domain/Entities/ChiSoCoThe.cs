namespace EatFitAI.Domain.Entities;

public class ChiSoCoThe
{
    public Guid Id { get; set; }
    public Guid NguoiDungId { get; set; }
    public DateOnly NgayDo { get; set; }

    // Cân nặng (kg), chiều cao (cm)
    public decimal? CanNangKg { get; set; }
    public decimal? ChieuCaoCm { get; set; }

    // Một số chỉ số khác (tùy chọn)
    public decimal? VongEoCm { get; set; }
    public decimal? VongHongCm { get; set; }

    public NguoiDung? NguoiDung { get; set; }
}

