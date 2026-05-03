"""
Script tạo file EatFitAI_Training.ipynb
Chạy: python create_notebook.py
Output: EatFitAI_Training.ipynb (upload lên Colab)
"""
import json

def make_code_cell(source_lines):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source_lines
    }

def make_md_cell(source_lines):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source_lines
    }

cells = []

# === HEADER ===
cells.append(make_md_cell([
    "# 🍜 EatFitAI — Training Pipeline\n",
    "**Model:** YOLO11s | **GPU:** T4 | **Dataset:** 22 bộ Vietnamese + General Food\n",
    "\n",
    "Chạy tuần tự từ Cell 1 → 10. Nếu Colab disconnect → mount Drive lại → chạy Cell 9 (auto resume)."
]))

# === CELL 1: SETUP ===
cells.append(make_md_cell(["## Cell 1: Mount Drive + Setup"]))
cells.append(make_code_cell([
    "from google.colab import drive\n",
    "drive.mount('/content/drive')\n",
    "\n",
    "!pip install -q ultralytics pyyaml tqdm\n",
    "\n",
    "import os, shutil, yaml, glob, re, zipfile\n",
    "from pathlib import Path\n",
    "from tqdm import tqdm\n",
    "from collections import Counter\n",
    "\n",
    "DRIVE_RAW = '/content/drive/MyDrive/EatFitAI-Training/datasets-raw'\n",
    "WORK_DIR  = '/content/datasets'\n",
    "MERGED    = '/content/merged_dataset'\n",
    "TRAIN_DIR = '/content/drive/MyDrive/EatFitAI-Training'\n",
    "\n",
    "for d in [WORK_DIR,\n",
    "          f'{MERGED}/train/images', f'{MERGED}/train/labels',\n",
    "          f'{MERGED}/valid/images', f'{MERGED}/valid/labels']:\n",
    "    os.makedirs(d, exist_ok=True)\n",
    "\n",
    "!nvidia-smi --query-gpu=name,memory.total --format=csv,noheader\n",
    "print('\\n✅ Setup xong!')"
]))

# === CELL 2: EXTRACT ===
cells.append(make_md_cell(["## Cell 2: Giải nén (Drive → Local SSD)\n", "Đọc zip trực tiếp từ Drive, giải nén ra SSD local (nhanh 10x). **Không copy zip.**"]))
cells.append(make_code_cell([
    "zips = sorted(glob.glob(f'{DRIVE_RAW}/*.zip'))\n",
    "print(f'📦 Tìm thấy {len(zips)} file zip\\n')\n",
    "\n",
    "for i, z in enumerate(zips, 1):\n",
    "    name = Path(z).stem\n",
    "    dest = f'{WORK_DIR}/{name}'\n",
    "    size_mb = os.path.getsize(z) / (1024*1024)\n",
    "    if os.path.exists(dest) and len(os.listdir(dest)) > 0:\n",
    "        print(f'  ⏭️ [{i}/{len(zips)}] Đã có: {name}')\n",
    "        continue\n",
    "    print(f'  📦 [{i}/{len(zips)}] Giải nén: {name} ({size_mb:.0f} MB)...', end=' ')\n",
    "    try:\n",
    "        with zipfile.ZipFile(z, 'r') as zf:\n",
    "            zf.extractall(dest)\n",
    "        print('✅')\n",
    "    except zipfile.BadZipFile:\n",
    "        print('❌ File zip bị lỗi!')\n",
    "    except Exception as e:\n",
    "        print(f'❌ {e}')\n",
    "\n",
    "total = sum(os.path.getsize(os.path.join(dp, f)) for dp, dn, fn in os.walk(WORK_DIR) for f in fn)\n",
    "print(f'\\n✅ Xong! Tổng: {total/(1024**3):.1f} GB')\n",
    "!df -h /content | tail -1"
]))

# === CELL 3: SCAN CLASSES ===
cells.append(make_md_cell(["## Cell 3: Quét data.yaml"]))
cells.append(make_code_cell([
    "def find_data_yaml(root):\n",
    "    for p in ['data.yaml', '*/data.yaml', '**/data.yaml']:\n",
    "        r = glob.glob(f'{root}/{p}', recursive=True)\n",
    "        if r: return r[0]\n",
    "    return None\n",
    "\n",
    "def parse_classes(yp):\n",
    "    with open(yp, 'r', encoding='utf-8', errors='ignore') as f:\n",
    "        data = yaml.safe_load(f)\n",
    "    names = data.get('names', {})\n",
    "    if isinstance(names, list): return {i: n for i, n in enumerate(names)}\n",
    "    return {int(k): v for k, v in names.items()}\n",
    "\n",
    "all_datasets = sorted([d for d in glob.glob(f'{WORK_DIR}/*') if os.path.isdir(d)])\n",
    "dataset_classes = {}\n",
    "for ds in all_datasets:\n",
    "    name = os.path.basename(ds)\n",
    "    yp = find_data_yaml(ds)\n",
    "    if yp:\n",
    "        dataset_classes[name] = parse_classes(yp)\n",
    "        print(f'  📋 {name}: {len(dataset_classes[name])} classes')\n",
    "    else:\n",
    "        print(f'  ⚠️  {name}: Không có data.yaml')\n",
    "print(f'\\n✅ {len(dataset_classes)} datasets')"
]))

# === CELL 4: NORMALIZE + MASTER MAP ===
cells.append(make_md_cell([
    "## Cell 4: Chuẩn hóa class ⭐ QUAN TRỌNG\n",
    "Xem output kỹ! Nếu thấy class trùng → sửa `MERGE_MAP` → chạy lại cell này."
]))
cells.append(make_code_cell([
    "def normalize_label(name):\n",
    "    name = name.strip().lower()\n",
    "    name = re.sub(r'[^a-z0-9_\\s-]', '', name)\n",
    "    name = re.sub(r'[\\s-]+', '_', name)\n",
    "    name = re.sub(r'_+', '_', name)\n",
    "    return name.strip('_')\n",
    "\n",
    "MERGE_MAP = {\n",
    "    'banh_mi': ['banhmi','banh_mi','bread_vietnamese','vietnamese_bread'],\n",
    "    'pho': ['pho','pho_bo','pho_ga','vietnamese_pho'],\n",
    "    'com_tam': ['com_tam','broken_rice','com_suon'],\n",
    "    'bun_bo_hue': ['bun_bo_hue','bun_bo'],\n",
    "    'fried_rice': ['fried_rice','com_chien','com_rang'],\n",
    "    'spring_roll': ['spring_roll','cha_gio','nem_ran','egg_roll'],\n",
    "    'goi_cuon': ['goi_cuon','summer_roll','fresh_spring_roll'],\n",
    "    'banh_xeo': ['banh_xeo','vietnamese_crepe'],\n",
    "    'banh_cuon': ['banh_cuon','steamed_rice_roll'],\n",
    "    'bun_cha': ['bun_cha','bun_cha_ha_noi'],\n",
    "    'hu_tieu': ['hu_tieu','hu_tieu_my_tho','hu_tieu_nam_vang'],\n",
    "    'rice': ['rice','cooked_rice','steamed_rice','white_rice','com'],\n",
    "    'chicken': ['chicken','fried_chicken','ga_ran','ga_chien'],\n",
    "    'fish': ['fish','ca','grilled_fish','ca_nuong'],\n",
    "    'egg': ['egg','fried_egg','trung','boiled_egg','trung_chien'],\n",
    "    'tofu': ['tofu','dau_hu','dau_phu','bean_curd'],\n",
    "    'shrimp': ['shrimp','prawn','tom'],\n",
    "    'pork': ['pork','thit_heo','thit_lon'],\n",
    "    'beef': ['beef','thit_bo'],\n",
    "    'soup': ['soup','canh'],\n",
    "}\n",
    "\n",
    "ALIAS_TO_STANDARD = {}\n",
    "for std, aliases in MERGE_MAP.items():\n",
    "    for a in aliases: ALIAS_TO_STANDARD[a] = std\n",
    "\n",
    "REMOVE_CLASSES = {\n",
    "    'person','face','hand','plate','bowl','fork','spoon','knife',\n",
    "    'chopstick','chopsticks','table','chair','cup','glass','bottle',\n",
    "    'can','bag','box','wrapper','packaging','logo','brand','poster',\n",
    "    'background','unknown','other','water','cola','coke','pepsi',\n",
    "    'sprite','fanta','con_nguoi','tray','napkin','tissue',\n",
    "}\n",
    "\n",
    "all_class_names = set()\n",
    "for ds_name, classes in dataset_classes.items():\n",
    "    for old_id, raw in classes.items():\n",
    "        norm = normalize_label(raw)\n",
    "        all_class_names.add(ALIAS_TO_STANDARD.get(norm, norm))\n",
    "\n",
    "clean_classes = sorted(all_class_names - REMOVE_CLASSES)\n",
    "MASTER_MAP = {name: idx for idx, name in enumerate(clean_classes)}\n",
    "\n",
    "print(f'Tổng gốc: {len(all_class_names)} | Sau lọc: {len(clean_classes)}')\n",
    "print('─'*45)\n",
    "for name, idx in MASTER_MAP.items():\n",
    "    print(f'{idx:4d}  {name}')\n",
    "print('─'*45)\n",
    "print(f'\\n✅ MASTER MAP: {len(MASTER_MAP)} classes')\n",
    "print('⚠️  Kiểm tra kỹ! Sửa MERGE_MAP/REMOVE_CLASSES rồi chạy lại nếu cần.')"
]))

# === CELL 5: MERGE ===
cells.append(make_md_cell(["## Cell 5: Merge + Remap labels (5-20 phút)"]))
cells.append(make_code_cell([
    "def find_split_dirs(root):\n",
    "    splits = {}\n",
    "    for sn in ['train','valid','val','test']:\n",
    "        for p in [f'{root}/{sn}', f'{root}/*/{sn}', f'{root}/**/{sn}']:\n",
    "            for r in glob.glob(p, recursive=True):\n",
    "                if os.path.isdir(f'{r}/images') and os.path.isdir(f'{r}/labels'):\n",
    "                    splits['valid' if sn=='val' else sn] = r; break\n",
    "    return splits\n",
    "\n",
    "def remap_label(src, dst, mapping):\n",
    "    out = []\n",
    "    with open(src) as f:\n",
    "        for line in f:\n",
    "            p = line.strip().split()\n",
    "            if len(p) >= 5 and int(p[0]) in mapping:\n",
    "                p[0] = str(mapping[int(p[0])]); out.append(' '.join(p))\n",
    "    if out:\n",
    "        with open(dst, 'w') as f: f.write('\\n'.join(out)+'\\n')\n",
    "        return True\n",
    "    return False\n",
    "\n",
    "for ds_name, old_cls in tqdm(dataset_classes.items(), desc='Merging'):\n",
    "    o2n = {}\n",
    "    for oid, raw in old_cls.items():\n",
    "        norm = normalize_label(raw)\n",
    "        std = ALIAS_TO_STANDARD.get(norm, norm)\n",
    "        if std in MASTER_MAP: o2n[oid] = MASTER_MAP[std]\n",
    "    if not o2n: continue\n",
    "    for sn, sp in find_split_dirs(f'{WORK_DIR}/{ds_name}').items():\n",
    "        ts = 'valid' if sn=='test' else sn\n",
    "        if ts not in ['train','valid']: continue\n",
    "        idir, ldir = f'{sp}/images', f'{sp}/labels'\n",
    "        pfx = ds_name.replace(' ','_').replace('-','_')\n",
    "        for img in os.listdir(idir):\n",
    "            if not img.lower().endswith(('.jpg','.jpeg','.png','.webp')): continue\n",
    "            lbl = os.path.splitext(img)[0]+'.txt'\n",
    "            sl = f'{ldir}/{lbl}'\n",
    "            if not os.path.exists(sl): continue\n",
    "            di = f'{MERGED}/{ts}/images/{pfx}__{img}'\n",
    "            dl = f'{MERGED}/{ts}/labels/{pfx}__{lbl}'\n",
    "            if os.path.exists(di): continue\n",
    "            if remap_label(sl, dl, o2n): shutil.copy2(f'{idir}/{img}', di)\n",
    "\n",
    "ti = len(os.listdir(f'{MERGED}/train/images'))\n",
    "vi = len(os.listdir(f'{MERGED}/valid/images'))\n",
    "print(f'\\n✅ Train: {ti:,} | Valid: {vi:,} | Tổng: {ti+vi:,} ảnh')"
]))

# === CELL 6: data.yaml ===
cells.append(make_md_cell(["## Cell 6: Tạo data.yaml"]))
cells.append(make_code_cell([
    "dy = {'path': MERGED, 'train': 'train/images', 'val': 'valid/images',\n",
    "      'nc': len(MASTER_MAP), 'names': {v:k for k,v in MASTER_MAP.items()}}\n",
    "with open(f'{MERGED}/data.yaml', 'w') as f:\n",
    "    yaml.dump(dy, f, default_flow_style=False, allow_unicode=True)\n",
    "print(f'✅ data.yaml — {dy[\"nc\"]} classes')\n",
    "with open(f'{MERGED}/data.yaml') as f: print(f.read())"
]))

# === CELL 7: STATS ===
cells.append(make_md_cell(["## Cell 7: Thống kê phân bố class"]))
cells.append(make_code_cell([
    "cc = Counter()\n",
    "rn = {v:k for k,v in MASTER_MAP.items()}\n",
    "for lp in tqdm(glob.glob(f'{MERGED}/train/labels/*.txt'), desc='Counting'):\n",
    "    with open(lp) as f:\n",
    "        ids = set()\n",
    "        for line in f:\n",
    "            p = line.strip().split()\n",
    "            if p:\n",
    "                try: ids.add(int(p[0]))\n",
    "                except: pass\n",
    "        for c in ids: cc[c] += 1\n",
    "\n",
    "print(f'{\"ID\":>4}  {\"Class\":<30} {\"Ảnh\":>6}')\n",
    "print('─'*50)\n",
    "for cid, cnt in cc.most_common():\n",
    "    print(f'{cid:4d}  {rn.get(cid,\"?\"):<30} {cnt:6,}  {\"█\"*min(cnt//50,40)}')\n",
    "low = [(i,c) for i,c in cc.items() if c < 50]\n",
    "if low:\n",
    "    print(f'\\n⚠️  {len(low)} class < 50 ảnh — nên loại hoặc gộp')\n",
    "print(f'\\n📊 {len(cc)} classes có data')"
]))

# === CELL 8: CLEANUP ===
cells.append(make_md_cell(["## Cell 8: Xóa local giải nén (giải phóng disk)"]))
cells.append(make_code_cell([
    "if os.path.exists(WORK_DIR):\n",
    "    sz = sum(os.path.getsize(os.path.join(dp,f)) for dp,dn,fn in os.walk(WORK_DIR) for f in fn)\n",
    "    shutil.rmtree(WORK_DIR)\n",
    "    print(f'🗑️ Đã xóa — giải phóng {sz/(1024**3):.1f} GB')\n",
    "!df -h /content | tail -1"
]))

# === CELL 9: TRAINING ===
cells.append(make_md_cell([
    "## Cell 9: Training YOLO11s 🔥\n",
    "Nếu Colab disconnect → Mount Drive lại (Cell 1) → Chạy lại cell này → **Auto resume!**"
]))
cells.append(make_code_cell([
    "from ultralytics import YOLO\n",
    "import os\n",
    "\n",
    "TRAIN_DIR = '/content/drive/MyDrive/EatFitAI-Training'\n",
    "RUN_DIR = os.path.join(TRAIN_DIR, 'runs/food-detection')\n",
    "CHECKPOINT = os.path.join(RUN_DIR, 'yolo11s-eatfitai/weights/last.pt')\n",
    "MERGED = '/content/merged_dataset'\n",
    "\n",
    "if os.path.exists(CHECKPOINT):\n",
    "    print('🔄 RESUME từ checkpoint...')\n",
    "    model = YOLO(CHECKPOINT)\n",
    "    model.train(resume=True)\n",
    "else:\n",
    "    print('🆕 Training mới')\n",
    "    model = YOLO('yolo11s.pt')\n",
    "    model.train(\n",
    "        data=f'{MERGED}/data.yaml',\n",
    "        epochs=150, imgsz=640, batch=16, patience=30,\n",
    "        workers=2, device=0, cache=False,\n",
    "        project=RUN_DIR, name='yolo11s-eatfitai', exist_ok=True,\n",
    "        optimizer='auto', lr0=0.01, lrf=0.01, cos_lr=True,\n",
    "        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,\n",
    "        degrees=10.0, translate=0.1, scale=0.5,\n",
    "        flipud=0.0, fliplr=0.5, mosaic=1.0, mixup=0.1,\n",
    "        save=True, save_period=10,\n",
    "    )\n",
    "print('\\n✅ Training xong!')"
]))

# === CELL 10: VALIDATE + EXPORT ===
cells.append(make_md_cell(["## Cell 10: Validate + Export ONNX"]))
cells.append(make_code_cell([
    "from ultralytics import YOLO\n",
    "import os\n",
    "\n",
    "BEST = '/content/drive/MyDrive/EatFitAI-Training/runs/food-detection/yolo11s-eatfitai/weights/best.pt'\n",
    "MERGED = '/content/merged_dataset'\n",
    "\n",
    "if not os.path.exists(BEST):\n",
    "    print('❌ best.pt chưa có')\n",
    "else:\n",
    "    m = YOLO(BEST)\n",
    "    r = m.val(data=f'{MERGED}/data.yaml')\n",
    "    print(f'mAP50: {r.box.map50:.3f} | mAP50-95: {r.box.map:.3f}')\n",
    "    print(f'Precision: {r.box.mp:.3f} | Recall: {r.box.mr:.3f}')\n",
    "    m.export(format='onnx', imgsz=640, simplify=True, opset=17)\n",
    "    onnx = BEST.replace('.pt','.onnx')\n",
    "    if os.path.exists(onnx):\n",
    "        print(f'\\n✅ ONNX: {os.path.getsize(onnx)/(1024*1024):.1f} MB')\n",
    "        print(f'📁 {onnx}')"
]))

# === BUILD NOTEBOOK ===
notebook = {
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "language_info": {"name": "python"},
        "accelerator": "GPU"
    },
    "cells": cells
}

out_path = "EatFitAI_Training.ipynb"
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, ensure_ascii=False, indent=1)

print(f"✅ Đã tạo: {out_path}")
print(f"📐 Size: {os.path.getsize(out_path)/1024:.1f} KB")
print(f"\n🚀 Upload file này lên Google Colab → chạy tuần tự từ Cell 1!")
