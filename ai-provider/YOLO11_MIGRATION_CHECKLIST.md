# YOLO11 Migration — Checklist Toàn Bộ Quy Trình

> Tài liệu này mô tả **từng bước** từ khi có link dataset đến khi deploy production.
> Mỗi bước có: Đầu vào, Hành động, Đầu ra, Tiêu chí đạt.

---

## PHASE 1: ĐÁNH GIÁ DATASET
> **Ai làm**: Bạn (trên browser)
> **Thời gian ước tính**: 2-4 giờ

### Bước 1.1: Mở từng link dataset trên Roboflow

**Đầu vào**: Danh sách link Roboflow (đã có ~15 link từ phiên trước)

**Hành động**:
- [x] Mở từng link trên browser/public page
- [x] Kiểm tra dataset có phải **Object Detection** không (KHÔNG dùng Classification)
- [x] Ghi lại: tên dataset, số ảnh, số class, danh sách class names
- [x] Xem 10-20 ảnh mẫu → bbox có tight không? Ảnh có rõ không?

**Đầu ra**: Bảng đánh giá như sau:

```
| # | Dataset name          | Ảnh  | Classes | Chất lượng bbox | Dùng? |
|---|-----------------------|------|---------|-----------------|-------|
| 1 | food-detection-lhp8d  | 1754 | 12      | Tốt             | ✅    |
| 2 | food-rsxtc            | 6553 | 25      | TB              | ✅    |
| 3 | food-qxo3r            | 556  | 8       | Kém (box lỏng)  | ❌    |
```

**Tiêu chí đạt**:
- ✅ Loại bỏ dataset bbox kém (box lỏng, label sai)
- ✅ Loại bỏ dataset < 200 ảnh (quá ít, không đáng merge)
- ✅ Tổng ảnh từ các dataset chọn: **15,000 - 30,000**

---

### Bước 1.2: Lập danh sách class thô

**Đầu vào**: Bảng đánh giá từ bước 1.1

**Hành động**:
- [x] Gộp tất cả class names từ các dataset đã chọn
- [x] Đánh dấu class trùng tên nhưng khác ý nghĩa (ví dụ: `chicken` ở dataset A = gà sống, dataset B = gà nấu)
- [x] Đánh dấu class không liên quan food: `person`, `face`, `plate`, `fork`, `spoon`, `knife`, `table`, `cup`, `bottle`, `bag`, `packaging`, `brand_logo`

**Đầu ra**: Danh sách class thô, ví dụ:

```
apple (Dataset A: 200 ảnh, Dataset C: 150 ảnh)
chicken (Dataset A: 300 ảnh — gà sống | Dataset B: 180 ảnh — gà nấu) ⚠️ CONFLICT
person (Dataset D: 500 ảnh) ❌ LOẠI
fried_rice (Dataset B: 400 ảnh)
rice (Dataset B: 250 ảnh — cơm trắng | Dataset C: 180 ảnh — cơm chiên) ⚠️ CONFLICT
fork (Dataset E: 120 ảnh) ❌ LOẠI
plate (Dataset E: 300 ảnh) ❌ LOẠI
```

**Tiêu chí đạt**:
- ✅ Mọi conflict đã được đánh dấu
- ✅ Class không liên quan đã đánh dấu loại

---

## KẾT QUẢ PHASE 1 — DATASET AUDIT 2026-05-02

> Phạm vi kiểm tra: mở link public, xác minh link còn sống, loại task, số ảnh/class công bố, class names công khai, và xem thumbnail mẫu trực quan với Roboflow. Với Kaggle/Hugging Face/official source, class map chính xác cần tải dataset hoặc đọc file label sau khi download.

### Bước 1.1 — Bảng đánh giá dataset

| # | Dataset | Nguồn | Ảnh / class public | Chất lượng trực quan | Dùng? | Ghi chú |
|---:|---|---|---:|---|---|---|
| 1 | [VietFood67 Kaggle](https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68) | Kaggle | ~33K / 68 | Cao | ✅ Core nếu license phù hợp | Dataset món Việt đúng nhu cầu nhất; YOLO bbox; license non-commercial, cần chú ý nếu dùng thương mại |
| 2 | [VietFood67 Roboflow mirror / Food Data](https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp) | Roboflow | 8,205 / 31 | Cao | ✅ Core | Ảnh món Việt sát domain; page public có mAP@50 74.7%, Precision 73.6%, Recall 70.4% |
| 3 | [DETECTION_15_VIETNAMESE_FOOD](https://universe.roboflow.com/aiapplication/detection_15_vietnamese_food) | Roboflow | 2,889 / 15 | Khá | ✅ Bổ sung | Ít class nhưng đúng món Việt; cần chuẩn hóa label tiếng Anh dài |
| 4 | [Vietnamese Food 5 classes](https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo) | Roboflow | 1,000 / 5 | Khá | ✅ Bổ sung class thiếu | Có bánh mì, bột chiên, bún, gỏi cuốn, phở; số class ít, dễ kiểm soát |
| 5 | [UECFOOD256 Roboflow](https://universe.roboflow.com/japon-gi1n7/uecfood256) | Roboflow | 29,364 / 253 | Khá | ⚠️ Cherry-pick | Nguồn lớn, nhiều món châu Á; không merge nguyên bộ vì >200 class |
| 6 | [V2 CareTech Combined Dataset](https://universe.roboflow.com/caretech-v2/v2-caretech-combined-dataset) | Roboflow | 29,278 / 258 | Khá | ⚠️ Cherry-pick | Tương tự UECFOOD, quá nhiều class; chỉ chọn món phổ biến/có mapping nutrition |
| 7 | [Complete Food](https://universe.roboflow.com/food-becxj/complete-food) | Roboflow | 46,735 / 214 | Trung bình-khá | ⚠️ Cherry-pick | Rộng và lẫn nhiều style ảnh; chỉ lấy class rõ như `Basil Rice`, `beef-curry`, `beef-noodle`, `Beetroot`, `bibimbap`, `biriyani`, `carrot_eggs`, `Chicken Rice`, `chinese_cabbage`, `chinese_sausage`, `Crispy Pork Kale`, `curry`, `dal`, `dosa`, `eels-on-rice`, `French Fries` |
| 8 | [Food Detection Project 64 classes](https://universe.roboflow.com/food-aozvm/food-detection-project) | Roboflow | 9,026 / 64 | Trung bình | ⚠️ Chọn lọc | Có class phổ thông nhưng lẫn candy/dessert/object; cần loại non-nutrition |
| 9 | [Food detection 3](https://universe.roboflow.com/gp-final/food-detection-3) | Roboflow | 10,000 / 36 | Khá | ✅/⚠️ Chọn lọc | Rau/trái cây/món phổ thông; có vài ảnh kiểu poster/stock cần lọc |
| 10 | [Thai-Food-Project](https://universe.roboflow.com/baimint/thai-food-project) | Roboflow | 3,803 / 21 | Khá | ⚠️ Bổ sung món châu Á | Dùng class visual rõ: `Shrimp`, `Egg-tofu`, `Fish-cake`, `Grill-shrimp`, `Pad-thai`, `Papaya-salad`, `Roast-fish`, `Steamed-egg`, `Tom-kha-kai`, `Tom-yam-goong` |
| 11 | [Thai Food Detection](https://universe.roboflow.com/test-kuvbw/thai-food-detection-xvc0m) | Roboflow | 3,999 / 10 | Khá | ❌ Tạm loại | Class public là `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`; không dùng nếu chưa có class map rõ |
| 12 | [FOOD-INGREDIENTS dataset](https://universe.roboflow.com/food-recipe-ingredient-images/food-ingredients-dataset) | Roboflow | 4,196 / 120 | Khá | ⚠️ Cherry-pick ingredient | Nhiều nguyên liệu hữu ích, nhưng 120 class dễ loãng; chỉ giữ class có nutrition mapping |
| 13 | [Food Ingredient Detection VN](https://universe.roboflow.com/viet-hoang-food/food-ingredient-detection-mnc5n) | Roboflow | 1,182 / 80 | Trung bình | ⚠️ Bổ sung class thiếu | Ít ảnh/class; chỉ dùng class đặc biệt còn thiếu |
| 14 | [NPG Project ingredients](https://universe.roboflow.com/qsc/npg_project) | Roboflow | 8,828 / 101 | Trung bình | ⚠️ Rất chọn lọc | Có packaging/object/noise như bottle, bag, water; không merge nguyên bộ |
| 15 | [Food-kcmrd](https://universe.roboflow.com/helo-helo/food-kcmrd) | Roboflow | 4,209 / 78 | Khá | ✅ Chọn lọc | Tốt cho ingredient: `amaranth`, `bamboo_shoots`, `bean_sprouts`, `bitter_gourd`, `chayote`, `chili_pepper`, `clams`, `common_mushrooms`, `green_banana`, `green_beans`, `green_onion`, `green_papaya`, `lemongrass`, `okra`, `oyster`, `sea_fish`, `shallot`, `squid`, `tofu`, `water_morning_glory` |
| 16 | [Food detection xt7yz](https://universe.roboflow.com/science-fair-48u9f/food-detection-xt7yz) | Roboflow | 6,435 / 51 | Khá | ✅ Chọn lọc | Có cơm/rau/đồ ăn trên plate; loại brand/drink nếu có |
| 17 | [Vegetable Object Detection ybszt](https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt) | Roboflow | 3,222 / 22 | Khá | ✅ Bổ sung rau củ | Ảnh rau củ thực tế ngoài chợ, hợp domain Việt |
| 18 | [Food Detection Union fruit](https://universe.roboflow.com/food-images/food-detection-union-rhdem) | Roboflow | 51,343 / 12 | Khá | ✅ Sample/cap per class | Rất mạnh cho fruit nhưng quá lớn; chỉ lấy ~300-500 ảnh/class |
| 19 | [Fruit Detection YOLO Kaggle](https://www.kaggle.com/datasets/itsmeaman03/fruit-detection-yolo) | Kaggle | YOLO format | Khá trên preview | ⚠️ Download kiểm tra | Dùng bổ sung fruit nếu Roboflow fruit thiếu variety |
| 20 | [Vegetables Object Detection Kaggle](https://www.kaggle.com/datasets/ayyuce/vegetables) | Kaggle | Object detection | Khá trên preview | ⚠️ Download kiểm tra | Có bbox vegetable; cần kiểm tra class map và label quality sau tải |
| 21 | [Fruit Quality Detection](https://www.kaggle.com/datasets/abrars2/fruit-quality-classificaltion-and-detection) | Kaggle | 1,968 / fruit quality | Trung bình | ⚠️ Optional | Hữu ích nếu muốn fresh/bad quality; không cần cho nutrition detection chính |
| 22 | [FoodSeg103 Kaggle](https://www.kaggle.com/datasets/fontainenathan/foodseg103) | Kaggle | 9,490 / 103 | Khá | ⚠️ Convert mask → bbox | Segmentation, không đưa thẳng vào YOLO bbox nếu chưa convert |
| 23 | [UECFoodPixComplete official](https://mm.cs.uec.ac.jp/uecfoodpix/) | Official | Segmentation masks | Nguồn học thuật | ⚠️ Convert mask → bbox | Tốt để mở rộng class sau, không phải nguồn Phase 2 nhanh |
| 24 | [Nutrition5k official GitHub](https://github.com/google-research-datasets/Nutrition5k) | GitHub | ~5K dishes | Nguồn học thuật | ❌ Không dùng bbox trực tiếp | Hữu ích tham khảo nutrition/RGB-D hơn là training YOLO detection |
| 25 | [Nutrition5k Kaggle mirror](https://www.kaggle.com/datasets/siddhantrout/nutrition5k-dataset) | Kaggle | ~5K dishes | Nguồn học thuật | ❌ Không dùng bbox trực tiếp | Mirror dễ tải, nhưng format không phải YOLO bbox trực tiếp |
| 26 | [Meat Project](https://universe.roboflow.com/meatproject/meat-project-n41vj) | Roboflow | 2,335 / 8 | Khá | ⚠️ Optional | Chỉ dùng nếu cần phân biệt thịt sống/chín/quá chín; rename label bắt buộc |
| 27 | [Fish aephx](https://universe.roboflow.com/project-3rfep/fish-aephx) | Roboflow | 984 / 1 | Khá | ✅ Bổ sung fish nếu thiếu | Một class, dễ dùng để tăng recall cho fish |
| 28 | [Food Image Dataset Indian YOLO](https://www.kaggle.com/datasets/josephvettom/food-image-dataset) | Kaggle | YOLO / 20 class | Khá trên preview | ⚠️ Optional | Món Ấn nhưng một số món phổ biến; download để xem class map |

### Bổ sung món Việt — kiểm tra thêm 2026-05-03

> Lý do bổ sung: danh sách ban đầu còn thiên về general food/ingredient, tỷ lệ món Việt quá thấp. Nhóm dưới đây ưu tiên dataset Roboflow public còn sống, task là Object Detection, có class món Việt rõ. Các bộ nhỏ hoặc trùng class vẫn có giá trị để tăng recall cho món Việt hiếm, nhưng cần dedup và review bbox trước khi merge.

| # | Dataset | Nguồn | Ảnh / class public | Dùng? | Ghi chú |
|---:|---|---|---:|---|---|
| 29 | [vietnamese-food-calories](https://universe.roboflow.com/toby-b9kw2/vietnamese-food-calories-suwt6) | Roboflow | 947 / 33 | ✅ Bổ sung VN | Có `banh_bao`, `banh_beo`, `banh_canh`, `banh_chung`, `banh_gio`, `banh_khot`, `banh_mi`, `bun_bo`, `com_tam`, `nem_ran`, `pho`, `thit_kho_tau`, `tom`, `trung_chien`; loại class số `0`, `25` nếu không có ý nghĩa |
| 30 | [RawData - My Khanh Nguyen](https://universe.roboflow.com/my-khanh-nguyen-tjmam/rawdata-8vvya) | Roboflow | 3,019 / 50 | ✅ Core miền Tây | Rất đáng lấy cho món Việt miền Tây: `Bánh Canh Ghẹ`, `Bánh Khọt`, `Bánh Pía`, `Bánh Tét Lá Cẩm`, `Bánh Xèo`, `Bún Bò Cay`, `Cá Kho Tộ`, `Canh Chua`, `Cơm Tấm Long Xuyên`, `Gỏi Cuốn`, `Hủ Tiếu Mỹ Tho`, `Lẩu Mắm`, `Vịt Nấu Chao` |
| 31 | [Food - Prethesis](https://universe.roboflow.com/prethesis-avz0w/food-4otph) | Roboflow | 8,738 / 68 | ✅ Core sau lọc | Nguồn lớn cho món Việt: `Banh_canh`, `Banh_chung`, `Banh_cuon`, `Banh_khot`, `Banh_mi`, `Banh_trang_tron`, `Banh_xeo`, `Bo_kho`, `Bun_bo_Hue`, `Bun_cha`, `Bun_dau`, `Bun_mam`, `Bun_rieu`, `Com_tam`, `Goi_cuon`, `Hu_tieu`, `Pho`; loại `Con_nguoi`, `Hamburger`, `Salad` nếu không dùng |
| 32 | [Food Items - FoodRecognitionPreThesis](https://universe.roboflow.com/foodrecognitionprethesis/food-items-j9iud) | Roboflow | 1,360 / 52 | ✅ Bổ sung cơm phần | Tốt cho món gia đình/canteen: `ba-roi-kho-ruoc`, `bap-cai-xao`, `ca-basa-kho-hanh`, `canh-chua`, `com-tam-suon-trung`, `dau-hu-nhoi-thit`, `ga-kho`, `heo-quay`, `rau-muong-xao`, `suon-non-kho-cai-chua`, `xiu-mai-boc-trung` |
| 33 | [canteen_menu](https://universe.roboflow.com/nhanbeo/canteen_menu) | Roboflow | 3,369 / 9 | ✅ Core cơm nhà | Ít class nhưng sát domain Việt: `ca_hu_kho`, `canh_cai`, `canh_chua`, `dau_hu_sot_ca`, `ga_chien`, `rau_muong_xao`, `thit_kho`, `thit_kho_trung`, `trung_chien` |
| 34 | [Food - Khoa](https://universe.roboflow.com/khoa-fbrvv/food-jfsxy) | Roboflow | 997 / 10 | ✅ Bổ sung bánh Việt | Có nhiều bánh dân gian: `banh_beo`, `banh_bo`, `banh_bot_loc`, `banh_can`, `banh_canh`, `banh_chung`, `banh_cong`, `banh_cuon`, `banh_da_lon`, `banh_duc` |
| 35 | [VietNamfood - Duy2902](https://universe.roboflow.com/duy2902/vietnamfood-w3i0a) | Roboflow | 320 / 3 | ⚠️ Nhỏ, dùng bổ sung | Chỉ có `food`, `Banh_beo`, `Banh_bot_loc`; loại hoặc bỏ qua class generic `food` khi merge |
| 36 | [phanloai](https://universe.roboflow.com/new-workspace-bfa6s/phanloai-pybzl) | Roboflow | 250 / 11 | ⚠️ Nhỏ, class hiếm | Có `banh beo`, `banh cuon`, `banh trang tron`, `banh xeo`, `bun rieu`, `canh kho qua`, `com chien`, `hu tieu`, `mi quang`, `thit kho tau`; loại class `food` |
| 37 | [banh-dan-gian-nb](https://universe.roboflow.com/nhtdanh/banh-dan-gian-nb) | Roboflow | 882 / 20 | ✅ Bổ sung bánh dân gian | Tốt cho nhóm bánh: `Banh Bo`, `Banh Cam`, `Banh Chuoi Hap`, `Banh Cong1`, `Banh Cong2`, `Banh Cuon Ngot`, `Banh Da Lon`, `Banh Duc Man`, `Banh It Tran`, `Banh Khoai Mi Nuong`, `Banh Khot`, `Banh Pia`, `Banh Tet`, `Banh Xeo` |
| 38 | [Bánh dân gian miền Tây](https://universe.roboflow.com/fruitnetyolov8/banh-dan-gian-mien-tay) | Roboflow | 462 / 12 | ✅ Bổ sung bánh miền Tây | Có `Banh_beo_ngot`, `Banh_bot_bang`, `Banh_cam`, `Banh_chuoi`, `Banh_cuon_ngot`, `Banh_da_lon`, `Banh_duc_gan`, `Banh_it_tran`, `Banh_khoai_mi_nuong`, `Banh_la`, `Banh_phu_the` |
| 39 | [Banh Nhan Gian](https://universe.roboflow.com/nhandangmonan/banh-nhan-gian) | Roboflow | 109 / 11 | ⚠️ Chỉ lấy nếu thiếu | Có `banh-bo-xop`, `banh-cong`, `banh-cung`, `banh-da-lon`, `banh-duc-gan`, `banh-it`, `banh-la-dua`, `banh-lot`, `banh-tai-heo`, `banh-tai-yen`; loại class lỗi `\` |
| 40 | [Food-Detection-bobotnhan](https://universe.roboflow.com/fooddetection-3q4jo/food-detection-bobotnhan) | Roboflow | 4,836 / 35 | ✅ Bổ sung VN + nguyên liệu | Hữu ích cho `banh_mi`, `bun_pho_mi`, `canh`, `cha_nem_xucxich`, `com`, `dau_phu`, `muc`, `rau`, `thit_ga`, `thit_lon`, `tom`, `trung`; loại `pizza`, `salad` nếu không cần |
| 41 | [ver6 - TrukTruong](https://universe.roboflow.com/truktruong/ver6-hyapb) | Roboflow | 5,859 / 200 | ⚠️ Cherry-pick mạnh | Nhiều món Việt nhưng 200 class rất dễ confuse; chỉ chọn class thiếu như `Banh Beo`, `Banh Bot Loc`, `Banh Canh Cua`, `Banh Hoi`, `Banh Mi`, `Banh Xeo`, `Bun Cha`, `Ca Kho`, `Canh`, `Cha Gio`, `Goi Cuon` |
| 42 | [Food_AI_Tong_Hop](https://universe.roboflow.com/foodaitonghop/food_ai_tong_hop) | Roboflow | 1,929 / 6 | ✅ Bổ sung trùng class trọng yếu | Dùng để tăng ảnh cho `Banh-Mi`, `Bot Chien`, `Bun`, `Com-Tam`, `Goi-Cuon`, `Pho`. Không lấy project riêng `Banh-Mi` 807 ảnh trong cùng workspace vì public class bị lỗi `label`, `3` |

**Kết luận bổ sung 2026-05-03**:
- Ưu tiên đưa vào vòng QC trước: #29, #30, #31, #32, #33, #34, #37, #38, #40, #42.
- Chỉ dùng để vá class thiếu: #35, #36, #39.
- Chỉ cherry-pick rất mạnh: #41 vì quá nhiều class.

**Kết luận Step 1.1**:
- Nhóm tạm loại: #11 (class map không rõ), #24/#25 (không phải YOLO bbox).
- **Tất cả dataset còn lại đều dùng** — toàn bộ hoặc cherry-pick class phù hợp.

### Chiến lược: TỐI ĐA HÓA — không giới hạn thời gian, không giới hạn công sức

#### Tier 1 — Dùng TOÀN BỘ (không cần lọc ảnh, chỉ chuẩn hóa label)

| # | Dataset | Ảnh dùng | Lý do |
|---|---|---|---|
| 1 | VietFood67 Kaggle (33K/68) | ~33,000 | Dataset món Việt lớn nhất, đúng domain nhất |
| 2 | VietFood67 Roboflow (8.2K/31) | ~8,200 | Core VN, overlap #1 thì dedup sau |
| 3 | DETECTION_15_VN (2.9K/15) | ~2,900 | Toàn bộ, class VN chính xác |
| 4 | Vietnamese Food 5 (1K/5) | ~1,000 | Toàn bộ |
| 15 | Food-kcmrd (4.2K/78) | ~4,200 | Ingredient VN chất lượng khá |
| 17 | Vegetable Detection (3.2K/22) | ~3,200 | Rau củ thực tế ngoài chợ VN |
| 27 | Fish aephx (984/1) | ~984 | Bổ sung fish |
| | **Subtotal Tier 1** | **~53,500** | |

#### Tier 2 — Cherry-pick class phù hợp (loại non-food/brand/duplicate)

| # | Dataset | Ảnh dùng (ước tính) | Chiến lược |
|---|---|---|---|
| 5 | UECFOOD256 (29.3K/253) | ~12,000-15,000 | Chọn 60-80 class món châu Á phổ biến |
| 6 | V2 CareTech (29.3K/258) | ~8,000-12,000 | Chọn class không overlap #5 |
| 7 | Complete Food (46.7K/214) | ~15,000-20,000 | Chọn class rõ visual (bạn đã list sẵn) |
| 8 | Food Detection 64 (9K/64) | ~6,000-7,000 | Loại candy/dessert/non-nutrition |
| 9 | Food detection 3 (10K/36) | ~8,000-9,000 | Loại poster/stock, giữ food thật |
| 10 | Thai-Food-Project (3.8K/21) | ~3,000 | Giữ class visual rõ (bạn đã list) |
| 12 | FOOD-INGREDIENTS (4.2K/120) | ~2,500-3,000 | Giữ ingredient có nutrition mapping |
| 13 | Food Ingredient VN (1.2K/80) | ~800-1,000 | Chỉ class VN đặc biệt còn thiếu |
| 14 | NPG Project (8.8K/101) | ~3,000-4,000 | Loại packaging/bottle/bag/water |
| 16 | Food detection xt7yz (6.4K/51) | ~4,000-5,000 | Loại brand (bạn đã list giữ/loại) |
| 18 | Food Union fruit (51.3K/12) | ~6,000-12,000 | Cap 500-1000 ảnh/class |
| 26 | Meat Project (2.3K/8) | ~2,300 | Toàn bộ, rename label thịt sống/chín |
| | **Subtotal Tier 2** | **~71,000-91,000** | |

#### Tier 3 — Download + kiểm tra trước khi dùng (Kaggle/convert)

| # | Dataset | Ảnh kỳ vọng | Việc cần làm |
|---|---|---|---|
| 19 | Fruit Detection YOLO Kaggle | ~2,000-3,000 | Download, check class map |
| 20 | Vegetables Kaggle | ~2,000-3,000 | Download, check label format |
| 21 | Fruit Quality | ~1,500 | Optional, fresh/bad quality |
| 22 | FoodSeg103 (9.5K/103) | ~5,000-7,000 | Convert segmentation mask → bbox |
| 28 | Food Image Indian (20 class) | ~2,000-3,000 | Download, check class overlap |
| | **Subtotal Tier 3** | **~12,500-17,500** | |

#### Tổng tối đa sau dedup

| | Ảnh thô | Sau dedup + QC (ước -15%) |
|---|---|---|
| Tier 1 | ~53,500 | ~45,000 |
| Tier 2 | ~71,000-91,000 | ~60,000-77,000 |
| Tier 3 | ~12,500-17,500 | ~10,000-15,000 |
| **TỔNG** | **~137,000-162,000** | **~115,000-137,000** |

> **Target: 100K-130K ảnh sạch, 120-150 class.**
> Gấp ~4-5x lần model hiện tại (28K ảnh, 63 class).

#### Lưu ý quan trọng khi dataset lớn

1. **Deduplication bắt buộc**: #1 và #2 chắc chắn overlap → dùng tool dedup (Roboflow có sẵn)
2. **Class balance**: Một số class sẽ có 5000+ ảnh, một số chỉ 100 → dùng class-weighted sampling hoặc cap max 2000 ảnh/class
3. **Training time**: 100K+ ảnh × 100 epochs = ~40-60 giờ → cần 5-8 session Colab T4
4. **Chia batch Colab**: Có thể train Tier 1 trước (53K, mAP baseline) → thêm Tier 2 → thêm Tier 3 (incremental improvement tracking)
5. **RAM Colab**: 100K+ ảnh imgsz=640 cần ~25GB RAM → Colab free có 12GB → Ultralytics tự stream từ disk OK, nhưng cache='ram' sẽ crash → dùng `cache=False` hoặc `cache='disk'`

### Bước 1.2 — Class list thô

#### Món Việt / Asian dishes

Nguồn [VietFood67 Roboflow mirror / Food Data](https://universe.roboflow.com/truongvo/food-data-e2kl5-vqaqp):

```text
Banh-beo, Banh-bot-loc, Banh-can, Banh-canh, Banh-chung,
Banh-cuon, Banh-duc, Banh-gio, Banh-khot, Banh-mi,
Banh-pia, Banh-tet, Banh-trang-nuong, Banh-xeo,
Bun-bo-Hue, Bun-dau-mam-tom, Bun-mam, Bun-rieu,
Bun-thit-nuong, Ca-kho-to, Canh-chua, Cao-lau,
Chao-long, Com-tam, Goi-cuon, Hu-tieu, Mi-quang,
Nem-chua, Pho, rau, Xoi-xeo
```

Nguồn [DETECTION_15_VIETNAMESE_FOOD](https://universe.roboflow.com/aiapplication/detection_15_vietnamese_food):

```text
Beef stew, Bitter melon soup, Caramelized fish in clay pot,
Chicken rice with oily scallion topping, Chinese sausage,
Fried rice, Pumpkin soup, Sizzling beef steak, Steamed bun,
Steamed pork belly with taro, Steaned chicken with lime leaves,
Stuffed squid with pork, Vietnamese crepe, Vietnamese sandwich,
Vietnamese sour soup
```

Nguồn [Vietnamese Food 5 classes](https://universe.roboflow.com/foodaitonghop/vietnamese-food-0nsuo):

```text
Bánh-Mì, Bột Chiên, Bún, Gỏi-Cuốn, Phở
```

Nguồn [Thai-Food-Project](https://universe.roboflow.com/baimint/thai-food-project) nếu cần bổ sung món châu Á:

```text
Dipping-sauce, Egg-tofu, Fish-cake, Gang-jued, Goong-ob-woonsen,
Grill-shrimp, Kai-look-khei, Kai-palo, Kao-moo-dang,
Kor-moo-yang, Moo-stay, Pad-ka-prao, Pad-see-ew, Pad-thai,
Panang, Papaya-salad, Shrimp, Somtum, Tom-yum
```

#### Ingredient / produce candidates theo từng nguồn

Nguồn [Food-kcmrd](https://universe.roboflow.com/helo-helo/food-kcmrd) — public page hiển thị 55/78 class, các class còn lại cần xem sau khi clone:

```text
amaranth, ash_gourd, bamboo_shoots, banana_flower,
bean_sprouts, bitter_gourd, bottle_gourd, cassava,
cauliflower_broccoli, chayote, chili_pepper, clams,
common_mushrooms, dracontomelon, dried_fish, dried_shrimp,
dry_noodles, eel, field_crab, frog_meat, galangal,
green_banana, green_beans, green_onion, green_papaya,
instant_noodles, jute_leaves, katuk, kohlrabi,
lemon_lime, lemongrass, lotus_root, malabar_spinach,
mustard_greens, okra, oyster, piper_lolot, pork_paste,
pumpkin_leaves, raw_rice, raw_sausage, sea_crab,
sea_fish, shallot, shiitake_mushroom, snail,
sponge_gourd, squid, starfruit, tamarind, tofu,
turmeric, water_morning_glory, white_radish,
wood_ear_mushroom
```

Nguồn [Food detection xt7yz](https://universe.roboflow.com/science-fair-48u9f/food-detection-xt7yz) — public page hiển thị 35/51 class, các class còn lại cần xem sau khi clone:

```text
Annie's Mac Cheese, AW cola, Beijing Beef,
black pepper rice bowl, carrot_eggs, cheese burger,
chicken waffle, chicken_nuggets, chinese_cabbage,
chinese_sausage, Chow Mein, crispy corn, curry,
french fries, fried chicken, Fried Rice, fried_chicken,
fried_dumplings, fried_eggs, Hashbrown,
Honey Walnut Shrimp, instant_noodle, Kung Pao Chicken,
mango chicken pocket, mozza burger, mung_bean_sprouts,
nugget, perkedel, String Bean Chicken Breast,
Super Greens, The Original Orange Chicken,
tostitos cheese dip sauce, triangle_hash_brown,
water_spinach, White Steamed Rice
```

Class nên giữ từ `food-detection-xt7yz`:

```text
black pepper rice bowl, carrot_eggs, chinese_cabbage,
chinese_sausage, Chow Mein, crispy corn, curry,
fried chicken, Fried Rice, fried_chicken, fried_dumplings,
fried_eggs, Honey Walnut Shrimp, instant_noodle,
Kung Pao Chicken, mung_bean_sprouts, perkedel,
String Bean Chicken Breast, Super Greens, water_spinach,
White Steamed Rice
```

Class nên loại từ `food-detection-xt7yz`:

```text
Annie's Mac Cheese, AW cola, cheese burger, chicken waffle,
french fries, Hashbrown, mango chicken pocket, mozza burger,
nugget, The Original Orange Chicken, tostitos cheese dip sauce,
triangle_hash_brown
```

Nguồn [Vegetable Object Detection ybszt](https://universe.roboflow.com/area51-npwti/vegetable-object-detection-ybszt) — public page hiển thị 13/22 class, các class còn lại cần xem sau khi clone:

```text
Beetroot, Bitter Gourd, Bottle gourd, Capsicum,
Coriander leaves, Green Banana, Green Beans,
Green Chilli, Green Papaya, Radish, Snake gourd,
Spring Onion, Turnip
```

Nguồn [FOOD-INGREDIENTS dataset](https://universe.roboflow.com/food-recipe-ingredient-images/food-ingredients-dataset) — public page hiển thị phần lớn class, 20 class còn lại cần xem sau khi clone:

```text
Akabare Khursani, Artichoke, Ash Gourd (Kubhindo),
Asparagus (Kurilo), Bacon, Bamboo Shoots (Tama),
Beaten Rice (Chiura), Beetroot, Bethu ko Saag,
Bitter Gourd, Black beans, Black Lentils,
Bottle Gourd (Lauka), Brinjal, Broad Beans (Bakullo),
Buff Meat, Capsicum, Cassava (Ghar Tarul), Chayote(iskus),
Chicken Gizzards, Chickpeas, Chili Pepper (Khursani),
Chili Powder, Chowmein Noodles, Cinnamon, Coriander (Dhaniya),
Cornflakec, Crab Meat, Farsi ko Munta,
Fiddlehead Ferns (Niguro), Garden cress(Chamsur ko saag),
Garden Peas, Green Brinjal, Green Lentils,
Green Mint (Pudina), Green Peas,
Green Soyabean (Hariyo Bhatmas), Gundruk, Ham, Ice,
Jack Fruit, Ketchup, kimchi, Lapsi (Nepali Hog Plum),
Lemon (Nimbu), Lime (Kagati), Long Beans (Bodi),
Masyaura, mayonnaise, Minced Meat,
Moringa Leaves (Sajyun ko Munta), Nutrela (Soya Chunks),
Okra (Bhindi), Olive Oil, Onion Leaves,
Palak (Indian Spinach), Palungo (Nepali Spinach),
Paneer, Pea, Pointed Gourd (Chuche Karela),
Pumpkin (Farsi), Radish, Rahar ko Daal,
Rayo ko Saag, Red Beans, Red Lentils
```

Nguồn [Food Ingredient Detection VN](https://universe.roboflow.com/viet-hoang-food/food-ingredient-detection-mnc5n) — public page hiển thị 32/80 class, các class còn lại cần xem sau khi clone:

```text
almond, asparagus, bacon, bean sprout, beetroot,
blackberry, bok choy, brie cheese, cheddar cheese,
chicken breast, chicken wing, chilli, dry grape,
durian, green grape, green pepper, jalepeno, jam,
mangoteen, meat ball, mozarella cheese, mussel,
oyster, parmesan cheese, pork belly, pork rib,
raspberry, scallop, spring onion, starfruit,
stilton cheese, tuna
```

Nguồn [Food Detection Union fruit](https://universe.roboflow.com/food-images/food-detection-union-rhdem):

```text
Apple, Orange, Banana, Lemon, Pear, Strawberry,
Mango, Grape, Peach, Pomegranate, objects, picanha
```

Class nên giữ từ `food-detection-union-rhdem`:

```text
Apple, Orange, Banana, Lemon, Pear, Strawberry,
Mango, Grape, Peach, Pomegranate
```

Class nên loại từ `food-detection-union-rhdem`:

```text
objects, picanha
```

Nguồn [Food detection hipfv](https://universe.roboflow.com/scan-detection/food-detection-hipfv):

```text
apple, banana, tomato, cabbage, capsicum
```

Nguồn [Vegetable 6d6cy](https://universe.roboflow.com/kittisak-tkerk/vegetable-6d6cy) — public page hiển thị 7/16 class, các class còn lại cần xem sau khi clone:

```text
chili, coriander, Kale, long beans, Radish,
sweet basil, water spinach
```

#### Conflict / cần xử lý ở Phase 2

```text
chicken
- Conflict: raw chicken / cooked chicken / fried chicken / chicken rice.
- Hướng xử lý: raw_chicken, cooked_chicken, fried_chicken hoặc chicken_dish tùy ảnh.

fish
- Conflict: whole raw fish / cooked fish / fish cake / fish fillet.
- Hướng xử lý: fish, cooked_fish, fish_cake nếu đủ ảnh; nếu ít thì gộp fish.

rice
- Conflict: rice trắng / fried rice / chicken rice / com_tam.
- Hướng xử lý: rice, fried_rice, com_tam, chicken_rice.

bun / pho / hu_tieu / mi_quang / cao_lau
- Visual gần nhau vì đều là noodle/broth/bowl.
- Hướng xử lý: giữ class món có visual khác rõ; nếu confuse thì gộp noodle_soup hoặc bun_noodle_soup.

rau
- Quá mơ hồ.
- Hướng xử lý: loại hoặc đổi thành mixed_vegetables nếu bbox thật sự là rau hỗn hợp.

Thai Food Detection: 0,1,2,3,4,5,6,7,8,9
- Class map không rõ.
- Hướng xử lý: không dùng cho tới khi có file class names.
```

#### Class loại ngay / không merge

```text
person, face, plate, fork, spoon, knife, table, cup, bottle,
water, bag, packaging, brand/logo, AW cola, coke, generic dessert,
candy, chocolate, poster/illustration-only images
```

#### Chuẩn hóa tên class ở Phase 2

Ví dụ mapping ban đầu:

```text
Banh-mi -> banh_mi
Bánh-Mì -> banh_mi
Pho -> pho
Phở -> pho
Bun-bo-Hue -> bun_bo_hue
Ca-kho-to -> ca_kho_to
Canh-chua -> canh_chua
Vietnamese sandwich -> banh_mi
Vietnamese sour soup -> canh_chua
Fried rice -> fried_rice
Caramelized fish in clay pot -> ca_kho_to
Steaned chicken with lime leaves -> steamed_chicken_lime_leaves
```

---

## PHASE 2: CHUẨN HÓA & MERGE
> **Ai làm**: Bạn (trên Roboflow)
> **Thời gian ước tính**: 3-6 giờ (tùy số dataset)

### Bước 2.1: Clone datasets vào workspace

**Đầu vào**: Các dataset đã chọn từ Phase 1

**Hành động**:
- [ ] Tạo workspace mới trên Roboflow (ví dụ: `EatFitAI-YOLO11`)
- [ ] Clone (Fork) từng dataset đã chọn vào workspace

**Đầu ra**: Tất cả dataset nằm trong 1 workspace

---

### Bước 2.2: Chuẩn hóa labels

**Đầu vào**: Danh sách class thô + conflict notes từ bước 1.2

**Hành động** (trên Roboflow, trong từng dataset):
- [ ] Rename class theo quy tắc: `lowercase_underscore` (ví dụ: `Fried Chicken` → `fried_chicken`)
- [ ] Resolve conflict:
  - `chicken` (gà sống) → rename `raw_chicken`
  - `chicken` (gà nấu) → rename `cooked_chicken`
- [ ] Xóa class không liên quan: `person`, `face`, `plate`, `fork`, `spoon`, `knife`, `table`, `cup`, `bottle`, `bag`, `packaging`, `brand_logo`, `poster`, `illustration_only`
- [ ] Gộp class quá giống: `green_pepper` + `red_pepper` → `bell_pepper`
- [ ] Xóa class có < 50 ảnh tổng (sau merge)

**Đầu ra**: Mỗi dataset có class names đã chuẩn hóa, không conflict

**Tiêu chí đạt**:
- ✅ Không có 2 dataset cùng class name nhưng khác ý nghĩa
- ✅ Tất cả tên class đều lowercase_underscore
- ✅ Không còn class non-food

---

### Bước 2.3: Merge datasets

**Đầu vào**: Các dataset đã chuẩn hóa

**Hành động**:
- [ ] Trên Roboflow → Merge tất cả dataset vào 1 project
- [ ] Thêm ảnh background (5-10%): ảnh bàn trống, đĩa rỗng, phòng bếp (KHÔNG gán label)
- [ ] Kiểm tra phân bố class: class nào quá ít ảnh?

**Đầu ra**: 1 project duy nhất chứa toàn bộ ảnh + labels đã chuẩn hóa

**Tiêu chí đạt**:
- ✅ Tổng ảnh: 15,000 - 30,000
- ✅ Mỗi class: tối thiểu 100 ảnh (lý tưởng 300+)
- ✅ Có 5-10% background images
- ✅ Số class: 80 - 150

---

### Bước 2.4: Generate Version & Export

**Đầu vào**: Project đã merge

**Hành động**:
- [ ] Generate Version trên Roboflow:
  - Preprocessing: Auto-Orient ✅, Resize: Stretch to 640x640 ✅
  - Augmentation: CHỈ bật nếu dataset < 10K ảnh (Flip Horizontal, Rotation ±15°, Brightness ±15%)
  - Train/Val/Test split: 80/15/5
- [ ] Export → Format: **YOLOv8** → Copy download code

**Đầu ra**:
- Download code (Python snippet cho Colab)
- `data.yaml` chứa class list cuối cùng

**Tiêu chí đạt**:
- ✅ Format = YOLOv8 (annotation format, dùng được cho YOLO11)
- ✅ `data.yaml` có đầy đủ class names
- ✅ Train/Val/Test split hợp lý

---

## PHASE 3: TRAINING
> **Ai làm**: Bạn (trên Google Colab)
> **Thời gian ước tính**: 12-20 giờ (2-3 session Colab)

### Bước 3.1: Setup Colab

**Đầu vào**: Download code từ Roboflow

**Hành động**:
- [ ] Mở Google Colab → Runtime → GPU T4
- [ ] Chạy theo `TRAINING_GUIDE.md` — Cell 1 (install + mount Drive)
- [ ] Chạy Cell 2 (download dataset)
- [ ] Verify: kiểm tra `data.yaml` có đúng class list không

**Đầu ra**: Dataset sẵn sàng trên Colab + Drive đã mount

---

### Bước 3.2: Train

**Đầu vào**: Dataset trên Colab

**Hành động**:
- [ ] Chạy Cell 3 từ `TRAINING_GUIDE.md` (training script với resume support)
- [ ] Nếu Colab disconnect → kết nối lại → chạy lại Cell 3 → auto resume từ `last.pt`
- [ ] Theo dõi loss giảm dần trên console output

**Đầu ra**: 
- `best.pt` (model tốt nhất)
- `last.pt` (checkpoint cuối)
- `results.csv` (metrics mỗi epoch)
- Lưu trên Google Drive: `EatFitAI-Training/runs/food-detection/yolo11s-eatfitai/`

---

### Bước 3.3: Validate

**Đầu vào**: `best.pt`

**Hành động**:
- [ ] Chạy Cell 4 từ `TRAINING_GUIDE.md` (validation)
- [ ] Ghi lại metrics: mAP50, mAP50-95, Precision, Recall
- [ ] Xem confusion_matrix.png → class nào bị confuse?
- [ ] Test inference trên 5-10 ảnh thực tế (ảnh chụp tay, không phải ảnh training)

**Đầu ra**: Bảng metrics + confusion matrix

**Tiêu chí đạt**:

| Metric | Minimum | Lý tưởng |
|---|---|---|
| mAP50 | > 0.65 | > 0.75 |
| mAP50-95 | > 0.40 | > 0.50 |
| Precision | > 0.70 | > 0.80 |
| Recall | > 0.60 | > 0.70 |

- ✅ Không có class nào bị confuse > 30% trên confusion matrix
- ✅ Test inference trên ảnh thực tế → detect đúng tên + vị trí

**Nếu KHÔNG đạt** → quay lại Phase 2, kiểm tra:
- Class nào accuracy thấp? → thêm data hoặc xóa class đó
- Nhiều false positive? → thêm background images
- Overfitting? → tăng augmentation

---

### Bước 3.4: Export ONNX

**Đầu vào**: `best.pt` đã qua validation

**Hành động**:
- [ ] Chạy Cell 5 từ `TRAINING_GUIDE.md` (export ONNX)
- [ ] Download `best.onnx` từ Drive về máy local

**Đầu ra**: File `best.onnx` (~18-25MB)

**Tiêu chí đạt**:
- ✅ File size hợp lý (15-30MB cho YOLO11s)
- ✅ Export không có warning/error

---

## PHASE 4: DEPLOY (Tôi + Bạn)
> **Thời gian ước tính**: 1-2 giờ

### Bước 4.1: Báo kết quả cho tôi

**Đầu vào**: Kết quả từ Phase 3

**Bạn cần gửi cho tôi**:
- [ ] File `best.onnx`
- [ ] File `data.yaml` (hoặc copy class list)
- [ ] Bảng metrics (mAP50, Precision, Recall)
- [ ] Screenshot confusion matrix (nếu có)

---

### Bước 4.2: Update code (Tôi làm)

**Đầu vào**: Class list + best.onnx

**Tôi sẽ làm**:
- [ ] Update `YOLO_CLASS_NAMES` trong `app.py` → khớp class list mới
- [ ] Thay file `best.onnx` cũ bằng file mới
- [ ] Mở rộng `NormalizeSearchKey()` nếu cần thêm alias
- [ ] Verify `/healthz` endpoint trả đúng `model_classes_count`

---

### Bước 4.3: Seed nutrition data (Tôi + Bạn)

**Đầu vào**: Class list cuối cùng

**Hành động**:
- [ ] Với mỗi class mới chưa có trong DB:
  - Tra nutrition trên USDA FoodData Central
  - Viết SQL INSERT FoodItem
  - Viết SQL INSERT AiLabelMap
  - Viết SQL INSERT FoodServing
- [ ] Chạy migration
- [ ] Verify: mỗi class có FoodItem với CaloriesPer100g > 0

**Đầu ra**: DB đã có nutrition data cho tất cả class

---

### Bước 4.4: Deploy & Test

**Hành động**:
- [ ] Git commit + push
- [ ] Render auto-deploy
- [ ] Test `/healthz` → model loaded + class count đúng
- [ ] Test detect ảnh thực tế qua API → trả đúng label + nutrition
- [ ] Test trên app mobile → chụp ảnh → kết quả hiển thị đúng

**Tiêu chí đạt (E2E)**:
- ✅ `/healthz` trả `model_classes_count` = số class mới
- ✅ Detect ảnh → trả label + confidence + bbox + nutrition data
- ✅ Mobile app hiển thị kết quả đúng, có calories/protein/carb/fat
- ✅ Không có class nào trả nutrition = null (đã seed đầy đủ)

---

## TÓM TẮT TOÀN BỘ

```
Phase 1: Đánh giá dataset     → Đầu ra: Bảng đánh giá + class list thô
Phase 2: Chuẩn hóa & Merge    → Đầu ra: 1 project Roboflow đã merge + data.yaml
Phase 3: Training & Validate  → Đầu ra: best.onnx + metrics table
Phase 4: Deploy & Test        → Đầu ra: Production hoạt động với model mới
```

| Phase | Ai làm | Thời gian |
|---|---|---|
| 1 | Bạn | 2-4 giờ |
| 2 | Bạn | 3-6 giờ |
| 3 | Bạn | 12-20 giờ (2-3 session Colab) |
| 4 | Tôi + Bạn | 1-2 giờ |
| **Tổng** | | **~2-4 ngày** |
