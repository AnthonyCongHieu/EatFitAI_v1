# ============================================================
# EATFITAI - TRAIN YOLO11 NOTEBOOK
# Chạy SAU KHI merge xong (colab_merge_datasets.py)
# ============================================================

# ==================== CELL 1: TRAIN YOLO11s ====================
"""
from ultralytics import YOLO

# Load model pretrained
model = YOLO('yolo11s.pt')

# Train
results = model.train(
    data='/content/merged_dataset/data.yaml',
    epochs=100,
    imgsz=640,
    batch=16,                # T4 16GB VRAM → batch 16 OK
    device=0,
    workers=4,
    patience=20,             # Early stop nếu 20 epoch không cải thiện
    save=True,
    save_period=10,          # Lưu checkpoint mỗi 10 epoch
    cache=False,             # 100K+ ảnh → KHÔNG cache vào RAM
    project='/content/drive/MyDrive/EatFitAI-Training/runs',
    name='yolo11s_full',
    
    # Hyperparameters tối ưu cho food detection
    lr0=0.01,
    lrf=0.01,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=5,
    hsv_h=0.015,
    hsv_s=0.5,
    hsv_v=0.3,
    degrees=10,
    translate=0.1,
    scale=0.3,
    flipud=0.0,
    fliplr=0.5,
    mosaic=1.0,
    mixup=0.1,
)
print("✅ Training xong!")
"""

# ==================== CELL 2: RESUME NẾU COLAB NGẮT ====================
# Khi Colab timeout, chạy cell này để tiếp tục
"""
from ultralytics import YOLO

# Tìm checkpoint cuối cùng
import glob
checkpoints = sorted(glob.glob('/content/drive/MyDrive/EatFitAI-Training/runs/yolo11s_full*/weights/last.pt'))
if checkpoints:
    last_ckpt = checkpoints[-1]
    print(f"📌 Resume từ: {last_ckpt}")
    model = YOLO(last_ckpt)
    model.train(resume=True)
else:
    print("❌ Không tìm thấy checkpoint!")
"""

# ==================== CELL 3: ĐÁNH GIÁ ====================
"""
from ultralytics import YOLO

best_models = sorted(glob.glob('/content/drive/MyDrive/EatFitAI-Training/runs/yolo11s_full*/weights/best.pt'))
model = YOLO(best_models[-1])

# Validate
metrics = model.val(data='/content/merged_dataset/data.yaml')
print(f"mAP50: {metrics.box.map50:.4f}")
print(f"mAP50-95: {metrics.box.map:.4f}")
print(f"Precision: {metrics.box.mp:.4f}")
print(f"Recall: {metrics.box.mr:.4f}")
"""

# ==================== CELL 4: EXPORT ONNX ====================
"""
model.export(
    format='onnx',
    imgsz=640,
    opset=17,         # Production: Render CPU
    simplify=True,
    dynamic=False,
)

# Copy sang Drive
import shutil
onnx_path = best_models[-1].replace('.pt', '.onnx').replace('best.pt', 'best.onnx')
# Tìm file onnx vừa export
import glob
onnx_files = glob.glob('/content/drive/MyDrive/EatFitAI-Training/runs/yolo11s_full*/weights/best.onnx')
if onnx_files:
    print(f"✅ ONNX đã lưu: {onnx_files[-1]}")
else:
    # Export có thể lưu ở thư mục khác
    print("Tìm file ONNX...")
    onnx_files = glob.glob('/content/**/*.onnx', recursive=True)
    for f in onnx_files:
        print(f"  Found: {f}")
"""

# ==================== CELL 5: LẤY CLASS LIST CHO app.py ====================
"""
# In ra YOLO_CLASS_NAMES để copy vào app.py
import yaml

with open('/content/merged_dataset/data.yaml', 'r') as f:
    data = yaml.safe_load(f)

names = data['names']
print("# Copy đoạn này vào app.py")
print("YOLO_CLASS_NAMES = [")
for i in range(len(names)):
    print(f'    "{names[i]}",')
print("]")
"""
