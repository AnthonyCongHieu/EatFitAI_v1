# Hướng Dẫn Train AI Nhận Diện Thực Phẩm (YOLO11 + Roboflow + Colab)

> **Model hiện tại**: YOLO11s (upgraded từ YOLOv8s — +2.1 mAP, -16% params)
> **Inference engine**: ONNX Runtime (CPU-only trên Render free tier)
> **Training environment**: Google Colab (T4 GPU 16GB VRAM)

---

## Bước 1: Chuẩn Bị Dữ Liệu trên Roboflow

### 1.1. Tìm dataset
1. Đăng ký tài khoản tại [roboflow.com](https://roboflow.com/).
2. Vào **Roboflow Universe** → tìm kiếm dataset:
   - "Food Detection", "Vegetables", "Meat", "Seafood", "Vietnamese Food"
   - ⚠️ **CHỈ CHỌN** dataset loại **Object Detection** (có bounding box). **KHÔNG** dùng Classification.

#### Dataset shortlist đã kiểm tra

> Ghi chú: danh sách dưới đây đã được kiểm tra link public còn sống, metadata task/images/classes, và với Roboflow đã xem thêm thumbnail mẫu trực quan. Không cần bắt buộc là món Việt; ưu tiên món/nguyên liệu phổ biến ở Việt Nam và có label đủ rõ để map nutrition.

**Core Vietnamese / Asian food detection — ưu tiên cao**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [VietFood67 Kaggle](https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68) | ~33K ảnh / 68 class | Nguồn món Việt phù hợp nhất; kiểm tra format annotation trước khi đưa vào YOLO |
| [VietFood67 Roboflow mirror / Food Data](https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp) | 8,205 ảnh / 31 class | Món Việt rõ, visual sát nhu cầu; nên review bbox từng class trước khi merge |
| [DETECTION_15_VIETNAMESE_FOOD](https://universe.roboflow.com/aiapplication/detection_15_vietnamese_food) | 2,889 ảnh / 15 class | Ít class nhưng đúng domain Việt, dùng tốt để bổ sung món phổ biến |
| [Vietnamese Food 5 classes](https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo) | 1,000 ảnh / 5 class | Có bánh mì, bột chiên, bún, gỏi cuốn, phở; dùng nếu class này còn thiếu |
| [Thai-Food-Project](https://universe.roboflow.com/baimint/thai-food-project) | 3,803 ảnh / 21 class | Món châu Á gần domain Việt; cherry-pick class visual rõ như shrimp, egg-tofu, grill-shrimp |

**General food phổ biến ở Việt Nam — dùng sau khi lọc class**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [UECFOOD256 Roboflow](https://universe.roboflow.com/japon-gi1n7/uecfood256) | 29,364 ảnh / 253 class | Nguồn lớn, nhiều món châu Á; không merge nguyên bộ, chỉ chọn class cần |
| [Food Detection Project 64 classes](https://universe.roboflow.com/food-aozvm/food-detection-project) | 9,026 ảnh / 64 class | Có nhiều class phổ thông; cần loại candy/drink/object nếu không phục vụ nutrition |
| [Food detection 3](https://universe.roboflow.com/gp-final/food-detection-3) | 10,000 ảnh / 36 class | Tương đối sạch cho rau/trái cây/món phổ thông; review ảnh có poster/stock không |
| [Food-kcmrd](https://universe.roboflow.com/helo-helo/food-kcmrd) | 4,209 ảnh / 78 class | Hữu ích cho ingredient/food mixed như fish, tomato, carrot, chicken, tofu |
| [Food detection xt7yz](https://universe.roboflow.com/science-fair-48u9f/food-detection-xt7yz) | 6,435 ảnh / 51 class | Có cả plate/food context; cần chuẩn hóa `rice`, `sandwich`, `onion`, fruit/vegetable |
| [Food detection tyd55](https://universe.roboflow.com/semproject-5w89z/food-detection-tyd55) | 3,376 ảnh / 38 class | Bổ sung trái cây/rau/cơm/pizza; review label trùng trước khi merge |
| [Food Detection lhp8d](https://universe.roboflow.com/detection-lnetp/food-detection-lhp8d) | 1,754 ảnh / 27 class | Có nguyên liệu phổ biến như salmon, beef, garlic/onion; cần đổi label về tiếng Anh chuẩn |

**Ingredients / vegetables / fruits — dùng để tăng độ phủ nguyên liệu**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [FOOD-INGREDIENTS dataset](https://universe.roboflow.com/food-recipe-ingredient-images/food-ingredients-dataset) | 4,196 ảnh / 120 class | Nguồn ingredient tốt; chỉ giữ class có nutrition mapping rõ |
| [Food Ingredient Detection VN](https://universe.roboflow.com/viet-hoang-food/food-ingredient-detection-mnc5n) | 1,182 ảnh / 80 class | Có ingredient phổ thông; số ảnh/class thấp nên chỉ dùng class còn thiếu |
| [Vegetable Object Detection ybszt](https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt) | 3,222 ảnh / 22 class | Rau củ thực tế ngoài chợ, hợp domain Việt |
| [Vegetable 6d6cy](https://universe.roboflow.com/kittisak-tkerk/vegetable-6d6cy) | 1,488 ảnh / 16 class | Bổ sung rau/gia vị; kiểm tra kỹ vì có cả chicken trong dataset vegetable |
| [Food Detection Union fruit](https://universe.roboflow.com/food-images/food-detection-union-rhdem) | 51,343 ảnh / 12 class | Rất lớn nhưng thiên về trái cây; dùng cho Apple, Orange, Banana, Lemon, Pear, Strawberry, Mango, Grape, Peach, Pomegranate; loại `objects` và `picanha` nếu không phục vụ nutrition |
| [Food detection hipfv](https://universe.roboflow.com/scan-detection/food-detection-hipfv) | 3,810 ảnh / 5 class | Ít class nhưng sạch cho apple/banana/tomato/cabbage/capsicum |
| [Food detector fruit vckr8](https://universe.roboflow.com/bro-bro-bro/food-detector-vckr8) | 1,031 ảnh / 18 class | Fruit classes phổ biến; dùng bổ sung nếu thiếu ảnh trái cây |
| [Fruit Detection YOLO Kaggle](https://www.kaggle.com/datasets/itsmeaman03/fruit-detection-yolo) | YOLO format | Nhỏ nhưng đúng format; phù hợp bổ sung fruit detection |
| [Vegetables Object Detection Kaggle](https://www.kaggle.com/datasets/ayyuce/vegetables) | Object detection | Có bbox vegetable; kiểm tra annotation sau khi tải |

**Large source — chỉ cherry-pick, không merge nguyên bộ**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [Complete Food](https://universe.roboflow.com/food-becxj/complete-food) | 46,735 ảnh / 214 class | Rất rộng, dễ làm model confuse nếu merge toàn bộ; chỉ lấy class rõ |
| [V2 CareTech Combined Dataset](https://universe.roboflow.com/caretech-v2/v2-caretech-combined-dataset) | 29,278 ảnh / 258 class | Nhiều món phổ thông nhưng quá nhiều class; dùng làm nguồn chọn lọc |
| [NPG Project ingredients](https://universe.roboflow.com/qsc/npg_project) | 8,828 ảnh / 101 class | Ingredient mixed; loại object/packaging như bottle, bag, water nếu không cần |
| [YOLOv5 Food Image](https://universe.roboflow.com/new-workspace/yolov5-food-image) | 10,000 ảnh / 498 class | Không phù hợp merge nguyên bộ với YOLO11s; chỉ dùng để lấy class thật sự thiếu |

**Segmentation / mask source — chỉ dùng nếu convert sang bbox**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [FoodSeg103 Kaggle](https://www.kaggle.com/datasets/fontainenathan/foodseg103) | 9,490 ảnh / 103 class | Segmentation; có thể convert mask sang bbox nếu cần thêm food class |
| [FoodSeg103 DatasetNinja](https://datasetninja.com/food-seg-103) | 103 class | Dùng để xem class/object stats trước khi quyết định tải |
| [UECFoodPixComplete official](https://mm.cs.uec.ac.jp/uecfoodpix/) | Segmentation masks | Nguồn học thuật tốt, cần convert mask → bbox |
| [Nutrition5k official GitHub](https://github.com/google-research-datasets/Nutrition5k) | ~5K dishes | Có nutrition/RGB-D, hữu ích tham khảo nutrition hơn là YOLO bbox trực tiếp |
| [Nutrition5k Kaggle mirror](https://www.kaggle.com/datasets/siddhantrout/nutrition5k-dataset) | ~5K dishes | Mirror dễ tải hơn, vẫn cần xử lý format |

**Specialized optional**

| Dataset | Quy mô public | Nhận xét |
|---|---:|---|
| [Meat Project](https://universe.roboflow.com/meatproject/meat-project-n41vj) | 2,335 ảnh / 8 class | Chỉ dùng nếu muốn phân biệt thịt sống/chín/quá chín; phải rename label rõ |
| [Fish aephx](https://universe.roboflow.com/project-3rfep/fish-aephx) | 984 ảnh / 1 class | Bổ sung class fish nếu thiếu recall |
| [Food Image Dataset Indian YOLO](https://www.kaggle.com/datasets/josephvettom/food-image-dataset) | YOLO format / 20 class | Món Ấn nhưng nhiều món phổ biến; dùng bổ sung class visual rõ |

**Nguyên tắc chọn từ shortlist**
- Ưu tiên mỗi class có tối thiểu 100 ảnh, lý tưởng 300+ ảnh.
- Với dataset >150 class, không merge nguyên bộ; chỉ lấy class rõ và có nutrition mapping.
- Gộp món visual gần giống thành class chung nếu cần, ví dụ `bun_nuoc` thay vì tách quá nhiều loại bún.
- Xóa class không phục vụ nutrition: packaging, tableware, brand, `person`, `fork`, `plate`, `bottle`, `water`.
- Sau khi merge, export YOLOv8 từ Roboflow và chỉ chuyển sang training khi class list đã sạch.

### 1.2. Chuẩn hóa labels TRƯỚC khi merge (QUAN TRỌNG)

Đây là bước quan trọng nhất. Nếu sai ở đây → model confuse, accuracy giảm.

**Quy trình**:
1. Clone từng dataset về workspace của bạn trên Roboflow
2. Mở dataset → **xem ảnh thực tế** của mỗi class
3. Rename class theo quy tắc:

| Quy tắc | Ví dụ sai | Ví dụ đúng |
|---|---|---|
| Lowercase + underscore | `Fried Chicken` | `fried_chicken` |
| Phân biệt rõ trạng thái | `chicken` (mơ hồ) | `raw_chicken` hoặc `cooked_chicken` |
| Gộp class trùng tên | Dataset A: `egg`, Dataset B: `Egg` | Cả 2 → `egg` |
| Xóa class không liên quan | `person`, `table`, `fork` | Xóa hết |

**Ví dụ chuẩn hóa thực tế**:
```
Dataset A (food-kcmrd): chicken → kiểm tra ảnh → toàn gà sống → rename: raw_chicken
Dataset B (food-rsxtc): chicken → kiểm tra ảnh → toàn gà nấu chín → rename: cooked_chicken
→ Merge → model phân biệt được 2 loại
```

### 1.3. Merge và Generate Version
1. Trong Workspace → **Merge** các dataset đã chuẩn hóa
2. Tại Generate Version:
   - **Preprocessing**: Auto-Orient ✅, Resize: Stretch to 640x640 ✅
   - **Augmentation** (chỉ nếu dataset < 5000 ảnh):
     - Flip Horizontal ✅
     - Rotation: ±15° ✅  
     - Brightness: ±15% ✅
     - ⚠️ KHÔNG dùng augmentation quá mạnh (blur, cutout) — có thể làm hỏng food features
3. Export → Format: **YOLOv8** → **Show Download Code** → Copy code

### 1.4. Thêm Background Images (Giảm False Positive)
- Thêm 5-10% ảnh **không chứa food** (bàn trống, phòng bếp, đĩa rỗng)
- KHÔNG gán label cho ảnh này
- Mục đích: Model học phân biệt "có food" vs "không có food"

---

## Bước 2: Training trên Google Colab

### 2.1. Setup Colab

```python
# ====== CELL 1: Cài đặt ======
!pip install -U ultralytics
from google.colab import drive
drive.mount('/content/drive')

# Tạo thư mục project trên Drive (lần đầu)
import os
PROJECT_DIR = '/content/drive/MyDrive/EatFitAI-Training'
os.makedirs(PROJECT_DIR, exist_ok=True)
print(f"✅ Project dir: {PROJECT_DIR}")
```

```python
# ====== CELL 2: Download dataset từ Roboflow ======
# Dán code từ Roboflow vào đây
# Ví dụ:
# from roboflow import Roboflow
# rf = Roboflow(api_key="YOUR_KEY")
# project = rf.workspace("your-workspace").project("your-project")
# dataset = project.version(1).download("yolov8")
```

### 2.2. Training — Có Resume Support

```python
# ====== CELL 3: Train YOLO11s ======
from ultralytics import YOLO
import os

PROJECT_DIR = '/content/drive/MyDrive/EatFitAI-Training'
CHECKPOINT = os.path.join(PROJECT_DIR, 'runs/food-detection/yolo11s-eatfitai/weights/last.pt')

# Kiểm tra có checkpoint cũ không (để resume nếu Colab bị disconnect)
if os.path.exists(CHECKPOINT):
    print("🔄 Resuming from checkpoint")
    model = YOLO(CHECKPOINT)
    model.train(resume=True)
else:
    print("🆕 Starting fresh training")
    model = YOLO('yolo11s.pt')  # Pretrained COCO weights
    model.train(
        data='/content/dataset/data.yaml',  # Sửa path cho đúng dataset
        epochs=150,           # Đủ lớn để early stopping hoạt động
        imgsz=640,            # Resolution tối ưu cho food detection
        batch=16,             # T4 16GB → batch 16 OK. Nếu OOM → giảm 8
        patience=30,          # Early stopping — tránh overfitting
        workers=2,            # Colab ổn định với 2 workers
        device=0,             # GPU
        project=os.path.join(PROJECT_DIR, 'runs/food-detection'),
        name='yolo11s-eatfitai',
        exist_ok=True,        # Cho phép ghi đè cùng thư mục
        
        # === Hyperparameters tối ưu cho food detection ===
        optimizer='auto',     # Ultralytics tự chọn optimizer tốt nhất
        lr0=0.01,             # Learning rate khởi đầu
        lrf=0.01,             # Learning rate cuối (lr0 * lrf)
        cos_lr=True,          # Cosine LR scheduler — smooth hơn linear
        
        # === Augmentation cho food ===
        hsv_h=0.015,          # Hue shift nhẹ — food đổi màu theo ánh sáng
        hsv_s=0.7,            # Saturation — food ở nhà hàng vs nhà bếp
        hsv_v=0.4,            # Brightness — quan trọng cho food
        degrees=10.0,         # Rotation nhẹ — đĩa có thể xoay
        translate=0.1,        # Dịch chuyển nhẹ
        scale=0.5,            # Zoom in/out — food ở gần/xa
        flipud=0.0,           # KHÔNG lật dọc — food không bao giờ lộn ngược
        fliplr=0.5,           # Lật ngang OK
        mosaic=1.0,           # Mosaic — rất tốt cho multi-food detection
        mixup=0.1,            # MixUp nhẹ — tăng robustness
        
        # === Saving ===
        save=True,
        save_period=10,       # Save checkpoint mỗi 10 epoch → resume dễ
    )

print("✅ Training complete!")
```

### 2.3. Xử lý Colab Disconnect

**Colab free có thể disconnect bất cứ lúc nào** (timeout ~12h, hoặc sớm hơn nếu hết quota).

Khi bị disconnect:
1. Kết nối lại Colab
2. Mount Drive lại
3. Chạy lại Cell 3 → code tự detect `last.pt` → **resume training** từ epoch cuối
4. ⚠️ `resume=True` giữ nguyên optimizer state + LR schedule → không mất quality

### 2.4. Giải thích Hyperparameters

| Parameter | Giá trị | Tại sao? |
|---|---|---|
| `epochs=150` | Cao | Để `patience=30` tự dừng khi đủ. Đặt cao để không bao giờ dừng quá sớm |
| `patience=30` | 30 epoch | Nếu 30 epoch liên tục không cải thiện → dừng. Tránh overfitting |
| `cos_lr=True` | Cosine | LR giảm mượt → converge tốt hơn step decay |
| `mosaic=1.0` | 100% | Ghép 4 ảnh → model học detect nhiều food cùng lúc |
| `flipud=0.0` | Tắt | Lật dọc food = vô nghĩa (đĩa cơm không bao giờ lộn ngược) |
| `hsv_s=0.7` | Cao | Ánh sáng nhà hàng (ấm) vs nhà bếp (lạnh) rất khác nhau |
| `save_period=10` | Mỗi 10 epoch | Bảo vệ khỏi Colab disconnect — tối đa mất 10 epoch tiến trình |
| `mixup=0.1` | Nhẹ | Blend 2 ảnh nhẹ → model robust hơn nhưng không mất detail |

---

## Bước 3: Validation và Đánh Giá

```python
# ====== CELL 4: Validate ======
best_model = YOLO(os.path.join(PROJECT_DIR, 'runs/food-detection/yolo11s-eatfitai/weights/best.pt'))
metrics = best_model.val(data='/content/dataset/data.yaml')

print(f"📊 mAP50:    {metrics.box.map50:.3f}")
print(f"📊 mAP50-95: {metrics.box.map:.3f}")
print(f"📊 Precision: {metrics.box.mp:.3f}")
print(f"📊 Recall:    {metrics.box.mr:.3f}")
```

### Đọc kết quả — Thế nào là tốt?

| Metric | Mục tiêu | Ý nghĩa |
|---|---|---|
| mAP50 | > 0.70 | 70%+ detection có IoU > 50% → sản phẩm dùng được |
| mAP50-95 | > 0.45 | Strict metric — > 0.45 là tốt cho food detection |
| Precision | > 0.75 | 75% detections là đúng (ít false positive) |
| Recall | > 0.65 | 65% food thật được detect (ít bị bỏ sót) |

### Kiểm tra per-class performance

```python
# Xem class nào yếu nhất
import pandas as pd
results_csv = os.path.join(PROJECT_DIR, 'runs/food-detection/yolo11s-eatfitai/results.csv')
if os.path.exists(results_csv):
    df = pd.read_csv(results_csv)
    print(df.tail(5))  # 5 epoch cuối

# Confusion matrix tự động lưu tại:
# runs/food-detection/yolo11s-eatfitai/confusion_matrix.png
```

### Nếu kết quả chưa đạt — Checklist debug

1. **mAP thấp toàn bộ** → Dataset quality kém. Kiểm tra bbox có tight không
2. **1-2 class accuracy thấp** → Class đó thiếu data. Thêm ảnh cho class đó
3. **Precision thấp (nhiều false positive)** → Thêm background images (ảnh không có food)
4. **Recall thấp (bỏ sót food)** → Tăng augmentation hoặc giảm confidence threshold
5. **Train loss giảm nhưng val loss tăng** → Overfitting. Giảm epochs hoặc tăng augmentation

---

## Bước 4: Export ONNX và Deploy

```python
# ====== CELL 5: Export ONNX ======
best_model = YOLO(os.path.join(PROJECT_DIR, 'runs/food-detection/yolo11s-eatfitai/weights/best.pt'))

# Export sang ONNX — dùng cho inference trên Render (CPU)
best_model.export(
    format='onnx',
    imgsz=640,
    simplify=True,    # Giảm size + tăng speed
    opset=17,         # ONNX opset 17 — tương thích onnxruntime 1.16+
)

# File output: best.onnx (~18-25MB cho YOLO11s)
print("✅ ONNX export complete!")
```

### Deploy lên Render

1. Download `best.onnx` từ Google Drive
2. Copy vào `ai-provider/` (thay file cũ)
3. Cập nhật `YOLO_CLASS_NAMES` trong `app.py` → khớp class list mới
4. Cập nhật `YOLO_ONNX_IMAGE_SIZE` nếu đổi imgsz
5. Git push → Render auto-deploy
6. Test: `GET /healthz` → kiểm tra `model_classes_count` khớp

---

## Bước 5: Test Inference Local (Tùy chọn)

```python
# Test trên máy local (RTX 3050) trước khi deploy
from ultralytics import YOLO

model = YOLO('best.pt')  # Hoặc best.onnx
results = model.predict(
    source='test_images/',  # Thư mục chứa ảnh test
    conf=0.25,
    save=True,
    show_labels=True,
    show_conf=True,
)
```

---

## Model Size Cheat Sheet

| Model | mAP⁵⁰⁻⁹⁵ | Params | ONNX Size | Dùng khi |
|---|---|---|---|---|
| `yolo11n.pt` | 39.5% | 2.6M | ~6MB | Test nhanh, prototype |
| **`yolo11s.pt`** | **47.0%** | **9.4M** | **~20MB** | **Production — EatFitAI** |
| `yolo11m.pt` | 51.5% | 20.1M | ~42MB | Nếu cần accuracy cao hơn |
| `yolo11l.pt` | 53.4% | 25.3M | ~50MB | Không khuyến nghị cho CPU |

---

## Thời gian Training ước tính (Colab T4)

| Dataset size | Epochs | Thời gian | Sessions Colab |
|---|---|---|---|
| 5K images | 150 | ~2-3 giờ | 1 session |
| 10K images | 150 | ~4-6 giờ | 1 session |
| 30K images | 150 | ~12-18 giờ | 2-3 sessions (resume) |
| 50K+ images | 150 | ~24-36 giờ | 3-5 sessions (resume) |

---

## Checklist trước khi bắt đầu

- [ ] Dataset đã merge trên Roboflow
- [ ] Labels đã chuẩn hóa (lowercase, underscore, không trùng lặp)
- [ ] Background images đã thêm (5-10%)
- [ ] Đã export format YOLOv8 từ Roboflow
- [ ] Google Drive đã mount trong Colab
- [ ] Đã tạo thư mục `EatFitAI-Training` trên Drive

## Checklist sau khi train xong

- [ ] mAP50 > 0.70
- [ ] Confusion matrix không có class nào bị confuse nặng
- [ ] ONNX export thành công
- [ ] Test inference trên ảnh thực tế — detect đúng
- [ ] `YOLO_CLASS_NAMES` trong `app.py` đã update
- [ ] Deploy Render OK, `/healthz` trả về model loaded

Chúc thành công! 🚀
