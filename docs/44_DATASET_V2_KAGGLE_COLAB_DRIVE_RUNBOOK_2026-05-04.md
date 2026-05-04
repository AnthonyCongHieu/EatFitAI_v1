# Dataset V2 Kaggle / Colab / Drive Runbook - 2026-05-04

**Mục tiêu:** ghi lại cách Codex, Kaggle, Colab và Google Drive nên phối hợp để tạo lại bộ dataset EatFitAI v2 sạch, mạnh, ít lỗi và train YOLO11 trơn tru trên Kaggle.

**Bối cảnh hiện tại:** raw dataset vẫn nằm trên Google Drive tại `EatFitAI-Training/datasets-raw`. Dataset đã upload lên Kaggle có dấu hiệu xấu: duplicate labels, mixed detect/segment labels, cache không lưu được do train trực tiếp từ `/kaggle/input`, và có khả năng lỗi phát sinh từ bước xử lý/merge trước đó trên Colab.

---

## 1. Kết Luận Kỹ Thuật Ngắn

Không nên tiếp tục coi dataset Kaggle hiện tại là source of truth.

Source of truth nên là:

```text
Google Drive / EatFitAI-Training / datasets-raw
```

Kaggle dataset chỉ nên là **artifact versioned sau khi đã audit + clean + package**.

Colab nên dùng để:

- mount Google Drive;
- đọc raw zip;
- giải nén ra local SSD `/content`;
- chuẩn hóa class;
- convert labels;
- dedupe;
- kiểm tra ảnh/label;
- sinh manifest, report, dataset clean.

Kaggle nên dùng để:

- nhận dataset clean đã đóng gói;
- chạy smoke training;
- train full bằng T4 x2/DDP;
- lưu checkpoint/model artifact.

Codex nên dùng để:

- viết notebook/script/runbook;
- tạo rule audit/clean;
- điều khiển Kaggle bằng CLI/API nếu token đã cấu hình an toàn;
- đọc log và sửa pipeline;
- không giữ token trong code, notebook hoặc repo.

---

## 2. Bản Đồ Kết Nối

### 2.1. Codex local -> Kaggle

Khả năng điều khiển:

- Qua Kaggle CLI/API nếu máy local có `kaggle` package và token.
- Qua notebook Kaggle nếu user import notebook thủ công.
- Qua browser chỉ khi thao tác UI cần xác nhận thủ công.

Các tác vụ phù hợp với Kaggle API/CLI:

```text
datasets list / download / create / version / metadata / status
kernels init / push / status / output / pull
```

Vai trò thực tế:

- push notebook/script lên Kaggle;
- tạo dataset version mới từ folder clean;
- kiểm tra dataset status;
- tải output/checkpoint từ kernel;
- không nên dùng Kaggle để làm merge data raw quá phức tạp vì session/output quota dễ vướng.

Nguồn chính thức: Kaggle CLI docs nói CLI hỗ trợ quản lý datasets/kernels/models; docs dataset có `kaggle datasets version`; docs kernels có `kaggle kernels push`, `status`, `output`.

### 2.2. Codex local -> Google Drive

Khả năng điều khiển:

- Nếu có Google Drive connector/API auth: có thể list/fetch/upload metadata/file.
- Nếu không có auth local: Codex không nên giả định đọc được Drive trực tiếp.
- Drive for Desktop có thể stream/mirror file về máy, nhưng cần cẩn thận sync chưa hoàn tất.

Vai trò thực tế:

- Dùng Drive làm kho raw.
- Dùng Colab mount Drive để xử lý vì Colab ở cùng hệ Google, thuận tiện hơn local download/upload hàng chục GB.
- Nếu cần API chuẩn: Google Drive API `files` resource có metadata như `id`, `name`, `mimeType`, `md5Checksum`, `size`, `webContentLink`, `parents`.

### 2.3. Colab -> Google Drive

Khả năng điều khiển:

```python
from google.colab import drive
drive.mount("/content/drive")
```

Luồng nên dùng:

```text
Drive zip raw -> Colab mount -> copy/extract to /content SSD -> process -> write report/package -> copy final artifacts back to Drive
```

Không nên:

- train trực tiếp từ Drive;
- đọc/ghi hàng trăm nghìn label file trực tiếp trên Drive;
- sửa dataset ngay trong raw folder;
- upload dataset lên Kaggle trước khi report pass.

Lý do:

- Drive mount tiện nhưng I/O rất chậm với nhiều file nhỏ.
- YOLO dataset có hàng trăm nghìn file nhỏ; xử lý trực tiếp trên Drive dễ timeout, stale file, partial write.
- Nên extract vào `/content/datasets_raw_extracted`, xử lý ở đó, sau đó đóng gói artifact sạch.

### 2.4. Colab -> Kaggle

Khả năng điều khiển:

- Có thể cài Kaggle CLI trong Colab và dùng token qua secret/env.
- Có thể upload dataset clean bằng `kaggle datasets create` hoặc `kaggle datasets version`.
- Có thể push kernel/notebook, nhưng Colab thường không phải nơi tốt nhất để điều khiển Kaggle long-run.

Nguyên tắc:

- Colab tạo dataset clean.
- Kaggle nhận dataset clean.
- Kaggle train.

### 2.5. Kaggle notebook -> Kaggle dataset

Kaggle input mount tại:

```text
/kaggle/input/<dataset-slug>
/kaggle/input/datasets/<owner>/<dataset-slug>
```

Đặc điểm:

- read-only;
- dataset cần chờ download/mount hoàn tất trước khi cell đọc;
- nếu train trực tiếp từ input, YOLO cache có thể không save được;
- output writable nằm tại `/kaggle/working`.

Luồng tốt:

```text
/kaggle/input/eatfitai-clean-v2/*.tar
-> extract/copy vào /tmp/eatfitai_detect_clean
-> train bằng /tmp/eatfitai_detect_clean/data.yaml
-> chỉ lưu checkpoint/report/export vào /kaggle/working
```

---

## 3. Rà Soát API: Kaggle vs Colab

### 3.1. Kaggle API/CLI

Kaggle có API/CLI chính thức đủ dùng cho workflow này.

Các lệnh quan trọng:

```bash
kaggle datasets init -p ./eatfitai-clean-v2
kaggle datasets create -p ./eatfitai-clean-v2 -r zip
kaggle datasets version -p ./eatfitai-clean-v2 -m "clean v2: dedupe labels, detect-only, audited manifests" -r zip
kaggle datasets status hiuinhcng/eatfitai-clean-v2
kaggle datasets metadata hiuinhcng/eatfitai-clean-v2 -p ./metadata

kaggle kernels init -p ./kaggle-train
kaggle kernels push -p ./kaggle-train
kaggle kernels status hiuinhcng/eatfitai-yolo11m-train
kaggle kernels output hiuinhcng/eatfitai-yolo11m-train -p ./outputs -o
```

Điểm mạnh:

- version dataset rõ ràng;
- chạy notebook/script từ CLI;
- lấy output/checkpoint;
- dễ tích hợp Codex/local.

Điểm yếu:

- Auth/token phải quản lý rất chặt.
- Upload dataset lớn có thể chậm.
- Dataset nhiều file nhỏ nên nên upload dạng archive hoặc ít shard lớn hơn.
- Không nên upload 400k ảnh rời nếu có thể đóng gói shard `.tar`.

### 3.2. Colab thường

Colab thường là môi trường notebook tương tác, không có public API ổn định như Kaggle để Codex local tạo session, run cell, theo dõi logs.

Có thể điều khiển gián tiếp bằng:

- notebook code;
- browser automation;
- Drive files;
- scripts chạy trong Colab;
- thủ công qua UI.

Không nên xây workflow phụ thuộc việc Codex local tự bấm/run Colab như CI.

### 3.3. Colab Enterprise

Colab Enterprise trên Google Cloud có API/gcloud để tạo notebook execution jobs, schedule, list/delete executions. Đây là sản phẩm khác Colab thường, cần GCP project, region, runtime template, quyền IAM, GCS output.

Nếu sau này muốn tự động hóa nghiêm túc:

```text
Colab Enterprise / Vertex AI Notebook Execution
```

Nhưng hiện tại với mục tiêu 0/ít chi phí, không nên coi đây là path chính.

---

## 4. Chẩn Đoán Dataset Kaggle Hiện Tại

Các cảnh báo đã quan sát:

```text
valid cache directory is not writable
Box and segment counts should be equal
duplicate labels removed
```

Ý nghĩa:

- Dataset đang chứa cả bbox rows và polygon segment rows.
- YOLO detect sẽ bỏ segment hoặc convert không rõ ràng nếu ta để framework tự xử lý.
- Có nhiều duplicate annotation, đặc biệt từ source `food_union_fruit`.
- Validation set bị nhiễu, metric có thể không tin cậy.
- Data đang train từ `/kaggle/input`, cache không lưu, scan lâu.

Root cause khả dĩ:

1. Merge từ nhiều nguồn nhưng không thống nhất task type.
2. Một số dataset Roboflow export YOLO segmentation, không phải detection.
3. Convert từ segment sang bbox chưa làm trước khi upload.
4. Duplicate labels không được dedupe sau augment/export.
5. Class mapping chưa gom alias triệt để.
6. Colab xử lý trực tiếp trên Drive gây partial output/stale files.
7. Upload lên Kaggle trước khi chạy audit full.

---

## 5. Kiến Trúc Dataset V2 Đề Xuất

### 5.1. Nguyên tắc source of truth

```text
raw zip trên Drive: immutable
processed workspace trên Colab: disposable
clean dataset v2: reproducible artifact
Kaggle dataset: published artifact, không sửa tay
```

Không sửa raw zip. Mọi thay đổi phải đi qua script.

### 5.2. Cấu trúc output clean

```text
eatfitai-clean-v2/
  data.yaml
  manifest.jsonl
  class_map.yaml
  source_report.csv
  audit_summary.json
  label_issues.csv
  duplicate_report.csv
  class_distribution.csv
  train/
    images/
    labels/
  valid/
    images/
    labels/
  test/
    images/
    labels/
```

Nếu số file quá lớn cho Kaggle upload:

```text
eatfitai-clean-v2/
  data.yaml
  manifest.jsonl
  shards/
    train_000.tar
    train_001.tar
    valid_000.tar
    test_000.tar
  audit/
    ...
```

Kaggle notebook sẽ extract shard vào `/kaggle/working`.

### 5.3. Label format duy nhất

Chỉ dùng YOLO detect:

```text
class_id x_center y_center width height
```

Tất cả polygon segment phải convert sang bbox trước khi train.

Không để mixed detect/segment lọt vào dataset clean.

---

## 6. Pipeline Lọc/Gom/Chỉnh Dataset V2

### Phase 0 - Đóng băng raw

Input:

```text
/content/drive/MyDrive/EatFitAI-Training/datasets-raw/*.zip
```

Output:

```text
raw_inventory.csv
raw_file_hashes.csv
```

Việc cần làm:

- list toàn bộ zip;
- ghi file size, modified time;
- tính md5/sha256 nếu đủ thời gian;
- không extract trực tiếp vào Drive;
- không overwrite raw.

### Phase 1 - Extract vào local SSD

Workspace:

```text
/content/eatfitai_v2_work/raw_extracted
/content/eatfitai_v2_work/normalized
/content/eatfitai_v2_work/clean
```

Rule:

- mỗi source zip extract vào folder riêng;
- giữ source slug trong filename output để trace lại;
- bỏ `__MACOSX`, hidden files, non-image junk.

### Phase 2 - Source audit từng dataset

Với mỗi source:

- tìm `data.yaml`;
- tìm split `train`, `valid`, `val`, `test`;
- đếm image/label;
- kiểm tra class names;
- kiểm tra detect/segment/classification;
- kiểm tra file ảnh mở được;
- kiểm tra label parse được;
- thống kê:
  - boxes;
  - segments;
  - malformed rows;
  - duplicate rows;
  - class out of range;
  - missing label;
  - orphan label;
  - empty label;
  - image size distribution.

Source nào không đạt thì đưa vào quarantine:

```text
quarantine/source_slug/
```

Không xóa ngay.

### Phase 3 - Chuẩn hóa class

Tạo `class_taxonomy.yaml` gồm:

```yaml
keep:
  pho:
    aliases: [pho_bo, pho_ga, vietnamese_pho]
    type: dish
    priority: high
  chicken:
    aliases: [ga, thit_ga, fried_chicken]
    type: ingredient
    priority: high

drop:
  - person
  - hand
  - plate
  - bowl
  - fork
  - spoon
  - table
  - logo
  - packaging

review:
  - food
  - dish
  - vegetable
  - fruit
```

Nguyên tắc:

- class quá chung như `food`, `dish`, `vegetable`, `fruit` không nên giữ nếu mục tiêu nutrition mapping chi tiết.
- class món và nguyên liệu có thể cùng tồn tại, nhưng phải có logic rõ:
  - `com_tam` là dish;
  - `rice`, `pork`, `egg` là ingredients;
  - không ép dish thành ingredient nếu bbox trong source là cả món.
- Không split class quá mịn nếu ảnh/class ít.

Mục tiêu class:

- ưu tiên 150-300 class mạnh hơn 457 class yếu;
- mỗi class nên có tối thiểu 100 instances, tốt hơn là 300+;
- tail classes dưới 50 instances nên review/gộp/bỏ.

### Phase 4 - Convert labels

Rule:

- detect row 5 tokens giữ lại nếu valid.
- segment row `class x1 y1 x2 y2 ...` convert thành bbox.
- bbox normalize phải nằm trong `[0,1]`.
- width/height phải > 0.
- class id phải tồn tại trong mapping.
- duplicate exact row drop.
- duplicate near-identical IoU > 0.98 cùng class drop.
- bbox quá nhỏ hoặc quá lớn bất thường đưa vào warning.

Output label luôn detect-only.

### Phase 5 - Image-level dedupe

Hai cấp:

1. Exact duplicate:
   - hash bytes hoặc image decoded hash.
2. Near duplicate:
   - perceptual hash/phash nếu có thư viện phù hợp.

Rule:

- nếu ảnh duplicate cùng label: giữ một.
- nếu ảnh duplicate nhưng label khác: đưa vào conflict report.
- nếu cùng source augmentation nhưng label duplicate nặng: dedupe row trước, sau đó quyết định giữ/bỏ ảnh.

### Phase 6 - Split lại train/valid/test

Không tin split từ source nếu đã merge nhiều dataset.

Nên tạo split mới:

```text
train 85%
valid 10%
test 5%
```

Điều kiện:

- stratified theo class nếu làm được;
- không để near-duplicate rơi vào cả train và valid;
- source leakage kiểm soát bằng manifest;
- valid/test phải sạch hơn train.

### Phase 7 - Dataset balance

Không nhất thiết cân bằng tuyệt đối.

Rule:

- cap class quá lớn nếu nó lấn át, ví dụ fruit source có hàng chục nghìn bbox trùng style;
- oversample nhẹ class quan trọng ít ảnh ở training config, nhưng không nhân bản vật lý quá nhiều;
- review classes có quá nhiều duplicate labels;
- báo cáo `instances_per_class`, `images_per_class`, `source_per_class`.

### Phase 8 - Final audit gate

Dataset clean chỉ được upload Kaggle nếu pass:

```text
0 mixed segment rows
0 malformed rows
0 class out of range
0 missing labels cho ảnh có object expected
0 orphan labels
duplicate exact rows = 0
near duplicate conflicts reviewed
valid/test duplicate leakage = 0 hoặc documented
data.yaml path portable
all class ids contiguous 0..nc-1
```

Metric mục tiêu:

```text
multi-object image pct: càng cao càng tốt
multi-class image pct: nên >20% nếu muốn detect nhiều món/nguyên liệu cùng ảnh
tail class <100 instances: càng ít càng tốt
valid labels clean: bắt buộc
```

---

## 7. Upload Kaggle Dataset V2

Folder upload nên chứa:

```text
dataset-metadata.json
eatfitai_clean_v2.tar hoặc shards/
audit_summary.json
class_distribution.csv
manifest_sample.csv
README.md
```

Không nên upload:

- raw zip ban đầu;
- intermediate extracted folders;
- notebook output rác;
- checkpoint train cũ vào dataset data.

Metadata:

```json
{
  "title": "EatFitAI Food Detection Clean V2",
  "id": "hiuinhcng/eatfitai-food-detection-clean-v2",
  "licenses": [{"name": "CC0-1.0"}]
}
```

Lệnh:

```bash
kaggle datasets init -p ./eatfitai-clean-v2-kaggle
kaggle datasets create -p ./eatfitai-clean-v2-kaggle -r zip
```

Khi cập nhật:

```bash
kaggle datasets version -p ./eatfitai-clean-v2-kaggle -m "v2 clean detect-only labels, deduped, audited" -r zip
kaggle datasets status hiuinhcng/eatfitai-food-detection-clean-v2
```

---

## 8. Kaggle Training Plan Sau Khi Có Clean V2

### Smoke run

```bash
yolo detect train model=yolo11s.pt data=/kaggle/working/eatfitai_clean_v2/data.yaml imgsz=640 batch=16 device=0,1 epochs=1 fraction=0.02
```

Mục tiêu:

- test mount/extract;
- test label parse;
- test DDP;
- test OOM;
- không quan tâm mAP.

### Baseline run

```bash
yolo detect train model=yolo11s.pt data=... imgsz=640 batch=32 device=0,1 epochs=20 patience=8
```

Mục tiêu:

- phát hiện dataset còn lỗi;
- lấy per-class AP đầu tiên;
- quyết định class nào cần gộp/bổ sung.

### Full run

```bash
yolo detect train model=yolo11m.pt data=... imgsz=640 batch=32 device=0,1 epochs=150 patience=35 save_period=2
```

Mục tiêu:

- train production candidate;
- checkpoint đều;
- resume qua nhiều session.

### Optional fine-tune

```bash
yolo detect train model=best.pt data=... imgsz=768 batch=16 device=0,1 epochs=25 close_mosaic=5
```

Mục tiêu:

- tăng recall object nhỏ/nguyên liệu nhỏ.

---

## 9. Tài Liệu Cần Sinh Tự Động

Mỗi lần build dataset clean phải sinh:

```text
00_raw_inventory.csv
01_source_audit.csv
02_class_taxonomy.yaml
03_class_mapping.csv
04_label_conversion_report.csv
05_duplicate_report.csv
06_split_report.csv
07_class_distribution_train.csv
08_class_distribution_valid.csv
09_multiclass_image_report.csv
10_final_audit_summary.json
README_DATASET.md
```

`README_DATASET.md` phải ghi:

- nguồn raw nào đã dùng;
- nguồn nào bị quarantine;
- rule convert segment sang bbox;
- rule drop class;
- số ảnh trước/sau clean;
- số label trước/sau clean;
- số duplicate đã loại;
- số class cuối;
- known limitations.

---

## 10. Codex Work Plan

### Task 1 - Tạo Colab dataset builder notebook

File đề xuất:

```text
ai-provider/EatFitAI_Dataset_V2_Builder_Colab.ipynb
ai-provider/build_dataset_v2_colab.py
```

Nội dung:

- mount Drive;
- inventory zip;
- extract local;
- source audit;
- taxonomy/mapping;
- clean labels;
- split;
- final audit;
- package artifacts.

### Task 2 - Tạo taxonomy v1

File:

```text
ai-provider/dataset_taxonomy/eatfitai_food_taxonomy.yaml
```

Nội dung:

- keep/drop/review;
- alias map;
- group món/nguyên liệu;
- priority cho class nutrition quan trọng.

### Task 3 - Tạo scripts audit reusable

File:

```text
ai-provider/dataset_tools/audit_yolo_dataset.py
ai-provider/dataset_tools/clean_yolo_dataset.py
ai-provider/dataset_tools/build_manifest.py
ai-provider/dataset_tools/package_kaggle_dataset.py
```

Yêu cầu:

- chạy được ở Colab và local;
- không phụ thuộc path cứng;
- UTF-8 an toàn;
- output CSV/JSON rõ.

### Task 4 - Tạo Kaggle clean training notebook

File:

```text
ai-provider/EatFitAI_Kaggle_Training_CleanV2.ipynb
```

Yêu cầu:

- chỉ nhận clean dataset;
- không tự clean phức tạp trong Kaggle;
- chỉ extract shard, smoke, train, validate, export.

### Task 5 - Upload clean dataset v2 lên Kaggle

Điều kiện trước upload:

- final audit pass;
- `README_DATASET.md` đã sinh;
- `dataset-metadata.json` đúng;
- token Kaggle không nằm trong repo/notebook.

### Task 6 - Train baseline và đọc report

Sau baseline:

- đọc `results.csv`;
- đọc confusion matrix;
- đọc per-class AP;
- lập danh sách class yếu;
- quay lại taxonomy/data nếu cần.

---

## 11. Nguyên Tắc An Toàn Token Và Encoding

Token Kaggle từng bị lộ trong ảnh. Phải revoke/regenerate.

Không lưu:

```text
KAGGLE_API_TOKEN
kaggle.json
access_token
Google OAuth token
```

trong:

```text
repo
notebook
Drive shared folder
Markdown docs
log output
```

Encoding:

- đọc/ghi text bằng UTF-8;
- không dùng `errors="ignore"` khi file quan trọng;
- detect mojibake như `Ã`, `Ä`, `áº`, `�`;
- preserve Vietnamese labels nếu có, nhưng class machine names nên dùng lowercase underscore không dấu nếu phục vụ model/runtime.

---

## 12. Quyết Định Kỹ Thuật Đề Xuất

1. Dừng coi Kaggle dataset hiện tại là bản sạch.
2. Tạo Dataset V2 Builder trên Colab từ raw zip Drive.
3. Không train production trên dataset mixed detect/segment.
4. Gộp/bỏ class trước khi train full, không cố giữ 457 class nếu tail quá yếu.
5. Upload Kaggle chỉ sau final audit.
6. Kaggle training notebook chỉ train clean artifact, không vừa clean vừa train full.
7. Ghi mọi thống kê thành artifact để có thể phản biện và báo cáo.

---

## 13. Nguồn Tham Khảo

- Kaggle CLI repository and feature list: https://github.com/Kaggle/kaggle-api
- Kaggle CLI docs overview: https://github.com/Kaggle/kaggle-api/blob/main/docs/README.md
- Kaggle dataset commands: https://github.com/Kaggle/kaggle-api/blob/main/docs/datasets.md
- Kaggle kernel commands: https://github.com/Kaggle/kaggle-api/blob/main/docs/kernels.md
- Google Drive API files resource: https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- Google Colab FAQ về Drive mount/I/O/quota: https://research.google.com/colaboratory/faq.html
- Colab Enterprise notebook execution/schedule docs: https://cloud.google.com/colab/docs/schedule-notebook-run
- Ultralytics train docs: https://docs.ultralytics.com/modes/train/
- Ultralytics detect dataset format: https://docs.ultralytics.com/datasets/detect/

---

## 14. Post-Mortem Kaggle Notebook `train-eatfitai-l-n-1`

**Notebook URL:** `https://www.kaggle.com/code/hiuinhcng/train-eatfitai-l-n-1/edit`

**Trạng thái truy cập từ Codex:** link `/edit` yêu cầu Kaggle browser session/auth, nên Codex local không đọc trực tiếp được output từng cell qua web công khai. Muốn Codex phân tích đầy đủ từng cell trong lần sau, cần một trong các cách:

1. Export notebook `.ipynb` có output rồi đưa vào repo/Drive.
2. Dùng Kaggle CLI/API đã cấu hình token an toàn để pull notebook/output.
3. Copy log cell quan trọng vào file text.
4. Save Version trên Kaggle rồi dùng `kaggle kernels output` nếu notebook/kernel public hoặc token có quyền.

Phần dưới đây là post-mortem dựa trên log/screenshot đã quan sát trong phiên làm việc ngày 2026-05-04.

### 14.1. Cell 1 - Setup/GPU

Kết quả tốt:

```text
Ultralytics already available: 8.4.46
Python: 3.12.12
PyTorch: 2.10.0+cu128
CUDA available: True
CUDA device count: 2
GPU 0: Tesla T4 | 14.6 GiB VRAM
GPU 1: Tesla T4 | 14.6 GiB VRAM
DEVICE_ARG=0,1
BATCH_TOTAL=32
WORKERS_PER_RANK=2
```

Đánh giá:

- Kaggle accelerator `GPU T4 x2` hoạt động đúng.
- DDP có thể dùng 2 GPU.
- Sửa `pip install` là cần thiết: không upgrade `pandas`/`pillow` trong Kaggle base environment.

Rút kinh nghiệm:

- Cell setup chỉ nên cài `ultralytics` nếu thiếu.
- Không dùng `pip install -U pandas pillow` trong Kaggle vì dễ tạo conflict với `google-colab`, `cudf`, `dask-cudf`, `gradio`, `bqplot`.

### 14.2. Cell 2 - Kaggle API Metadata

Log:

```text
Warning: outdated kaggle version installed: 2.0.0
AttributeError("'KaggleApi' object has no attribute 'dataset_view'")
```

Đánh giá:

- Đây là optional cell.
- Không ảnh hưởng train.
- Nguyên nhân là Kaggle package trong runtime không có method `dataset_view`.

Rút kinh nghiệm:

- Không phụ thuộc Python method chưa ổn định của Kaggle API trong notebook train.
- Nếu cần metadata, dùng CLI fallback:

```bash
kaggle datasets metadata hiuinhcng/eatfitai-food-dataset -p /kaggle/working/kaggle_metadata
```

hoặc chỉ đọc metadata từ file đã lưu trong repo.

### 14.3. Cell 3 - Locate Dataset

Lỗi đầu tiên:

```text
FileNotFoundError: Could not locate YOLO dataset root under /kaggle/input
```

Nguyên nhân thực tế sau khi đối chiếu screenshot:

```text
eatfitai-food-dataset: Downloaded 1/13001 files: 8.4KiB/475.47MiB [0%]
```

Tức là Kaggle input dataset chưa mount/download xong khi cell chạy.

Khi dataset mount xong, log tốt:

```text
valid: images=27,141 labels=27,141
Wrote: /kaggle/working/eatfitai_raw_data.yaml
```

Và train split được thấy là:

```text
train: 405,586 images
valid: 27,141 images
```

Đánh giá:

- Dataset mount thành công sau khi chờ Kaggle tải xong.
- Quy mô dataset rất lớn: khoảng 432,727 ảnh train+valid.

Rút kinh nghiệm:

- Notebook phải có preflight chờ `/kaggle/input` sẵn sàng trước khi scan.
- Cần in tree input và số file dataset.
- Cần fail message rõ: "dataset still downloading" thay vì chỉ "not found".

Preflight nên thêm:

```python
!find /kaggle/input -maxdepth 6 -type d | head -100
!find /kaggle/input -maxdepth 8 \( -name "data.yaml" -o -name "*.tar" -o -name "*.zip" \) | head -100
```

### 14.4. Cell 4/5 - Audit Dataset

Quan sát:

```text
audit train: 0/405586
```

Đánh giá:

- Full audit trên Kaggle với 405k ảnh là rất nặng.
- Audit toàn bộ có thể mất lâu và ăn thời gian quota, nhưng vẫn có giá trị nếu chỉ chạy một lần.

Rút kinh nghiệm:

- Không nên vừa full audit vừa full train trong cùng Kaggle session nếu dataset chưa sạch.
- Dataset v2 nên audit/clean trên Colab local SSD trước.
- Kaggle training notebook chỉ nên chạy preflight nhỏ và train.
- Nếu cần audit trong Kaggle, nên có chế độ:

```python
AUDIT_MODE = "sample"  # sample | full
AUDIT_SAMPLE_IMAGES = 20000
```

### 14.5. Cell 8/9 - Training Command/DDP

Lệnh đã chạy:

```bash
yolo detect train model=yolo11m.pt data=/kaggle/working/eatfitai_detect_clean/data.yaml project=/kaggle/working/runs/food-detection name=yolo11m-eatfitai-kaggle-t4x2-full exist_ok=True imgsz=640 batch=32 device=0,1 workers=2 amp=True cache=False deterministic=False plots=True epochs=150 patience=35 save_period=2 optimizer=auto cos_lr=True warmup_epochs=3 close_mosaic=15 hsv_h=0.015 hsv_s=0.60 hsv_v=0.35 degrees=8.0 translate=0.10 scale=0.50 shear=0.0 perspective=0.0 flipud=0.0 fliplr=0.5 mosaic=1.0 mixup=0.05 copy_paste=0.0 val=True save=True
```

Log tốt:

```text
CUDA:0 (Tesla T4)
CUDA:1 (Tesla T4)
DDP: torch.distributed.run --nproc_per_node 2
Transferred 643/649 items from pretrained weights
AMP: checks passed
```

Đánh giá:

- Multi-GPU DDP đã khởi động đúng.
- Pretrained transfer 643/649 là bình thường vì head đổi từ COCO 80 class sang 457 class.
- AMP hoạt động.

Tuy nhiên log cũng cho thấy vấn đề:

```text
train: Scanning /kaggle/input/datasets/hiuinhcng/eatfitai-food-dataset/merged_dataset/train/labels...
WARNING val: Cache directory /kaggle/input/.../valid is not writable
WARNING Box and segment counts should be equal, got len(segments)=3811, len(boxes)=81001
duplicate labels removed
```

Đánh giá:

- Dù command dùng `data=/kaggle/working/eatfitai_detect_clean/data.yaml`, YOLO vẫn scan raw path trong `/kaggle/input`.
- Khả năng cao clean view chưa thật sự tách labels khỏi raw input, hoặc `data.yaml`/symlink làm YOLO resolve về source raw.
- Kết quả là vẫn gặp:
  - raw validation path;
  - cache không ghi được;
  - mixed detect/segment;
  - duplicate labels.

Rút kinh nghiệm quan trọng:

1. Không symlink nguyên split folder.
2. Không dựa vào symlink ảnh nếu chưa chứng minh YOLO không resolve về raw input.
3. `images` và `labels` nên là path thật trong clean root tạm, ưu tiên `/tmp/eatfitai_detect_clean`.
4. `/kaggle/working` chỉ nên lưu report/checkpoint/model, tránh lưu toàn bộ ảnh trung gian vào output.
5. Sau khi tạo clean dataset, phải assert:

```python
assert str(CLEAN_YAML).startswith("/tmp/eatfitai_detect_clean/")
assert "/kaggle/input" not in Path(CLEAN_YAML).read_text()
assert (Path("/tmp/eatfitai_detect_clean/train/images")).is_dir()
assert (Path("/tmp/eatfitai_detect_clean/train/labels")).is_dir()
assert not (Path("/tmp/eatfitai_detect_clean/train/images")).is_symlink()
assert not (Path("/tmp/eatfitai_detect_clean/train/labels")).is_symlink()
```

6. Trước full train, chạy:

```bash
cat /tmp/eatfitai_detect_clean/data.yaml
find /tmp/eatfitai_detect_clean/train/labels -name "*.txt" | head
find /tmp/eatfitai_detect_clean/valid/labels -name "*.txt" | head
```

7. Nếu YOLO log vẫn scan `/kaggle/input/.../labels`, dừng ngay.

### 14.6. Duplicate Label Warnings

Quan sát:

```text
val: ... 17_food_union_fruit___MG_8065_14...jpg: 26 duplicate labels removed
val: ... 17_food_union_fruit___MG_8065_16...jpg: 20 duplicate labels removed
val: ... 17_food_union_fruit___MG_8065_21...jpg: 14 duplicate labels removed
```

Đánh giá:

- Source `17_food_union_fruit.zip` có dấu hiệu duplicate labels nặng.
- Duplicate validation labels làm metric kém tin cậy.
- YOLO tự remove lúc scan, nhưng không nên để framework sửa thầm trong production train.

Rút kinh nghiệm:

- `17_food_union_fruit` phải được audit riêng.
- Cần exact duplicate row dedupe và near-duplicate bbox dedupe.
- Nếu một source có duplicate label density quá cao, đưa vào quarantine hoặc cap số ảnh/class.

### 14.7. Notebook Autosave Conflict

Popup:

```text
We're unable to save your notebook because it may have been modified in another location.
```

Đánh giá:

- Đây là conflict Kaggle draft/autosave, không liên quan YOLO.
- Có rủi ro mất sửa cell thủ công.

Rút kinh nghiệm:

- Khi popup xuất hiện, bấm Download trước khi refresh.
- Không sửa notebook cùng lúc ở nhiều tab.
- Với notebook quan trọng, sửa trong repo/local rồi import lại Kaggle, tránh chỉnh tay nhiều lần trên Kaggle UI.

### 14.8. Trạng Thái Khi Dừng

Sau khi dùng Kaggle API pull notebook output, trạng thái chính xác hơn là:

- Smoke run `epochs=1 fraction=0.01` đã chạy xong và có validation metrics.
- Full run `epochs=150` chưa có bằng chứng đã vào epoch; output dừng ở giai đoạn scan labels/duplicate warnings.
- Smoke run không chứng minh clean dataset hoạt động, vì log cho thấy Ultralytics vẫn scan image/label path từ `/kaggle/input/.../merged_dataset`.

Kết luận:

- Notebook đã khởi động DDP và smoke training chạy được.
- Smoke result chỉ là kiểm tra runtime/DDP, không phải model candidate.
- Full training không tạo model hữu ích.
- Không nên dùng output này làm production candidate.

### 14.9. Phát Hiện Thêm Sau Khi Pull Notebook Bằng Kaggle API

Kaggle API pull thành công:

```text
kaggle kernels pull hiuinhcng/train-eatfitai-l-n-1 -p <local_tmp> -m
```

Metadata:

```json
{
  "id": "hiuinhcng/train-eatfitai-l-n-1",
  "title": "train eatfitai lần 1 ",
  "is_private": true,
  "enable_gpu": true,
  "enable_internet": true,
  "dataset_sources": ["hiuinhcng/eatfitai-food-dataset"],
  "machine_shape": "NvidiaTeslaT4"
}
```

Notebook có 23 cells, trong đó các cell code đã chạy đến:

```text
Cell 3  setup/GPU
Cell 5  optional Kaggle API metadata
Cell 7  locate dataset
Cell 9  raw dataset audit
Cell 11 quality decision
Cell 13 build clean detect-only view
Cell 15 verify clean dataset view
Cell 17 smoke train
Cell 19 full train started but no epoch completed
```

Raw audit exact numbers:

```text
train images: 405,586
valid images: 27,141
classes: 457

train box_rows: 1,371,231
train segment_rows: 22,444
train duplicate_label_files: 6,971
train duplicate_lines: 29,468
train multi_object_image_pct: 48.91
train multi_class_image_pct: 23.46

valid box_rows: 86,393
valid segment_rows: 3,634
valid duplicate_label_files: 2,590
valid duplicate_lines: 9,026
valid multi_object_image_pct: 43.73
valid multi_class_image_pct: 16.73
valid class_instances_nonzero: 429
valid class_instances_zero: 28
```

Class distribution risk:

```text
Classes with <100 train instances: 41
Classes with <300 train instances: 228
Classes with 0 train instances: 0
```

Nhận định:

- Dataset có khả năng học multi-object vì train multi-object gần 49%.
- Train multi-class 23.46% là chấp nhận được để bắt đầu, nhưng valid multi-class chỉ 16.73%, chưa lý tưởng cho đánh giá ảnh nhiều món/nguyên liệu.
- 228/457 class dưới 300 instances là rủi ro lớn cho tail-class AP.
- Valid thiếu 28 class, nên metric valid không phản ánh toàn bộ 457 class.

Clean conversion output:

```text
box_kept: 1,419,130
segment_kept: 26,078
duplicate_dropped: 38,494
written_objects: 1,445,208
empty_written: 0
```

Nhưng verify clean dataset view báo lỗi nghiêm trọng:

```text
clean train box_rows: 0
clean train segment_rows: 0
clean train malformed_rows: 405,586
clean train class_instances_nonzero: 0
```

Root cause cụ thể:

- Cell clean label writer đã ghi literal `\n` vào label file thay vì newline thật.
- Ví dụ một dòng label clean bị đọc thành một dòng chứa cả chuỗi `\n`:

```text
353 0.363595 0.490833 0.592832 0.195725\n353 0.753987 ...
```

Do đó parser báo `non_numeric` vì token chứa ký tự `\n353`.

Fix đúng trong notebook/script:

```python
dst_label.write_text("\n".join(out_lines) + ("\n" if out_lines else ""), encoding="utf-8")
```

Không được dùng:

```python
dst_label.write_text("\\n".join(out_lines) + ("\\n" if out_lines else ""), encoding="utf-8")
```

Local notebook `ai-provider/EatFitAI_Kaggle_Training.ipynb` đã được sửa lỗi newline writer sau phát hiện này.

Vấn đề còn lại sau khi sửa newline:

- Clean labels có thể đúng, nhưng nếu image folder là symlink đến `/kaggle/input`, Ultralytics có thể resolve path về raw input và tự tìm raw labels bằng rule `images -> labels`.
- Đây là lý do smoke/full logs vẫn scan `/kaggle/input/.../merged_dataset`.

Decision mới:

- Dataset clean training đáng tin cậy không nên dựa vào symlink folder.
- Clean artifact v2 nên chứa ảnh + label thật sau khi package/extract, hoặc một cơ chế chắc chắn khiến Ultralytics nhận image paths trong clean root.
- Với Kaggle disk tạm, có thể copy/extract clean dataset vào `/tmp` hoặc `/kaggle/working` để train, nhưng không save toàn bộ ảnh vào output.

---

## 15. Google Drive Raw Inventory - `datasets-raw`

Drive folder tìm được qua Google Drive connector:

```text
Title: datasets-raw
URL: https://drive.google.com/drive/folders/1Kf4pHiUlrYW__y4_rL3n8PBoLjPZzNYw
Viewed by current user: 2026-05-04
```

Số file connector liệt kê được: **23 zip files**.

Danh sách hiện tại:

| # | File | Nhận xét sơ bộ |
|---:|---|---|
| 1 | `VietFood67.ZIP` | Source món Việt lớn, cần kiểm tra format annotation. |
| 2 | `Food-Detection-bobotnhan.v7i.yolov11.zip` | Roboflow YOLOv11 export, domain food/VN. |
| 3 | `Food.v6i.yolov11.zip` | Tên quá chung, cần audit class taxonomy. |
| 4 | `Food_AI_Tong_Hop.v1-banh_mi.yolov11.zip` | Có vẻ source tăng class bánh mì. |
| 5 | `Banh dan gian mien Tay.v5i.yolov11.zip` | Bánh dân gian miền Tây, domain tốt. |
| 6 | `banh-dan-gian-nb.v1i.yolov11.zip` | Bánh dân gian, domain tốt. |
| 7 | `canteen_menu.v4i.yolov11.zip` | Bữa ăn/canteen, gần use case thực tế. |
| 8 | `Food.v3i.yolov11.zip` | Tên quá chung, cần phân biệt với `Food.v6i`. |
| 9 | `Food Items.v11i.yolov11.zip` | Nhiều món/nguyên liệu, cần audit class overlap. |
| 10 | `RawData.v12i.yolov11.zip` | Source miền Tây/Việt, cần kiểm tra duplicate/class. |
| 11 | `vietnamese-food-calories.v1i.yolov11.zip` | Domain tốt cho nutrition mapping. |
| 12 | `17_food_union_fruit.zip` | Đã thấy duplicate labels nhiều trong valid; cần audit/quarantine trước. |
| 13 | `16_food_detection_xt7yz.zip` | General food detection. |
| 14 | `15_npg_project.zip` | Ingredient mixed, cần drop packaging/object nếu có. |
| 15 | `12_thai_food.zip` | Asian food gần domain VN, cần cherry-pick/gom class. |
| 16 | `10_food_detection_64.zip` | General food 64 class. |
| 17 | `11_food_detection_3.zip` | General food/vegetable, cần audit. |
| 18 | `07_uecfood256.zip` | Source lớn nhiều món châu Á, chỉ nên cherry-pick/gom class. |
| 19 | `06_fish.zip` | Source fish chuyên biệt. |
| 20 | `05_vegetable_detection.zip` | Vegetable source. |
| 21 | `04_food_kcmrd.zip` | Food/ingredient mixed. |
| 22 | `03_vietnamese_food_5.zip` | Vietnamese food nhỏ, domain tốt. |
| 23 | `01_food_data_vn.zip.zip` | Tên `.zip.zip`, cần kiểm tra double-pack hoặc naming artifact. |

Nhận xét:

- Raw collection có nền tốt cho food/ingredient VN và Asian food.
- Nhiều source là Roboflow YOLOv11 export, nhưng vẫn phải audit task type vì YOLOv11 export có thể là detect hoặc segment tùy project.
- Có nhiều source tên chung (`Food.v3`, `Food.v6`, `Food Items`) nên nguy cơ class overlap/conflict cao.
- `17_food_union_fruit.zip` phải được xem là source rủi ro vì log đã chứng minh duplicate labels.
- `01_food_data_vn.zip.zip` cần kiểm tra có bị nén lồng hoặc lỗi tên.

Không thể kiểm tra nội dung zip sâu qua Drive connector mà không download raw bytes. Việc đọc bên trong zip nên làm trong Colab bằng local SSD.

---

## 16. Action Plan Sau Khi Dừng Notebook Kaggle

### 16.1. Không tiếp tục train từ Kaggle dataset hiện tại

Lý do:

- Dataset hiện tại đã có duplicate labels.
- Mixed detect/segment vẫn lọt vào train/valid.
- Clean view chưa được dùng đúng.
- Chưa có epoch/model hữu ích.

### 16.2. Tạo Colab Dataset V2 Builder

Notebook mới nên chạy trên Colab:

```text
EatFitAI_Dataset_V2_Builder_Colab.ipynb
```

Cell đề xuất:

1. Mount Drive.
2. Inventory raw zip.
3. Extract zip vào `/content/eatfitai_v2_work/raw_extracted`.
4. Audit từng source.
5. Sinh source report.
6. Build taxonomy/alias/drop map.
7. Convert all labels to detect-only.
8. Dedupe exact labels.
9. Dedupe near-identical boxes.
10. Verify images.
11. Split lại train/valid/test.
12. Final audit.
13. Package clean dataset.
14. Copy artifact clean về Drive.
15. Optional upload Kaggle clean v2 bằng Kaggle CLI.

### 16.3. Ưu tiên audit source rủi ro

Thứ tự nên audit trước:

1. `17_food_union_fruit.zip` - vì đã thấy duplicate labels.
2. `07_uecfood256.zip` - source lớn, nhiều class, dễ gây imbalance.
3. `Food.v3i.yolov11.zip`, `Food.v6i.yolov11.zip`, `Food Items.v11i.yolov11.zip` - tên chung, dễ conflict taxonomy.
4. `VietFood67.ZIP` - cần xác nhận có bbox hay chỉ classification.
5. Nhóm Vietnamese domain nhỏ: `03_vietnamese_food_5`, `vietnamese-food-calories`, `RawData`, `canteen_menu`, các source bánh.

### 16.4. Tạo Kaggle Training Notebook Clean-Only

Notebook Kaggle v2 không nên làm clean phức tạp nữa.

Nó chỉ nên:

1. Add clean Kaggle dataset v2.
2. Extract shard nếu cần.
3. Preflight:
   - check `data.yaml`;
   - check label path không trỏ `/kaggle/input` nếu cần cache/write;
   - sample parse labels;
   - smoke train 1 epoch.
4. Full train.
5. Save/checkpoint/export.

### 16.5. Điều kiện mới để chạy full train

Chỉ full train khi:

```text
mixed segment rows = 0
duplicate exact labels = 0
class out of range = 0
malformed rows = 0
valid/test clean
data.yaml path đúng
train logs scan /kaggle/working hoặc clean extracted dataset
smoke train pass
```

Nếu không đạt, quay lại builder Colab.

### 16.6. Cập Nhật Notebook Local Sau Khi Rút Kinh Nghiệm Từ Kaggle Run

Sau khi pull output notebook Kaggle bằng API, notebook local:

```text
ai-provider/EatFitAI_Kaggle_Training.ipynb
```

đã được chỉnh thêm để tránh lặp lại lỗi ở lần chạy đầu:

- `CLEAN_DIR` chuyển sang `/tmp/eatfitai_detect_clean`.
- Không dùng symlink nguyên folder ảnh nữa.
- Ảnh được hardlink nếu filesystem cho phép, nếu không thì copy thật bằng `shutil.copy2`.
- Label detect-only được ghi trong cùng clean root.
- Dòng ghi label dùng newline thật:

```python
dst_label.write_text("\n".join(out_lines) + ("\n" if out_lines else ""), encoding="utf-8")
```

Mục tiêu của thay đổi này:

- YOLO phải suy ra label path từ `/tmp/eatfitai_detect_clean/.../images` sang `/tmp/eatfitai_detect_clean/.../labels`.
- Tránh trường hợp Ultralytics resolve symlink về `/kaggle/input` rồi đọc nhầm raw labels.
- Cache/label scan nằm ở vùng writable, giảm cảnh báo `cache not saved`.
- Smoke train trở thành kiểm tra thật của clean dataset, không phải kiểm tra nhầm raw dataset.

Khi chạy lại trên Kaggle, bắt buộc nhìn log smoke train:

```text
train: Scanning /tmp/eatfitai_detect_clean/train/labels...
val: Scanning /tmp/eatfitai_detect_clean/valid/labels...
```

Nếu log vẫn là:

```text
train: Scanning /kaggle/input/.../labels...
```

thì dừng full train ngay, vì notebook vẫn chưa train trên dataset đã làm sạch.

Tradeoff:

- Copy/hardlink ảnh vào `/tmp` tốn thời gian hơn symlink.
- Nhưng đây là chi phí đáng trả để đảm bảo train dùng đúng label sạch.
- Không đặt full clean dataset trong `/kaggle/working` vì output quota Kaggle chỉ nên dùng cho report/checkpoint/model, không nên lưu lại toàn bộ ảnh trung gian.

Điểm cần theo dõi:

- Disk session Kaggle phải còn đủ chỗ trong `/tmp`.
- Nếu dataset v2 sau này lớn hơn nhiều, nên đóng gói thành tar shards sạch rồi extract theo shard hoặc dùng clean Kaggle dataset đã chứa sẵn cấu trúc ảnh + label đúng.
- Nếu hardlink thành công, tốc độ build clean rất nhanh; nếu fallback copy, cần chấp nhận vài phút đến hơn 10 phút tùy kích thước thật của ảnh.
