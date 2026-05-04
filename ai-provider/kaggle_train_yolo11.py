# ============================================================
# EATFITAI — KAGGLE TRAINING NOTEBOOK
# Copy từng block (giữa các dòng #===) vào 1 Cell trên Kaggle
# ĐỌC KỸ KAGGLE_TRAINING_GUIDE.md TRƯỚC KHI CHẠY
# ============================================================


# ==================== CELL 1: SETUP + KIỂM TRA GPU ====================
# Thời gian: ~30 giây
# ---
import os, sys, shutil, glob, time, json
from pathlib import Path
from datetime import datetime

# Cài ultralytics (Kaggle có sẵn PyTorch + CUDA)
os.system("pip install -q ultralytics>=8.3.0")

import torch
print(f"{'='*60}")
print(f"🖥️  KIỂM TRA PHẦN CỨNG KAGGLE")
print(f"{'='*60}")
print(f"  PyTorch:  {torch.__version__}")
print(f"  CUDA:     {torch.cuda.is_available()}")
print(f"  GPU count: {torch.cuda.device_count()}")
for i in range(torch.cuda.device_count()):
    props = torch.cuda.get_device_properties(i)
    print(f"  GPU {i}: {props.name} — {props.total_mem / 1024**3:.1f} GB VRAM")

# === ĐƯỜNG DẪN KAGGLE ===
# /kaggle/input/  → dữ liệu input (READ-ONLY)
# /kaggle/working/ → output (WRITABLE, lưu khi commit)
KAGGLE_INPUT = "/kaggle/input"
KAGGLE_WORK  = "/kaggle/working"

# Tên dataset trên Kaggle (slug từ URL)
DATASET_NAME = "eatfitai-food-dataset"

# === BƯỚC 1: Giải nén tar nếu cần ===
TAR_PATH = None
INPUT_DIR = f"{KAGGLE_INPUT}/{DATASET_NAME}"
for f in glob.glob(f"{INPUT_DIR}/*.tar") + glob.glob(f"{INPUT_DIR}/**/*.tar", recursive=True):
    TAR_PATH = f
    break

EXTRACT_DIR = f"{KAGGLE_WORK}/dataset"  # Giải nén vào working (writable)

if TAR_PATH and not os.path.exists(f"{EXTRACT_DIR}/merged_dataset/train/images"):
    print(f"📦 Đang giải nén {os.path.basename(TAR_PATH)}...")
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    import subprocess
    start_ext = time.time()
    subprocess.run(["tar", "-xf", TAR_PATH, "-C", EXTRACT_DIR], check=True)
    ext_time = time.time() - start_ext
    print(f"✅ Giải nén xong ({ext_time/60:.1f} phút)")
elif TAR_PATH:
    print(f"✅ Dataset đã giải nén trước đó, bỏ qua")

# === BƯỚC 2: Tìm dataset ===
DATASET_DIR = None
search_paths = [
    f"{EXTRACT_DIR}/merged_dataset",
    EXTRACT_DIR,
    f"{INPUT_DIR}/merged_dataset",
    INPUT_DIR,
]

for candidate in search_paths:
    if os.path.exists(candidate) and os.path.exists(f"{candidate}/train/images"):
        DATASET_DIR = candidate
        break
    # Tìm sâu 1 cấp
    if os.path.exists(candidate):
        for sd in glob.glob(f"{candidate}/*"):
            if os.path.isdir(sd) and os.path.exists(f"{sd}/train/images"):
                DATASET_DIR = sd
                break
    if DATASET_DIR:
        break

if not DATASET_DIR:
    print(f"\n❌ KHÔNG TÌM THẤY DATASET!")
    print(f"   /kaggle/input/{DATASET_NAME}/:")
    for d in sorted(glob.glob(f"{INPUT_DIR}/*"))[:10]:
        print(f"   {'📁' if os.path.isdir(d) else '📄'} {os.path.basename(d)}")
    print(f"   /kaggle/working/dataset/:")
    for d in sorted(glob.glob(f"{EXTRACT_DIR}/*"))[:10]:
        print(f"   {'📁' if os.path.isdir(d) else '📄'} {os.path.basename(d)}")
    sys.exit(1)

# Kiểm tra data.yaml
DATA_YAML = f"{DATASET_DIR}/data.yaml"
if not os.path.exists(DATA_YAML):
    print(f"❌ Không tìm thấy data.yaml tại {DATA_YAML}")
    sys.exit(1)

# Đếm ảnh
train_imgs = len(glob.glob(f"{DATASET_DIR}/train/images/*"))
valid_imgs = len(glob.glob(f"{DATASET_DIR}/valid/images/*"))

print(f"\n✅ DATASET TÌM THẤY:")
print(f"  📁 Path:  {DATASET_DIR}")
print(f"  📊 Train: {train_imgs:,} ảnh")
print(f"  📊 Valid: {valid_imgs:,} ảnh")

# Đọc data.yaml để biết số class
import yaml
with open(DATA_YAML, 'r') as f:
    data_cfg = yaml.safe_load(f)
print(f"  📋 Classes: {data_cfg.get('nc', 'N/A')}")

# Fix path trong data.yaml → trỏ đúng vào Kaggle path
data_cfg['path'] = DATASET_DIR
data_cfg['train'] = 'train/images'
data_cfg['val'] = 'valid/images'

# Ghi data.yaml mới vào /kaggle/working (vì input là read-only)
FIXED_YAML = f"{KAGGLE_WORK}/data.yaml"
with open(FIXED_YAML, 'w') as f:
    yaml.dump(data_cfg, f, default_flow_style=False, allow_unicode=True)
print(f"  📄 Fixed data.yaml: {FIXED_YAML}")

print(f"\n✅ Setup hoàn tất! Chạy Cell 2 để bắt đầu training.")


# ==================== CELL 2: KIỂM TRA CHECKPOINT CŨ ====================
# Nếu resume từ session trước → cần add output của notebook trước làm input
# Kaggle: Output notebook cũ → "New Dataset" → Add vào notebook mới
# ---
import glob

CHECKPOINT_NAME = "eatfitai-checkpoint"  # ← Tên dataset checkpoint (nếu có)

# Tìm checkpoint từ nhiều nguồn
checkpoint_path = None

# Nguồn 1: Checkpoint dataset (từ session trước, đã save thành dataset)
for pattern in [
    f"{KAGGLE_INPUT}/{CHECKPOINT_NAME}/*.pt",
    f"{KAGGLE_INPUT}/{CHECKPOINT_NAME}/**/*.pt",
]:
    pts = sorted(glob.glob(pattern, recursive=True))
    if pts:
        checkpoint_path = pts[-1]  # Lấy file mới nhất
        break

# Nguồn 2: Checkpoint trong /kaggle/working (session hiện tại bị crash/restart)
if not checkpoint_path:
    pts = sorted(glob.glob(f"{KAGGLE_WORK}/runs/**/last.pt", recursive=True))
    if pts:
        checkpoint_path = pts[-1]

if checkpoint_path:
    print(f"🔄 TÌM THẤY CHECKPOINT:")
    print(f"   📁 {checkpoint_path}")
    size_mb = os.path.getsize(checkpoint_path) / (1024*1024)
    print(f"   📐 Size: {size_mb:.1f} MB")
    print(f"\n   → Cell 3 sẽ tự động RESUME từ checkpoint này")
else:
    print(f"🆕 KHÔNG CÓ CHECKPOINT — Sẽ bắt đầu training mới")
    print(f"   (Nếu bạn có checkpoint từ session trước,")
    print(f"    hãy add dataset '{CHECKPOINT_NAME}' vào notebook)")


# ==================== CELL 3: TRAINING / RESUME ====================
# ⏱️ Thời gian: Chạy hết session 12h
# Tự động resume nếu có checkpoint
# Checkpoint lưu tại /kaggle/working/runs/ → commit notebook để giữ lại
# ---
from ultralytics import YOLO
import os, time, shutil

# === CONFIG ===
RUN_DIR  = f"{KAGGLE_WORK}/runs/food-detection"
RUN_NAME = "yolo11m-eatfitai"
NUM_GPUS = max(1, __import__('torch').cuda.device_count())

# Device config: 1 GPU → device=0, 2 GPUs → device=[0,1] (DDP tự động)
DEVICE = [i for i in range(NUM_GPUS)] if NUM_GPUS > 1 else 0

# Batch size: tổng cho tất cả GPU. Mỗi GPU xử lý batch/num_gpus
# T4 16GB VRAM → 16/GPU là an toàn cho YOLO11m @ 640px
BATCH_TOTAL = 16 * NUM_GPUS

print(f"{'='*60}")
print(f"🚀 EATFITAI YOLO11m TRAINING")
print(f"{'='*60}")
print(f"  GPUs:       {NUM_GPUS}x {'T4' if NUM_GPUS > 0 else 'CPU'}")
print(f"  Device:     {DEVICE}")
print(f"  Batch size: {BATCH_TOTAL} (total) = {BATCH_TOTAL//max(NUM_GPUS,1)}/GPU")
print(f"  Image size: 640px")
print(f"  Data:       {FIXED_YAML}")
print(f"{'='*60}")

start_time = time.time()

# === AUTO RESUME hoặc TRAIN MỚI ===
if checkpoint_path:
    print(f"\n🔄 RESUME từ: {checkpoint_path}")
    print(f"   Training sẽ tiếp tục từ epoch cuối cùng...\n")
    model = YOLO(checkpoint_path)
    results = model.train(resume=True)
else:
    print(f"\n🆕 BẮT ĐẦU TRAINING MỚI\n")
    model = YOLO('yolo11m.pt')  # Pretrained COCO — 20M params
    results = model.train(
        data=FIXED_YAML,
        epochs=150,
        imgsz=640,
        batch=BATCH_TOTAL,
        patience=30,          # Early stopping: 30 epoch không cải thiện → dừng
        workers=4,            # Kaggle có 4 CPU cores
        device=DEVICE,
        cache=False,          # Dataset quá lớn → không cache RAM
        project=RUN_DIR,
        name=RUN_NAME,
        exist_ok=True,

        # === Optimizer ===
        optimizer='auto',
        lr0=0.01,
        lrf=0.01,
        cos_lr=True,

        # === Augmentation tối ưu cho food detection ===
        hsv_h=0.015,          # Hue shift nhẹ (màu thức ăn nhạy cảm)
        hsv_s=0.7,            # Saturation — ánh sáng nhà hàng vs nhà bếp
        hsv_v=0.4,            # Brightness
        degrees=10.0,         # Rotation nhẹ (đĩa thức ăn ít khi xoay nhiều)
        translate=0.1,
        scale=0.5,
        flipud=0.0,           # KHÔNG lật dọc (food không bao giờ lộn ngược)
        fliplr=0.5,           # Lật ngang OK
        mosaic=1.0,           # Ghép 4 ảnh — tốt cho multi-food scenes
        mixup=0.1,            # Blend nhẹ

        # === Saving ===
        save=True,
        save_period=5,        # ⚠️ Kaggle: checkpoint MỖI 5 EPOCH (thay vì 10)
                              # Vì session chỉ 12h → cần checkpoint thường xuyên hơn

        # === Performance ===
        amp=True,             # Mixed precision → tận dụng T4 Tensor Cores
    )

elapsed = time.time() - start_time
hours = elapsed / 3600
print(f"\n{'='*60}")
print(f"⏱️  Thời gian training: {hours:.1f} giờ")
print(f"{'='*60}")


# ==================== CELL 4: BENCHMARK REPORT ====================
# Chạy sau Cell 3 để lấy thống kê tốc độ training
# Dùng để tính toán chính xác tổng thời gian cần thiết
# ---
import os, json, glob

# Tìm results.csv
results_files = sorted(glob.glob(f"{RUN_DIR}/{RUN_NAME}*/results.csv"))
if results_files:
    import csv
    results_path = results_files[-1]
    with open(results_path, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if len(rows) >= 2:
        total_epochs = len(rows)
        print(f"\n{'='*60}")
        print(f"📊 BENCHMARK REPORT")
        print(f"{'='*60}")
        print(f"  Epochs hoàn thành: {total_epochs}")
        print(f"  Thời gian chạy:    {hours:.1f} giờ")
        if total_epochs > 0:
            avg_per_epoch = hours * 60 / total_epochs
            print(f"  Trung bình:        {avg_per_epoch:.1f} phút/epoch")
            print(f"\n📈 DỰ ĐOÁN (dựa trên data thực):")
            remaining = 150 - total_epochs
            print(f"  Còn lại: {remaining} epochs")
            print(f"  Thời gian cần: {remaining * avg_per_epoch / 60:.1f} giờ")
            print(f"  Số sessions 12h: {remaining * avg_per_epoch / 60 / 12:.0f}")
            print(f"  Số tuần (30h quota): {remaining * avg_per_epoch / 60 / 30:.1f}")
    else:
        print("⚠️  Chưa đủ dữ liệu để benchmark")
else:
    print("⚠️  Không tìm thấy results.csv")


# ==================== CELL 5: COPY CHECKPOINT → OUTPUT ====================
# ⚠️ QUAN TRỌNG: Chạy cell này TRƯỚC KHI session hết hạn!
# Hoặc chạy sau khi training xong
# File trong /kaggle/working sẽ được lưu khi bạn "Save Version"
# ---
import shutil, os, glob

print(f"{'='*60}")
print(f"💾 LƯU CHECKPOINT ĐỂ RESUME SESSION SAU")
print(f"{'='*60}")

# Tìm và copy các file quan trọng ra /kaggle/working root
files_to_save = {
    "last.pt": f"{RUN_DIR}/{RUN_NAME}/weights/last.pt",
    "best.pt": f"{RUN_DIR}/{RUN_NAME}/weights/best.pt",
    "results.csv": f"{RUN_DIR}/{RUN_NAME}/results.csv",
    "args.yaml": f"{RUN_DIR}/{RUN_NAME}/args.yaml",
}

saved_files = []
for name, src in files_to_save.items():
    if os.path.exists(src):
        dst = f"{KAGGLE_WORK}/{name}"
        shutil.copy2(src, dst)
        size_mb = os.path.getsize(dst) / (1024*1024)
        saved_files.append(name)
        print(f"  ✅ {name} → {dst} ({size_mb:.1f} MB)")
    else:
        print(f"  ⏭️ {name} — không tìm thấy")

# Copy thêm các epoch checkpoint (epoch5.pt, epoch10.pt, ...)
for pt in glob.glob(f"{RUN_DIR}/{RUN_NAME}/weights/epoch*.pt"):
    name = os.path.basename(pt)
    dst = f"{KAGGLE_WORK}/{name}"
    shutil.copy2(pt, dst)
    saved_files.append(name)
    print(f"  ✅ {name} → {dst}")

print(f"\n{'='*60}")
print(f"📋 ĐÃ LƯU {len(saved_files)} FILES VÀO /kaggle/working/")
print(f"{'='*60}")
print(f"""
🔴 BƯỚC TIẾP THEO ĐỂ RESUME:
   1. Click 'Save Version' (góc phải trên) → chọn 'Save & Run All'
   2. Sau khi commit xong → vào tab 'Output'
   3. Click 'New Dataset' → đặt tên '{CHECKPOINT_NAME}'
   4. Lần chạy tiếp → Add dataset '{CHECKPOINT_NAME}' vào notebook
   5. Code sẽ TỰ ĐỘNG tìm và resume từ checkpoint!
""")


# ==================== CELL 6: VALIDATE + EXPORT (SAU KHI TRAIN XONG) ====================
# Chỉ chạy khi training đã hoàn tất (early stop hoặc đủ 150 epochs)
# ---
from ultralytics import YOLO
import os

BEST_PT = f"{RUN_DIR}/{RUN_NAME}/weights/best.pt"

# Fallback: tìm trong /kaggle/working
if not os.path.exists(BEST_PT):
    BEST_PT = f"{KAGGLE_WORK}/best.pt"

if not os.path.exists(BEST_PT):
    print("❌ Không tìm thấy best.pt — Training chưa xong?")
else:
    # === VALIDATE ===
    print("📊 Đang validate model...")
    model = YOLO(BEST_PT)
    metrics = model.val(data=FIXED_YAML)

    print(f"\n{'='*60}")
    print(f"📊 KẾT QUẢ VALIDATION")
    print(f"{'='*60}")
    print(f"  mAP50:     {metrics.box.map50:.3f}  {'✅ Tốt' if metrics.box.map50 > 0.70 else '⚠️  < 0.70'}")
    print(f"  mAP50-95:  {metrics.box.map:.3f}  {'✅ Tốt' if metrics.box.map > 0.45 else '⚠️  < 0.45'}")
    print(f"  Precision: {metrics.box.mp:.3f}  {'✅ Tốt' if metrics.box.mp > 0.75 else '⚠️  < 0.75'}")
    print(f"  Recall:    {metrics.box.mr:.3f}  {'✅ Tốt' if metrics.box.mr > 0.65 else '⚠️  < 0.65'}")

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
        # Copy ONNX ra /kaggle/working để download
        dst = f"{KAGGLE_WORK}/best.onnx"
        shutil.copy2(onnx_path, dst)
        size_mb = os.path.getsize(dst) / (1024*1024)
        print(f"\n✅ EXPORT THÀNH CÔNG!")
        print(f"   📁 File: {dst}")
        print(f"   📐 Size: {size_mb:.1f} MB")
    else:
        print(f"❌ Không tìm thấy file ONNX")

    # === IN CLASS LIST ===
    print(f"\n{'='*60}")
    print(f"📋 CLASS LIST CHO app.py:")
    print(f"{'='*60}")
    import yaml
    with open(FIXED_YAML, 'r') as f:
        data = yaml.safe_load(f)
    names = data.get('names', {})
    print("YOLO_CLASS_NAMES = [")
    for i in range(len(names)):
        name = names.get(i, names.get(str(i), f"class_{i}"))
        comma = "," if i < len(names)-1 else ""
        print(f'    "{name}"{comma}')
    print("]")

    print(f"\n🚀 BƯỚC TIẾP:")
    print(f"   1. Download best.onnx từ Output tab")
    print(f"   2. Thay file trong ai-provider/")
    print(f"   3. Update YOLO_CLASS_NAMES trong app.py")
    print(f"   4. Git push → Render auto-deploy")
