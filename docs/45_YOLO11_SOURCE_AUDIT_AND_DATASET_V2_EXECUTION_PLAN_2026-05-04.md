# YOLO11 Source Audit And Dataset V2 Execution Plan - 2026-05-04

## 0. Kết Luận Điều Hành

Tập Kaggle hiện tại **chưa phải trạng thái tối ưu để train production**. Nó lớn, đã có đủ dấu hiệu cho thấy hướng YOLO11 là đúng, nhưng chất lượng dataset chưa đạt chuẩn để kỳ vọng "cực cao và ổn định".

Bằng chứng hiện có từ notebook/log:

- `train`: 405,586 ảnh, 405,586 label files.
- `valid`: 27,141 ảnh, 27,141 label files.
- `data.yaml` hiện tại: 457 classes.
- Audit raw train: 1,371,231 box rows, 22,444 segment rows, 6,971 label files có dòng trùng, 29,468 duplicate lines.
- Audit raw valid: 86,393 box rows, 3,634 segment rows, 2,590 label files có dòng trùng, 9,026 duplicate lines.
- Ultralytics warning: detect/segment bị trộn, nên segment sẽ bị bỏ.
- Một số log valid cho thấy mỗi ảnh có thể bị xóa 4-30 duplicate labels.

Kết luận kỹ thuật: **không nên tiếp tục lấy dataset Kaggle hiện tại làm source of truth**. Source of truth phải quay lại:

```text
Google Drive / EatFitAI-Training / datasets-raw
```

Kaggle chỉ nên nhận **dataset V2 đã clean, audit, đóng gói và versioned**.

## 1. Nguyên Tắc Bằng Chứng

Tài liệu này cố tình phân biệt 4 mức bằng chứng:

| Mức | Ý nghĩa | Có được dùng để train full không? |
|---|---|---|
| A | Đã đọc raw zip hoặc artifact, có số liệu ảnh/label/class/duplicate/segment/sample grid | Có, nếu pass gate |
| B | Đã xác minh public page/API chính chủ, nhưng chưa đọc raw zip | Chỉ được đưa vào hàng chờ |
| C | Có trong tài liệu repo hoặc commit, chưa xác minh lại nguồn/raw | Không train full |
| D | Chỉ thấy tên file trong Drive/screenshot, chưa có manifest | Không train full |

Quy tắc: **"đã chọn 22 link" không đồng nghĩa "22 nguồn đã sạch"**. Mỗi nguồn chỉ được vào dataset V2 khi có `source_manifest.csv`, `source_audit.json`, sample bbox grid và class mapping.

## 2. Plan YOLO11 Đã Đọc

Các file kế hoạch và tài liệu gần đây đã được rà:

| File | Vai trò hiện tại | Nhận xét |
|---|---|---|
| `ai-provider/YOLO11_MIGRATION_CHECKLIST.md` | Plan YOLO11 gốc | Có checklist theo phase và danh sách nguồn rộng, nhưng một phần đã lỗi thời so với dataset Kaggle 457 class |
| `ai-provider/TRAINING_GUIDE.md` | Shortlist nguồn và hướng train ban đầu | Có 44 URL nguồn, cần tái kiểm định raw zip |
| `docs/44_DATASET_V2_KAGGLE_COLAB_DRIVE_RUNBOOK_2026-05-04.md` | Runbook mới nhất | Hướng đúng nhất: Drive raw -> Colab clean -> Kaggle train |
| `yolo_version_research.md` | Lý do chọn YOLO11 | Vẫn có giá trị, nhưng cần cập nhật theo official YOLO11 docs mới nhất khi cần |
| `docs/43_AI_SCAN_V1_PROGRESS_2026-05-02.md` | Bối cảnh sản phẩm AI Scan | Mục tiêu app là nhận diện nhiều item và ép review khi model chưa chắc |

## 3. Timeline Commit Gần Đây

| Commit | Nội dung | Bài học |
|---|---|---|
| `9a211038` | Nghiên cứu YOLO version, chọn YOLO11s cho deploy CPU/ONNX | Đúng cho inference nhẹ, nhưng train dataset lớn cần YOLO11m/l để benchmark |
| `60ddd537` | Pipeline Colab/YOLO11 ban đầu | Mục tiêu lúc đó 100K-130K ảnh, 120-150 class thực tế hơn 457 class |
| `e11a7157` | Bổ sung nguồn món Việt | Hướng domain đúng |
| `7efd9e6f` | YOLO11m training pipeline, nói 22 dataset merged, 279 classes | Đây là mốc quan trọng, nhưng không có manifest URL -> zip -> class -> image để chứng minh từng nguồn |
| `15ff3c44` | Script cleanup class cho Kaggle | Hướng cleanup đúng, nhưng cần chạy từ raw V2, không vá muộn trên artifact xấu |
| `d69ff5c0` | Kaggle train script, duplicate checks, root `data.yaml` 457 classes | Bộc lộ vấn đề: token hardcode, artifact 457 class quá rộng, dataset_info private usability thấp |

## 4. Mục Tiêu Sản Phẩm Thực Tế

Mục tiêu không phải chỉ "train YOLO11". Mục tiêu đúng là:

1. Mạnh hơn `best.pt` YOLOv8 hiện tại trên ảnh thật của EatFitAI.
2. Nhận diện được nhiều object trong một ảnh:
   - món ăn;
   - nguyên liệu;
   - gia vị.
3. Ưu tiên món/nguyên liệu/gia vị Việt Nam.
4. Kết quả phải ổn định theo class, không chỉ mAP trung bình đẹp.

Điểm phản biện quan trọng: một detector chỉ học được "món + nguyên liệu + gia vị trong cùng một ảnh" nếu label raw thật sự có bbox cho các đối tượng đó trong cùng ảnh hoặc cùng domain ảnh tương tự. Nếu nguồn chỉ có ảnh món đơn, nguồn ingredient riêng và nguồn gia vị riêng, model có thể detect nhiều class, nhưng chưa chắc hiểu tốt ảnh bữa ăn Việt Nam phức hợp.

## 5. YOLO11 Có Phù Hợp Không?

Có, nhưng chỉ khi dataset sạch.

Bằng chứng chính chủ:

- Ultralytics YOLO11 hỗ trợ detection, segmentation, classification, pose và OBB. Với EatFitAI hiện tại nên dùng **detection** trước, không trộn detect/segment.
- Official YOLO11 detection benchmark tại 640: YOLO11s mAP50-95 COCO 47.0, 9.4M params; YOLO11m 51.5, 20.1M params; YOLO11l 53.4, 25.3M params.
- Ultralytics train settings hỗ trợ `device=0,1` cho multi-GPU và `workers` là số worker theo mỗi rank khi multi-GPU.
- Dataset detect format yêu cầu mỗi dòng label là `class x_center y_center width height`, normalized 0..1, class zero-indexed.

Nguồn tham khảo chính:

- https://docs.ultralytics.com/models/yolo11/
- https://docs.ultralytics.com/modes/train/
- https://docs.ultralytics.com/datasets/detect/

Kết luận model:

| Model | Vai trò đề xuất | Lý do |
|---|---|---|
| YOLO11s | Baseline nhanh, smoke, so với best.pt hiện tại | Rẻ, nhanh, deploy dễ |
| YOLO11m | Candidate production chính | Cân bằng tốt cho Kaggle T4 x2 và accuracy |
| YOLO11l | Chỉ train khi V2 sạch và còn quota | Có thể tăng accuracy nhưng rủi ro quá thời gian |
| YOLO11x | Không ưu tiên Kaggle T4 x2 | Nặng, khó hoàn tất ổn định trong session Kaggle |

## 6. Vì Sao Kaggle T4 x2 Có Lúc Chỉ Thấy 1 GPU?

Các pha khác nhau dùng tài nguyên khác nhau:

- Scan label/cache/audit dataset chủ yếu là CPU và I/O. GPU có thể 0% hoặc chỉ một GPU nhúc nhích.
- Khi Ultralytics bắt đầu DDP thật, log phải có `CUDA:0`, `CUDA:1` và dòng `torch.distributed.run --nproc_per_node 2`.
- Trong UI Kaggle, panel có thể hiển thị GPU 0/1 không đồng đều trong lúc rank đang khởi động, đang scan hoặc đang chờ dataloader.
- Nếu command dùng `device=0` hoặc Python process không vào DDP, chỉ 1 GPU sẽ được dùng.

Gate xác nhận đang dùng 2 GPU:

```text
device=0,1
DDP: ... --nproc_per_node 2
CUDA:0 ... T4
CUDA:1 ... T4
Epoch table bắt đầu chạy, không chỉ đang "Scanning labels"
```

## 7. Đánh Giá Artifact Kaggle Hiện Tại

| Hạng mục | Trạng thái | Đánh giá |
|---|---|---|
| Số ảnh | Rất lớn | Tốt cho coverage, nhưng quá lớn nếu noisy |
| Số class | 457 | Quá rộng cho production đầu tiên, nhiều class sparse |
| Duplicate labels | Có nhiều | Phải clean trước train, không chỉ để Ultralytics tự xóa |
| Detect/segment mixed | Có | Không đạt chuẩn detect dataset |
| Cache `/kaggle/input` not writable | Có warning | Không làm sai train, nhưng giảm tốc/cache không lưu |
| Train 150 epochs full raw | Không thực tế nếu chưa đo epoch time | Cần smoke/fraction và time-bound |
| Source provenance | Thiếu manifest | Không thể khẳng định 22 nguồn đã được xác thực |

Phản biện thẳng: nếu train full 405K ảnh, 457 classes, nhiều duplicate và mixed labels, kết quả có thể "có vẻ train được" nhưng mAP/per-class sẽ nhiễu, đặc biệt với món Việt hiếm, gia vị nhỏ và ingredient nhỏ.

## 8. Nguồn Đã Tìm: Đánh Giá Lại Không Bịa Đặt

Repo hiện có 44 URL nguồn trong `TRAINING_GUIDE.md` và `YOLO11_MIGRATION_CHECKLIST.md`. Trong Drive đang thấy 23 file zip theo screenshot/runbook. Không có file manifest chứng minh chính xác "22 link được lọc" là 22 URL nào và zip nào tương ứng với URL nào.

Vì vậy bảng dưới đây là **quyết định kỹ thuật hiện tại**, không phải xác nhận rằng source đã sạch.

### 8.1 Core Vietnamese / Asian Food

| Nguồn | Quyết định hiện tại | Lý do/rủi ro |
|---|---|---|
| `https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68` | Core candidate, phải audit license/format | Rất sát món Việt, nhưng cần kiểm tra annotation thật và quyền dùng |
| `https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp` | Core candidate | Có thể trùng với VietFood67, bắt buộc perceptual dedupe |
| `https://universe.roboflow.com/aiapplication/detection_15_vietnamese_food` | Giữ nếu raw pass | Ít class nhưng sát domain |
| `https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo` | Giữ nếu raw pass | 5 class Việt, dễ kiểm soát |
| `https://universe.roboflow.com/toby-b9kw2/vietnamese-food-calories-suwt6` | Giữ có điều kiện | Sát domain, nhưng cần xác nhận bbox và label map |
| `https://universe.roboflow.com/my-khanh-nguyen-tjmam/rawdata-8vvya` | Ưu tiên cao nếu bbox tốt | Nguồn miền Tây có giá trị sản phẩm |
| `https://universe.roboflow.com/prethesis-avz0w/food-4otph` | Quarantine rồi lọc class | Có dấu hiệu class nhiễu như người/object/non-food trong docs cũ |
| `https://universe.roboflow.com/foodrecognitionprethesis/food-items-j9iud` | Giữ nếu raw pass | Hữu ích cho cơm phần/món nhà |
| `https://universe.roboflow.com/nhanbeo/canteen_menu` | Ưu tiên cao nếu raw pass | Cận domain bữa ăn Việt |
| `https://universe.roboflow.com/khoa-fbrvv/food-jfsxy` | Giữ có điều kiện | Nhóm bánh Việt, nhỏ nên cần chống overfit |
| `https://universe.roboflow.com/nhtdanh/banh-dan-gian-nb` | Giữ có điều kiện | Bánh dân gian, cần sample bbox |
| `https://universe.roboflow.com/fruitnetyolov8/banh-dan-gian-mien-tay` | Giữ có điều kiện | Ít ảnh, dùng để vá class hiếm |
| `https://universe.roboflow.com/fooddetection-3q4jo/food-detection-bobotnhan` | Giữ nếu raw pass | Có món/nguyên liệu Việt phổ biến |
| `https://universe.roboflow.com/foodaitonghop/food_ai_tong_hop` | Giữ nếu raw pass | Tăng ảnh cho class Việt phổ biến |
| `https://universe.roboflow.com/baimint/thai-food-project` | Bổ sung, không core | Gần domain châu Á nhưng không thuần Việt |
| `https://universe.roboflow.com/test-kuvbw/thai-food-detection-xvc0m` | Bổ sung, cần audit | Nguồn Thai khác, chỉ cherry-pick class gần Việt |
| `https://universe.roboflow.com/duy2902/vietnamfood-w3i0a` | Cần xác minh lại public/raw | Có trong checklist, chưa có bằng chứng raw trong repo |
| `https://universe.roboflow.com/nhandangmonan/banh-nhan-gian` | Cần xác minh lại public/raw | Có trong checklist, cần đối chiếu với zip bánh dân gian |
| `https://universe.roboflow.com/truktruong/ver6-hyapb` | Cần xác minh lại public/raw | Có trong checklist, chưa đủ bằng chứng chất lượng |
| `https://universe.roboflow.com/new-workspace-bfa6s/phanloai-pybzl` | Không đưa vào detect nếu là classification | Tên `phanloai` là cờ đỏ, phải kiểm tra task |

### 8.2 General Food / Cherry-Pick

| Nguồn | Quyết định hiện tại | Lý do/rủi ro |
|---|---|---|
| `https://universe.roboflow.com/japon-gi1n7/uecfood256` | Cherry-pick, không merge nguyên bộ | Quá nhiều class, không thuần Việt |
| `https://universe.roboflow.com/caretech-v2/v2-caretech-combined-dataset` | Cherry-pick | Rộng, dễ làm class taxonomy phình |
| `https://universe.roboflow.com/food-becxj/complete-food` | Cherry-pick nghiêm ngặt | Nguồn lớn, class lẫn nhiều style/domain |
| `https://universe.roboflow.com/food-aozvm/food-detection-project` | Giữ có điều kiện | Cần loại candy/drink/object nếu không phục vụ nutrition |
| `https://universe.roboflow.com/gp-final/food-detection-3` | Giữ có điều kiện | Cần sample grid để tránh stock/poster |
| `https://universe.roboflow.com/helo-helo/food-kcmrd` | Giữ có điều kiện | Hữu ích cho ingredient/food mixed |
| `https://universe.roboflow.com/science-fair-48u9f/food-detection-xt7yz` | Giữ có điều kiện | Cần chuẩn hóa `rice`, fruit/vegetable |
| `https://universe.roboflow.com/semproject-5w89z/food-detection-tyd55` | Hold nếu không nằm trong 22 zip | Không có bằng chứng raw zip hiện tại |
| `https://universe.roboflow.com/detection-lnetp/food-detection-lhp8d` | Hold nếu không nằm trong 22 zip | Có thể tốt nhưng chưa thấy mapping Drive rõ |
| `https://universe.roboflow.com/new-workspace/yolov5-food-image` | Không merge full | 498 classes, chỉ dùng để mining class thiếu nếu có audit mạnh |
| `https://www.kaggle.com/datasets/josephvettom/food-image-dataset` | Không đưa vào detect nếu chỉ classification | Cần bbox thật, không dùng ảnh classification làm YOLO detect |

### 8.3 Ingredient / Vegetable / Fruit / Spice

| Nguồn | Quyết định hiện tại | Lý do/rủi ro |
|---|---|---|
| `https://universe.roboflow.com/food-recipe-ingredient-images/food-ingredients-dataset` | Ưu tiên cho ingredient nếu raw pass | Cần map class sang nutrition/spice taxonomy |
| `https://universe.roboflow.com/viet-hoang-food/food-ingredient-detection-mnc5n` | Ưu tiên nếu bbox tốt | Ingredient VN, nhưng ảnh/class có thể thấp |
| `https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt` | Giữ nếu raw pass | Rau củ thực tế, hợp domain |
| `https://universe.roboflow.com/kittisak-tkerk/vegetable-6d6cy` | Giữ có điều kiện | Docs cũ ghi có class lạ như chicken trong vegetable |
| `https://universe.roboflow.com/food-images/food-detection-union-rhdem` | Quarantine trước | Log hiện tại cho thấy nhiều duplicate labels liên quan nhóm `17_food_union_fruit` |
| `https://universe.roboflow.com/scan-detection/food-detection-hipfv` | Bổ sung nếu raw pass | Ít class nhưng có thể sạch cho fruit/vegetable |
| `https://universe.roboflow.com/bro-bro-bro/food-detector-vckr8` | Bổ sung nếu raw pass | Fruit classes, cần tránh trùng Union fruit |
| `https://www.kaggle.com/datasets/itsmeaman03/fruit-detection-yolo` | Giữ nếu license/format pass | Đúng YOLO nếu metadata khớp |
| `https://www.kaggle.com/datasets/ayyuce/vegetables` | Giữ nếu bbox pass | Cần xác minh annotation và license |
| `https://universe.roboflow.com/meatproject/meat-project-n41vj` | Giữ có điều kiện | Hữu ích cho thịt sống/chín nếu label rõ |
| `https://universe.roboflow.com/project-3rfep/fish-aephx` | Giữ có điều kiện | Hữu ích cho cá/hải sản, cần bbox sample |
| `https://www.kaggle.com/datasets/abrars2/fruit-quality-classificaltion-and-detection` | Hold | Tên có classification/detection mixed, cần tách đúng task |

### 8.4 Segment / Non-Detect Sources

| Nguồn | Quyết định hiện tại | Lý do/rủi ro |
|---|---|---|
| `https://www.kaggle.com/datasets/fontainenathan/foodseg103` | Không trộn trực tiếp vào detect | Segmentation, chỉ dùng sau khi convert mask/segment sang bbox sạch |
| `https://datasetninja.com/food-seg-103` | Metadata tham khảo, không phải raw train source | Hữu ích để hiểu FoodSeg103, không thay thế raw audit |
| `https://mm.cs.uec.ac.jp/uecfoodpix/` | Không trộn trực tiếp vào detect | UECFoodPix là segmentation, cần converter riêng |
| `https://github.com/google-research-datasets/Nutrition5k` | Không train YOLO detect trực tiếp | Có giá trị nutrition/dish metadata, không phải bbox detection source |
| `https://www.kaggle.com/datasets/siddhantrout/nutrition5k-dataset` | Không train YOLO detect trực tiếp | Chỉ dùng cho nutrition mapping nếu license/metadata phù hợp |

## 9. Drive Zip Inventory Và Trạng Thái Xác Thực

Ảnh Drive/runbook đang thấy 23 zip:

| Zip trong Drive | Mapping hiện tại | Trạng thái |
|---|---|---|
| `VietFood67.ZIP` | VietFood67 | D, cần raw audit |
| `Food-Detection-bobotnhan.v7i.yolov11.zip` | Food-Detection-bobotnhan | D, cần raw audit |
| `Food.v6i.yolov11.zip` | Không đủ tên để map chắc | D, cần mở data.yaml |
| `Food_AI_Tong_Hop.v1-banh_mi.yolov11.zip` | Food_AI_Tong_Hop hoặc project con | D, cần kiểm tra class public bị lỗi hay không |
| `Banh dan gian mien Tay.v5i.yolov11.zip` | Bánh dân gian miền Tây | D, cần raw audit |
| `banh-dan-gian-nb.v1i.yolov11.zip` | banh-dan-gian-nb | D, cần raw audit |
| `canteen_menu.v4i.yolov11.zip` | canteen_menu | D, cần raw audit |
| `Food.v3i.yolov11.zip` | Không đủ tên để map chắc | D, cần mở data.yaml |
| `Food Items.v11i.yolov11.zip` | Food Items PreThesis | D, cần raw audit |
| `RawData.v12i.yolov11.zip` | RawData My Khanh | D, cần raw audit |
| `vietnamese-food-calories.v1i.yolov11.zip` | Vietnamese food calories | D, cần raw audit |
| `17_food_union_fruit.zip` | Food Detection Union fruit | Quarantine do duplicate label evidence |
| `16_food_detection_xt7yz.zip` | Food detection xt7yz | D, cần raw audit |
| `15_npg_project.zip` | NPG Project | D, cần lọc object/packaging |
| `12_thai_food.zip` | Thai food | D, chỉ supplement |
| `10_food_detection_64.zip` | Food Detection Project 64 | D, cần raw audit |
| `11_food_detection_3.zip` | Food detection 3 | D, cần raw audit |
| `07_uecfood256.zip` | UECFOOD256 | D, cherry-pick |
| `06_fish.zip` | Fish | D, cần raw audit |
| `05_vegetable_detection.zip` | Vegetable detection | D, cần raw audit |
| `04_food_kcmrd.zip` | Food-kcmrd | D, cần raw audit |
| `03_vietnamese_food_5.zip` | Vietnamese Food 5 classes | D, cần raw audit |
| `01_food_data_vn.zip.zip` | Food Data VN/VietFood mirror | D, cần dedupe với VietFood67 |

Kết luận về Drive: hiện tại mới xác thực được **tồn tại tên zip**, chưa xác thực được **chất lượng thực tế** của từng zip. Bước tiếp theo bắt buộc là raw audit trong Colab hoặc Drive API có quyền đọc bytes.

## 10. Taxonomy V2 Đề Xuất

Không nên bắt đầu bằng 457 classes. Với mục tiêu accuracy cao, nên chia lớp theo tầng:

| Tầng | Mục tiêu | Số class V2 đầu tiên |
|---|---|---:|
| P0 Vietnamese dishes | Món Việt phổ biến, xuất hiện trong app/nutrition DB | 80-120 |
| P1 Ingredients | Thịt, cá, rau củ, trứng, đậu hũ, bún/phở/cơm, trái cây chính | 60-100 |
| P2 Spices / seasonings | Hành, tỏi, ớt, tiêu, rau thơm, nước mắm/chén nước chấm nếu bbox rõ | 20-40 |

Tổng hợp lý cho production V2 đầu tiên: **160-260 classes**, không phải 457. Class nào không đạt min instance/val/test thì đưa vào backlog V3, không ép vào V2.

## 11. Gates Bắt Buộc Trước Khi Train Full

### 11.1 Source Gate

Một source chỉ được accept nếu:

- đọc được zip không lỗi;
- tìm được `data.yaml` hoặc cấu trúc `train/images`, `train/labels`, `valid/images`, `valid/labels`;
- label parse 100%;
- không có label ngoài range class;
- bbox normalized 0..1;
- width/height > 0;
- duplicate label lines sau clean = 0;
- detect dataset không còn segment row;
- class name map được sang taxonomy EatFitAI;
- sample grid 50 ảnh/source được render bbox nhìn được;
- license/nguồn được ghi vào manifest.

### 11.2 Class Gate

| Loại class | Min train instances | Min valid/test instances | Ghi chú |
|---|---:|---:|---|
| P0 dish production | 300 | 30/30 | Nếu món rất quan trọng có thể tạm 150 nhưng phải flag low confidence |
| P1 ingredient | 300 | 30/30 | Ingredient nhỏ cần bbox tight hơn |
| P2 spice/seasoning | 150 | 20/20 | Không ép class quá nhỏ nếu ảnh mờ |
| Long-tail/backlog | <100 | bất kỳ | Không train production, giữ làm nguồn mở rộng |

### 11.3 Dataset Gate

- Không còn duplicate exact ảnh theo hash.
- Không còn near-duplicate nặng giữa train/valid/test.
- Không còn class rác: `person`, `face`, `table`, `fork`, `spoon`, `knife`, `bottle`, `bag`, `objects`, `picanha` nếu không phục vụ mục tiêu.
- Không còn class generic quá rộng nếu gây nhập nhằng: `food`, `dish`, `meal`.
- Có `dataset_manifest.csv` ghi từng ảnh đến từ source nào.
- Có `class_mapping.csv` ghi raw class -> canonical class -> group -> decision.
- Có `rejected_sources.json` và `rejected_labels.csv`.

## 12. Pipeline Phối Hợp Kaggle / Drive / Colab / Codex

### 12.1 Google Drive

Vai trò: lưu raw zip bất biến.

Quy tắc:

- Không sửa zip raw tại chỗ.
- Mọi lần clean tạo output mới theo version: `eatfitai_dataset_v2_YYYYMMDD`.
- Mỗi source có folder report riêng.

### 12.2 Colab

Vai trò: build dataset V2 từ Drive.

Luồng:

1. Mount Drive.
2. List zip trong `EatFitAI-Training/datasets-raw`.
3. Extract từng zip vào `/content/raw_sources/<source_id>`.
4. Parse `data.yaml`.
5. Chuẩn hóa class theo `class_mapping.csv`.
6. Convert segment/mask sang bbox nếu source được phép convert, còn lại reject.
7. Xóa duplicate label rows.
8. Dedupe ảnh exact/near-duplicate.
9. Split train/valid/test theo source và class để tránh leakage.
10. Render sample bbox grid.
11. Xuất:
    - `data.yaml`;
    - `source_manifest.csv`;
    - `class_mapping.csv`;
    - `source_audit.json`;
    - `dataset_audit.json`;
    - `sample_grids/`;
    - `eatfitai_dataset_v2_clean.zip`.

### 12.3 Kaggle

Vai trò: train, không làm merge raw phức tạp.

Luồng:

1. Upload clean dataset V2 lên Kaggle dataset version mới.
2. Notebook audit lại dataset ngay trong Kaggle.
3. Smoke run:
   - YOLO11s;
   - `fraction=0.02` hoặc subset fixed;
   - 1-3 epochs;
   - xác nhận no warning, 2 GPU DDP, batch ổn.
4. Baseline:
   - YOLO11s full hoặc partial 20-30 epochs để so nhanh.
5. Candidate:
   - YOLO11m full;
   - `device=0,1`;
   - `batch=32` rồi tăng/giảm theo VRAM;
   - `workers=2-4` mỗi rank;
   - `amp=True`;
   - `cos_lr=True`;
   - `save_period=2`;
   - `patience=35`;
   - nếu Kaggle quota căng, dùng `time=11.5` và resume.

### 12.4 Codex

Vai trò:

- viết notebook/script;
- đọc commit/log/output;
- giữ tài liệu sống;
- không giữ token;
- phản biện chất lượng nguồn;
- tạo PR/commit sau khi tài liệu và script pass kiểm tra.

Codex không nên tự tuyên bố Drive zip sạch nếu không đọc được raw bytes hoặc không có report Colab.

## 13. Golden Eval Bắt Buộc Để Chứng Minh Mạnh Hơn `best.pt`

Không thể chứng minh "mạnh hơn YOLOv8/best.pt" bằng cảm giác hoặc COCO benchmark. Cần một bộ eval riêng:

```text
golden_eval_v1/
  images/
  labels/
  metadata.csv
```

Nội dung:

- 300-500 ảnh thật từ app/điện thoại.
- Bữa cơm Việt nhiều món.
- Ảnh có món + nguyên liệu + gia vị.
- Ảnh ánh sáng kém, góc nghiêng, che khuất, đĩa/chén nhiều.
- Label chỉ gồm class có trong taxonomy production.

So sánh bắt buộc:

| Model | Dataset | Metrics |
|---|---|---|
| current `best.pt` | golden_eval_v1 | mAP50, mAP50-95, precision, recall, per-class |
| YOLO11s V2 | golden_eval_v1 | cùng metrics |
| YOLO11m V2 | golden_eval_v1 | cùng metrics |

Chỉ gọi là thắng khi:

- YOLO11m V2 thắng `best.pt` trên mAP50-95 và recall nhóm món Việt.
- Không tụt nghiêm trọng ở ingredient/spice quan trọng.
- False positive non-food giảm.
- Ảnh nhiều món có recall tốt hơn.

## 14. File Dead / Rủi Ro Đã Xử Lý Trong Lần Rà Này

Đã xử lý tối thiểu:

- Xóa `ai-provider/merge_datasets.py` vì file tracked rỗng 0 byte, không có logic.
- Sửa `ai-provider/check_kaggle_duplicates.py` để không hardcode `KAGGLE_API_TOKEN`.
- Sửa output tiếng Việt trong `check_kaggle_duplicates.py` về UTF-8 đúng.
- Cho `_tmp_kaggle_kernel/` vào `.gitignore` vì đây là artifact tạm.

Chưa xóa các file legacy khác vì chưa đủ bằng chứng an toàn:

- `ai-provider/create_notebook.py`;
- `ai-provider/colab_train_yolo11.py`;
- `ai-provider/EatFitAI_Training_Notebook.py`;
- `ai-provider/kaggle_train_yolo11.py`.

Các file này nên được đánh dấu deprecated sau khi Dataset V2 Builder mới được tạo và chạy pass.

## 15. Plan Thực Thi Tiếp Theo

### Phase A - Manifest Và Raw Audit

Output bắt buộc:

- `docs/dataset_v2/source_manifest.csv`
- `docs/dataset_v2/class_mapping.csv`
- `docs/dataset_v2/source_audit_summary.md`

Việc cần làm:

1. Tạo Colab notebook `EatFitAI_Dataset_V2_Builder.ipynb`.
2. Đọc 23 zip Drive.
3. Xuất audit cho từng zip.
4. Xác định chính xác 22 nguồn nào được giữ.
5. Reject/quarantine nguồn không đạt.

### Phase B - Taxonomy Và Clean Dataset

Output bắt buộc:

- `eatfitai_dataset_v2_clean/`
- `data.yaml`
- `dataset_audit.json`
- `sample_grids/`

Việc cần làm:

1. Chốt taxonomy 160-260 classes.
2. Map raw class -> canonical class.
3. Dedupe ảnh/label.
4. Tách detect và segment.
5. Split train/valid/test.

### Phase C - Kaggle Smoke Và Baseline

Output bắt buộc:

- `runs/food-detection/yolo11s-v2-smoke/`
- `runs/food-detection/yolo11s-v2-baseline/`
- log DDP T4 x2.

Việc cần làm:

1. Upload dataset V2 clean lên Kaggle.
2. Run notebook audit.
3. Smoke 1-3 epochs.
4. Baseline YOLO11s.

### Phase D - YOLO11m Production Candidate

Output bắt buộc:

- `best.pt`;
- `last.pt`;
- `results.csv`;
- confusion matrix;
- per-class metrics;
- benchmark trên `golden_eval_v1`.

Việc cần làm:

1. Train YOLO11m.
2. Resume nếu Kaggle hết session.
3. So với current `best.pt`.
4. Export ONNX nếu thắng.

## 16. Quyết Định Hiện Tại

Chưa tối ưu nhất nếu tiếp tục train artifact hiện tại.

Hướng tối ưu nhất hiện tại là:

```text
Không train full raw Kaggle 457 classes
-> quay về Drive raw zips
-> audit từng zip bằng Colab
-> build Dataset V2 clean 160-260 classes
-> Kaggle smoke
-> YOLO11s baseline
-> YOLO11m candidate
-> golden eval so với best.pt
```

Đây là hướng ít bịa đặt nhất vì mọi quyết định đều cần report/manifest, không dựa vào tên link hoặc cảm giác "dataset lớn là tốt".
