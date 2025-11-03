using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class MealType
{
    public int MealTypeId { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();
}
