# BÁO CÁO ĐÁNH GIÁ TÍNH KHẢ THI (FEASIBILITY REPORT) - NÂNG CẤP "PRO MAX" EATFITAI

Dựa trên yêu cầu của bạn về việc "đưa mọi chức năng lên mức cao nhất có thể" và copy các tính năng ngon của đối thủ (trừ chuyên gia thật), mình đã research kỹ stack công nghệ hiện tại (React Native Expo + .NET 9 + Python AI) và đây là báo cáo đánh giá thực tế:

---

## 🚀 1. NÂNG CẤP "PRO MAX" CÁC TÍNH NĂNG ĐANG CÓ (RẤT KHẢ THI)

### A. Nhận diện hình ảnh (Vision AI)
* **Status Đối thủ (CalSnap):** Dùng AI đa năng nhận diện chính xác từng Calo chỉ qua 1 bức ảnh chụp bữa cơm tổng hợp.
* **Status EatFitAI:** Đang dùng YOLOv8 (chỉ nhận diện được tên món ăn đã train, ví dụ: "apple", độ chính xác thấp với món lạ).
* **Đề xuất nâng cấp (Pro Max):** 
  * Tích hợp thẳng **Gemini 2.5 Flash Vision** làm engine dự phòng. Nếu YOLO nhận diện độ tự tin thấp (<60%), đẩy ảnh lên Gemini. Gemini có thể nhận diện **hàng triệu món ăn** trên đời (kể cả bún đậu mắm tôm) và bóc tách thẳng ra JSON: `{ "name": "Bún đậu", "calories": 500, "protein": 20 }`.
  * **Đánh giá ráp vào Plan:** Khả thi 100%. Code Python Backend chỉ mất ~1 ngày để làm.

### B. Nhận diện giọng nói (Voice AI) -> "Text/Audio-to-Meal"
* **Status Đối thủ (CalSnap):** Gõ chữ "1 tô phở bò, bớt bánh" là ra macro.
* **Status EatFitAI:** Nhận giọng nói nhưng AI bóc tách (Ollama) thỉnh thoảng bị ngu.
* **Đề xuất nâng cấp (Pro Max):** 
  * Mở rộng nút Mic thành hộp thoại "**Chat với món ăn**". Cho phép user vừa nói, vừa gõ chữ.
  * Backend AI (Python) sẽ đưa chuỗi text này qua Gemini với prompt xịn (như LangChain Structured Output) để trích xuất chuẩn xác món ăn, định lượng, calo.
  * **Đánh giá ráp vào Plan:** Khả thi 100%, dễ làm, tốn thêm 1 ngày ở Phase 3. Thêm text input vào `VoiceScreen.tsx` là xong.

### C. Gợi ý công thức nấu ăn (Recipe AI)
* **Status EatFitAI:** Chỉ mới suggest món ăn, chưa có chi tiết các bước.
* **Đề xuất nâng cấp (Pro Max):** 
  * Cho phép user nhập nguyên liệu dư trong tủ lạnh -> Gemini xả ra bài hướng dẫn nấu ăn cực xịn: Số phút nấu, độ khó, lượng Calo/serving, 5 bước xào nấu chi tiết.
  * **Đánh giá ráp vào Plan:** Khả thi 100%, dễ làm trên .NET Backend. Đã có trong Phase 3, sẽ làm xịn hơn.

---

## 🚷 2. HỌC TÍNH NĂNG ĐỐI THỦ (CÓ TECH BLOCKERS CẦN LƯU Ý)

### D. Đồng bộ thiết bị đeo (Wearable / Health Sync) như WAO
* **Tính năng:** Lấy số bước chân, calo tiêu hao từ Apple Health (iOS) và Google Fit / Health Connect (Android).
* **Rào cản kỹ thuật (CỰC KỲ QUAN TRỌNG):** Cả thư viện `react-native-health` (Apple HealthKit) và `react-native-health-connect` **KHÔNG THỂ CHẠY TRONG APP EXPO GO**. Những thư viện này can thiệp rất sâu vào Native Code của Hệ điều hành.
* **Hướng giải quyết:**
  * **Với Android:** Phải build ra file `.apk` (như đã chốt) thì tính năng này mới chạy được.
  * **Với iOS:** Vì chúng ta đã chốt "Zero-cost" (hướng dẫn tải Expo Go QR code), thiết bị iOS sẽ **Crashes (Văng app)** ngay lập tức nếu gọi Apple Health. 
* **Đề xuất kết luận:** Chỉ làm **Google Health Connect** cho Android. Bỏ qua Apple HealthKit để bảo toàn app Expo Go cho đồ án. (Độ khó: High - 3 ngày).

### E. Quét mã vạch (Barcode Scanner) như WAO, CalSnap, Caloer
* **Tính năng:** Quét mã vạch bánh snack ra calo.
* **Đánh giá:** Rất khả thi. React Native Vision Camera có sẵn module scan barcode cực mượt. Data thì gọi API miễn phí từ `OpenFoodFacts` (Có data vài nghìn món VN đồ đóng gói). Cái nào API ko có thì cho user tự điền.
* **Đề xuất ráp vào Plan:** Khả thi 100%, UI thân thiện. (Độ khó: Medium - 2 ngày).

### F. Chế độ Tập luyện (Exercise Tracking) như Caloer
* **Tính năng:** Đưa ra các bài tập (Gym, chạy bộ) để trừ calo.
* **Đánh giá:** 
  * Nếu tự làm thư viện bài tập (DB chứa Squat, Push-up, Yoga, tính Calo theo METs) -> Cần sửa Database cực mạnh (Thêm > 5 bảng mới), UI thêm hẳn 1 tab lớn.
  * **Đề xuất kết luận:** Vì nguồn lực chỉ có 2 Dev và thời hạn đồ án 6 tuần, ôm thêm mảng "Tập luyện" sẽ làm nát cấu trúc "Dinh dưỡng" hiện tại. Tạm thời **từ chối** phát triển mảng này (để dành cho version EatFitAI 2.0). Thay vào đó, lấy calo tiêu hao tự động từ Google Health Connect (Tính năng D) là đủ ngon rồi.

### G. Chọn định lượng & Phương pháp nấu (Portion & Cooking Method) như WAO
* **Tính năng:** 1 lạng thịt heo "Luộc" calo khác "Chiên xù".
* **Đề xuất kết luận:** Khả thi 100%. Khi scan món hoặc gõ chữ, cho phép user chọn (Hấp, Luộc, Chiên, Nướng). Backend nhân hệ số calo (VD: Chiên x 1.3 Calo, x 1.5 Fat). Rất dễ code và trông cực kỳ chuyên nghiệp. (Độ khó: Low - 1 ngày).

---

## 🎯 TỔNG KẾT ACTION ITEMS (ĐỂ ĐƯA VÀO PLAN/TASK)

NẾU bẠN ĐỒNG Ý, mình sẽ cộng thêm các Task sau vào `task.md` (Giai đoạn Phase 3):
1. **[Bơm AI]** Thêm Gemini 2.5 Flash làm fallback bắt ảnh cho YOLOv8, bóc JSON.
2. **[Bơm AI]** Chuyển VoiceScreen thành "Smart Input" (vừa ghi âm, vừa gõ chữ bóc tách).
3. **[Feature]** Tích hợp Barcode Scan + API OpenFoodFacts.
4. **[Feature]** Android Health Connect (Chỉ Android). Bỏ Apple Health.
5. **[Feature]** Thêm tuỳ chọn "Phương pháp chế biến" (Cooking method multiply) vào màn hình cộng món ăn.

Bạn xác nhận phương án này chứ? Nếu gửi chữ OK, mình sẽ đập tất cả đồ chơi này vào `task.md` và bắt tay vào Code ngay tính năng đầu tiên!
