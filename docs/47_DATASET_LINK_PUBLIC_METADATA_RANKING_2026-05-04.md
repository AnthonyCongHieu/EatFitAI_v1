# Dataset Link Public Metadata Ranking - 2026-05-04

## 0. Kết Luận

Đây là bản đánh giá **từng link dataset theo thông tin public**: task type, số ảnh, số class, class names, license, độ khớp với mục tiêu EatFitAI.

Mục tiêu đánh giá:

- Train YOLO11 tốt hơn model YOLOv8/current `best.pt`.
- Nhận diện trong một ảnh:
  - món ăn;
  - nguyên liệu;
  - gia vị.
- Ưu tiên món/nguyên liệu/gia vị Việt Nam.

Quan trọng: đây là **public metadata audit**, không phải raw bbox audit. Vì vậy bảng này đủ để quyết định **nguồn nào đáng tải/audit tiếp**, nhưng chưa đủ để nói bbox của nguồn đã sạch.

## 1. Cách Chấm Điểm

Tổng điểm 100:

| Tiêu chí | Điểm | Ý nghĩa |
|---|---:|---|
| Task phù hợp YOLO detect | 25 | Object Detection được ưu tiên; segmentation/classification bị trừ |
| Độ khớp Việt Nam | 25 | Món Việt/cơm Việt/nguyên liệu Việt được ưu tiên |
| Độ khớp món + nguyên liệu + gia vị | 20 | Có class ingredient/spice hữu ích |
| Quy mô/class balance public | 15 | Không quá nhỏ, không quá phình class |
| Red flags public | 15 | Trừ nếu class numeric, `objects`, `Food`, class rác, license hạn chế, quá general |

Quyết định:

| Điểm | Nhóm |
|---:|---|
| 85-100 | S-tier: ưu tiên tải/audit đầu tiên |
| 75-84 | A-tier: nguồn tốt, cần raw audit |
| 60-74 | B-tier: dùng có điều kiện/cherry-pick |
| 40-59 | C-tier: chỉ dùng nếu thiếu class hoặc convert được |
| 0-39 | D-tier: không nên dùng cho V2 production |

## 2. Top Sources Nên Ưu Tiên

| Rank | Source | Score | Verdict | Vì sao |
|---:|---|---:|---|---|
| 1 | Food Data / TruongVo | 92 | S-tier | Object Detection, 8,205 ảnh, 31 class món Việt rất sát domain |
| 2 | Food-kcmrd | 90 | S-tier | 4,209 ảnh, 78 class nguyên liệu Việt/Á như cá, tôm, rau, tỏi, gừng, sả, nghệ, đậu hũ |
| 3 | FOOD-INGREDIENTS dataset | 88 | S-tier | 4.2k ảnh public, 120 class ingredient/spice, có garlic/ginger/chili/coriander/mint/oil |
| 4 | Food Items / FoodRecognitionPreThesis | 86 | S-tier | 1,356 ảnh, 52 class cơm/canh/món nhà Việt, rất khớp app |
| 5 | Vegetable Object Detection ybszt | 84 | A-tier | 3,222 ảnh, 22 class rau/củ/gia vị như coriander, green chilli, spring onion |
| 6 | Vietnamese Food / FoodAITongHop | 82 | A-tier | 1,000 ảnh, 5 món Việt core; nhỏ nhưng taxonomy sạch |
| 7 | DETECTION_15_VIETNAMESE_FOOD | 82 | A-tier | Khoảng 2.9k ảnh, 15 món Việt/Việt hóa, domain tốt |
| 8 | VietFood67 Kaggle | 80 | A-tier | Rất sát món Việt, nhưng public page Kaggle không trả đủ metadata qua web; cần license/raw check |
| 9 | canteen_menu | 80 | A-tier | Theo repo: 3,369 ảnh, 9 class bữa ăn Việt/canteen; cần xác minh public/raw |
| 10 | Food-Detection-bobotnhan | 78 | A-tier | Theo repo: 4,836 ảnh, 35 class món/nguyên liệu Việt; cần public/raw verify thêm |

## 3. Bảng Đánh Giá 49 Link Trong Repo

| # | Dataset link | Evidence | Public info chính | Score | Verdict | Ghi chú |
|---:|---|---|---|---:|---|---|
| 1 | https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68 | Repo + Kaggle page limited | Repo ghi ~33K ảnh / 68 class, món Việt | 80 | A-tier | Rất đáng giữ, nhưng cần kiểm tra license và annotation thật |
| 2 | https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp | Public verified | Object Detection, 8,205 images, 31 classes, CC BY 4.0 | 92 | S-tier | Nguồn món Việt mạnh nhất theo public metadata |
| 3 | https://universe.roboflow.com/aiapplication/detection_15_vietnamese_food | Public search verified | Object Detection, ~2.9k images, 15 classes, CC BY 4.0 | 82 | A-tier | Có thể URL canonical thay đổi sang workspace khác, nhưng source public có thật |
| 4 | https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo | Public verified | Object Detection, 1,000 images, 5 classes, CC BY 4.0 | 82 | A-tier | Ít class nhưng class rất sạch: bánh mì, bột chiên, bún, gỏi cuốn, phở |
| 5 | https://universe.roboflow.com/toby-b9kw2/vietnamese-food-calories-suwt6 | Public verified | Object Detection, 947 images, 33 classes, CC BY 4.0 | 68 | B-tier | Có class numeric `0`, `25`; cần relabel/map trước khi dùng |
| 6 | https://universe.roboflow.com/my-khanh-nguyen-tjmam/rawdata-8vvya | Repo only | Repo ghi 3,019 images / 50 classes, món miền Tây | 73 | B-tier | Tiềm năng cao nhưng chưa xác minh public page trong lần này |
| 7 | https://universe.roboflow.com/prethesis-avz0w/food-4otph | Repo only | Repo ghi 8,738 images / 68 classes | 55 | C-tier | Repo ghi có class nhiễu như `Con_nguoi`, `Hamburger`, `Salad` |
| 8 | https://universe.roboflow.com/foodrecognitionprethesis/food-items-j9iud | Public verified | Object Detection, 1,356 images, 52 classes, CC BY 4.0 | 86 | S-tier | Cơm/canh/đậu hũ/gà kho/canh chua, rất sát app |
| 9 | https://universe.roboflow.com/nhanbeo/canteen_menu | Repo only | Repo ghi 3,369 images / 9 classes | 80 | A-tier | Cần xác minh public/raw, nhưng domain canteen Việt rất tốt |
| 10 | https://universe.roboflow.com/khoa-fbrvv/food-jfsxy | Public search verified | Object Detection, 997 images, nhóm bánh Việt | 76 | A-tier | Tốt cho bánh Việt, hơi nhỏ |
| 11 | https://universe.roboflow.com/nhtdanh/banh-dan-gian-nb | Public search verified | Object Detection, 882 images, 20 classes bánh dân gian | 74 | B-tier | Rất đúng domain nhưng ít ảnh |
| 12 | https://universe.roboflow.com/fruitnetyolov8/banh-dan-gian-mien-tay | Repo only | Repo ghi 462 images / 12 classes | 64 | B-tier | Chỉ dùng để vá class bánh hiếm nếu bbox tốt |
| 13 | https://universe.roboflow.com/fooddetection-3q4jo/food-detection-bobotnhan | Repo only | Repo ghi 4,836 images / 35 classes | 78 | A-tier | Đáng audit sớm; public open trực tiếp chưa lấy được trong lần này |
| 14 | https://universe.roboflow.com/foodaitonghop/food_ai_tong_hop | Public search verified | Object Detection, 1.93k images, 6 classes | 74 | B-tier | Tăng ảnh cho món Việt core; trùng class với source #4 nên cần dedupe |
| 15 | https://universe.roboflow.com/baimint/thai-food-project | Public search verified | Object Detection, 3.8k images, 21 classes Thai food | 63 | B-tier | Gần domain châu Á, không thuần Việt; cherry-pick class gần Việt |
| 16 | https://universe.roboflow.com/japon-gi1n7/uecfood256 | Public verified | Object Detection, 29,364 images, 253 classes, CC BY 4.0 | 58 | C-tier | Rất lớn nhưng class quá rộng; chỉ cherry-pick |
| 17 | https://universe.roboflow.com/food-aozvm/food-detection-project | Public verified | Object Detection, 9,026 images, 64 classes, CC BY 4.0 | 66 | B-tier | Có nhiều class phổ thông, nhưng có candy/snack/generic category |
| 18 | https://universe.roboflow.com/gp-final/food-detection-3 | Public search + Kaggle log | Search thấy ~9.64k images; Kaggle log duplicate rất nặng | 42 | C-tier | Không dùng full; prefix `11_food_detection_3` có duplicate labels cực cao trong Kaggle log |
| 19 | https://universe.roboflow.com/helo-helo/food-kcmrd | Public verified | Object Detection, 4,209 images, 78 classes, CC BY 4.0 | 90 | S-tier | Nguồn ingredient Việt/Á rất mạnh: tỏi, gừng, sả, nghệ, đậu hũ, rau |
| 20 | https://universe.roboflow.com/science-fair-48u9f/food-detection-xt7yz | Repo only | Repo ghi 6,435 images / 51 classes | 62 | B-tier | Có thể dùng nếu raw class sạch |
| 21 | https://universe.roboflow.com/semproject-5w89z/food-detection-tyd55 | Repo only | Repo ghi 3,376 images / 38 classes | 58 | C-tier | Không nằm rõ trong top source; cần exact public metadata |
| 22 | https://universe.roboflow.com/detection-lnetp/food-detection-lhp8d | Public verified | Object Detection, 1,754 images, 27 classes, CC BY 4.0 | 52 | C-tier | Có ingredient tốt nhưng class `Food`, `en` là red flag |
| 23 | https://universe.roboflow.com/food-recipe-ingredient-images/food-ingredients-dataset | Public verified via canonical/search | Object Detection, 4.2k images, 120 classes, CC BY 4.0 | 88 | S-tier | Nguồn ingredient/spice quan trọng, cần map class theo Việt Nam |
| 24 | https://universe.roboflow.com/viet-hoang-food/food-ingredient-detection-mnc5n | Repo only | Repo ghi 1,182 images / 80 classes | 70 | B-tier | Có vẻ sát ingredient Việt, nhưng cần public/raw xác minh |
| 25 | https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt | Public verified | Object Detection, 3,222 images, 22 classes | 84 | A-tier | Rau/củ/gia vị tốt: coriander, green chilli, spring onion |
| 26 | https://universe.roboflow.com/kittisak-tkerk/vegetable-6d6cy | Public verified | Object Detection, 1,488 images, 16 classes, CC BY 4.0 | 64 | B-tier | Có garlic/chili/coriander nhưng lẫn chicken/pork và typo `tomoato` |
| 27 | https://universe.roboflow.com/food-images/food-detection-union-rhdem | Public verified + Kaggle log | Object Detection, 51,343 images, 12 classes, CC BY 4.0 | 38 | D-tier for full merge | Có `objects`, `picanha`; Kaggle log prefix này duplicate rất nặng |
| 28 | https://universe.roboflow.com/scan-detection/food-detection-hipfv | Public verified | Object Detection, 3,810 images, 5 classes | 60 | B-tier | Ít class fruit/vegetable; supplement only |
| 29 | https://universe.roboflow.com/bro-bro-bro/food-detector-vckr8 | Public verified | Object Detection, 1,031 images, 18 fruit classes, CC BY 4.0 | 62 | B-tier | Bổ sung fruit, không giúp món Việt nhiều |
| 30 | https://www.kaggle.com/datasets/itsmeaman03/fruit-detection-yolo | Repo/Kaggle limited | Repo ghi YOLO fruit detection | 55 | C-tier | Cần Kaggle metadata/auth hoặc page readable; không ưu tiên nếu đã có fruit sources |
| 31 | https://www.kaggle.com/datasets/ayyuce/vegetables | Repo/Kaggle limited | Repo ghi object detection vegetable | 55 | C-tier | Cần metadata/license/raw; không đủ public evidence trong lần này |
| 32 | https://universe.roboflow.com/food-becxj/complete-food | Public verified | Object Detection, 46,735 images, 214 classes, CC BY 4.0 | 50 | C-tier | Quá rộng, class duplicate/case inconsistency; chỉ cherry-pick |
| 33 | https://universe.roboflow.com/caretech-v2/v2-caretech-combined-dataset | Public verified | Object Detection, 29,278 images, 258 classes, CC BY 4.0 | 52 | C-tier | Quá nhiều class, không thuần Việt; cherry-pick Asian classes |
| 34 | https://universe.roboflow.com/qsc/npg_project | Repo only | Repo ghi 8,828 images / 101 classes | 54 | C-tier | Ingredient mixed, nhưng repo cảnh báo bottle/bag/water |
| 35 | https://universe.roboflow.com/new-workspace/yolov5-food-image | Public search + repo | Search/repo cho thấy class rác/numeric/fork/knife/spoon; repo ghi 10k / 498 classes | 24 | D-tier | Không dùng full, rất dễ làm bẩn taxonomy |
| 36 | https://www.kaggle.com/datasets/fontainenathan/foodseg103 | Public via DatasetNinja | FoodSeg103 là segmentation, không phải detect trực tiếp | 45 | C-tier convert-only | Chỉ dùng nếu convert mask/segment sang bbox |
| 37 | https://datasetninja.com/food-seg-103 | Public verified | 7,118 images, 103 classes, semantic segmentation, Apache 2.0 | 48 | C-tier metadata/convert-only | Tốt cho ingredient mask, không dùng trực tiếp YOLO detect |
| 38 | https://mm.cs.uec.ac.jp/uecfoodpix/ | Official verified | 9,000 train + 1,000 test, segmentation masks, 103 classes, non-commercial research only | 36 | D-tier for production detect | License non-commercial và segmentation |
| 39 | https://github.com/google-research-datasets/Nutrition5k | Official verified | ~5,006 plates, ingredient/nutrition metadata, videos/RGB-D, 181.4GB | 40 | Nutrition-only | Rất tốt cho nutrition mapping, không phải bbox detect source |
| 40 | https://www.kaggle.com/datasets/siddhantrout/nutrition5k-dataset | Repo/Kaggle limited | Nutrition5k mirror | 35 | Nutrition-only | Không dùng train YOLO detect trực tiếp |
| 41 | https://universe.roboflow.com/meatproject/meat-project-n41vj | Repo only | Repo ghi meat project | 55 | C-tier | Có thể bổ sung meat nhưng thiếu public metadata chi tiết trong lần này |
| 42 | https://universe.roboflow.com/project-3rfep/fish-aephx | Repo/search weak | Search không xác nhận đúng exact project; chỉ thấy nhiều fish OD sources khác | 45 | C-tier | Cần exact public/raw check trước khi dùng |
| 43 | https://www.kaggle.com/datasets/josephvettom/food-image-dataset | Repo/Kaggle limited | Repo ghi Indian YOLO/general food | 42 | C-tier | Có thể hữu ích general food, nhưng không thuần Việt và chưa xác minh |
| 44 | https://universe.roboflow.com/test-kuvbw/thai-food-detection-xvc0m | Public search verified | Object Detection, classes chỉ là `0..9`, CC BY 4.0 | 18 | D-tier | Class numeric, không dùng nếu chưa có mapping |
| 45 | https://www.kaggle.com/datasets/abrars2/fruit-quality-classificaltion-and-detection | Repo/Kaggle limited | Tên source có classification/detection mixed | 30 | D-tier/Hold | Không ưu tiên cho YOLO detect production |
| 46 | https://universe.roboflow.com/duy2902/vietnamfood-w3i0a | Public search verified | VietNamfood, 320 images, có class generic `food` | 44 | C-tier | Việt Nam nhưng quá nhỏ và generic |
| 47 | https://universe.roboflow.com/new-workspace-bfa6s/phanloai-pybzl | Public search verified | `phanloai`, khoảng 250 images, có class `food` | 25 | D-tier | Tên/metadata gợi ý phân loại/generic, không phù hợp V2 |
| 48 | https://universe.roboflow.com/nhandangmonan/banh-nhan-gian | Public search verified | 109 images, class có `\\` lỗi | 15 | D-tier | Quá nhỏ và label lỗi |
| 49 | https://universe.roboflow.com/truktruong/ver6-hyapb | Public search verified | ver2/ver6 family, nhiều class, có `food` generic; repo ghi 200 classes | 35 | D-tier/Hold | Cần relabel mạnh nếu muốn dùng |

## 4. Nhóm Nên Dùng Theo Mục Tiêu EatFitAI

### 4.1 Món Việt / Cơm Việt

Ưu tiên:

```text
Food Data / TruongVo
Food Items / FoodRecognitionPreThesis
Vietnamese Food / FoodAITongHop
DETECTION_15_VIETNAMESE_FOOD
VietFood67
canteen_menu
Food / Khoa
banh-dan-gian-nb
Food-Detection-bobotnhan
```

Không ưu tiên:

```text
Banh Nhan Gian
phanloai-pybzl
ver6-hyapb
```

Lý do: quá nhỏ, label lỗi, generic `food`, hoặc class taxonomy không sạch.

### 4.2 Nguyên Liệu / Gia Vị

Ưu tiên:

```text
Food-kcmrd
FOOD-INGREDIENTS dataset
Vegetable Object Detection ybszt
Food Ingredient Detection VN
Vegetable 6d6cy
```

Điểm cần chú ý:

- `Food-kcmrd` cực hợp nguyên liệu Việt/Á.
- `FOOD-INGREDIENTS` mạnh nhưng có nhiều class Nepal/Ấn, cần map/cắt.
- `Vegetable 6d6cy` có chicken/pork trong vegetable và typo `tomoato`, cần clean.

### 4.3 Nguồn General Chỉ Cherry-Pick

```text
UECFOOD256
Complete Food
V2 CareTech
Food Detection Project 64
NPG Project
Thai-Food-Project
Food detector fruit vckr8
food detection hipfv
```

Không merge nguyên bộ vì dễ làm taxonomy phình và làm model kém ổn định theo class Việt.

## 5. Ranking Tổng Hợp

### S-tier

| Source | Score |
|---|---:|
| Food Data / TruongVo | 92 |
| Food-kcmrd | 90 |
| FOOD-INGREDIENTS dataset | 88 |
| Food Items / FoodRecognitionPreThesis | 86 |

### A-tier

| Source | Score |
|---|---:|
| Vegetable Object Detection ybszt | 84 |
| Vietnamese Food / FoodAITongHop | 82 |
| DETECTION_15_VIETNAMESE_FOOD | 82 |
| VietFood67 | 80 |
| canteen_menu | 80 |
| Food-Detection-bobotnhan | 78 |
| Food / Khoa | 76 |

### B-tier

| Source | Score |
|---|---:|
| banh-dan-gian-nb | 74 |
| Food_AI_Tong_Hop | 74 |
| RawData / My Khanh Nguyen | 73 |
| Food Ingredient Detection VN | 70 |
| vietnamese-food-calories | 68 |
| Food Detection Project 64 | 66 |
| Bánh dân gian miền Tây | 64 |
| Vegetable 6d6cy | 64 |
| Thai-Food-Project | 63 |
| Food detector fruit vckr8 | 62 |
| Food detection xt7yz | 62 |
| food detection hipfv | 60 |

### C-tier

| Source | Score |
|---|---:|
| UECFOOD256 | 58 |
| Food detection tyd55 | 58 |
| Food - Prethesis | 55 |
| Fruit Detection YOLO Kaggle | 55 |
| Vegetables Kaggle | 55 |
| Meat project | 55 |
| NPG Project | 54 |
| Food Detection lhp8d | 52 |
| V2 CareTech | 52 |
| Complete Food | 50 |
| FoodSeg103 DatasetNinja | 48 |
| FoodSeg103 Kaggle | 45 |
| Fish project | 45 |
| Vietnamfood Duy2902 | 44 |
| Food detection 3 | 42 |
| Indian Food Dataset Kaggle | 42 |
| Nutrition5k official | 40 |

### D-tier / Không Khuyến Nghị Cho V2

| Source | Score |
|---|---:|
| Food Detection Union | 38 |
| UECFoodPix official | 36 |
| Nutrition5k Kaggle mirror | 35 |
| ver6-hyapb | 35 |
| Fruit Quality Classification/Detection | 30 |
| phanloai-pybzl | 25 |
| YOLOv5 Food Image | 24 |
| Thai Food Detection xvc0m | 18 |
| Banh Nhan Gian | 15 |

## 6. Những Red Flags Public Quan Trọng

| Red flag | Source |
|---|---|
| Numeric classes | `vietnamese-food-calories`, `Thai Food Detection xvc0m`, nhiều nguồn search quanh YOLOv5 Food Image |
| Generic `Food` class | `Food Detection lhp8d`, `Vietnamfood Duy2902`, `phanloai-pybzl`, `ver6-hyapb` |
| Class lỗi `\\` | `Banh Nhan Gian` |
| `objects`, `picanha` trong fruit dataset | `Food Detection Union` |
| Quá nhiều class | `UECFOOD256`, `V2 CareTech`, `Complete Food`, `YOLOv5 Food Image` |
| Segmentation/non-detect | `FoodSeg103`, `UECFoodPix`, `Nutrition5k` |
| License hạn chế commercial | `UECFoodPix` non-commercial research only |

## 7. Kết Luận Chọn 22 Link

Nếu cần chốt lại khoảng 22 link đáng đi tiếp sang bước raw audit, tôi chọn:

```text
1. Food Data / TruongVo
2. VietFood67
3. DETECTION_15_VIETNAMESE_FOOD
4. Vietnamese Food / FoodAITongHop
5. Food Items / FoodRecognitionPreThesis
6. canteen_menu
7. Food / Khoa
8. banh-dan-gian-nb
9. Food-Detection-bobotnhan
10. Food_AI_Tong_Hop
11. RawData / My Khanh Nguyen
12. vietnamese-food-calories
13. Food-kcmrd
14. FOOD-INGREDIENTS dataset
15. Food Ingredient Detection VN
16. Vegetable Object Detection ybszt
17. Vegetable 6d6cy
18. Bánh dân gian miền Tây
19. Thai-Food-Project
20. Food Detection Project 64
21. UECFOOD256
22. Complete Food
```

Nhưng trong 22 link này:

- `UECFOOD256`, `Complete Food`, `Thai-Food-Project`, `Food Detection Project 64` chỉ nên cherry-pick.
- `vietnamese-food-calories` phải sửa numeric classes.
- `Vegetable 6d6cy` phải sửa typo/class lẫn.
- `RawData`, `canteen_menu`, `Food-Detection-bobotnhan`, `Food Ingredient Detection VN` cần public/raw xác minh sâu hơn vì lần này không lấy đủ public page exact.

Tôi loại khỏi 22 production-first:

```text
Food Detection Union
Food detection 3
YOLOv5 Food Image
Thai Food Detection xvc0m
Banh Nhan Gian
phanloai-pybzl
ver6-hyapb
Nutrition5k direct detect
UECFoodPix direct detect
FoodSeg103 direct detect
```

## 8. Drive Zip Inventory Và Bằng Chứng Sau Khi Gom Lên Kaggle

Kết nối Google Drive đã xác nhận folder:

```text
Drive của tôi / EatFitAI-Training / datasets-raw
```

Trong folder này hiện có **23 file zip**, không phải 22. Đây là các file dataset đã tải về và là nguồn hợp thành dataset Kaggle đã chạy train/audit. Vì vậy đánh giá dưới đây kết hợp hai lớp:

- **Public metadata**: link/source public ở các phần trên.
- **Actual Kaggle merged evidence**: dấu vết sau khi các zip đã được gom vào `/kaggle/input/datasets/hiuinhcng/eatfitai-food-dataset/merged_dataset`.

Giới hạn kỹ thuật của lần kiểm tra này: Google Drive connector liệt kê được file zip nhưng không tải raw zip bytes trực tiếp qua `_fetch` vì MIME zip bị trả lỗi `No supported mimetype`. Do đó phần "thực tế" ở bảng này dựa trên **inventory thật trong Drive + log/audit thật từ notebook Kaggle đã chạy**, chưa phải byte-level unzip audit từng file zip gốc. Những dòng ghi "chưa thấy duplicate log" không có nghĩa là zip sạch tuyệt đối; nó chỉ có nghĩa là notebook đã lưu không ghi duplicate warning cho prefix đó.

### 8.1. Inventory 23 Zip Trong Drive

| # | Zip trong Drive | Map về source/link | Public score | Bằng chứng sau khi gom Kaggle | Quyết định mới |
|---:|---|---|---:|---|---|
| 1 | `01_food_data_vn.zip.zip` | Food Data / TruongVo | 92 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ ưu tiên cao**, raw audit bắt buộc |
| 2 | `03_vietnamese_food_5.zip` | Vietnamese Food / FoodAITongHop | 82 | Có trong malformed examples sau clean do notebook clean/audit bug; chưa thấy duplicate log riêng | **Giữ**, nhưng phải audit lại sau clean đúng |
| 3 | `04_food_kcmrd.zip` | Food-kcmrd | 90 | `13` file có duplicate, `13` duplicate labels removed | **Giữ ưu tiên cao**, lỗi duplicate nhẹ |
| 4 | `05_vegetable_detection.zip` | Vegetable detection / ybszt hoặc nguồn vegetable tương đương | 84 | `176` file có duplicate, `277` duplicate labels removed | **Giữ có điều kiện**, cần dedupe và class-map |
| 5 | `06_fish.zip` | Fish project | 45 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Cherry-pick/hold**, không phải nguồn core món Việt |
| 6 | `07_uecfood256.zip` | UECFOOD256 | 58 | `5` file có duplicate, `5` duplicate labels removed | **Cherry-pick**, không dùng full 253 class |
| 7 | `10_food_detection_64.zip` | Food Detection Project 64 | 66 | `48` file có duplicate, `48` duplicate labels removed | **Dùng có điều kiện**, cần lọc class generic/snack |
| 8 | `11_food_detection_3.zip` | Food detection 3 | 42 | `8,462` file có duplicate, `29,529` duplicate labels removed | **Quarantine/loại khỏi production-first** |
| 9 | `12_thai_food.zip` | Thai-Food-Project | 63 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Cherry-pick**, chỉ lấy món/gia vị gần Việt |
| 10 | `15_npg_project.zip` | NPG Project | 54 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Hold**, cần xác minh class thật |
| 11 | `16_food_detection_xt7yz.zip` | Food detection xt7yz | 62 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Dùng có điều kiện**, raw class audit trước |
| 12 | `17_food_union_fruit.zip` | Food Detection Union / fruit | 38 | `821` file có duplicate, `8,584` duplicate labels removed | **Quarantine/loại khỏi production-first** |
| 13 | `vietnamese-food-calories.v1i.yolov11.zip` | Vietnamese food calories | 68 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Dùng có điều kiện**, phải sửa numeric classes |
| 14 | `RawData.v12i.yolov11.zip` | RawData / My Khanh Nguyen | 73 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ candidate**, cần raw audit class/bbox |
| 15 | `Food Items.v11i.yolov11.zip` | Food Items / FoodRecognitionPreThesis | 86 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ ưu tiên cao** |
| 16 | `Food.v3i.yolov11.zip` | Food / Khoa hoặc source `Food` tương ứng | 76 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ có điều kiện**, cần xác minh map source |
| 17 | `canteen_menu.v4i.yolov11.zip` | canteen_menu | 80 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ ưu tiên cao** |
| 18 | `banh-dan-gian-nb.v1i.yolov11.zip` | banh-dan-gian-nb | 74 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Dùng để vá class bánh Việt**, quy mô nhỏ |
| 19 | `Banh dan gian mien Tay.v5i.yolov11.zip` | Bánh dân gian miền Tây | 64 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Dùng để vá class hiếm**, không làm nguồn lớn |
| 20 | `Food_AI_Tong_Hop.v1-banh_mi.yolov11.zip` | Food_AI_Tong_Hop | 74 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Dùng có điều kiện**, chống trùng với source #4 |
| 21 | `Food.v6i.yolov11.zip` | Source `Food` chưa map chắc chắn | 55 | `39` file có duplicate, `41` duplicate labels removed | **Hold**, phải map lại nguồn trước khi dùng |
| 22 | `Food-Detection-bobotnhan.v7i.yolov11.zip` | Food-Detection-bobotnhan | 78 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ candidate mạnh**, raw audit bbox/class |
| 23 | `VietFood67.ZIP` | VietFood67 Kaggle | 80 | Chưa thấy duplicate log theo prefix trong notebook đã lưu | **Giữ candidate Việt mạnh**, cần xác minh có bbox detect thật |

### 8.2. Kết Luận Thực Tế Sau Khi Đối Chiếu Drive + Kaggle

Nhóm **đáng giữ làm lõi V2**, nhưng vẫn phải raw audit trước merge:

```text
01_food_data_vn.zip.zip
03_vietnamese_food_5.zip
04_food_kcmrd.zip
Food Items.v11i.yolov11.zip
canteen_menu.v4i.yolov11.zip
Food-Detection-bobotnhan.v7i.yolov11.zip
RawData.v12i.yolov11.zip
VietFood67.ZIP
Food.v3i.yolov11.zip
Food_AI_Tong_Hop.v1-banh_mi.yolov11.zip
banh-dan-gian-nb.v1i.yolov11.zip
Banh dan gian mien Tay.v5i.yolov11.zip
```

Nhóm **dùng có điều kiện/cherry-pick**:

```text
05_vegetable_detection.zip
07_uecfood256.zip
10_food_detection_64.zip
12_thai_food.zip
16_food_detection_xt7yz.zip
vietnamese-food-calories.v1i.yolov11.zip
06_fish.zip
15_npg_project.zip
Food.v6i.yolov11.zip
```

Nhóm **không đưa vào production-first nếu chưa sửa mạnh**:

```text
11_food_detection_3.zip
17_food_union_fruit.zip
```

Lý do hai zip này bị hạ cấp không phải do suy đoán từ tên file, mà do log thật của Ultralytics sau khi dataset đã gom:

- `11_food_detection_3`: `8,462` file bị xóa duplicate labels, tổng `29,529` duplicate labels removed.
- `17_food_union_fruit`: `821` file bị xóa duplicate labels, tổng `8,584` duplicate labels removed.

Hai nguồn này có thể vẫn cứu được một phần nếu unzip và lọc lại từ đầu, nhưng **không được dùng full vào dataset YOLO11 production**.

### 8.3. Điều Chỉnh So Với Kết Luận 22 Link Ban Đầu

Sau khi nối với Drive inventory, tôi điều chỉnh như sau:

- Danh sách thực tế đang có là **23 zip**, cần xử lý như 23 source artifact.
- `Complete Food` nằm trong shortlist public nhưng **không thấy zip tương ứng trong `datasets-raw` hiện tại**, nên chưa đưa vào nhóm actual source.
- `Food Detection Union` và `Food detection 3` bị hạ xuống **quarantine** vì có bằng chứng lỗi thật sau merge.
- `Food-kcmrd`, `Food Items`, `canteen_menu`, `Food Data`, `Vietnamese Food`, `Bobotnhan`, `RawData`, `VietFood67` là lõi đáng đi tiếp nhất cho V2.
- Nguồn classification/segmentation hoặc quá rộng chỉ nên dùng sau khi convert/cherry-pick, không merge full.

## 9. Nguồn Public Đã Dùng

Các trang public tiêu biểu đã mở/tra trong lần audit này:

- https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp
- https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo
- https://universe.roboflow.com/toby-b9kw2/vietnamese-food-calories-suwt6
- https://universe.roboflow.com/foodrecognitionprethesis/food-items-j9iud
- https://universe.roboflow.com/japon-gi1n7/uecfood256
- https://universe.roboflow.com/food-aozvm/food-detection-project
- https://universe.roboflow.com/helo-helo/food-kcmrd
- https://universe.roboflow.com/detection-lnetp/food-detection-lhp8d
- https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt
- https://universe.roboflow.com/kittisak-tkerk/vegetable-6d6cy
- https://universe.roboflow.com/food-images/food-detection-union-rhdem
- https://universe.roboflow.com/scan-detection/food-detection-hipfv
- https://universe.roboflow.com/bro-bro-bro/food-detector-vckr8
- https://universe.roboflow.com/food-becxj/complete-food
- https://universe.roboflow.com/caretech-v2/v2-caretech-combined-dataset
- https://universe.roboflow.com/test-kuvbw/thai-food-detection-xvc0m
- https://datasetninja.com/food-seg-103
- https://mm.cs.uec.ac.jp/uecfoodpix/
- https://github.com/google-research-datasets/Nutrition5k
