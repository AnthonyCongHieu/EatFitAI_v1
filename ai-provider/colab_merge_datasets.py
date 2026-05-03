# ============================================================
# EATFITAI - MERGE DATASETS NOTEBOOK
# Chạy trên Google Colab - Copy từng block vào 1 cell
# ============================================================

# ==================== CELL 1: SETUP ====================
# Mount Drive + cài thư viện
"""
from google.colab import drive
drive.mount('/content/drive')

!pip install ultralytics pyyaml tqdm

import os, shutil, yaml, glob
from pathlib import Path
from tqdm import tqdm
from collections import Counter

DRIVE_RAW = "/content/drive/MyDrive/EatFitAI-Training/datasets-raw"
WORK_DIR = "/content/datasets"       # Giải nén tại đây
MERGED = "/content/merged_dataset"   # Dataset gộp cuối cùng

os.makedirs(WORK_DIR, exist_ok=True)
os.makedirs(f"{MERGED}/train/images", exist_ok=True)
os.makedirs(f"{MERGED}/train/labels", exist_ok=True)
os.makedirs(f"{MERGED}/valid/images", exist_ok=True)
os.makedirs(f"{MERGED}/valid/labels", exist_ok=True)

print("✅ Setup xong")
"""

# ==================== CELL 2: GIẢI NÉN ====================
"""
import zipfile

zips = sorted(glob.glob(f"{DRIVE_RAW}/*.zip"))
print(f"Tìm thấy {len(zips)} file zip")

for z in zips:
    name = Path(z).stem  # Tên không đuôi .zip
    dest = f"{WORK_DIR}/{name}"
    if os.path.exists(dest):
        print(f"⏭️ Đã giải nén: {name}")
        continue
    print(f"📦 Đang giải nén: {name}...")
    try:
        with zipfile.ZipFile(z, 'r') as zf:
            zf.extractall(dest)
        print(f"  ✅ Xong: {name}")
    except Exception as e:
        print(f"  ❌ Lỗi: {name} - {e}")

print(f"\n✅ Giải nén xong tất cả")
"""

# ==================== CELL 3: QUÉT CLASS MAP ====================
# Đọc data.yaml từ mỗi dataset, thu thập tất cả class names
"""
def find_data_yaml(root):
    '''Tìm file data.yaml trong thư mục dataset'''
    for pattern in ["data.yaml", "*/data.yaml", "**/data.yaml"]:
        results = glob.glob(f"{root}/{pattern}", recursive=True)
        if results:
            return results[0]
    return None

def parse_classes(yaml_path):
    '''Đọc class names từ data.yaml'''
    with open(yaml_path, 'r', encoding='utf-8', errors='ignore') as f:
        data = yaml.safe_load(f)
    names = data.get('names', {})
    # Có thể là dict {0: 'rice', 1: 'chicken'} hoặc list ['rice', 'chicken']
    if isinstance(names, list):
        return {i: n for i, n in enumerate(names)}
    return {int(k): v for k, v in names.items()}

# Quét tất cả datasets
all_datasets = sorted(glob.glob(f"{WORK_DIR}/*"))
dataset_classes = {}  # {dataset_name: {old_id: class_name}}

for ds in all_datasets:
    name = os.path.basename(ds)
    yaml_path = find_data_yaml(ds)
    if yaml_path:
        classes = parse_classes(yaml_path)
        dataset_classes[name] = classes
        print(f"📋 {name}: {len(classes)} classes")
    else:
        print(f"⚠️ {name}: Không tìm thấy data.yaml")

print(f"\n✅ Quét xong {len(dataset_classes)} datasets")
"""

# ==================== CELL 4: CHUẨN HÓA TÊN CLASS ====================
# Tạo bảng mapping tên class → tên chuẩn (lowercase_underscore)
"""
import re

def normalize_label(name):
    '''Chuẩn hóa tên class: lowercase, thay dấu cách/gạch ngang bằng _'''
    name = name.strip().lower()
    name = re.sub(r'[^a-z0-9_\s-]', '', name)  # Bỏ ký tự đặc biệt
    name = re.sub(r'[\s-]+', '_', name)          # Dấu cách/gạch ngang → _
    name = re.sub(r'_+', '_', name)              # Nhiều _ → 1 _
    return name.strip('_')

# Bảng merge thủ công — class trùng nghĩa gộp về 1 tên
# Thêm vào đây khi phát hiện thêm
MERGE_MAP = {
    "banh_mi": ["banhmi", "banh_mi", "bread_vietnamese"],
    "pho": ["pho", "pho_bo", "pho_ga", "vietnamese_pho"],
    "com_tam": ["com_tam", "broken_rice", "com_suon"],
    "bun_bo_hue": ["bun_bo_hue", "bun_bo"],
    "fried_rice": ["fried_rice", "com_chien", "com_rang"],
    "spring_roll": ["spring_roll", "cha_gio", "nem_ran", "egg_roll"],
    "rice": ["rice", "cooked_rice", "steamed_rice", "white_rice", "com"],
    "chicken": ["chicken", "fried_chicken", "ga_ran", "ga_chien"],
    "fish": ["fish", "ca", "grilled_fish", "ca_nuong"],
    "egg": ["egg", "fried_egg", "trung", "boiled_egg", "trung_chien"],
    "tofu": ["tofu", "dau_hu", "dau_phu", "bean_curd"],
    "shrimp": ["shrimp", "prawn", "tom"],
    "pork": ["pork", "thit_heo", "thit_lon"],
    "beef": ["beef", "thit_bo"],
    "soup": ["soup", "canh"],
}

# Đảo ngược: alias → tên chuẩn
ALIAS_TO_STANDARD = {}
for standard, aliases in MERGE_MAP.items():
    for alias in aliases:
        ALIAS_TO_STANDARD[alias] = standard

# Thu thập tất cả class names đã normalize
all_class_names = set()
for ds_name, classes in dataset_classes.items():
    for old_id, raw_name in classes.items():
        norm = normalize_label(raw_name)
        standard = ALIAS_TO_STANDARD.get(norm, norm)
        all_class_names.add(standard)

# Loại class rác (non-food)
REMOVE_CLASSES = {
    "person", "face", "hand", "plate", "bowl", "fork", "spoon",
    "knife", "chopstick", "table", "chair", "cup", "glass",
    "bottle", "can", "bag", "box", "wrapper", "packaging",
    "logo", "brand", "poster", "background", "unknown", "other",
    "water", "cola", "coke", "pepsi", "sprite", "fanta",
}

clean_classes = sorted(all_class_names - REMOVE_CLASSES)
print(f"Tổng class sau normalize: {len(all_class_names)}")
print(f"Sau loại rác: {len(clean_classes)}")

# Tạo master class map: {class_name: new_id}
MASTER_MAP = {name: idx for idx, name in enumerate(clean_classes)}

# In ra để kiểm tra
for name, idx in MASTER_MAP.items():
    print(f"  {idx}: {name}")

print(f"\n✅ Master class map: {len(MASTER_MAP)} classes")
"""

# ==================== CELL 5: XEM & SỬA MERGE_MAP ====================
# Sau khi chạy Cell 4, kiểm tra output
# Nếu thấy class trùng nghĩa → thêm vào MERGE_MAP ở Cell 4 rồi chạy lại
# Nếu thấy class cần loại → thêm vào REMOVE_CLASSES rồi chạy lại
# Khi đã OK → chạy Cell 6

# ==================== CELL 6: MERGE + REMAP ====================
"""
def find_split_dirs(root):
    '''Tìm thư mục train/valid/test trong dataset'''
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
                    # val → valid (chuẩn hóa)
                    key = 'valid' if split_name == 'val' else split_name
                    splits[key] = r
                    break
    return splits

def remap_label_file(src_path, dst_path, old_to_new):
    '''Đọc label file, remap class ID, ghi ra file mới'''
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

# Merge từng dataset
stats = Counter()  # Đếm ảnh theo class

for ds_name, old_classes in tqdm(dataset_classes.items(), desc="Merging"):
    ds_path = f"{WORK_DIR}/{ds_name}"

    # Tạo bảng remap: old_id → new_id (bỏ qua class bị loại)
    old_to_new = {}
    for old_id, raw_name in old_classes.items():
        norm = normalize_label(raw_name)
        standard = ALIAS_TO_STANDARD.get(norm, norm)
        if standard in MASTER_MAP:
            old_to_new[old_id] = MASTER_MAP[standard]

    if not old_to_new:
        print(f"⏭️ {ds_name}: không có class nào match")
        continue

    splits = find_split_dirs(ds_path)

    for split_name, split_path in splits.items():
        # test → gộp vào valid
        target_split = 'valid' if split_name == 'test' else split_name
        if target_split not in ['train', 'valid']:
            continue

        img_dir = f"{split_path}/images"
        lbl_dir = f"{split_path}/labels"
        prefix = ds_name.replace(' ', '_')

        for img_file in os.listdir(img_dir):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue

            lbl_file = os.path.splitext(img_file)[0] + '.txt'
            src_lbl = f"{lbl_dir}/{lbl_file}"

            if not os.path.exists(src_lbl):
                continue

            # Tên mới: prefix_tên_gốc (tránh trùng giữa datasets)
            new_name = f"{prefix}_{img_file}"
            new_lbl = f"{prefix}_{lbl_file}"

            dst_img = f"{MERGED}/{target_split}/images/{new_name}"
            dst_lbl = f"{MERGED}/{target_split}/labels/{new_lbl}"

            if os.path.exists(dst_img):
                continue

            # Remap label
            success = remap_label_file(src_lbl, dst_lbl, old_to_new)
            if success:
                shutil.copy2(f"{img_dir}/{img_file}", dst_img)

print(f"\n✅ Merge hoàn tất!")

# Đếm kết quả
train_imgs = len(os.listdir(f"{MERGED}/train/images"))
valid_imgs = len(os.listdir(f"{MERGED}/valid/images"))
print(f"📊 Train: {train_imgs} ảnh")
print(f"📊 Valid: {valid_imgs} ảnh")
print(f"📊 Tổng: {train_imgs + valid_imgs} ảnh")
"""

# ==================== CELL 7: TẠO data.yaml ====================
"""
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

print(f"✅ Đã tạo {yaml_path}")
print(f"📋 {data_yaml['nc']} classes")
"""

# ==================== CELL 8: THỐNG KÊ CLASS ====================
"""
# Đếm số ảnh chứa mỗi class
class_counts = Counter()
reverse_names = {v: k for k, v in MASTER_MAP.items()}

for lbl_path in tqdm(glob.glob(f"{MERGED}/train/labels/*.txt"), desc="Counting"):
    with open(lbl_path, 'r') as f:
        classes_in_img = set()
        for line in f:
            parts = line.strip().split()
            if parts:
                classes_in_img.add(int(parts[0]))
        for c in classes_in_img:
            class_counts[c] += 1

print("\n📊 Phân bố class (top 30):")
for cls_id, count in class_counts.most_common(30):
    name = reverse_names.get(cls_id, f"unknown_{cls_id}")
    bar = "█" * min(count // 100, 50)
    print(f"  {cls_id:3d} {name:30s} {count:6d} {bar}")

print(f"\n📊 Class ít nhất 50 ảnh:")
low_classes = [(cls_id, count) for cls_id, count in class_counts.items() if count < 50]
for cls_id, count in sorted(low_classes, key=lambda x: x[1]):
    name = reverse_names.get(cls_id, f"unknown_{cls_id}")
    print(f"  ⚠️ {name}: {count} ảnh → NÊN LOẠI hoặc gộp")

print(f"\nTổng: {len(class_counts)} classes có data thực tế")
"""
