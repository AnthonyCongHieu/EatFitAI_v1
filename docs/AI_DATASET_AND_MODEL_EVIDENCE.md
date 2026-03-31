# Bằng chứng dataset và mô hình best.pt của EatFitAI

## 1. Mục đích tài liệu

Tài liệu này ghi nhận lại các bằng chứng kỹ thuật liên quan đến bộ dữ liệu huấn luyện YOLOv8 và file trọng số `best.pt` đang được sử dụng trong dự án EatFitAI.  

Mục tiêu là trả lời rõ các câu hỏi sau, dựa trên dữ liệu thực tế đang có trên máy:

- Dataset mẫu nào đang được dùng?
- Dữ liệu nào dùng để train?
- Dữ liệu nào dùng để validation?
- Dữ liệu nào dùng để test?
- File `best.pt` là gì, được tạo ra như thế nào, và hiện có thể xác nhận trực tiếp được những thông tin nào?

Tài liệu này ưu tiên hai mức độ phát biểu:

- **Xác nhận được trực tiếp từ máy**: dựa trên file thật, thư mục thật, checkpoint thật.
- **Suy ra từ pipeline YOLO hiện tại**: dựa trên cách `train_local.py`, `data.yaml` và Ultralytics YOLOv8 hoạt động trong môi trường hiện có.

## 2. Dataset mẫu đang dùng

### 2.1. Nguồn dataset

Dataset mẫu đang được dùng cho bài toán nhận diện thực phẩm/nguyên liệu trong EatFitAI là:

- **Roboflow project**: `eatfitai-ingredients-v1-wfulm`
- **Workspace**: `conghieu`
- **Version**: `v4`
- **Tên version hiển thị trên Roboflow**: `sau modify class v1`
- **Định dạng export**: `YOLOv8`
- **Tổng số ảnh**: `30,896`

### 2.2. Nguồn bằng chứng

Các thông tin trên được đối chiếu từ:

- giao diện Roboflow do người dùng cung cấp
- file cấu hình dataset tại `D:/datasets/data.yaml`
- file cấu hình dùng trong dự án tại `D:/EatFitAI_v1/ai-provider/datasets/data.yaml`

### 2.3. Danh sách class

Dataset hiện có **63 class**, tương ứng với 63 nhãn đối tượng mà mô hình có thể học để nhận diện. Danh sách đầy đủ được ghi ở phần phụ lục cuối tài liệu.

## 3. Dữ liệu train/validation/test trên máy

### 3.1. Cấu trúc thư mục thực tế

Trên máy hiện tại, dataset YOLOv8 đang tồn tại dưới thư mục:

- `D:/datasets/train/images`
- `D:/datasets/train/labels`
- `D:/datasets/valid/images`
- `D:/datasets/valid/labels`
- `D:/datasets/test/images`
- `D:/datasets/test/labels`

Đây là đúng cấu trúc dữ liệu chuẩn mà YOLOv8 yêu cầu: mỗi tập dữ liệu có thư mục ảnh (`images`) và thư mục nhãn (`labels`) riêng.

### 3.2. Số lượng thực tế đã kiểm tra trên máy

Kết quả kiểm tra trực tiếp trên máy cho thấy:

| Tập dữ liệu | Số lượng ảnh | Số lượng label | Vai trò |
|---|---:|---:|---|
| Train | 25,308 | 25,308 | Dùng để huấn luyện mô hình |
| Validation | 2,839 | 2,839 | Dùng để theo dõi chất lượng mô hình trong lúc train |
| Test | 2,749 | 2,749 | Dùng để đánh giá độc lập sau huấn luyện |

Tổng cộng:

- `25,308 + 2,839 + 2,749 = 30,896` ảnh

Con số này khớp với tổng số ảnh hiển thị trong Roboflow version `v4`.

### 3.3. Khai báo trong data.yaml

File `D:/EatFitAI_v1/ai-provider/datasets/data.yaml` hiện khai báo như sau:

- `train: D:/datasets/train/images`
- `val: D:/datasets/valid/images`
- `test: D:/datasets/test/images`
- `nc: 63`

Điều này xác nhận rõ pipeline train local của dự án đang tham chiếu đúng đến bộ dữ liệu thực tế trên máy.

## 4. Logic kỹ thuật của từng tập dữ liệu

### 4.1. Train set dùng để làm gì?

Train set là tập dữ liệu được dùng để mô hình học trực tiếp.

Logic kỹ thuật cốt lõi:

- mô hình đọc ảnh từ `train/images`
- mô hình đọc nhãn thật từ `train/labels`
- mô hình dự đoán class và bounding box
- hệ thống so sánh dự đoán với nhãn thật
- tính loss
- cập nhật trọng số bằng backpropagation

Trong bài toán này, tập `train` là tập quan trọng nhất vì đây là nơi mô hình học đặc trưng của các nguyên liệu/thực phẩm.

### 4.2. Validation set dùng để làm gì?

Validation set không phải là tập để cập nhật trọng số.  
Nó được dùng để kiểm tra chất lượng mô hình trong quá trình huấn luyện.

Logic kỹ thuật cốt lõi:

- sau các epoch huấn luyện, mô hình được chạy trên tập `val`
- hệ thống tính các chỉ số như precision, recall, mAP
- hệ thống theo dõi xem mô hình đang tốt lên hay bắt đầu overfit
- từ đó chọn checkpoint tốt nhất

Trong pipeline hiện tại của dự án, đây là điểm rất quan trọng: **`best.pt` được chọn theo kết quả validation**, không phải theo test set.

### 4.3. Test set dùng để làm gì?

Test set là tập dữ liệu được tách riêng để đánh giá mô hình sau khi huấn luyện xong.

Ý nghĩa kỹ thuật:

- không dùng để cập nhật trọng số
- không nên dùng để chọn checkpoint tốt nhất trong lúc train
- dùng để đánh giá độc lập chất lượng mô hình sau huấn luyện

### 4.4. Logic thật của pipeline local trong dự án này

File `D:/EatFitAI_v1/ai-provider/train_local.py` gọi:

```python
results = model.train(**config)
```

trong đó `config["data"]` trỏ tới file `data.yaml` của dataset.

Khi rà source Ultralytics YOLOv8 đang cài trong môi trường `ai-provider/venv`, có thể xác nhận:

- `train_loader` lấy từ `self.data["train"]`
- loader dùng để validate lấy từ `self.data.get("val") or self.data.get("test")`

Suy ra:

- nếu dataset có `val`, YOLO sẽ dùng `val` để validate
- chỉ khi không có `val`, YOLO mới fallback sang `test`

Vì dataset hiện tại **có `val`**, nên pipeline local thực tế của dự án là:

1. train trên `train`
2. validate trên `valid`
3. chọn `best.pt` theo kết quả validation
4. giữ `test` như tập đánh giá tách riêng

Do đó, cách diễn đạt kỹ thuật chính xác là:

- **dữ liệu dùng để train**: `D:/datasets/train/images`
- **dữ liệu dùng để validation**: `D:/datasets/valid/images`
- **dữ liệu dùng để test**: `D:/datasets/test/images`

và **test set không phải là tập đang được dùng để chọn `best.pt` trong vòng train mặc định**.

## 5. Bằng chứng từ file best.pt

### 5.1. Thông tin file vật lý

File trọng số hiện có tại:

- `D:/EatFitAI_v1/ai-provider/best.pt`

Thông tin kiểm tra trực tiếp trên máy:

- **Kích thước**: `22,557,219` bytes
- **Thời gian sửa cuối**: `2025-12-03 03:10:21`

Điều này xác nhận trong dự án đang tồn tại một checkpoint huấn luyện thực tế, không chỉ là cấu hình lý thuyết.

### 5.2. Bản chất của best.pt

File `best.pt` là file trọng số mô hình sau huấn luyện.

Trong ngữ cảnh dự án này, nó có nghĩa là:

- bạn đã tải dataset YOLOv8 về máy local
- bạn đã huấn luyện mô hình trực tiếp trên máy
- hệ thống đã lưu checkpoint tốt nhất thành `best.pt`
- AI Provider dùng file này làm mô hình chính cho chức năng nhận diện ảnh

Nói ngắn gọn: `best.pt` là **artifact đầu ra của quá trình train local**, không phải là dataset đầu vào.

### 5.3. Thông tin mô hình trích được từ checkpoint

Khi đọc trực tiếp `best.pt` bằng môi trường `D:/EatFitAI_v1/ai-provider/venv`, có thể xác nhận:

- **Task**: `detect`
- **Số class**: `63`
- **Danh sách nhãn**: khớp với danh sách class trong dataset

Điều này cho thấy checkpoint `best.pt` thực sự là mô hình object detection tương ứng với dataset `eatfitai-ingredients-v1-wfulm`.

### 5.4. Các metric đã lưu trong checkpoint

Checkpoint `best.pt` hiện đang chứa các chỉ số validation sau:

- `precision(B) = 0.79401`
- `recall(B) = 0.81653`
- `mAP50(B) = 0.84685`
- `mAP50-95(B) = 0.62142`
- `val/box_loss = 0.96597`
- `val/cls_loss = 0.59031`
- `val/dfl_loss = 1.21224`

Các chỉ số này là bằng chứng cho thấy:

- mô hình đã trải qua một quá trình train/validate thật
- checkpoint không phải là file rỗng hoặc file placeholder
- trong checkpoint có nhúng sẵn kết quả validation của mô hình

### 5.5. Cách hiểu đúng về best.pt trong báo cáo kỹ thuật

Không nên mô tả `best.pt` là “model tốt nhất theo test set” nếu không có artifact đánh giá test riêng đi kèm.

Cách diễn đạt an toàn và đúng hơn:

> `best.pt` là checkpoint tốt nhất được chọn trong quá trình huấn luyện local, dựa trên các chỉ số validation do YOLOv8 ghi nhận.

## 6. Giới hạn của bằng chứng hiện tại

Khi rà soát repo hiện tại, chưa thấy thư mục `runs/detect/...` được lưu trong dự án để đối chiếu toàn bộ log train như:

- `results.csv`
- `results.png`
- `args.yaml`
- `weights/last.pt`
- các biểu đồ quá trình huấn luyện

Vì vậy, những gì có thể khẳng định chắc chắn là:

- dataset thật đang tồn tại trên máy
- `data.yaml` thật đang trỏ đúng vào train/val/test
- `best.pt` thật đang tồn tại
- `best.pt` là checkpoint detection 63 class
- `best.pt` có chứa metric validation

Những gì **không nên khẳng định quá mức** nếu chưa có artifact bổ sung:

- test set đã chắc chắn được chạy riêng trong một bước đánh giá cuối cùng
- metric test đã được xuất thành báo cáo độc lập
- toàn bộ lịch sử train đã được lưu đầy đủ trong repo

## 7. Kết luận ngắn để dùng cho báo cáo hoặc luận văn

Trong dự án EatFitAI, bộ dữ liệu mẫu dùng để huấn luyện mô hình nhận diện thực phẩm là Roboflow project `eatfitai-ingredients-v1-wfulm`, version `v4`, export theo định dạng `YOLOv8`. Dataset gồm `30,896` ảnh và được chia thành `25,308` ảnh train, `2,839` ảnh validation và `2,749` ảnh test. Trên máy local, dữ liệu được lưu tại `D:/datasets` và được khai báo trong `ai-provider/datasets/data.yaml`.

Quá trình huấn luyện local sử dụng `train_local.py`, trong đó YOLOv8 học trên tập train và đánh giá trong quá trình huấn luyện bằng tập validation. File `best.pt` hiện có trong `ai-provider` là checkpoint tốt nhất thu được từ quá trình train local này. Từ checkpoint có thể xác nhận mô hình thuộc task `detect`, có `63` class và chứa các metric validation như `precision = 0.79401`, `recall = 0.81653`, `mAP50 = 0.84685`, `mAP50-95 = 0.62142`.

## 8. Phụ lục: danh sách 63 class

1. apple
2. avocado
3. banana
4. bayleaf
5. beans
6. beef
7. beet
8. bell_pepper
9. blueberry
10. broccoli
11. cabbage
12. carrot
13. cauliflower
14. celery
15. cherry
16. chicken
17. chickpeas
18. cloves
19. coriander
20. corn
21. cranberry
22. cucumber
23. curry_powder
24. egg
25. eggplant
26. fish
27. garlic
28. ginger
29. gooseberry
30. grape
31. guava
32. kumquat
33. lamb
34. leek
35. lemon
36. lettuce
37. mango
38. marrow
39. mulberry
40. okra
41. onion
42. orange
43. papaya
44. peanut
45. pear
46. peas
47. pepper
48. pineapple
49. pork
50. potato
51. pumpkin
52. radish
53. raspberry
54. rice
55. salad
56. salt
57. shrimp
58. spinach
59. spring_onion
60. squash
61. strawberry
62. tomato
63. turmeric
