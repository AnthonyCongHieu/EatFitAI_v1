# Dataset Source Real Audit Results - 2026-05-04

## 0. Kết Luận Ngắn

Tôi **không chấp nhận train production tiếp bằng dataset Kaggle hiện tại**.

Lý do không phải vì YOLO11 yếu. Lý do là dataset hiện tại có bằng chứng lỗi thật từ notebook Kaggle:

- `train`: 405,586 ảnh, 405,586 label files.
- `valid`: 27,141 ảnh, 27,141 label files.
- `data.yaml`: 457 classes.
- Raw train labels: 1,371,231 box rows, 22,444 segment rows.
- Raw valid labels: 86,393 box rows, 3,634 segment rows.
- Duplicate labels:
  - train: 6,971 label files có duplicate, 29,468 duplicate lines;
  - valid: 2,590 label files có duplicate, 9,026 duplicate lines.
- Clean cell từng báo `duplicate_dropped=38,494`, `segment_kept=26,078`.
- Sau clean, audit cell lại ra `box_rows=0`, `class_instances_nonzero=0`, nghĩa là notebook phiên bản đã chạy có vấn đề trong bước clean/đọc lại label.
- Khi smoke/full train, Ultralytics vẫn scan về raw `/kaggle/input/.../merged_dataset/...`, không phải clean dataset thật.

Kết luận khắt khe: dataset hiện tại chỉ chứng minh rằng ta có nhiều ảnh và nhiều class. Nó **chưa chứng minh** chất lượng đủ để đạt mục tiêu "món ăn + nguyên liệu + gia vị Việt Nam với độ chính xác cực cao".

## 1. Phạm Vi Kiểm Tra Đã Làm

Đã kiểm tra trong lần này:

1. Đọc notebook Kaggle đã pull về local:
   - `_tmp_kaggle_kernel/train-eatfitai-l-n-1/train-eatfitai-l-n-1.ipynb`
2. Parse output cell để lấy số liệu thực tế từ lần chạy Kaggle đã dừng.
3. Đọc `data.yaml`, `dataset_info.json`, các doc/commit gần đây.
4. Kiểm tra public web metadata cho một số nguồn Roboflow/Kaggle/official quan trọng.
5. Đối chiếu 50 URL trong repo với mục tiêu sản phẩm.
6. Tìm thêm candidate nguồn mới qua Roboflow Universe search.

Không làm trong lần này:

- Không download raw zip từ Google Drive vì local hiện không có Drive bytes trực tiếp.
- Không dùng token Roboflow/Kaggle chụp trong screenshot để tránh ghi secret vào command/log. Token đã lộ trong ảnh/chat, nên nên revoke/regenerate.
- Không kết luận bbox tight/label đúng với từng raw zip nếu chưa xem sample grid thật.

## 2. Bằng Chứng Thực Tế Từ Kaggle Notebook

### 2.1 Hardware

Notebook Kaggle xác nhận:

```text
CUDA available: True
CUDA device count: 2
GPU 0: Tesla T4 | 14.6 GiB VRAM
GPU 1: Tesla T4 | 14.6 GiB VRAM
BATCH_TOTAL=32 (16/GPU target)
```

Kaggle có 2 GPU. Vấn đề chính không phải thiếu GPU, mà là dataset/preprocess.

### 2.2 Dataset path và số lượng

Notebook tìm được dataset:

```text
DATASET_DIR: /kaggle/input/datasets/hiuinhcng/eatfitai-food-dataset/merged_dataset
train: images=405,586 labels=405,586
valid: images=27,141 labels=27,141
```

Số lượng ảnh rất lớn. Nhưng ảnh lớn không đồng nghĩa dataset tốt.

### 2.3 Raw audit

| Split | Box rows | Segment rows | Duplicate label files | Duplicate lines | Multi-object images | Multi-class images | Nonzero classes | Zero classes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| train | 1,371,231 | 22,444 | 6,971 | 29,468 | 48.91% | 23.46% | 457 | 0 |
| valid | 86,393 | 3,634 | 2,590 | 9,026 | 43.73% | 16.73% | 429 | 28 |

Đánh giá:

- Multi-object khá tốt cho mục tiêu nhiều món/nguyên liệu trong 1 ảnh.
- Nhưng segment rows trong detect dataset là lỗi pipeline.
- Duplicate labels rất nhiều.
- Valid thiếu 28 classes, làm metric theo class không ổn định.

### 2.4 Lỗi clean pipeline

Sau clean:

```text
duplicate_dropped: 38,494
segment_kept: 26,078
CLEAN_YAML: /kaggle/working/eatfitai_detect_clean/data.yaml
```

Nhưng audit lại clean dataset báo:

```text
box_rows: 0
segment_rows: 0
class_instances_nonzero: 0
class_instances_zero: 457
```

Đây là dấu hiệu nghiêm trọng: bước clean ở notebook đã chạy không tạo/đọc label sạch đúng cách. Vì vậy mọi train sau đó không được xem là train trên dataset clean đã xác thực.

### 2.5 Train vẫn scan raw path

Smoke/full train log dùng:

```text
data=/kaggle/working/eatfitai_detect_clean/data.yaml
```

nhưng Ultralytics scan:

```text
/kaggle/input/datasets/hiuinhcng/eatfitai-food-dataset/merged_dataset/train/labels
/kaggle/input/datasets/hiuinhcng/eatfitai-food-dataset/merged_dataset/valid/labels
```

Kết luận: notebook đã không tách clean dataset khỏi raw dataset đúng cách trong lần chạy đã dừng.

## 3. Duplicate Evidence Theo Source Prefix Trong Log Kaggle

Tôi parse toàn bộ output notebook để gom các dòng `duplicate labels removed` theo prefix file nguồn.

| Source prefix trong merged dataset | Số file bị log duplicate | Tổng duplicate removed trong log | Đánh giá |
|---|---:|---:|---|
| `11_food_detection_3` | 8,462 | 29,529 | QUARANTINE nặng |
| `17_food_union_fruit` | 821 | 8,584 | QUARANTINE nặng |
| `05_vegetable_detection` | 176 | 277 | QUARANTINE cho tới khi raw clean |
| `10_food_detection_64` | 48 | 48 | CONDITIONAL sau clean |
| `Food.v6i.yolov11` | 39 | 41 | Cần map lại source, CONDITIONAL |
| `04_food_kcmrd` | 13 | 13 | CONDITIONAL |
| `07_uecfood256` | 5 | 5 | Không nặng vì duplicate, nhưng vẫn cherry-pick do quá nhiều class |

Đây là bằng chứng thực tế từ lần Kaggle train/log, không phải suy luận.

## 4. Kiểm Tra Public Metadata Quan Trọng

### 4.1 Nguồn Việt Nam có giá trị cao

| Source | Public evidence đã kiểm tra | Đánh giá |
|---|---|---|
| Food Data / VietFood mirror | Public page Roboflow: Object Detection, 8,205 images, 31 classes, license CC BY 4.0. Classes gồm nhiều món Việt như `Banh-beo`, `Banh-mi`, `Bun-bo-Hue`, `Ca-kho-to`, `Canh-chua`, `Com-tam`, `Goi-cuon`, `Pho`. | ACCEPT_CANDIDATE, rất sát mục tiêu món Việt |
| Vietnamese Food / FoodAITongHop | Public page: Object Detection, 1,000 images, 5 classes: `Bánh-Mì`, `Bột Chiên`, `Bún`, `Gỏi-Cuốn`, `Phở`, CC BY 4.0. | ACCEPT_CANDIDATE, nhỏ nhưng sạch về taxonomy |
| DETECTION_15_VIETNAMESE_FOOD | Search/web metadata: Object Detection, khoảng 2.9k images, 15 classes món Việt/Việt hóa như beef stew, cá kho tộ, bánh mì, phở, bánh xèo, CC BY 4.0. | ACCEPT_CANDIDATE nếu raw bbox pass |
| Food Items / FoodRecognitionPreThesis | Public page: Object Detection, 1,356 images, 52 classes, nhiều món cơm/canh/đậu hũ/gà kho/canh chua, CC BY 4.0. | ACCEPT_CANDIDATE cho bữa ăn Việt/cơm phần |
| banh-dan-gian-nb | Search/web metadata: Object Detection, 882 images, 20 classes bánh dân gian. | ACCEPT_CANDIDATE nhưng cần chống overfit vì nhỏ |
| Food / Khoa | Search/web metadata: Object Detection, 997 images, nhóm bánh Việt như bánh bèo, bánh bò, bánh bột lọc, bánh căn, bánh canh. | ACCEPT_CANDIDATE cho nhóm bánh |
| vietnamese-food-calories | Search/web metadata: 947 images, 1 model, class món Việt. | CONDITIONAL, cần kiểm tra class numeric/label map |
| RawData / My Khanh Nguyen | Repo shortlist ghi 3,019 images/50 classes, nhiều món miền Tây; public search trực tiếp chưa đủ metadata trong lần này. | PENDING_RAW_AUDIT, tiềm năng cao nhưng chưa chốt |
| Food - Prethesis | Repo shortlist ghi 8,738 images/68 classes và có class nhiễu như `Con_nguoi`, `Hamburger`, `Salad`. | QUARANTINE cho tới khi class filter |

### 4.2 Nguồn ingredient/gia vị

| Source | Public evidence đã kiểm tra | Đánh giá |
|---|---|---|
| FOOD-INGREDIENTS dataset | Web metadata: Object Detection, 4.2k images, 120 classes; có garlic, ginger, chili, coriander, mint, olive oil, meat/vegetable classes; license CC BY 4.0. Version page còn ghi export/augmentation lên 9,780 images. | ACCEPT_CANDIDATE cho ingredient/spice, nhưng phải lọc class Nepal/ít dùng |
| Food Ingredient Detection VN | Repo shortlist ghi 1,182 images/80 classes. Chưa public-open được trong lần này. | PENDING_RAW_AUDIT |
| Vegetable Object Detection ybszt | Repo shortlist ghi 3,222 images/22 classes. Chưa public-open được trong lần này. | ACCEPT_CANDIDATE nếu raw pass |
| Vegetable 6d6cy | Repo shortlist ghi 1,488 images/16 classes, có warning class lạ. | CONDITIONAL |
| Food Detection Union fruit | Repo shortlist ghi 51,343 images/12 classes; Kaggle log thực tế cho prefix `17_food_union_fruit` có 8,584 duplicate labels removed. | QUARANTINE nặng, không merge full |
| Food detection hipfv | Repo shortlist ghi 3,810 images/5 classes. | CONDITIONAL |
| Food detector fruit vckr8 | Repo shortlist ghi 1,031 images/18 classes. | CONDITIONAL |
| Fruit Detection YOLO Kaggle | Public Kaggle source có trong repo, chưa authenticated metadata ở local. | CONDITIONAL nếu bbox/license pass |
| Vegetables Object Detection Kaggle | Public Kaggle source có trong repo, chưa authenticated metadata ở local. | CONDITIONAL nếu bbox/license pass |

### 4.3 Nguồn general/cherry-pick

| Source | Public evidence đã kiểm tra | Đánh giá |
|---|---|---|
| UECFOOD256 Roboflow | Public page: Object Detection, 29,364 images, 253 classes, CC BY 4.0. | CHERRY_PICK only, không merge full vì quá nhiều class và không thuần Việt |
| Food Detection Project 64 | Repo shortlist ghi 9,026 images/64 classes; Kaggle log prefix `10_food_detection_64` có duplicate nhẹ. | CONDITIONAL, cần lọc candy/drink/object |
| Food detection 3 | Kaggle log prefix `11_food_detection_3` có 29,529 duplicate labels removed. | QUARANTINE nặng |
| Food-kcmrd | Kaggle log prefix `04_food_kcmrd` duplicate nhẹ; repo ghi 4,209 images/78 classes. | CONDITIONAL, hữu ích ingredient nhưng phải lọc |
| Food detection xt7yz | Repo shortlist ghi 6,435 images/51 classes. | CONDITIONAL |
| Food detection tyd55 | Repo shortlist ghi 3,376 images/38 classes. | HOLD nếu không nằm trong Drive zip |
| Food Detection lhp8d | Repo shortlist ghi 1,754 images/27 classes. | HOLD nếu không nằm trong Drive zip |
| Complete Food | Repo shortlist ghi 46,735 images/214 classes. | CHERRY_PICK only, không merge full |
| V2 CareTech Combined Dataset | Repo shortlist ghi 29,278 images/258 classes. | CHERRY_PICK only |
| NPG Project | Repo shortlist ghi 8,828 images/101 classes; có rủi ro bottle/bag/water. | CONDITIONAL sau class reject |
| YOLOv5 Food Image | Search/web metadata cho nguồn cùng nhóm cho thấy 10k images, class có `fork`, `knife`, `spoon`, numeric classes. | REJECT_FULL, chỉ mining class nếu thật cần |

### 4.4 Nguồn segmentation / non-detect

| Source | Public evidence đã kiểm tra | Đánh giá |
|---|---|---|
| FoodSeg103 DatasetNinja/Kaggle | DatasetNinja: semantic segmentation, 7,118 images, 103 classes, pixel masks, Apache 2.0; mô tả gốc nói 9,490 images, có ingredient masks. | Không trộn trực tiếp; chỉ dùng nếu convert mask -> bbox và audit lại |
| UECFoodPixComplete | Official/source trong repo là segmentation. | Không trộn trực tiếp |
| Nutrition5k official/Kaggle mirror | Không phải YOLO bbox dataset trực tiếp. | Không dùng train detect; chỉ dùng nutrition/class mapping |
| Food Image Dataset Indian YOLO | Repo có Kaggle link, chưa xác minh bbox/license trong lần này. | HOLD |
| Fruit Quality Classification and Detection | Tên nguồn có classification/detection mixed. | HOLD, cần tách task |

## 5. Kiểm Tra 50 URL Trong Repo: Quyết Định Hiện Tại

| # | URL/source | Current decision | Lý do chính |
|---:|---|---|---|
| 1 | `roboflow.com` | INFO_ONLY | Trang nền tảng, không phải dataset |
| 2 | VietFood67 Kaggle | ACCEPT_CANDIDATE | Core Vietnamese, cần license/raw bbox |
| 3 | Food Data / TruongVo | ACCEPT_CANDIDATE | Public verified, 8.2k images/31 classes Việt |
| 4 | DETECTION_15_VIETNAMESE_FOOD | ACCEPT_CANDIDATE | Public/search verified, 2.9k images/15 classes |
| 5 | Vietnamese Food / FoodAITongHop | ACCEPT_CANDIDATE | Public verified, 1k images/5 core classes |
| 6 | vietnamese-food-calories | CONDITIONAL | Sát domain, cần raw/class map |
| 7 | RawData / My Khanh Nguyen | PENDING_RAW_AUDIT | Tiềm năng cao, cần đọc zip |
| 8 | Food - Prethesis | QUARANTINE | Có class nhiễu theo docs |
| 9 | Food Items | ACCEPT_CANDIDATE | Public verified, 1.36k/52 classes cơm Việt |
| 10 | canteen_menu | ACCEPT_CANDIDATE | Repo ghi sát bữa ăn Việt, cần raw |
| 11 | Food / Khoa | ACCEPT_CANDIDATE | Public/search verified nhóm bánh Việt |
| 12 | banh-dan-gian-nb | ACCEPT_CANDIDATE | Public/search verified, 882 images |
| 13 | Bánh dân gian miền Tây | CONDITIONAL | Nhỏ, cần raw bbox |
| 14 | Food-Detection-bobotnhan | ACCEPT_CANDIDATE | Sát món/nguyên liệu, cần raw |
| 15 | Food_AI_Tong_Hop | ACCEPT_CANDIDATE | Public/search verified 1.93k images/6 classes |
| 16 | Thai-Food-Project | CONDITIONAL | Gần domain châu Á, không thuần Việt |
| 17 | UECFOOD256 | CHERRY_PICK | Public verified 29k/253 classes, quá rộng |
| 18 | Food Detection Project 64 | CONDITIONAL | Duplicate nhẹ, cần lọc class |
| 19 | Food detection 3 | QUARANTINE | Kaggle log duplicate rất nặng |
| 20 | Food-kcmrd | CONDITIONAL | Duplicate nhẹ, useful ingredient |
| 21 | Food detection xt7yz | CONDITIONAL | Cần raw bbox/class map |
| 22 | Food detection tyd55 | HOLD | Chưa thấy mapping Drive chắc |
| 23 | Food Detection lhp8d | HOLD | Chưa thấy mapping Drive chắc |
| 24 | FOOD-INGREDIENTS dataset | ACCEPT_CANDIDATE | Public verified, ingredient/spice rất hữu ích |
| 25 | Food Ingredient Detection VN | PENDING_RAW_AUDIT | Cần public/raw check |
| 26 | Vegetable Object Detection ybszt | ACCEPT_CANDIDATE | Cần raw check |
| 27 | Vegetable 6d6cy | CONDITIONAL | Có rủi ro class lạ |
| 28 | Food Detection Union fruit | QUARANTINE | Kaggle log duplicate rất nặng |
| 29 | Food detection hipfv | CONDITIONAL | Ít class, có thể bổ sung |
| 30 | Food detector fruit vckr8 | CONDITIONAL | Fruit supplement |
| 31 | Fruit Detection YOLO Kaggle | CONDITIONAL | Cần license/raw |
| 32 | Vegetables Kaggle | CONDITIONAL | Cần license/raw |
| 33 | Complete Food | CHERRY_PICK | 46k/214 classes, không merge full |
| 34 | V2 CareTech Combined | CHERRY_PICK | 29k/258 classes, quá rộng |
| 35 | NPG Project | CONDITIONAL | Ingredient mixed nhưng có object/packaging |
| 36 | YOLOv5 Food Image | REJECT_FULL | Quá nhiều/rác/numeric/object, chỉ mining |
| 37 | FoodSeg103 Kaggle | CONVERT_ONLY | Segmentation |
| 38 | DatasetNinja FoodSeg103 | INFO_ONLY | Metadata/visual reference |
| 39 | UECFoodPix official | CONVERT_ONLY | Segmentation |
| 40 | Nutrition5k official | NUTRITION_ONLY | Không phải bbox detect |
| 41 | Nutrition5k Kaggle | NUTRITION_ONLY | Không train detect trực tiếp |
| 42 | Meat project | CONDITIONAL | Bổ sung meat, cần raw |
| 43 | Fish project | CONDITIONAL | Bổ sung fish/seafood, cần raw |
| 44 | Food Image Dataset Indian YOLO | HOLD | Chưa xác minh |
| 45 | Thai Food Detection xvc0m | CONDITIONAL | Supplement châu Á |
| 46 | Fruit Quality Classification/Detection | HOLD | Mixed task |
| 47 | Vietnamfood Duy2902 | CONDITIONAL | Public search thấy 320 images, có `food` generic |
| 48 | phanloai-pybzl | REJECT_UNLESS_DETECT_VERIFIED | Tên "phanloai" là cờ đỏ |
| 49 | Banh Nhan Gian | REJECT_OR_RELABEL | Public search thấy 109 images và class `\\`, quá nhỏ/lỗi |
| 50 | ver6-hyapb | QUARANTINE | Public search thấy nhiều class, có `food` generic |

## 6. Nguồn Mới Tìm Thêm Trong Lần Kiểm Tra

Các nguồn này **chưa được accept**, chỉ là candidate mới để kiểm tra raw nếu muốn mở rộng.

| Candidate mới | Public evidence | Lý do đáng xem | Rủi ro |
|---|---|---|---|
| Canteen_food by niunue | Roboflow search: 1.6k images, Object Detection, nhiều món canteen như rice, boiled egg, braised pork, fish, soups. | Rất hợp bữa ăn Việt/canteen | Cần URL exact/raw/license |
| Food Detect by NCKH | Roboflow search: 113 classes, có `banh_cuon`, `banh_gio`, `banh_mi`, `banh_xeo`, `bun_bo_hue`, `bun_cha`, `com_tam`, `pho`, `nem_chua`. | Có nhiều class Việt + quốc tế | Cần kiểm tra ảnh/class imbalance |
| food ingredients by Melisas Workspace | Roboflow search: 40k images, 20 ingredient classes gồm fish, tomato, carrot, chicken, garlic, beef, ginger, tofu, small_pepper. | Rất mạnh cho ingredient/gia vị | Cần check duplicate/license/raw bbox |
| Food Ingredient Recognition/Search results | Roboflow search có nhiều nguồn 3.75k-8.94k images ingredient. | Có thể vá ingredient/spice | Nhiều nguồn generic, cần lọc rất kỹ |
| Food Item Detection 15k/95 classes | Roboflow search: 15k images, 95 classes ingredient/food. | Có garlic, yogurt, beef, vegetables | Có `bottle`, `plasticsaveholder`, class duplicate case |

## 7. Quyết Định Với Mục Tiêu Cuối

### 7.1 Để mạnh hơn YOLOv8/current `best.pt`

Chưa thể chứng minh bằng dataset hiện tại. Muốn chứng minh phải có:

- `golden_eval_v1` ảnh thật Việt Nam;
- chạy current `best.pt` và YOLO11m cùng tập;
- so mAP50-95, recall theo nhóm món Việt, ingredient, spice;
- kiểm tra false positives non-food.

### 7.2 Để nhận diện món + nguyên liệu + gia vị trong 1 ảnh

Dataset hiện tại có dấu hiệu multi-object:

- train multi-object image: 48.91%;
- valid multi-object image: 43.73%.

Điểm tốt: có khả năng học nhiều object trong một hình.

Điểm chưa đạt:

- chưa chứng minh các object đó đúng là món + nguyên liệu + gia vị;
- ingredient/spice nhỏ cần bbox tight, hiện chưa có visual sample grid;
- 457 classes làm long-tail yếu, valid thiếu 28 classes.

### 7.3 Dataset phù hợp YOLO11

Chưa phù hợp ở trạng thái raw hiện tại vì:

- detect/segment mixed;
- duplicate labels nhiều;
- clean notebook lần chạy cũ lỗi;
- train vẫn scan raw path.

Chỉ phù hợp YOLO11 sau khi:

- còn đúng label detect 5 cột;
- duplicate = 0;
- segment = 0 hoặc đã convert bbox rõ;
- class count giảm còn khoảng 160-260 class có ích;
- có train/valid/test không leakage.

## 8. Kết Luận Nguồn Nên Gom Lại Trước

Nhóm core nên ưu tiên raw audit trước:

```text
Food Data / VietFood mirror
VietFood67
Vietnamese Food / FoodAITongHop
DETECTION_15_VIETNAMESE_FOOD
Food Items / FoodRecognitionPreThesis
Food / Khoa
banh-dan-gian-nb
canteen_menu
Food-Detection-bobotnhan
RawData / My Khanh Nguyen
FOOD-INGREDIENTS dataset
Vegetable Object Detection ybszt
Food Ingredient Detection VN
Fish project
Meat project
```

Nhóm chỉ cherry-pick:

```text
UECFOOD256
Complete Food
V2 CareTech
Food-kcmrd
NPG Project
Thai-Food-Project
Food Detection Project 64
```

Nhóm quarantine/reject trước mắt:

```text
11_food_detection_3
17_food_union_fruit
FoodSeg103 direct detect
UECFoodPix direct detect
Nutrition5k direct detect
YOLOv5 Food Image full merge
Banh Nhan Gian
phanloai-pybzl
ver6-hyapb
```

## 9. Final Verdict

Nếu mục tiêu là model EatFitAI YOLO11 production tốt hơn `best.pt`, tôi sẽ không dùng dataset 457-class hiện tại để train full.

Dataset cần build lại theo hướng:

```text
core Vietnamese dish sources
+ ingredient/spice sources đã raw-audit
+ cherry-pick từ general sources
- duplicate/segment/rác/class generic
-> 160-260 classes sạch
-> YOLO11s smoke/baseline
-> YOLO11m candidate
-> golden eval so với best.pt
```

Trạng thái hiện tại của 22 zip Drive: **chưa xác thực thực tế đủ nghiêm ngặt**. Có tên zip, có một số log lỗi theo prefix sau khi merge, nhưng chưa có per-source raw audit + sample bbox grid. Không nên gom lại một cách mù.

## 10. Nguồn Web Đã Dùng

- Roboflow Food Data: https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp
- Roboflow Vietnamese Food: https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo
- Roboflow Food Items: https://universe.roboflow.com/foodrecognitionprethesis/food-items-j9iud
- Roboflow UECFOOD256: https://universe.roboflow.com/japon-gi1n7/uecfood256
- Roboflow FOOD-INGREDIENTS dataset: https://universe.roboflow.com/food-recipe-ingredient-images-0gnku/food-ingredients-dataset
- FoodSeg103 DatasetNinja: https://datasetninja.com/food-seg-103
- Roboflow API docs: https://docs.roboflow.com/developer/rest-api/using-the-rest-api
- Roboflow export docs: https://docs.roboflow.com/developer/rest-api/export-data
- Kaggle CLI dataset docs: https://github.com/Kaggle/kaggle-api/blob/main/docs/datasets.md
- Kaggle CLI kernel docs: https://github.com/Kaggle/kaggle-api/blob/main/docs/kernels.md
