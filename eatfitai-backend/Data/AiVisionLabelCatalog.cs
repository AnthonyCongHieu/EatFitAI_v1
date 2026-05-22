using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EatFitAI.API.Data;

public static class AiVisionLabelCatalog
{
    public const string SeedFileRelativePath = "Data/SeedData/ai_vision_food_catalog.v1.json";

    public static IReadOnlyList<Entry> Entries { get; } =
    [
        E("banh_mi", "Bánh mì", ["bánh mì", "banh mi", "vietnamese baguette"]),
        E("pho", "Phở", ["phở", "pho", "phở bò", "pho bo", "phở gà", "pho ga"]),
        E("bun", "Bún", ["bún", "bun", "rice vermicelli"], isGeneric: true),
        E("bot_chien", "Bột chiên", ["bột chiên", "bot chien"]),
        E("goi_cuon", "Gỏi cuốn", ["gỏi cuốn", "goi cuon", "fresh spring roll"]),
        E("fried_rice", "Cơm chiên", ["cơm chiên", "com chien", "fried rice"]),
        E("com_tam", "Cơm tấm", ["cơm tấm", "com tam", "broken rice"]),
        E("thit_kho", "Thịt kho", ["thịt kho", "thit kho", "caramelized pork"]),
        E("ca_kho", "Cá kho", ["cá kho", "ca kho", "caramelized fish"]),
        E("canh", "Canh", ["canh", "soup", "vietnamese soup"], isGeneric: true),
        E("banh_beo", "Bánh bèo", ["bánh bèo", "banh beo"]),
        E("banh_bo", "Bánh bò", ["bánh bò", "banh bo"]),
        E("banh_bot_loc", "Bánh bột lọc", ["bánh bột lọc", "banh bot loc"]),
        E("banh_can", "Bánh căn", ["bánh căn", "banh can"]),
        E("banh_canh", "Bánh canh", ["bánh canh", "banh canh"]),
        E("banh_chung", "Bánh chưng", ["bánh chưng", "banh chung"]),
        E("banh_cong", "Bánh cống", ["bánh cống", "banh cong"]),
        E("banh_cuon", "Bánh cuốn", ["bánh cuốn", "banh cuon"]),
        E("banh_da_lon", "Bánh da lợn", ["bánh da lợn", "banh da lon"]),
        E("banh_duc", "Bánh đúc", ["bánh đúc", "banh duc"]),
        E("banh_khot", "Bánh khọt", ["bánh khọt", "banh khot"]),
        E("banh_tet", "Bánh tét", ["bánh tét", "banh tet"]),
        E("banh_xeo", "Bánh xèo", ["bánh xèo", "banh xeo"]),
        E("banh_trang", "Bánh tráng", ["bánh tráng", "banh trang", "rice paper"]),
        E("banh_trang_tron", "Bánh tráng trộn", ["bánh tráng trộn", "banh trang tron"]),
        E("bo_kho", "Bò kho", ["bò kho", "bo kho", "beef stew"]),
        E("bo_la_lot", "Bò lá lốt", ["bò lá lốt", "bo la lot"]),
        E("bun_bo_hue", "Bún bò Huế", ["bún bò Huế", "bun bo hue"]),
        E("bun_cha", "Bún chả", ["bún chả", "bun cha"]),
        E("bun_dau", "Bún đậu", ["bún đậu", "bun dau", "bún đậu mắm tôm"]),
        E("bun_mam", "Bún mắm", ["bún mắm", "bun mam"]),
        E("bun_rieu", "Bún riêu", ["bún riêu", "bun rieu"]),
        E("cha_gio", "Chả giò", ["chả giò", "cha gio", "fried spring roll"]),
        E("hu_tieu", "Hủ tiếu", ["hủ tiếu", "hu tieu"]),
        E("lau", "Lẩu", ["lẩu", "lau", "hot pot"], isGeneric: true),
        E("mi_quang", "Mì Quảng", ["mì quảng", "mi quang"]),
        E("cao_lau", "Cao lầu", ["cao lầu", "cao lau"]),
        E("xoi", "Xôi", ["xôi", "xoi", "sticky rice"]),
        E("chao_long", "Cháo lòng", ["cháo lòng", "chao long"]),
        E("sup_cua", "Súp cua", ["súp cua", "sup cua", "crab soup"]),
        E("bitter_melon_soup", "Canh khổ qua", ["canh khổ qua", "canh kho qua", "bitter melon soup"]),
        E("caramelized_fish_clay_pot", "Cá kho tộ", ["cá kho tộ", "ca kho to", "caramelized fish clay pot"]),
        E("chicken_rice", "Cơm gà", ["cơm gà", "com ga", "chicken rice"]),
        E("pumpkin_soup", "Canh bí đỏ", ["canh bí đỏ", "canh bi do", "pumpkin soup"]),
        E("purple_yam_soup", "Canh khoai mỡ", ["canh khoai mỡ", "canh khoai mo", "purple yam soup"]),
        E("steamed_pork_belly_taro", "Thịt ba chỉ hấp khoai môn", ["thịt ba chỉ hấp khoai môn", "thit ba chi hap khoai mon"]),
        E("sizzling_beef_steak", "Bò bít tết", ["bò bít tết", "bo bit tet", "sizzling beef steak"]),
        E("hollow_fried_sesame_donut", "Bánh tiêu", ["bánh tiêu", "banh tieu"]),
        E("nuoc_cham", "Nước chấm", ["nước chấm", "nuoc cham", "dipping sauce"], isGeneric: true),
        E("rice", "Cơm trắng", ["cơm", "cơm trắng", "com", "com trang", "rice"]),
        E("noodles", "Mì/bún/phở", ["mì", "mi", "bún", "bun", "phở", "pho", "noodles"], isGeneric: true),
        E("chicken", "Thịt gà", ["thịt gà", "thit ga", "gà", "ga", "chicken"], isGeneric: true),
        E("beef", "Thịt bò", ["thịt bò", "thit bo", "bò", "bo", "beef"], isGeneric: true),
        E("pork", "Thịt heo", ["thịt heo", "thit heo", "thịt lợn", "thit lon", "pork"], isGeneric: true),
        E("pork_belly", "Thịt ba chỉ", ["thịt ba chỉ", "thit ba chi", "pork belly"]),
        E("pork_rib", "Sườn heo", ["sườn heo", "suon heo", "pork rib"]),
        E("grilled_pork_belly", "Thịt ba chỉ nướng", ["thịt ba chỉ nướng", "thit ba chi nuong", "grilled pork belly"]),
        E("fish", "Cá", ["cá", "ca", "fish"], isGeneric: true),
        E("shrimp", "Tôm", ["tôm", "tom", "shrimp"]),
        E("crab", "Cua", ["cua", "crab"]),
        E("squid", "Mực", ["mực", "muc", "squid"]),
        E("egg", "Trứng", ["trứng", "trung", "egg"]),
        E("fried_egg", "Trứng chiên", ["trứng chiên", "trung chien", "fried egg"]),
        E("tofu", "Đậu hũ", ["đậu hũ", "đậu phụ", "dau hu", "tofu"]),
        E("tempeh", "Tempeh", ["tempeh", "đậu nành lên men"]),
        E("tomato", "Cà chua", ["cà chua", "ca chua", "tomato"]),
        E("cucumber", "Dưa leo", ["dưa leo", "dưa chuột", "dua leo", "cucumber"]),
        E("carrot", "Cà rốt", ["cà rốt", "ca rot", "carrot"]),
        E("potato", "Khoai tây", ["khoai tây", "khoai tay", "potato"]),
        E("sweet_potato", "Khoai lang", ["khoai lang", "sweet potato"]),
        E("spinach", "Rau chân vịt", ["rau chân vịt", "rau bina", "spinach"]),
        E("water_spinach", "Rau muống", ["rau muống", "rau muong", "water spinach"]),
        E("bokchoy", "Cải thìa", ["cải thìa", "cai thia", "bok choy", "bokchoy"]),
        E("cabbage", "Bắp cải", ["bắp cải", "bap cai", "cabbage"]),
        E("cauliflower", "Bông cải trắng", ["bông cải trắng", "cauliflower"]),
        E("broccoli", "Bông cải xanh", ["bông cải xanh", "broccoli"]),
        E("eggplant", "Cà tím", ["cà tím", "ca tim", "eggplant"]),
        E("bitter_gourd", "Khổ qua", ["khổ qua", "kho qua", "bitter gourd"]),
        E("bottle_gourd", "Bầu", ["bầu", "bau", "bottle gourd"]),
        E("pumpkin", "Bí đỏ", ["bí đỏ", "bi do", "pumpkin"]),
        E("radish", "Củ cải trắng", ["củ cải", "cu cai", "radish"]),
        E("long_beans", "Đậu đũa", ["đậu đũa", "dau dua", "long beans"]),
        E("beans", "Đậu", ["đậu", "dau", "beans"], isGeneric: true),
        E("peas", "Đậu Hà Lan", ["đậu Hà Lan", "dau ha lan", "peas"]),
        E("mushroom", "Nấm", ["nấm", "nam", "mushroom"], isGeneric: true),
        E("chayote", "Su su", ["su su", "chayote"]),
        E("corn", "Bắp", ["bắp", "ngô", "corn"]),
        E("onion", "Hành tây", ["hành tây", "hanh tay", "onion"]),
        E("shallot", "Hành tím", ["hành tím", "hanh tim", "shallot"]),
        E("green_onion", "Hành lá", ["hành lá", "hanh la", "green onion"]),
        E("garlic", "Tỏi", ["tỏi", "toi", "garlic"]),
        E("chili", "Ớt", ["ớt", "ot", "chili"]),
        E("ginger", "Gừng", ["gừng", "gung", "ginger"]),
        E("galangal", "Riềng", ["riềng", "rieng", "galangal"]),
        E("lemongrass", "Sả", ["sả", "sa", "lemongrass"]),
        E("leek", "Tỏi tây", ["tỏi tây", "toi tay", "leek"]),
        E("lime_leaf", "Lá chanh", ["lá chanh", "la chanh", "lime leaf"]),
        E("coriander_seed", "Hạt ngò", ["hạt ngò", "hat ngo", "coriander seed"]),
        E("fennel_seed", "Hạt thì là", ["hạt thì là", "hat thi la", "fennel seed"]),
        E("star_anise", "Hoa hồi", ["hoa hồi", "hoa hoi", "star anise"]),
        E("cinnamon", "Quế", ["quế", "que", "cinnamon"]),
        E("clove", "Đinh hương", ["đinh hương", "dinh huong", "clove"]),
        E("turmeric", "Nghệ", ["nghệ", "nghe", "turmeric"]),
        E("bell_pepper", "Ớt chuông", ["ớt chuông", "ot chuong", "bell pepper"]),
        E("lime", "Chanh", ["chanh", "lime"]),
    ];

    public static IReadOnlyDictionary<string, Entry> ByLabel { get; } = Entries
        .ToDictionary(entry => entry.Label, StringComparer.OrdinalIgnoreCase);

    public static Entry? Find(string? label)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            return null;
        }

        var key = label.Trim().ToLowerInvariant();
        return ByLabel.TryGetValue(key, out var entry) ? entry : null;
    }

    public static IReadOnlyList<FoodSeed> LoadFoodSeeds(string? contentRootPath = null)
    {
        var path = ResolveSeedFilePath(contentRootPath);
        if (path == null)
        {
            return Array.Empty<FoodSeed>();
        }

        using var stream = File.OpenRead(path);
        var seeds = JsonSerializer.Deserialize<List<FoodSeed>>(stream, JsonOptions) ?? [];
        return seeds
            .Where(seed => !string.IsNullOrWhiteSpace(seed.Label))
            .ToList();
    }

    public static string NormalizeKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var lower = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(lower.Length);
        var lastWasSpace = true;

        foreach (var c in lower)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var normalized = c == 'đ' ? 'd' : c;
            if (char.IsLetterOrDigit(normalized))
            {
                builder.Append(normalized);
                lastWasSpace = false;
            }
            else if (!lastWasSpace)
            {
                builder.Append(' ');
                lastWasSpace = true;
            }
        }

        return builder.ToString().Trim().Normalize(NormalizationForm.FormC);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private static Entry E(
        string label,
        string displayNameVi,
        string[] aliases,
        decimal minConfidence = 0.60m,
        bool isGeneric = false) =>
        new(label, displayNameVi, aliases, isGeneric ? Math.Max(minConfidence, 0.75m) : minConfidence, isGeneric);

    private static string? ResolveSeedFilePath(string? contentRootPath)
    {
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(contentRootPath))
        {
            candidates.Add(Path.Combine(contentRootPath, SeedFileRelativePath));
        }

        candidates.Add(Path.Combine(AppContext.BaseDirectory, SeedFileRelativePath));
        candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), "eatfitai-backend", SeedFileRelativePath));
        candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), SeedFileRelativePath));

        return candidates.FirstOrDefault(File.Exists);
    }

    public sealed record Entry(
        string Label,
        string DisplayNameVi,
        IReadOnlyList<string> Aliases,
        decimal MinConfidence,
        bool IsGeneric);

    public sealed class FoodSeed
    {
        public string Label { get; set; } = string.Empty;
        public string FoodName { get; set; } = string.Empty;
        public string? FoodNameEn { get; set; }
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal CarbPer100g { get; set; }
        public decimal FatPer100g { get; set; }
        public string DefaultServingUnitName { get; set; } = "gram";
        public decimal DefaultGrams { get; set; } = 100;
        public bool IsVerified { get; set; }
        public string? VerifiedBy { get; set; }
        public string VerificationStatus { get; set; } = "trusted_reference";
        public int CredibilityScore { get; set; } = 75;
        public decimal NutrientCompletenessScore { get; set; } = 100;
        public List<string> MissingNutrients { get; set; } = [];
    }
}
