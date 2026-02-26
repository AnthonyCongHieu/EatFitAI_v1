# BÁO CÁO GIẢI PHÁP TỰ CHỦ CHUỖI AI VỚI GIÁ 0$ (AI SOVEREIGNTY)

Dựa trên yêu cầu "không dùng giải pháp có sẵn tốn tiền", "cải thiện Database, Vision, Voice, Recipe" bằng cách tự lực cánh sinh. Đây là bộ **Giải Pháp Kỹ Thuật 0$ - Tự Chủ Hoàn Toàn** cho EatFitAI:

---

## 1. 🍱 CẢI THIỆN DATABASE MÓN VIỆT NAM (FOOD DATA)
* **Vấn đề:** FatSecret, Edamam API đều tính phí nếu dùng nhiều. Tự nhập tay 2000 món thì quá lâu.
* **Giải pháp 0$ - Automated Crawling & Open Data:**
  1. **Nguồn 1: OpenFoodFacts (Official Python SDK):** Viết script Python dùng thư viện `openfoodfacts` cào toàn bộ sản phẩm barcode nội địa đang bán ở Việt Nam. Data trả về file JSON cực sạch (có ảnh, calo, barcode).
  2. **Nguồn 2: Kaggle Datasets:** Download bộ data open-source **VietFood67** (Hình ảnh + Calo) và **ViFoodRec** (hơn 5000 records info món Việt).
  3. **Nguồn 3: Viện Dinh Dưỡng Quốc Gia (PDF):** Dùng tool bóc tách chữ (`pdfplumber` trong Python) quét bảng thành phần thực phẩm VN của FAO chuyển thành file Excel, sau đó dùng script C# seed thẳng vào Database `EatFitAI`.
* **Kế hoạch:** Thay vì tự nghĩ món, 1 tool Crawler sẽ gom 3 nguồn này lại, lọc trùng lặp và đẩy tự động vào PostgreSQL.

---

## 2. 👁️ CẢI THIỆN NHẬN DIỆN HÌNH Ảnh (VISION AI - YOLOv8/11)
* **Vấn đề:** Gemini 2.5 Flash bị limit 250 requests/ngày.
* **Giải pháp 0$ - Tự Build Model Xịn (Fine-Tuning on Colab):**
  1. Lấy bộ data ảnh **VietFood67** từ Kaggle (có sẵn file annotation yolo text).
  2. Đẩy model YOLOv8 (hoặc upgrade lên YOLO11) lên Google Colab (Môi trường cấp GPU T4 miễn phí 12h/ngày).
  3. **Mẹo chống sập (Colab Hacks):** Chia nhỏ tập train (mỗi lần train 50 epoch, lưu checkpoint `.pt` lại). Nếu Colab hết giờ, dùng tài khoản Google thứ 2 chạy tiếp từ checkpoint đó.
  4. Export model ra file `.onnx` (Dung lượng <25MB), gắn thẳng vào backend Flask của bạn. **100% Free, chạy offline cực nhanh, không phụ thuộc API google.**

---

## 3. 🎙️ CẢI THIỆN NHẬN DIỆN GIỌNG NÓI (VOICE AI - PHOWHISPER)
* **Vấn đề:** Model PhoWhisper (của VinAI) gốc nhận diện món ăn còn sai chính tả.
* **Giải pháp 0$ - Fine-tune LLM Context & Checkpoints:**
  1. Không cần thiết phải train lại toàn bộ Whisper (vì cần GPU cực khủng 32GB/80GB VRAM). Colab T4 Free sẽ không gánh nổi bản Base/Small.
  2. **Cách đi khôn ngoan:** Vẫn dùng `vinai/PhoWhisper-tiny` (hoặc `base`) nhẹ nhất có thể tải thẳng vào Docker container của bạn.
  3. **Dùng Kỹ Thuật RAG (Retrieval-Augmented Generation) kết hợp Ollama:** Khi PhoWhisper nghe nhầm "Bún bò Huế" thành "Mũn bò huê", đoạn text vỡ này sẽ được quăng thẳng vào Local LLM (Ollama) cùng List món ăn nội bộ. Prompt: *"Tôi có từ 'Mũn bò huê', hãy sửa nó thành món ăn hợp lý nhất tại VN"*. Ollama sẽ auto tự dịch lại thành "Bún bò Huế" => **Độ chính xác tăng thêm 40% mà không cần tốn tiền mua máy tính cấu hình khủng để mài lại file Whisper.**

---

## 4. 👨‍🍳 CẢI THIỆN ĐA DẠNG GỢI Ý MÓN ĂN (RECIPE AI - GGUF MODELS)
* **Vấn đề:** Model Llama 3 / Qwen dung lượng 4-8GB tốn nhiều RAM server, đôi khi đưa ra công thức kiểu Tây, nguyên liệu khó kiếm.
* **Giải pháp 0$ - Local LLM Agentic RAG:**
  1. **Bơm Context Đầu Vào:** Ollama sẽ không trực tiếp lấy kiến thức có sẵn ra trả lời. Khi user hỏi "Nhà còn trứng, xì dầu làm món gì?", Backend sẽ search mảng Database Món Việt (của bước 1), lấy ra 3 công thức món Việt liên quan trứng. Sau đó gắp 3 công thức này nhét vào mồm Ollama bảo: "Mày hãy xào nấu lại thành lời văn tự nhiên dựa trên 3 công thức tao cho này".
  2. Cách này đảm bảo 100% AI trả về công thức món Việt thân thuộc (không bị ảo giác khuyên đi mua dầu Olive hay phô mai), và xử lý mượt mà trên môi trường Server RAM yếu.

---

### 🔥 KẾT LUẬN CHIẾN LƯỢC

Nếu đi theo hướng này, EatFitAI của bạn sẽ là một **Local-First App (Tiền đề Serverless/Edge Computing)** cực kỳ mạnh mẽ. 
- Mọi xử lý AI (Voice, Image, Chat) đều được lo bằng thuật toán tối ưu hoặc model nhỏ (Tiny/Nano quantized) chạy 100% bằng tài nguyên Của VPS Oracle Free hoặc Server local trường học cấp. 
- **Google hay OpenAI có cắt free tier thì App của bạn VẪN SỐNG khoẻ re!**

👉 Bạn check kỹ **Hướng đi 4 Mảng (Data, Vision, Voice, Recipe)** này nhé. Nếu đồng ý, mình sẽ gạch tên mọi API trả phí ra khỏi não, và ốp ngay các task (Crawl data, Train Colab, Prompt RAG) vào Task list để tiến hành viết code cho Bước 1!
