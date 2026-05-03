# ============================================================
# EATFITAI — COMPLETE TRAINING NOTEBOOK
# Copy từng block (giữa các dòng #===) vào 1 Cell trên Colab
# Chạy theo thứ tự: Cell 1 → 2 → 3 → ... → 10
# ============================================================


# ==================== CELL 1: MOUNT DRIVE + SETUP ====================
# Thời gian: ~30 giây
# ---
from google.colab import drive
drive.mount('/content/drive')

!pip install -q ultralytics pyyaml tqdm

import os, shutil, yaml, glob, re, zipfile
from pathlib import Path
from tqdm import tqdm
from collections import Counter

# === ĐƯỜNG DẪN CHÍNH ===
# File zip trên Drive — ĐỌC TRỰC TIẾP, KHÔNG COPY
DRIVE_RAW = "/content/drive/MyDrive/EatFitAI-Training/datasets-raw"

# Giải nén ra ổ SSD local của Colab (nhanh gấp 10x so với Drive)
WORK_DIR  = "/content/datasets"
MERGED    = "/content/merged_dataset"

# Kết quả training lưu về Drive (bảo vệ khỏi disconnect)
TRAIN_DIR = "/content/drive/MyDrive/EatFitAI-Training"

for d in [
    WORK_DIR,
    f"{MERGED}/train/images", f"{MERGED}/train/labels",
    f"{MERGED}/valid/images", f"{MERGED}/valid/labels",
]:
    os.makedirs(d, exist_ok=True)

# Kiểm tra GPU
!nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
print("\n✅ Setup xong! Drive mounted, thư viện đã cài.")


# ==================== CELL 2: GIẢI NÉN (Drive → Local SSD) ====================
# Thời gian: 10-30 phút tùy dung lượng
# Giải nén từ Drive → local SSD. KHÔNG copy zip, đọc trực tiếp từ Drive.
# ---
import zipfile, glob
from pathlib import Path

zips = sorted(glob.glob(f"{DRIVE_RAW}/*.zip"))
print(f"📦 Tìm thấy {len(zips)} file zip trên Drive\n")

for i, z in enumerate(zips, 1):
    name = Path(z).stem
    dest = f"{WORK_DIR}/{name}"
    size_mb = os.path.getsize(z) / (1024*1024)

    if os.path.exists(dest) and len(os.listdir(dest)) > 0:
        print(f"  ⏭️ [{i}/{len(zips)}] Đã có: {name}")
        continue

    print(f"  📦 [{i}/{len(zips)}] Giải nén: {name} ({size_mb:.0f} MB)...", end=" ")
    try:
        with zipfile.ZipFile(z, 'r') as zf:
            zf.extractall(dest)
        print("✅")
    except zipfile.BadZipFile:
        print("❌ File zip bị lỗi — tải lại!")
    except Exception as e:
        print(f"❌ {e}")

# Tổng dung lượng local
total = sum(
    os.path.getsize(os.path.join(dp, f))
    for dp, dn, fn in os.walk(WORK_DIR) for f in fn
)
print(f"\n✅ Giải nén xong! Tổng: {total/(1024**3):.1f} GB trên local SSD")
print(f"💡 Dung lượng Colab còn lại:")
!df -h /content | tail -1


# ==================== CELL 3: QUÉT DATA.YAML + THU THẬP CLASS ====================
# Thời gian: ~10 giây
# ---
import yaml, glob, os

def find_data_yaml(root):
    """Tìm file data.yaml trong thư mục dataset (đệ quy)"""
    for pattern in ["data.yaml", "*/data.yaml", "**/data.yaml"]:
        results = glob.glob(f"{root}/{pattern}", recursive=True)
        if results:
            return results[0]
    return None

def parse_classes(yaml_path):
    """Đọc class names từ data.yaml"""
    with open(yaml_path, 'r', encoding='utf-8', errors='ignore') as f:
        data = yaml.safe_load(f)
    names = data.get('names', {})
    if isinstance(names, list):
        return {i: n for i, n in enumerate(names)}
    return {int(k): v for k, v in names.items()}

# Quét
all_datasets = sorted([d for d in glob.glob(f"{WORK_DIR}/*") if os.path.isdir(d)])
dataset_classes = {}

print(f"🔍 Quét {len(all_datasets)} thư mục...\n")
for ds in all_datasets:
    name = os.path.basename(ds)
    yaml_path = find_data_yaml(ds)
    if yaml_path:
        classes = parse_classes(yaml_path)
        dataset_classes[name] = classes
        print(f"  📋 {name}: {len(classes)} classes")
    else:
        print(f"  ⚠️  {name}: Không tìm thấy data.yaml — BỎ QUA")

print(f"\n✅ Đọc được {len(dataset_classes)} datasets có data.yaml")


# ==================== CELL 4: CHUẨN HÓA TÊN CLASS + MASTER MAP ====================
# ĐÂY LÀ CELL QUAN TRỌNG NHẤT — xem output kỹ trước khi chạy Cell 5
# ---
import re
from collections import Counter

def normalize_label(name):
    """Chuẩn hóa: lowercase, giữ Unicode (tiếng Việt), thay space/dash bằng underscore, strip prefix dataset"""
    name = name.strip().lower()
    name = re.sub(r'[^\w\s-]', '', name, flags=re.UNICODE)
    name = re.sub(r'[\s-]+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_')
    # Strip prefix dataset (ya_, yb_, ..., yj_)
    name = re.sub(r'^y[a-z]_', '', name)
    return name

# ====================================================================
# 🔧 BẢNG GỘP CLASS TRÙNG NGHĨA
# Nếu sau khi chạy thấy class trùng → THÊM VÀO ĐÂY rồi chạy lại Cell 4
# ====================================================================
MERGE_MAP = {
    # ============ THÀNH PHẨM VIỆT NAM ============
    "pho":           ["pho", "pho_bo", "pho_ga", "pho_tai", "pho_tai_nam",
                      "pho_tai_lan", "pho_ap_chao", "vietnamese_pho"],
    "banh_mi":       ["banhmi", "banh_mi", "banh_mi_thit", "banh_mi_op_la",
                      "banh_mi_cha", "bread_vietnamese", "vietnamese_bread",
                      "vietnamese_sandwich"],
    "com_tam":       ["com_tam", "com_tam_suon", "com_tam_bi", "com_tam_suon_bi_cha",
                      "broken_rice", "com_tam_long_xuyen", "com_tam_suon_trung",
                      "com_tam_trung"],
    "bun_bo_hue":    ["bun_bo_hue", "bun_bo", "bun_bo_cay",
                      "hue_beef_rice_vermicelli_soup"],
    "com_chien":     ["com_chien", "com_rang", "fried_rice", "nasi_goreng",
                      "com_chien_duong_chau", "com_chien_ga"],
    "cha_gio":       ["cha_gio", "nem_ran", "spring_roll", "egg_roll",
                      "fried_spring_roll", "fried_spring_rolls"],
    "goi_cuon":      ["goi_cuon", "summer_roll", "fresh_spring_roll",
                      "vietnamese_spring_roll"],
    "hu_tieu":       ["hu_tieu", "hu_tieu_my_tho", "hu_tieu_nam_vang",
                      "hu_tieu_go"],
    "bun_cha":       ["bun_cha", "bun_cha_ha_noi"],
    "banh_canh":     ["banh_canh", "banh_canh_cua", "banh_canh_ghe",
                      "banh_canh_cha_ca"],
    "banh_cuon":     ["banh_cuon", "banh_cuon_ngot", "steamed_rice_roll"],
    "banh_xeo":      ["banh_xeo", "vietnamese_crepe", "vietnamese_pancake"],
    "com_ga":        ["com_ga", "com_ga_xoi_mo", "com_ga_hai_nam",
                      "chicken_rice", "khao_man_gai"],
    "bun_rieu":      ["bun_rieu", "bun_rieu_cua"],
    "chao":          ["chao", "chao_ga", "chao_long", "congee", "rice_porridge",
                      "porridge", "jok"],
    "canh":          ["canh", "canh_chua", "canh_bi_do_suon_non", "canh_cai",
                      "canh_cua_rau_day", "canh_khoai_mo", "canh_khoai_so",
                      "canh_rau", "canh_rau_cai", "canh_rong_bien_suon_non",
                      "vegetable_soup", "clear_soup"],
    "lau":           ["lau", "lau_thai", "hotpot", "hot_pot", "steamboat",
                      "lau_ga_chanh_ot", "lau_mam"],
    "xoi":           ["xoi", "xoi_xeo", "xoi_gac", "xoi_dau_xanh",
                      "sticky_rice", "glutinous_rice", "glutinous_oil_rice",
                      "xoi_phong"],
    "banh_bao":      ["banh_bao", "steamed_bun", "bao", "nikuman"],
    "mi":            ["mi", "mi_quang", "noodle_soup", "mi_hoanh_thanh"],
    "thit_kho":      ["thit_kho", "thit_kho_tau", "thit_kho_trung",
                      "ba_roi_kho_trung", "ba_roi_kho_ruoc", "simmered_pork"],
    "banh_cong":     ["banh_cong", "banh_congz"],
    "banh_beo":      ["banh_beo", "banh_beo_ngot"],

    # ============ CƠM / TINH BỘT ============
    "com":           ["com", "rice", "cooked_rice", "steamed_rice", "white_rice",
                      "com_trang", "white_steamed_rice", "com_gao_lut"],
    "bun_pho_mi":    ["bun_pho_mi", "rice_vermicelli", "vermicelli_noodles_with_snails",
                      "fine_white_noodles"],
    "mi_xao":        ["fried_noodle", "chow_mein", "crispy_noodles", "dry_noodles"],
    "mi_y":          ["spaghetti", "spaghetti_meat_sauce", "pasta"],
    "burger":        ["burger", "hamburger", "cheese_burger", "mozza_burger"],
    "sandwich":      ["sandwich", "sandwiches", "submarine_sandwich"],
    "bread":         ["bread", "french_bread", "white_bread", "roll_bread"],
    "banh_ngot":     ["cake", "shortcake", "rare_cheese_cake", "pastry"],
    "dumpling":      ["dumpling", "fried_dumplings", "steamed_meat_dumpling",
                      "jiaozi", "xiao_long_bao"],

    # ============ NGUYÊN LIỆU THỊT / HẢI SẢN ============
    "ga":            ["chicken", "ga", "fried_chicken", "ga_ran", "ga_chien",
                      "chicken_breast", "chicken_wing", "chicken_thigh",
                      "chicken_leg", "roast_chicken", "thit_ga",
                      "deep_fried_chicken_wing"],
    "ca":            ["fish", "ca", "grilled_fish", "ca_nuong", "fried_fish",
                      "ca_chien", "steamed_fish", "sea_fish", "dried_fish",
                      "roast_fish", "boiled_fish"],
    "trung":         ["egg", "trung", "fried_egg", "boiled_egg", "trung_chien",
                      "trung_op_la", "scrambled_egg", "omelette", "omelet",
                      "fried_eggs", "egg_sunny_side_up"],
    "dau_hu":        ["tofu", "dau_hu", "dau_phu", "bean_curd", "cold_tofu",
                      "egg_tofu", "bean_curd_family_style"],
    "tom":           ["shrimp", "prawn", "tom", "tom_rang", "fried_shrimp",
                      "grill_shrimp", "salted_shrimp", "dried_shrimp"],
    "thit_heo":      ["pork", "thit_heo", "thit_lon", "pork_belly",
                      "pork_chop", "pork_paste", "heo_quay", "bacon",
                      "sweet_and_sour_pork", "twice_cooked_pork",
                      "stewed_pork_leg", "long_heo"],
    "thit_bo":       ["beef", "thit_bo", "steak", "beef_steak", "thit_traubo",
                      "beef_belly", "beef_fillet_cutlet", "beef_loin_cutlet",
                      "picanha"],
    "cua":           ["crab", "cua", "sea_crab", "field_crab", "crab_meat"],
    "muc":           ["squid", "muc"],
    "oc":            ["snail", "oc"],
    "vit":           ["duck", "vit_nau_chao", "roast_duck",
                      "rice_with_roast_duck"],

    # ============ RAU CỦ ============
    "ca_rot":        ["carrot", "carrots", "ca_rot"],
    "ca_chua":       ["tomato", "ca_chua"],
    "ca_tim":        ["eggplant", "egg_plant"],
    "dua_leo":       ["cucumber", "dua_leo"],
    "bap_cai":       ["cabbage", "chinese_cabbage", "napa_cabbage"],
    "ot":            ["chili", "chili_pepper", "green_chilli"],
    "ot_chuong":     ["capsicum", "bell_pepper", "paprika", "ot_chuong"],
    "hanh":          ["onion", "green_onion", "spring_onion", "shallot"],
    "gia":           ["bean_sprout", "bean_sprouts", "mung_bean_sprouts"],
    "nam":           ["mushroom", "common_mushrooms", "nam",
                      "shiitake_mushroom", "shiitake_mushrooms",
                      "enoki_mushrooms", "oyster_mushrooms",
                      "wood_ear_mushroom"],
    "khoai_tay":     ["potato", "khoai", "khoai_tay_chien", "french_fries",
                      "hashbrown", "triangle_hash_brown"],
    "rau_muong":     ["water_spinach", "water_morning_glory", "rau_muong_xao"],
    "bi_do":         ["pumpkin", "pumpkin_leaves"],
    "bong_cai":      ["broccoli", "cauliflower", "cauliflower_broccoli",
                      "bong_cai"],

    # ============ TRÁI CÂY ============
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
    "dua_luoi":      ["cantaloupe", "cantaloupe_melon"],

    # ============ GIA VỊ ============
    "tuong_ot":      ["ketchup", "dipping_sauce", "tostitos_cheese_dip_sauce"],
    "sa":            ["lemongrass"],

    # ============ ĐỒ UỐNG ============
    "tra":           ["tea", "tra", "green_tea", "tra_da", "iced_tea",
                      "tra_xanh"],
    "ca_phe":        ["coffee", "ca_phe", "ca_phe_sua", "ca_phe_den",
                      "vietnamese_coffee", "iced_coffee"],
    "nuoc_ep":       ["juice", "nuoc_ep", "fruit_juice", "orange_juice",
                      "nuoc_cam"],
    "sinh_to":       ["smoothie", "sinh_to", "milkshake"],
    "bia":           ["beer", "bia", "craft_beer"],
    "sua":           ["milk", "sua", "sua_tuoi", "fresh_milk", "soy_milk"],
    "nuoc_ngot":     ["soda", "soft_drink", "cola", "coke", "pepsi",
                      "sprite", "fanta", "nuoc_ngot", "7up", "aw_cola",
                      "cider"],
    "nuoc":          ["water", "nuoc", "mineral_water", "nuoc_loc",
                      "nuoc_suoi"],
    "ruou":          ["wine", "soju", "makgeolli"],
    "kem":           ["ice_cream", "icecream"],

    # ============ MÓN KHÁC (gộp biến thể) ============
    "salad":         ["salad", "green_salad", "garden_salad", "mixed_salad",
                      "caesar_salad", "macaroni_salad", "potato_salad"],
    "sushi":         ["sushi", "sushi_bowl", "sashimi", "sashimi_bowl"],
    "ga_vien":       ["chicken_nugget", "chicken_nuggets", "nugget"],
    "curry":         ["curry", "green_curry", "yellow_curry", "dry_curry",
                      "beef_curry", "cutlet_curry"],
    "taco":          ["taco", "tacos"],
    "sup":           ["soup", "oxtail_soup", "miso_soup", "beef_miso_soup",
                      "coconut_milk_soup", "chinese_soup", "wonton_soup",
                      "winter_melon_soup", "sour_prawn_soup", "potage",
                      "fish_ball_soup", "sup_cua"],
    "stew":          ["stew", "pot_au_feu"],
    "pizza":         ["pizza", "pizza_toast"],
    "hot_dog":       ["hot_dog", "sausage", "xuc_xich_ca_vien"],
}

# Đảo ngược: alias → tên chuẩn
ALIAS_TO_STANDARD = {}
for standard, aliases in MERGE_MAP.items():
    for alias in aliases:
        ALIAS_TO_STANDARD[alias] = standard

# ====================================================================
# 🗑️ CLASS RÁC — KHÔNG LIÊN QUAN ĐẾN FOOD / QUÁ CHUNG
# ====================================================================
REMOVE_CLASSES = {
    # Đồ vật, con người
    "person", "face", "hand", "finger",
    "plate", "bowl_empty", "fork", "spoon", "knife",
    "chopstick", "chopsticks", "tray", "napkin", "tissue",
    "table", "chair", "restaurant", "kitchen",
    "cutting_board", "pot", "pan", "wok",
    "bag", "box", "wrapper", "packaging",
    "logo", "brand", "poster", "menu", "label",
    "background", "unknown", "other", "con_nguoi",
    # Quá chung — không detect được (model sẽ confused)
    "food", "dish", "meal", "cuisine",
    "baked_goods", "dairy", "dessert", "fast_food",
    "fruit", "vegetable", "rau", "snack", "seafood",
    "super_greens", "raw_rice", "raw_sausage",
    "boned", "samul", "ice",
}

# Thu thập + normalize
all_class_names = set()
for ds_name, classes in dataset_classes.items():
    for old_id, raw_name in classes.items():
        norm = normalize_label(raw_name)
        standard = ALIAS_TO_STANDARD.get(norm, norm)
        all_class_names.add(standard)

clean_classes = sorted(all_class_names - REMOVE_CLASSES)

# Tạo MASTER MAP
MASTER_MAP = {name: idx for idx, name in enumerate(clean_classes)}

print(f"📊 Tổng class gốc (sau normalize): {len(all_class_names)}")
print(f"📊 Sau loại rác:                    {len(clean_classes)}")
print(f"\n{'─'*50}")
print(f"{'ID':>4}  {'Class Name':<35}")
print(f"{'─'*50}")
for name, idx in MASTER_MAP.items():
    print(f"{idx:4d}  {name}")
print(f"{'─'*50}")
print(f"\n✅ MASTER MAP: {len(MASTER_MAP)} classes")
print(f"\n⚠️  KIỂM TRA KỸ danh sách trên!")
print(f"    - Thấy class trùng nghĩa → thêm vào MERGE_MAP → chạy lại Cell 4")
print(f"    - Thấy class rác          → thêm vào REMOVE_CLASSES → chạy lại Cell 4")
print(f"    - OK rồi                  → chạy Cell 5")


# ==================== CELL 5: MERGE + REMAP LABELS ====================
# Thời gian: 5-20 phút tùy dung lượng
# Đọc ảnh/label từ local SSD, remap class ID, ghi ra merged_dataset
# ---
from tqdm import tqdm
import shutil

def find_split_dirs(root):
    """Tìm thư mục train/valid/test chứa images/ + labels/"""
    splits = {}
    for split_name in ['train', 'valid', 'val', 'test']:
        for pattern in [
            f"{root}/{split_name}",
            f"{root}/*/{split_name}",
            f"{root}/**/{split_name}",
        ]:
            results = glob.glob(pattern, recursive=True)
            for r in results:
                img_dir = f"{r}/images"
                lbl_dir = f"{r}/labels"
                if os.path.isdir(img_dir) and os.path.isdir(lbl_dir):
                    key = 'valid' if split_name == 'val' else split_name
                    splits[key] = r
                    break
    return splits

def remap_label_file(src_path, dst_path, old_to_new):
    """Đọc label → remap class ID → ghi ra file mới"""
    lines_out = []
    with open(src_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            old_id = int(parts[0])
            if old_id in old_to_new:
                parts[0] = str(old_to_new[old_id])
                lines_out.append(' '.join(parts))
    if lines_out:
        with open(dst_path, 'w') as f:
            f.write('\n'.join(lines_out) + '\n')
        return True
    return False

# === MERGE ===
total_copied = 0
skipped_ds = []

for ds_name, old_classes in tqdm(dataset_classes.items(), desc="🔄 Merging"):
    ds_path = f"{WORK_DIR}/{ds_name}"

    # Tạo remap table
    old_to_new = {}
    for old_id, raw_name in old_classes.items():
        norm = normalize_label(raw_name)
        standard = ALIAS_TO_STANDARD.get(norm, norm)
        if standard in MASTER_MAP:
            old_to_new[old_id] = MASTER_MAP[standard]

    if not old_to_new:
        skipped_ds.append(ds_name)
        # Xóa dataset không dùng → giải phóng ổ đĩa
        if os.path.exists(ds_path):
            shutil.rmtree(ds_path, ignore_errors=True)
        continue

    splits = find_split_dirs(ds_path)
    ds_count = 0

    for split_name, split_path in splits.items():
        target_split = 'valid' if split_name == 'test' else split_name
        if target_split not in ['train', 'valid']:
            continue

        img_dir = f"{split_path}/images"
        lbl_dir = f"{split_path}/labels"
        prefix = ds_name.replace(' ', '_').replace('-', '_')

        for img_file in os.listdir(img_dir):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue

            lbl_file = os.path.splitext(img_file)[0] + '.txt'
            src_lbl = f"{lbl_dir}/{lbl_file}"

            if not os.path.exists(src_lbl):
                continue

            new_name = f"{prefix}__{img_file}"
            new_lbl = f"{prefix}__{lbl_file}"

            dst_img = f"{MERGED}/{target_split}/images/{new_name}"
            dst_lbl = f"{MERGED}/{target_split}/labels/{new_lbl}"

            if os.path.exists(dst_img):
                continue

            success = remap_label_file(src_lbl, dst_lbl, old_to_new)
            if success:
                shutil.copy2(f"{img_dir}/{img_file}", dst_img)
                ds_count += 1

    total_copied += ds_count

    # 🗑️ XÓA dataset gốc ngay sau khi merge xong → tránh hết ổ đĩa
    if os.path.exists(ds_path):
        shutil.rmtree(ds_path, ignore_errors=True)

# Kết quả
train_imgs = len(os.listdir(f"{MERGED}/train/images"))
valid_imgs = len(os.listdir(f"{MERGED}/valid/images"))

print(f"\n{'='*50}")
print(f"✅ MERGE HOÀN TẤT!")
print(f"{'='*50}")
print(f"  📊 Train: {train_imgs:,} ảnh")
print(f"  📊 Valid: {valid_imgs:,} ảnh")
print(f"  📊 Tổng:  {train_imgs + valid_imgs:,} ảnh")
if skipped_ds:
    print(f"\n  ⏭️  Bỏ qua {len(skipped_ds)} datasets (không match class):")
    for s in skipped_ds:
        print(f"     - {s}")


# ==================== CELL 6: TẠO data.yaml ====================
# ---
data_yaml = {
    'path': MERGED,
    'train': 'train/images',
    'val': 'valid/images',
    'nc': len(MASTER_MAP),
    'names': {v: k for k, v in MASTER_MAP.items()}
}

yaml_path = f"{MERGED}/data.yaml"
with open(yaml_path, 'w') as f:
    yaml.dump(data_yaml, f, default_flow_style=False, allow_unicode=True)

print(f"✅ Đã tạo: {yaml_path}")
print(f"📋 Số class: {data_yaml['nc']}")
print(f"\n📄 Nội dung data.yaml:")
print("─" * 40)
with open(yaml_path, 'r') as f:
    print(f.read())


# ==================== CELL 7: THỐNG KÊ PHÂN BỐ CLASS ====================
# Chạy cell này để xem class nào nhiều/ít ảnh
# Class < 50 ảnh → nên loại hoặc gộp
# ---
class_counts = Counter()
reverse_names = {v: k for k, v in MASTER_MAP.items()}

for lbl_path in tqdm(glob.glob(f"{MERGED}/train/labels/*.txt"), desc="📊 Đếm class"):
    with open(lbl_path, 'r') as f:
        classes_in_img = set()
        for line in f:
            parts = line.strip().split()
            if parts:
                try:
                    classes_in_img.add(int(parts[0]))
                except ValueError:
                    pass
        for c in classes_in_img:
            class_counts[c] += 1

# Hiển thị
print(f"\n{'='*65}")
print(f"{'ID':>4}  {'Class':^30}  {'Ảnh':>6}  {'Bar'}")
print(f"{'='*65}")
for cls_id, count in class_counts.most_common():
    name = reverse_names.get(cls_id, f"unknown_{cls_id}")
    bar = "█" * min(count // 50, 40)
    print(f"{cls_id:4d}  {name:<30}  {count:6,}  {bar}")

# Cảnh báo class ít data
low = [(id, c) for id, c in class_counts.items() if c < 50]
if low:
    print(f"\n⚠️  CÓ {len(low)} CLASS ÍT HƠN 50 ẢNH:")
    for cls_id, count in sorted(low, key=lambda x: x[1]):
        name = reverse_names.get(cls_id, f"unknown_{cls_id}")
        print(f"   ❗ {name}: {count} ảnh → Xem xét LOẠI hoặc GỘP")

print(f"\n📊 Tổng: {len(class_counts)} classes có data thực tế")
print(f"📊 Tổng ảnh train: {sum(class_counts.values()):,}")


# ==================== CELL 8: XÓA LOCAL SAU KHI MERGE (Tiết kiệm RAM) ====================
# Chạy cell này SAU KHI đã kiểm tra merge OK ở Cell 7
# Xóa dữ liệu giải nén để giải phóng ổ đĩa Colab cho training
# ---
import shutil

if os.path.exists(WORK_DIR):
    size_before = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, dn, fn in os.walk(WORK_DIR) for f in fn
    )
    shutil.rmtree(WORK_DIR)
    print(f"🗑️  Đã xóa {WORK_DIR} — giải phóng {size_before/(1024**3):.1f} GB")
else:
    print("ℹ️  Không có gì để xóa")

print(f"\n💾 Dung lượng Colab còn lại:")
!df -h /content | tail -1


# ==================== CELL 9: TRAINING YOLO11m ====================
# Thời gian: 2-36 giờ tùy dataset size (xem bảng ước tính ở TRAINING_GUIDE.md)
# Nếu Colab disconnect → Kết nối lại → Mount Drive → Chạy lại Cell này
# Code tự phát hiện checkpoint → RESUME không mất tiến trình
# ---
from ultralytics import YOLO
import os

TRAIN_DIR = "/content/drive/MyDrive/EatFitAI-Training"
RUN_DIR   = os.path.join(TRAIN_DIR, "runs/food-detection")
RUN_NAME  = "yolo11m-eatfitai"
CHECKPOINT = os.path.join(RUN_DIR, RUN_NAME, "weights/last.pt")

# Auto-detect resume
if os.path.exists(CHECKPOINT):
    print("🔄 RESUME — Phát hiện checkpoint cũ, tiếp tục training...")
    model = YOLO(CHECKPOINT)
    model.train(resume=True)
else:
    print("🆕 BẮT ĐẦU TRAINING MỚI")
    print(f"   Dataset: {MERGED}/data.yaml")

    model = YOLO('yolo11m.pt')  # Pretrained COCO weights — 20M params, sweet spot cho ~300 classes
    model.train(
        data=f'{MERGED}/data.yaml',
        epochs=150,
        imgsz=640,
        batch=16,             # T4 16GB → batch 16. Nếu OOM → đổi thành 8
        patience=30,          # Early stopping
        workers=2,
        device=0,
        cache=False,          # ❗ KHÔNG dùng cache='ram' — dataset quá lớn
        project=RUN_DIR,
        name=RUN_NAME,
        exist_ok=True,

        # === Optimizer ===
        optimizer='auto',
        lr0=0.01,
        lrf=0.01,
        cos_lr=True,

        # === Augmentation tối ưu cho food ===
        hsv_h=0.015,          # Hue shift nhẹ
        hsv_s=0.7,            # Saturation — ánh sáng nhà hàng vs nhà bếp
        hsv_v=0.4,            # Brightness
        degrees=10.0,         # Rotation nhẹ
        translate=0.1,
        scale=0.5,
        flipud=0.0,           # KHÔNG lật dọc (food không bao giờ lộn ngược)
        fliplr=0.5,           # Lật ngang OK
        mosaic=1.0,           # Ghép 4 ảnh — rất tốt cho multi-food
        mixup=0.1,            # Blend nhẹ

        # === Saving ===
        save=True,
        save_period=10,       # Checkpoint mỗi 10 epoch → resume an toàn
    )

print("\n✅ TRAINING HOÀN TẤT!")


# ==================== CELL 10: VALIDATE + EXPORT ONNX ====================
# Chạy sau khi training xong
# ---
from ultralytics import YOLO
import os

TRAIN_DIR = "/content/drive/MyDrive/EatFitAI-Training"
BEST_PT = os.path.join(TRAIN_DIR, "runs/food-detection/yolo11m-eatfitai/weights/best.pt")

if not os.path.exists(BEST_PT):
    print("❌ Không tìm thấy best.pt — Training chưa xong?")
else:
    # === VALIDATE ===
    print("📊 Đang validate...")
    model = YOLO(BEST_PT)
    metrics = model.val(data=f'{MERGED}/data.yaml')

    print(f"\n{'='*50}")
    print(f"📊 KẾT QUẢ VALIDATION")
    print(f"{'='*50}")
    print(f"  mAP50:     {metrics.box.map50:.3f}  {'✅' if metrics.box.map50 > 0.70 else '⚠️  < 0.70'}")
    print(f"  mAP50-95:  {metrics.box.map:.3f}  {'✅' if metrics.box.map > 0.45 else '⚠️  < 0.45'}")
    print(f"  Precision:  {metrics.box.mp:.3f}  {'✅' if metrics.box.mp > 0.75 else '⚠️  < 0.75'}")
    print(f"  Recall:     {metrics.box.mr:.3f}  {'✅' if metrics.box.mr > 0.65 else '⚠️  < 0.65'}")

    # === EXPORT ONNX ===
    print(f"\n📦 Đang export ONNX...")
    model.export(
        format='onnx',
        imgsz=640,
        simplify=True,
        opset=17,
    )

    onnx_path = BEST_PT.replace('.pt', '.onnx')
    if os.path.exists(onnx_path):
        size_mb = os.path.getsize(onnx_path) / (1024*1024)
        print(f"\n✅ EXPORT THÀNH CÔNG!")
        print(f"   📁 File: {onnx_path}")
        print(f"   📐 Size: {size_mb:.1f} MB")
        print(f"\n🚀 BƯỚC TIẾP THEO:")
        print(f"   1. Download best.onnx từ Drive")
        print(f"   2. Thay file cũ trong ai-provider/")
        print(f"   3. Cập nhật YOLO_CLASS_NAMES trong app.py")
        print(f"   4. Git push → Render auto-deploy")
    else:
        print(f"❌ Không tìm thấy file ONNX tại {onnx_path}")

    # === IN CLASS LIST cho app.py ===
    print(f"\n{'='*50}")
    print(f"📋 COPY ĐOẠN NÀY VÀO app.py:")
    print(f"{'='*50}")
    names = {v: k for k, v in MASTER_MAP.items()}
    print("YOLO_CLASS_NAMES = [")
    for i in range(len(names)):
        comma = "," if i < len(names)-1 else ""
        print(f'    "{names[i]}"{comma}')
    print("]")
