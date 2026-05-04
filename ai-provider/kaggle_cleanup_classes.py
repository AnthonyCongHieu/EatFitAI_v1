# ===== CHẠY TRÊN COLAB — SAU CELL 7, TRƯỚC KHI ZIP =====
# Dọn dẹp: gộp class trùng nghĩa + loại class rác
# Sau khi chạy xong → dataset sạch, ít class hơn, train tốt hơn
# ===================================================

import os, yaml, re, glob
from tqdm import tqdm
from collections import Counter

MERGED = "/content/merged_dataset"
DATA_YAML = f"{MERGED}/data.yaml"

# === Đọc data.yaml hiện tại ===
with open(DATA_YAML, 'r') as f:
    data_cfg = yaml.safe_load(f)

old_names = data_cfg['names']  # {id: name}
if isinstance(old_names, list):
    old_names = {i: n for i, n in enumerate(old_names)}
else:
    old_names = {int(k): v for k, v in old_names.items()}

print(f"📊 Hiện tại: {len(old_names)} classes")

# ============================================================
# 🗑️ CLASS RÁC — LOẠI BỎ (không phải food hoặc quá chung)
# ============================================================
REMOVE_CLASSES = {
    # Đồ vật
    "label", "oil", "slice_cheese", "butter", "mayonnaise",
    "salad_dressing", "whipped_cream", "plain_yogurt",
    "gochujang", "soybean_paste", "mustard", "ketchup",
    # Quá chung — model sẽ confused
    "rau", "food", "dish", "meal", "cuisine", "snack",
    "baked_goods", "dairy", "dessert", "fast_food",
    "fruit", "vegetable", "seafood", "super_greens",
    "raw_rice", "raw_sausage", "boned", "samul", "ice",
}

# ============================================================
# 🔀 GỘP CLASS TRÙNG NGHĨA → 1 tên chuẩn
# Format: "tên_chuẩn": ["alias1", "alias2", ...]
# ============================================================
MERGE_MAP = {
    # === Rau củ trùng ===
    "dua_leo":       ["cucumber", "dua_leo"],
    "ca_chua":       ["tomato", "ca_chua"],
    "ca_rot":        ["carrot", "carrots", "ca_rot"],
    "ca_tim":        ["eggplant", "egg_plant", "ca_tim", "ca_tim_nuong_mo_hanh"],
    "ot_chuong":     ["capsicum", "bell_pepper", "paprika", "ot_chuong"],
    "bap_cai":       ["cabbage", "chinese_cabbage", "napa_cabbage"],
    "hanh":          ["onion", "green_onion", "spring_onion", "shallot"],
    "nam":           ["mushroom", "common_mushrooms", "nam", "shiitake_mushroom",
                      "shiitake_mushrooms", "enoki_mushrooms", "oyster_mushrooms",
                      "wood_ear_mushroom"],
    "khoai_tay":     ["potato", "khoai", "khoai_tay_chien", "french_fries",
                      "hashbrown", "triangle_hash_brown"],
    "bong_cai":      ["broccoli", "cauliflower", "cauliflower_broccoli", "bong_cai"],
    "rau_muong":     ["water_spinach", "water_morning_glory", "rau_muong_xao"],
    "bi_do":         ["pumpkin", "pumpkin_leaves"],
    "gia":           ["bean_sprout", "bean_sprouts", "mung_bean_sprouts"],
    "ot":            ["chili", "chili_pepper", "green_chilli"],
    "spinach_rau":   ["spinach", "malabar_spinach"],

    # === Protein trùng ===
    "ga":            ["chicken", "thit_ga", "fried_chicken", "roast_chicken",
                      "chicken_breast", "chicken_leg", "chicken_thigh",
                      "chicken_wing", "deep_fried_chicken_wing"],
    "ca":            ["fish", "grilled_fish", "fried_fish", "roast_fish",
                      "boiled_fish", "sea_fish", "dried_fish", "ca_hu_kho",
                      "ca_loc_nuong", "ca_nuc_chien", "ca_basa_kho_hanh",
                      "ca_tai_tuong_chien_xu"],
    "trung":         ["egg", "fried_egg", "fried_eggs", "boiled_egg",
                      "scrambled_egg", "omelet", "omelette",
                      "egg_sunny_side_up", "carrot_eggs"],
    "tom":           ["shrimp", "prawn", "grill_shrimp", "fried_shrimp",
                      "salted_shrimp", "dried_shrimp", "shrimp_patties"],
    "thit_heo":      ["pork", "pork_belly", "pork_chop", "pork_paste",
                      "heo_quay", "bacon", "sweet_and_sour_pork",
                      "twice_cooked_pork", "stewed_pork_leg", "long_heo",
                      "simmered_pork", "pork_with_lemon"],
    "thit_bo":       ["beef", "steak", "beef_steak", "thit_traubo",
                      "beef_belly", "beef_fillet_cutlet", "beef_loin_cutlet",
                      "picanha", "beef_cutlet"],
    "dau_hu":        ["tofu", "dau_hu", "cold_tofu", "egg_tofu",
                      "bean_curd_family_style", "stinky_tofu",
                      "dau_hu_sot_ca", "dau_hu_chien_sot_ca",
                      "dau_hu_sot_ca_chua", "dau_hu_nhoi_thit",
                      "dau_hu_non_ham_hat_sen", "dau_hu_xao_rau_cu",
                      "dau_hu_kho_trung_cut"],
    "cua":           ["crab", "cua", "sea_crab", "field_crab", "crab_meat"],
    "muc":           ["squid", "muc"],
    "oc":            ["snail", "oc", "oc_len_xao_dua", "oc_nuong_tieu_xanh",
                      "oc_xao", "oc_huong"],
    "vit":           ["duck", "vit_nau_chao", "roast_duck", "rice_with_roast_duck"],

    # === Thành phẩm Việt Nam ===
    "pho":           ["pho", "pho_mai"],
    "banh_mi":       ["banh_mi"],
    "com_tam":       ["com_tam", "com_tam_long_xuyen", "com_tam_suon_trung",
                      "com_tam_trung"],
    "bun_bo_hue":    ["bun_bo_hue", "bun_bo_cay",
                      "hue_beef_rice_vermicelli_soup"],
    "com_chien":     ["fried_rice", "com_chien_ga",
                      "yf_com_chien_ga", "yd_com_chien_duong_chau"],
    "cha_gio":       ["spring_roll", "fried_spring_rolls"],
    "sup":           ["soup", "yj_sup_cua", "oxtail_soup", "miso_soup",
                      "wonton_soup", "winter_melon_soup", "sour_prawn_soup",
                      "potage", "fish_ball_soup", "clear_soup", "chinese_soup",
                      "gang_jued"],
    "mi_quang":      ["yc_mi_quang"],
    "nom_hoa_chuoi": ["yh_nom_hoa_chuoi"],
    "nui_xao_bo":    ["yi_nui_xao_bo"],
    "bun_cha_ca":    ["ye_bun_cha_ca"],
    "chao_long":     ["yg_chao_long"],
    "cao_lau":       ["yb_cao_lau"],
    "banh_beo":      ["banh_beo", "banh_beo_ngot", "ya_banh_beo"],
    "banh_cong":     ["banh_cong", "banh_congz"],
    "thit_kho":      ["thit_kho", "thit_kho_tau", "thit_kho_trung",
                      "ba_roi_kho_trung", "ba_roi_kho_ruoc"],

    # === Quốc tế trùng ===
    "burger":        ["hamburger", "burger", "cheese_burger", "mozza_burger"],
    "sandwich":      ["sandwich", "sandwiches", "submarine_sandwich"],
    "salad":         ["salad", "green_salad", "caesar_salad",
                      "macaroni_salad", "potato_salad"],
    "sushi":         ["sushi", "sushi_bowl", "sashimi", "sashimi_bowl"],
    "curry":         ["curry", "green_curry", "yellow_curry", "dry_curry",
                      "beef_curry", "cutlet_curry"],
    "pizza":         ["pizza", "pizza_toast"],
    "hot_dog":       ["hot_dog", "sausage", "xuc_xich_ca_vien"],
    "dumpling":      ["dumpling", "fried_dumplings", "steamed_meat_dumpling",
                      "jiaozi", "xiao_long_bao"],
    "ga_vien":       ["chicken_nugget", "chicken_nuggets", "nugget"],
    "stew":          ["stew", "pot_au_feu"],
    "bread":         ["bread", "french_bread", "white_bread", "roll_bread"],
    "banh_ngot":     ["cake", "shortcake", "rare_cheese_cake", "pastry"],
    "mi_xao":        ["fried_noodle", "chow_mein", "crispy_noodles", "dry_noodles"],
    "pasta":         ["spaghetti", "spaghetti_meat_sauce", "pasta"],
    "com":           ["rice", "cooked_rice", "steamed_rice", "white_rice",
                      "white_steamed_rice", "com_trang", "com_gao_lut"],
    "lau":           ["lau", "hot_pot", "lau_ga_chanh_ot", "lau_mam"],
    "xoi":           ["xoi", "glutinous_oil_rice", "xoi_phong"],

    # === Trái cây trùng ===
    "chuoi":         ["banana", "green_banana", "qua_chuoi"],
    "tao":           ["apple", "qua_tao"],
    "xoai":          ["mango", "qua_xoai"],
    "nho":           ["grape", "qua_nho"],
    "dua_hau":       ["watermelon", "qua_dua_hau"],
    "thanh_long":    ["dragon_fruit", "qua_thanh_long"],
    "dau_tay":       ["strawberry", "qua_dau_tay"],
    "kiwi_qua":      ["kiwi", "qua_kiwi"],
    "oi":            ["qua_oi"],
    "cam":           ["orange"],
    "chanh":         ["lemon", "chanh", "lemon_lime"],
    "buoi":          ["grapefruit", "cam_buoi"],
    "dua":           ["cantaloupe", "cantaloupe_melon", "qua_dua"],
    "taco":          ["taco", "tacos"],

    # === Đồ uống trùng ===
    "bia":           ["beer", "aw_cola", "cider"],
    "kem":           ["ice_cream", "icecream"],
    "ruou":          ["wine", "soju", "makgeolli"],
    "mi":            ["mi", "mi_hoanh_thanh"],

    # === Món khác ===
    "chicken_rice":  ["chicken_rice", "chicken_n_egg_on_rice"],
    "com_ga":        ["com_chay_kho_quet", "com_goi_la_sen", "com_rau_muong_xao",
                      "com_va_rau_xao"],
}

# ============================================================
# XỬ LÝ
# ============================================================

# Tạo reverse map: alias → tên chuẩn
alias_to_standard = {}
for standard, aliases in MERGE_MAP.items():
    for alias in aliases:
        alias_to_standard[alias] = standard

# Bước 1: Tạo mapping old_id → new_name (hoặc None nếu loại)
id_to_new_name = {}
for old_id, old_name in old_names.items():
    if old_name in REMOVE_CLASSES:
        id_to_new_name[old_id] = None  # Loại bỏ
    elif old_name in alias_to_standard:
        id_to_new_name[old_id] = alias_to_standard[old_name]
    else:
        id_to_new_name[old_id] = old_name  # Giữ nguyên

# Bước 2: Tạo danh sách class mới (đã gộp + loại rác)
new_class_set = set()
for old_id, new_name in id_to_new_name.items():
    if new_name is not None:
        new_class_set.add(new_name)

new_class_list = sorted(new_class_set)
new_name_to_id = {name: idx for idx, name in enumerate(new_class_list)}

# Bước 3: Tạo mapping old_id → new_id
old_to_new_id = {}
for old_id, new_name in id_to_new_name.items():
    if new_name is not None and new_name in new_name_to_id:
        old_to_new_id[old_id] = new_name_to_id[new_name]
    # Nếu None → class bị loại, không có trong mapping

print(f"✅ Class mới: {len(new_class_list)} (giảm {len(old_names) - len(new_class_list)})")
print(f"🗑️  Loại bỏ: {sum(1 for v in id_to_new_name.values() if v is None)} classes rác")
print(f"🔀 Gộp: {len(old_names) - len(new_class_list) - sum(1 for v in id_to_new_name.values() if v is None)} classes trùng")

# Bước 4: Rewrite tất cả label files
for split in ['train', 'valid']:
    lbl_dir = f"{MERGED}/{split}/labels"
    img_dir = f"{MERGED}/{split}/images"
    label_files = glob.glob(f"{lbl_dir}/*.txt")

    removed_files = 0
    modified_files = 0

    for lbl_path in tqdm(label_files, desc=f"🔄 Rewrite {split}"):
        new_lines = []
        with open(lbl_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 5:
                    continue
                old_id = int(parts[0])
                if old_id in old_to_new_id:
                    parts[0] = str(old_to_new_id[old_id])
                    new_lines.append(' '.join(parts))
                # Nếu old_id không có trong mapping → class bị loại → bỏ dòng này

        if new_lines:
            with open(lbl_path, 'w') as f:
                f.write('\n'.join(new_lines) + '\n')
            modified_files += 1
        else:
            # Label file rỗng → xóa cả ảnh + label
            os.remove(lbl_path)
            img_name = os.path.splitext(os.path.basename(lbl_path))[0]
            for ext in ['.jpg', '.jpeg', '.png', '.webp']:
                img_path = f"{img_dir}/{img_name}{ext}"
                if os.path.exists(img_path):
                    os.remove(img_path)
                    break
            removed_files += 1

    print(f"  {split}: {modified_files} files updated, {removed_files} files removed")

# Bước 5: Ghi data.yaml mới
data_cfg['nc'] = len(new_class_list)
data_cfg['names'] = {i: name for i, name in enumerate(new_class_list)}

with open(DATA_YAML, 'w') as f:
    yaml.dump(data_cfg, f, default_flow_style=False, allow_unicode=True)

# Bước 6: Thống kê lại
train_imgs = len(glob.glob(f"{MERGED}/train/images/*"))
valid_imgs = len(glob.glob(f"{MERGED}/valid/images/*"))

print(f"\n{'='*60}")
print(f"✅ CLEANUP HOÀN TẤT!")
print(f"{'='*60}")
print(f"  📊 Classes: {len(old_names)} → {len(new_class_list)}")
print(f"  📊 Train:  {train_imgs:,} ảnh")
print(f"  📊 Valid:  {valid_imgs:,} ảnh")
print(f"\n🔜 BƯỚC TIẾP: Zip dataset → upload Kaggle")
