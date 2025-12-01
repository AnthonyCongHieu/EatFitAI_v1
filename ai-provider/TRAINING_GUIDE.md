# Hướng Dẫn Train AI Nhận Diện Nguyên Liệu (Roboflow + Colab)

Tài liệu này hướng dẫn bạn cách tự tạo bộ dữ liệu (Dataset) tổng hợp từ nhiều nguồn (Rau, Thịt, Món Việt...) và train model AI.

## Bước 1: Chuẩn Bị Dữ Liệu trên Roboflow
Roboflow là công cụ tuyệt vời để tìm kiếm và gộp các dataset lại với nhau.
1.  Đăng ký tài khoản tại [roboflow.com](https://roboflow.com/).
2.  Vào **Roboflow Universe** (tab Universe) để tìm kiếm dataset.
    *   Tìm **"Vegetables"** -> Chọn bộ nào nhiều ảnh, có bounding box.
    *   Tìm **"Meat"** (thịt), **"Seafood"** (hải sản).
    *   Tìm **"Vietnamese Food"** (nếu muốn nhận diện món ăn).
    *   Tìm **"Ingredients"** (nguyên liệu chung).
3.  Với mỗi dataset ưng ý, nhấn **"Download this Dataset"** -> Chọn **"YOLOv8"** -> Nhưng **KHOAN TẢI VỀ**.
    *   Thay vào đó, hãy chọn **"Clone to your workspace"** (hoặc Fork). Điều này giúp bạn copy dataset đó về kho của mình.
4.  Trong Workspace của bạn, bạn có thể **Merge** (gộp) các dataset này lại thành một Project duy nhất (ví dụ tên là "EatFitAI-Data").
5.  Sau khi gộp xong, nhấn **Generate Version** để tạo phiên bản dataset.
6.  Nhấn **Export** -> Chọn **YOLOv8** -> Chọn **"Show Download Code"**.
7.  Copy đoạn code Python hiện ra (chứa API Key của bạn).

## Bước 2: Mở Google Colab
1.  Truy cập [Google Colab](https://colab.research.google.com/).
2.  Upload file `train_colab.ipynb` (trong thư mục `ai-provider`).

## Bước 3: Chạy Training
1.  Chạy cell cài đặt thư viện.
2.  Tại cell **"Download Dataset from Roboflow"**, dán đoạn code bạn vừa copy ở Bước 1 vào.
3.  Chạy cell đó để Colab tải toàn bộ dữ liệu về.
4.  Chạy cell **Train Model**.
    *   *Lưu ý*: Nếu dataset lớn (>5000 ảnh), thời gian train có thể mất 2-5 tiếng. Hãy kiên nhẫn hoặc treo máy.

## Bước 4: Tải Model Về & Cài Đặt
1.  Sau khi train xong, chạy cell cuối để tải `best.pt`.
2.  Copy file `best.pt` vào thư mục `ai-provider` trên máy tính của bạn.
3.  Khởi động lại `python app.py`.

## Tại sao cách này tốt hơn?
*   Bạn chủ động chọn được những gì AI sẽ học (chỉ học thịt bò, rau cải, không học xe cộ, chó mèo...).
*   Dữ liệu trên Roboflow thường đã được gán nhãn (label) rất kỹ.
*   Bạn có thể thêm ảnh chụp thực tế của mình vào Roboflow để AI học thêm.

Chúc bạn thành công! 🚀
