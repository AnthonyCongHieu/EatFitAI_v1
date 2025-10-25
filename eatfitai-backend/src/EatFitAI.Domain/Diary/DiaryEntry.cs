namespace EatFitAI.Domain.Diary;

public class DiaryEntry
{
    public long MaNhatKy { get; set; }              // MaNhatKy
    public Guid MaNguoiDung { get; set; }          // MaNguoiDung
    public DateOnly NgayAn { get; set; }        // NgayAn (date)
    public string MaBuaAn { get; set; } = string.Empty;    // MaBuaAn (varchar20)

    // 3 sources, only one set:
    public long? MaThucPham { get; set; }         // MaThucPham
    public long? MaMonNguoiDung { get; set; }     // MaMonNguoiDung
    public long? MaCongThuc { get; set; }       // MaCongThuc

    public decimal KhoiLuongGram { get; set; }  // KhoiLuongGram (10,2)
    public decimal Calo { get; set; }     // Calo (10,2)
    public decimal Protein { get; set; }      // Protein (10,2)
    public decimal Carb { get; set; }         // Carb (10,2)
    public decimal Fat { get; set; }          // Fat (10,2)
    public DateTime NgayTao { get; set; }   // NgayTao

    // Navigations
    public Users.NguoiDung? User { get; set; }
    public Foods.Food? Food { get; set; }
    public Foods.CustomDish? CustomDish { get; set; }   // map MonNguoiDung
    public Foods.Recipe? Recipe { get; set; }       // map CongThuc
    public MealType? MealType { get; set; }    // map LoaiBuaAn
}
