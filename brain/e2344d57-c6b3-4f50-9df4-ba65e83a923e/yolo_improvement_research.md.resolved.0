# Research: Cải thiện YOLO + Quyết định Barcode

## 1. Barcode Việt Nam — Kết quả research

### Thực trạng
- **OpenFoodFacts**: Coverage sản phẩm Việt Nam (prefix 893) **rất thấp**, phụ thuộc volunteer đóng góp, không có coverage chính thức
- **iCheck.vn**: Nền tảng mã vạch lớn nhất VN, **KHÔNG có public API**. Chỉ cung cấp dịch vụ B2B cho doanh nghiệp đối tác. Cần liên hệ trực tiếp (cskh@icheck.vn)
- **GS1 Việt Nam** (gs1vn.org.vn / nbc.gov.vn): Cơ quan quản lý nhà nước về mã vạch. Có app Scan and Check nhưng **không có public API** cho developer

### Kết luận về barcode

> [!IMPORTANT]
> **Không có public API tra cứu barcode sản phẩm Việt Nam nào khả dụng miễn phí**.
> - OpenFoodFacts: Coverage gần như = 0 cho sản phẩm nội địa VN
> - iCheck: Chỉ B2B, cần hợp đồng thương mại
> - GS1 VN: Không public API
>
> **Recommendation**: Bỏ barcode là hợp lý cho giai đoạn hiện tại. Code barcode hiện tại (~150 dòng) có thể giữ lại ở dạng feature flag `disabled` nếu sau này muốn kích hoạt khi tìm được provider. Hoặc xóa sạch để giảm maintenance.

---

## 2. Đánh giá Datasets bạn tìm được

### A. Datasets Roboflow (Object Detection — có bounding box)

| Dataset | Images | Đánh giá |
|---------|--------|----------|
| food-detection-union-rhdem | **51,343** | ⭐ Lớn nhất. Cần check class list xem có phù hợp không |
| food-rsxtc | 6,553 | Cần check labels |
| food-detection-xt7yz | 6,435 | Cần check labels |
| food-kcmrd | 4,209 | Cần check labels |
| food-detection-hipfv | 3,810 | Cần check labels |
| food-detection-tyd55 | 3,376 | Cần check labels |
| food-detection-agahl | 205 | ⚠️ Quá nhỏ |
| food-detection-lhp8d | 1,754 | OK |
| food-detection-2-tt8wv | 2,764 | OK |
| food-4oq56 | 1,121 | OK |
| food-detector-vckr8 | 1,031 | OK |
| food-qxo3r | 556 | ⚠️ Nhỏ |
| fast-food-7pbap | 224 | ⚠️ Quá nhỏ |
| food-classes | 46 | ❌ Quá nhỏ, vô dụng |
| food-classification-azsi4 | 205 | ⚠️ Classification, có thể KHÔNG có bounding box |
| cook-meat-project | 2,213 | ⭐ Tốt cho thịt chế biến |
| meat-project-n41vj | 2,335 | ⭐ Tốt cho thịt |
| fish-aephx | 984 | OK cho cá |
| vegetable-kcg2u | 163 | ⚠️ Nhỏ |
| vegetable-6d6cy | 1,488 | OK |
| vegetable-object-detection-ybszt | 3,222 | ⭐ Tốt cho rau |

### B. Datasets Kaggle

> [!WARNING]
> **Kaggle datasets phần lớn là CLASSIFICATION (image-level label), KHÔNG phải DETECTION (bounding box).**
> YOLO cần bounding box annotations. Nếu dataset Kaggle chỉ có class label theo folder thì **KHÔNG dùng trực tiếp cho YOLO training** được.

| Dataset | Images | Loại | Vấn đề |
|---------|--------|------|--------|
| food-recognition-2022 | 44,000 | Detection (COCO format) | ⭐ **Tốt nhất** — 498 classes, có bbox. Cần convert COCO → YOLO format |
| meat-freshness-image-dataset | 2,266 | Classification | ❌ Không có bbox, phân loại tươi/hỏng |
| vegetable-image-dataset | 21,000 | Classification | ❌ Không có bbox |
| vegetables (ayyuce) | 619 | Classification | ❌ Không có bbox |
| fruit-quality-classification | 1,968 | Classification | ❌ Phân loại chất lượng, không có bbox |
| food-items-sushi-sashimi | 10,100 | Classification | ❌ Không có bbox |
| fresh-and-stale | 30,400 | Classification | ❌ Phân loại tươi/hỏng |
| food-items-fruits-berries-vegetables | 50,600 | Classification | ❌ Không có bbox |

### Tổng kết datasets

> [!IMPORTANT]
> **Datasets thực sự dùng được cho YOLO training:**
> - Roboflow: ~21 datasets, tổng ước tính **~80,000+ images** (có bbox)
> - Kaggle: Chỉ **food-recognition-2022** (44,000 images, 498 classes) là dùng được — nhưng cần convert format
> - Các dataset Kaggle còn lại (**~115,000 images**) là **CLASSIFICATION** — không có bounding box → không train YOLO trực tiếp

---

## 3. Vấn đề B: Multi-object detection — Hiện trạng code

### Code hiện tại đã hỗ trợ multi-object
File: [app.py](file:///d:/EatFitAI_v1/ai-provider/app.py#L367-L380)

```python
# Hiện tại: best_by_label — chỉ giữ 1 detection/label
best_by_label: Dict[str, Dict[str, Any]] = {}
for index in np.array(selected).flatten().tolist():
    label = labels[index].strip().lower()
    confidence = confidences[index]
    existing = best_by_label.get(label)
    if existing is None or confidence > float(existing["confidence"]):
        # Chỉ giữ detection có confidence cao nhất cho mỗi label
        best_by_label[label] = {...}
```

### Vấn đề
- 2 quả táo → trả 1 "apple" (mất 1)
- 3 miếng gà → trả 1 "chicken" (mất 2)
- Không có count

### Sửa cần làm
- Bỏ logic `best_by_label`, giữ **tất cả detections** sau NMS
- Thêm field `count` vào response (group by label)
- Backend cần mapping N detections → N nutrition items

---

## 4. Vấn đề C: Phân biệt cách chế biến — Research

### Thực tế kỹ thuật

YOLO là **object detection** — nó detect "vật thể là gì" (chicken, rice, egg), KHÔNG phải "nấu kiểu gì" (chiên, luộc, nướng).

Có **3 hướng tiếp cận** được nghiên cứu:

### Hướng 1: Tạo class riêng cho mỗi cách chế biến (Simplest)
- `fried_chicken`, `grilled_chicken`, `boiled_chicken` → 3 class riêng
- **Ưu**: Đơn giản nhất, không cần thay đổi pipeline
- **Nhược**: Số class tăng nhanh (N food × M cooking method). Cần data riêng cho từng combo
- **Khi nào dùng**: Khi chỉ có 3-5 loại chế biến và đủ data

### Hướng 2: Two-stage — Detect trước, classify sau (Recommended)
1. **Stage 1**: YOLO detect `chicken` (generic)
2. **Stage 2**: Crop vùng detect → đưa vào **classifier riêng** (ResNet/EfficientNet) để phân loại cooking method
- **Ưu**: Scalable, dễ thêm cooking method mới, data hiệu quả hơn
- **Nhược**: 2 model → phức tạp pipeline, tăng inference time
- **Khi nào dùng**: Khi có nhiều food type × nhiều cooking method

### Hướng 3: Multi-label detection (Advanced)
- Sửa YOLO head để predict nhiều label cho 1 object (chicken + fried + spicy)
- Dùng **Binary Cross-Entropy** thay Cross-Entropy
- **Ưu**: Flexible nhất, 1 model duy nhất
- **Nhược**: Cần custom training, phức tạp nhất

### Recommendation cho EatFitAI

> [!IMPORTANT]
> **Giai đoạn hiện tại**: Dùng **Hướng 1** (class riêng cho combo phổ biến nhất)
> - Tạo class: `fried_chicken`, `grilled_chicken`, `fried_rice`, `white_rice`, `fried_egg`, `boiled_egg`...
> - Chỉ focus 10-20 combo phổ biến nhất tại VN, không cần cover tất cả
> - Cần dataset có label ở level "món ăn + cách chế biến"
>
> **Giai đoạn sau (nếu scale)**: Chuyển sang **Hướng 2** (YOLO + secondary classifier)

---

## 5. Rủi ro và thách thức khi merge 20+ datasets

### Label Conflict (Quan trọng nhất)
- Dataset A: "apple" → Dataset B: "red_apple" → Dataset C: "Apple" → **3 class cho cùng 1 vật**
- Phải **chuẩn hóa toàn bộ label** trước khi merge

### Class Imbalance
- Dataset lớn 51K images có thể dominate dataset nhỏ 200 images
- Cần kiểm tra distribution và oversample/undersample

### Quality Inconsistency
- Bbox quality khác nhau giữa datasets (tight vs loose, accurate vs sloppy)
- Một số dataset community-annotated → sai sót nhiều

### Quy trình merge khuyến nghị
1. **Liệt kê tất cả labels** từ mỗi dataset
2. **Tạo taxonomy chuẩn** — 1 master list class names
3. **Map labels** — dùng Roboflow "Modify Classes"
4. **Merge** trên Roboflow → Generate Version
5. **Validate** `data.yaml` — đảm bảo index đúng
6. **Train thử** trên subset nhỏ trước (5K-10K images) → đánh giá mAP
7. **Scale up** nếu kết quả tốt

---

## 6. Training Requirements

### Hardware
- Google Colab **Pro** (~$10/tháng): T4 GPU, đủ cho 50K-100K images
- Google Colab **Pro+** (~$50/tháng): A100 GPU, train nhanh hơn 5-10x
- Local GPU (nếu có): RTX 3060+ khuyến nghị, 8GB VRAM minimum

### Thời gian ước tính (dựa trên 80K images, YOLOv8s, 100 epochs)
- T4 (Colab Free/Pro): **12-24 giờ**
- A100 (Colab Pro+): **3-6 giờ**
- RTX 4090 (local): **2-4 giờ**

### Model size recommendation
- YOLOv8**n** (nano): Fastest, accuracy thấp nhất. Cho testing nhanh
- YOLOv8**s** (small): **Recommended** — balance giữa speed và accuracy, phù hợp CPU inference trên Render
- YOLOv8**m** (medium): Better accuracy, chậm hơn trên CPU
- YOLOv8**l/x**: **Không khuyến nghị** cho CPU inference trên Render free tier

---

## 7. Action Plan đề xuất

### Phase 1: Barcode Cleanup (1-2 giờ code)
- Remove barcode UI toggle trong AIScanScreen
- Disable/remove barcode backend endpoint
- Giữ cột Barcode trong DB (không cần migration)

### Phase 2: Dataset Preparation (3-5 ngày manual work)
- Mở từng Roboflow dataset → xem class list
- Tạo master taxonomy
- Merge + remap labels
- Convert food-recognition-2022 (Kaggle) sang YOLO format nếu cần
- Validate dataset quality

### Phase 3: Training (1-2 ngày)
- Train trên subset nhỏ (10K images) → validate
- Train full dataset → export ONNX
- Test inference locally

### Phase 4: Code Changes (1-2 ngày)
- Update `YOLO_CLASS_NAMES` list
- Sửa multi-object detection logic (bỏ `best_by_label`)
- Update backend food mapping (YOLO label → FoodItem DB)
- Re-export ONNX model
