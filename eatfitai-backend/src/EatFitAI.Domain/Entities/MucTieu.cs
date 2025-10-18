namespace EatFitAI.Domain.Entities;

public class MucTieu
{
    public int Id { get; set; }
    public string Ma { get; set; } = default!;  // GIAM_CAN, GIU_CAN, TANG_CAN
    public string Ten { get; set; } = default!;
}

