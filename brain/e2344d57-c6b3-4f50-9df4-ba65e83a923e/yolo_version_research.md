# Research: YOLO Version Comparison & Alternatives

## 1. So sánh các phiên bản YOLO — Benchmark COCO Official

### Bảng benchmark chính thức từ Ultralytics

| Model | Version | mAP⁵⁰⁻⁹⁵ | Parameters (M) | Improvement |
|-------|---------|-----------|----------------|-------------|
| **Nano** | YOLOv8n | 37.3% | 3.2M | baseline |
| | **YOLO11n** | **39.5%** | **2.6M** | **+2.2 mAP, -19% params** |
| **Small** | YOLOv8s | 44.9% | 11.2M | baseline |
| | **YOLO11s** | **47.0%** | **9.4M** | **+2.1 mAP, -16% params** |
| **Medium** | YOLOv8m | 50.2% | 25.9M | baseline |
| | **YOLO11m** | **51.5%** | **20.1M** | **+1.3 mAP, -22% params** |
| **Large** | YOLOv8l | 52.9% | 43.7M | baseline |
| | **YOLO11l** | **53.4%** | **25.3M** | **+0.5 mAP, -42% params** |
| **X-Large** | YOLOv8x | 53.9% | 68.2M | baseline |
| | **YOLO11x** | **54.7%** | **56.9M** | **+0.8 mAP, -17% params** |

### Key Takeaways
- YOLO11 **thắng YOLOv8 ở MỌI model size** — cả accuracy lẫn efficiency
- Lợi ích lớn nhất ở model nhỏ (nano/small) — chính xác là segment bạn đang dùng
- **YOLO11s**: +2.1 mAP, ít hơn 1.8M params so với YOLOv8s → **upgrade tốt nhất cho EatFitAI**

---

## 2. Tại sao YOLO11 > YOLOv8? (Kiến trúc)

### Cải tiến kiến trúc YOLO11
1. **C3k2 blocks** (thay C2f trong v8): Feature extraction hiệu quả hơn
2. **C2PSA** (Cross-Stage Partial Spatial Attention): Cải thiện nhận diện object nhỏ/bị che
3. **Backbone/Neck tối ưu**: Ít parameters hơn nhưng mạnh hơn
4. **Better small object detection**: Quan trọng cho food detection (nhiều thành phần nhỏ trên đĩa)

### YOLO11 vs các đời khác

| Feature | YOLOv8 | YOLOv9 | YOLOv10 | **YOLO11** |
|---------|--------|--------|---------|-----------|
| Release | 2023 | 2024-Q1 | 2024-Q2 | **2024-Q3** |
| Team | Ultralytics | Wang et al. | Tsinghua | **Ultralytics** |
| Architecture | C2f + CSPNet | PGI + GELAN | NMS-free E2E | **C3k2 + C2PSA** |
| NMS | Required | Required | **Not needed** | Required |
| ONNX Export | ✅ Native | ⚠️ Custom | ✅ Via Ultralytics | **✅ Native** |
| API Compatibility | `ultralytics` | Riêng lẻ | `ultralytics` | **`ultralytics`** |
| CPU Inference | Fast | Moderate | Very Fast (no NMS) | **Fastest** |
| Small Object | Good | Good | Good | **Best** |
| Ecosystem/Support | Mature | Limited | Good | **Full (Ultralytics)** |

---

## 3. Alternatives ngoài YOLO — Đánh giá thực tế

### RT-DETR (Real-Time DETR by Baidu)
- **Kiến trúc**: Transformer-based (không phải CNN như YOLO)
- **Ưu**: Không cần NMS, global context tốt hơn cho scene phức tạp
- **Nhược trên CPU**: **Chậm hơn YOLO 2-5x** do self-attention overhead
- **Verdict**: ❌ **Không phù hợp** — Render free tier là CPU-only, RT-DETR quá nặng

### YOLO-World (Open-Vocabulary Detection)
- **Kiến trúc**: Detect bất kỳ object nào qua text prompt, zero-shot
- **Ưu**: Không cần training, thêm class mới chỉ cần sửa text prompt
- **Nhược**: Accuracy thấp hơn fine-tuned model 10-20% cho specific domain
- **Verdict**: ⚠️ **Thú vị cho prototyping**, nhưng accuracy cho production food app sẽ không đủ. Có thể dùng để tạm thay thế trong khi train model mới

### Florence-2 / Grounding DINO / SAM
- **Kiến trúc**: Foundation models (rất lớn)
- **Ưu**: Cực kỳ flexible, zero-shot, segmentation
- **Nhược**: Quá nặng cho CPU inference (1-5GB+ model size), cần GPU
- **Verdict**: ❌ **Hoàn toàn không phù hợp** cho Render free tier

### RF-DETR (Roboflow DETR)
- **Kiến trúc**: Roboflow's optimized DETR variant
- **Ưu**: Accuracy cao, NMS-free
- **Nhược**: Mới, chưa mature, chưa có ONNX ecosystem tốt
- **Verdict**: ❌ Chưa sẵn sàng cho production

---

## 4. Verdict: YOLO11 — Lựa chọn tối ưu

> [!IMPORTANT]
> ### Kết luận rõ ràng
> **YOLO11s** là lựa chọn tốt nhất cho EatFitAI vì:
> 1. **+2.1 mAP accuracy** so với YOLOv8s mà ít params hơn → inference nhanh hơn trên CPU
> 2. **Zero migration effort** — chỉ đổi weight file từ `yolov8s.pt` → `yolo11s.pt`
> 3. **Better small object detection** — quan trọng cho multi-food trên 1 đĩa
> 4. **Cùng ecosystem Ultralytics** — `export_model.py` hiện tại gần như không cần sửa
> 5. **ONNX export hoàn toàn tương thích** — `app.py` inference code **KHÔNG CẦN SỬA**

### Tại sao không phải YOLOv10?
- YOLOv10 bỏ NMS → lợi ích nhỏ cho CPU (NMS chỉ tốn ~2-5ms)
- Ecosystem không full bằng Ultralytics native (YOLO11)
- mAP không cao bằng YOLO11 ở cùng size

### Tại sao không phải YOLOv9?
- API riêng lẻ, không nằm trong `ultralytics` package → cần refactor code
- ONNX export cần custom pipeline
- Không có lợi ích rõ ràng so với YOLO11

---

## 5. Chi phí migrate YOLOv8 → YOLO11 — Phân tích code

### File cần thay đổi

| File | Thay đổi | Effort |
|------|----------|--------|
| `export_model.py` L1,26 | `YOLO('best.pt')` — **Không cần sửa** | 0 |
| `app.py` L19,281-288 | ONNX Runtime inference — **Không cần sửa** | 0 |
| `app.py` L85-149 | `YOLO_CLASS_NAMES` — Sửa khi thay đổi class | ~30 phút |
| `app.py` L414-416 | Model type string — Đổi "yolov8" → "yolo11" | 5 phút |
| `TRAINING_GUIDE.md` | Cập nhật hướng dẫn | 15 phút |
| `requirements.txt` | `ultralytics` version — Chỉ dùng khi train, không ảnh hưởng runtime | 0 |

### Giải thích quan trọng

```
YOLO11 training:  YOLO('yolo11s.pt')  →  model.train(data='data.yaml')  →  best.pt
YOLO11 export:    YOLO('best.pt')     →  model.export(format='onnx')    →  best.onnx
Runtime (app.py): ort.InferenceSession('best.onnx')  →  KHÔNG ĐỔI GÌ
```

> [!TIP]
> **`app.py` dùng ONNX Runtime thuần (`ort.InferenceSession`)** — nó KHÔNG biết model gốc là YOLOv8 hay YOLO11. Nó chỉ đọc tensor input/output.
> 
> Chỉ cần file `.onnx` mới có cùng output format (boxes + class scores) là inference code **tương thích 100%**.
> 
> YOLO11 export ONNX có **cùng output format** với YOLOv8 → **Zero code change cho inference**.

### Migration workflow

```
1. Train trên Colab: YOLO('yolo11s.pt').train(data='merged_food.yaml', epochs=100)
2. Export ONNX:     model.export(format='onnx', imgsz=640, simplify=True)  
3. Upload best.onnx lên Render (thay file cũ)
4. Cập nhật YOLO_CLASS_NAMES trong app.py (nếu class list thay đổi)
5. Deploy → Done
```

---

## 6. Datasets — Kết quả kiểm tra

> [!WARNING]
> Roboflow Universe bị chặn automated access (Cloudflare protection). Không thể kiểm tra class list chi tiết qua browser tool.
> 
> **Bạn cần tự mở từng link trên trình duyệt cá nhân** để xem class list và quality.
> Đây là việc **bạn phải tự làm** — tôi chỉ có thể hỗ trợ phân loại và đánh giá sau khi có data.

### Checklist khi review từng dataset

Mở mỗi link, kiểm tra:
- [ ] **Type**: Object Detection? (phải có bounding box, KHÔNG phải Classification)
- [ ] **Classes**: Liệt kê class names
- [ ] **Images count**: Bao nhiêu ảnh thực tế (sau khi remove duplicates)
- [ ] **Quality**: Ảnh có rõ không? Bbox có chính xác không?
- [ ] **Relevance**: Có class nào liên quan food/ingredient VN không?

### Dataset ưu tiên cao (nên check trước)

| # | Dataset | Images | Lý do ưu tiên |
|---|---------|--------|---------------|
| 1 | food-detection-union-rhdem | 51,343 | Lớn nhất, có thể đã merged sẵn |
| 2 | food-rsxtc | 6,553 | Kích thước tốt |
| 3 | food-detection-xt7yz | 6,435 | Kích thước tốt |
| 4 | food-kcmrd | 4,209 | Kích thước trung bình |
| 5 | cook-meat-project | 2,213 | Có thể có cooking method labels |
| 6 | Kaggle food-recognition-2022 | 44,000 | 498 classes, cần convert format |

---

## 7. Phản biện — Rủi ro của việc chuyển YOLO11

### Rủi ro 1: "YOLO11 mới, có ổn định không?"
**Phản biện**: YOLO11 release 09/2024, đã 8+ tháng. Ultralytics là maintainer chính thức, có CI/CD production-grade. Package `ultralytics` hỗ trợ đồng thời cả v8 và 11 — nếu v11 có issue, fallback về v8 chỉ cần đổi weight file.

### Rủi ro 2: "ONNX output format có thay đổi không?"
**Phản biện**: ONNX output format (xywh + class_scores) là standard trong toàn bộ YOLO family. Ultralytics cam kết backward compatibility. Code `_detect_with_onnx()` hiện tại đã handle cả transpose format (L328-329), rất robust.

### Rủi ro 3: "Train lại từ đầu mất thời gian"
**Thực tế**: Dù chọn YOLO11 hay v8, bạn ĐỀU phải train lại vì:
- Class list thay đổi (thêm nhiều class mới)
- Dataset khác hoàn toàn
- Vậy chi phí migrate = 0 (chỉ đổi pretrained weight file khi bắt đầu train)

### Rủi ro 4: "Render free tier CPU có chạy được YOLO11 không?"
**Phản biện**: YOLO11s có ÍT params hơn YOLOv8s (9.4M vs 11.2M) → inference trên CPU sẽ **nhanh hơn hoặc bằng**. ONNX Runtime không phân biệt v8/v11, nó chỉ thực thi computation graph.

### Rủi ro 5: "YOLO-World zero-shot có thay thế được không?"
**Phản biện thực tế**: Không, vì:
1. YOLO-World accuracy thấp hơn 10-20% so với fine-tuned model cho domain cụ thể
2. Model size lớn hơn nhiều (phải load CLIP text encoder)
3. Inference chậm hơn trên CPU
4. Không có nutritional mapping — detect "chicken" nhưng không biết "gà nướng" hay "gà luộc"

**Tuy nhiên**, YOLO-World có thể hữu ích làm **fallback** khi model chính không detect được → tương tự recovery pass hiện tại.
