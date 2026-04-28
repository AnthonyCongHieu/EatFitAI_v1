# Đánh giá & Kế hoạch Khắc phục EatFitAI (Giai đoạn 1)

## 1. Xác nhận chiến lược Key Premium (Fallback)
Đối với bản Production thương mại, giải pháp **sử dụng 1 key Gemini Premium (Pay-as-you-go) làm fallback** là hoàn toàn chính xác và đủ dùng. 
- **Lý do:** Ở mức độ scale hiện tại, một key trả phí sẽ xử lý toàn bộ các request vượt ngưỡng (rate limit) của các key free mà không gây sập hệ thống. 
- **Kết luận:** Đây là chiến lược an toàn, cân bằng tốt giữa trải nghiệm người dùng (không bị lỗi 429) và tối ưu chi phí R&D. Tôi hoàn toàn nhất trí với bạn.

## 2. Giải thích rõ hơn về vấn đề Edge AI (Đưa model xuống App)
Ở lần trước, tôi có đề cập đến rủi ro "Model Theft" (Bị trộm Model) nếu đưa AI xuống điện thoại (Edge AI). 
- **Giải thích cụ thể:** Nếu bạn nhúng trực tiếp file nhận diện (ví dụ file `.onnx`) vào bên trong ứng dụng di động (app Android/iOS) để nó tự phân tích ảnh không cần internet. Bất kỳ ai tải app của bạn về cũng có thể "bung" file cài đặt (APK) ra và lấy cắp file model đó để làm app đối thủ chỉ trong 5 phút.
- **Lợi ích của Server AI (Hiện tại):** Ngoài việc bảo mật model, việc đưa ảnh lên Server giúp bạn **thu thập được dữ liệu thực tế** (ảnh người dùng chụp hằng ngày). Dữ liệu này là vàng để bạn tiếp tục train cho AI ngày càng thông minh hơn. Đưa model xuống app offline thì bạn sẽ "mù" thông tin này.

## 3. Các hạng mục dự kiến thay đổi & khắc phục (Chuẩn bị cho Phase Đánh giá sâu)
Để chuẩn bị cho yêu cầu tiếp theo (soi lỗi user flow, đánh giá 5 góc độ: học thuật, bảo mật, hiệu năng, thẩm mỹ, thương mại, và barcode), hệ thống cần chuẩn bị khắc phục các vấn đề cốt lõi sau:
1. **Kiến trúc Gemini Pool (shared_gemini_pool.py):** Thay vì mỗi request tạo 1 object kết nối mới, hệ thống sẽ sử dụng Singleton Pattern (1 pool dùng chung) để quản lý luân chuyển các key AI, tránh rò rỉ bộ nhớ (Memory Leak) và tăng tốc độ phản hồi.
2. **Luồng Barcode:** Phục hồi và hoàn thiện logic xử lý mã vạch từ Mobile -> Backend -> AI Provider (Hiện tại đang bị đứt gãy hoặc không có dữ liệu trả về hợp lý).
3. **Thẩm mỹ (UI/UX) & Trạng thái tải:** Khắc phục trải nghiệm chờ đợi "chết" của người dùng khi AI đang xử lý, bổ sung các animation hoặc thông báo trạng thái realtime.

---
*Tiến độ này sẽ được commit và push để lưu trữ trước khi bước vào phân tích sâu.*
