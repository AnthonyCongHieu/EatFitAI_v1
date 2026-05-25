# Kế Hoạch Cải Tiến: Trực Quan Hóa & Dễ Tiếp Cận Cho Người Dùng Trung Bình

## 🎯 Vấn Đề Cốt Lõi

> [!CAUTION]
> **"1 người có khả năng trung bình nhìn vào chả hiểu cái gì cả"** — Đây là phản hồi trực tiếp từ người dùng. Ứng dụng hiện tại quá tải thông tin kỹ thuật, biểu đồ SVG nhỏ khó đọc, navigation phức tạp, và không có hướng dẫn tiếp cận.

### Phân Tích Nguyên Nhân (từ review code hiện tại)

| # | Vấn đề | Mức nghiêm trọng | File liên quan |
|---|--------|-------------------|----------------|
| 1 | **Information Overload** — Quá nhiều text kỹ thuật ở cùng 1 level, không phân biệt cốt lõi vs phụ | 🔴 Critical | [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx) (1536 dòng) |
| 2 | **SVG Dataflow quá nhỏ** — ViewBox 600x150, text 8-10px, stage 3&5 nodes chồng chéo | 🔴 Critical | Learn.tsx (renderStageXSVG) |
| 3 | **Navigation trùng lặp** — Tab Quiz trong Learn.tsx trùng với View Quiz.tsx ở sidebar | 🟡 Medium | Learn.tsx, App.tsx |
| 4 | **Không lưu tiến trình** — Radar scores, stage đã học, quiz results reset khi reload | 🔴 Critical | Learn.tsx |
| 5 | **Thiếu guided path** — Không có progress indicator, không biết bắt đầu từ đâu | 🟡 Medium | Learn.tsx |
| 6 | **KnowledgeMap quá phức tạp** — 24 nodes, 25 edges, thiếu onboarding | 🟡 Medium | [KnowledgeMap.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/KnowledgeMap.tsx) |
| 7 | **Thiếu câu hỏi phản biện** — Hiện có 12, tài liệu yêu cầu 15 câu bắt buộc | 🟡 Medium | Learn.tsx |

---

## 🌟 Giải Pháp Đề Xuất — 5 Pha

---

### Pha 1: 🧹 Giảm Quá Tải — "Nhìn Vào Là Hiểu Ngay"

**Mục tiêu:** Mỗi section lý thuyết phải có TL;DR 1-2 dòng ở đầu, phân cấp nội dung rõ ràng (Cốt lõi / Nâng cao), và ẩn chi tiết vào accordion.

#### [MODIFY] [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx)

1. **Thêm TL;DR Summary Box** cho mỗi section trong `handbookStages`:
   - Mỗi section thêm field `tldr: string` — tóm tắt 1-2 câu ngắn gọn dễ hiểu
   - Render TL;DR box nổi bật (gradient background, icon 💡) trước nội dung chi tiết
   - Ví dụ: *"YOLO11m là AI nhận diện món ăn qua camera, chạy được trên server giá rẻ $10/tháng mà vẫn nhanh 55ms"*

2. **Phân cấp nội dung bằng Badge "CỐT LÕI" / "NÂNG CAO"**:
   - Thêm field `level: 'core' | 'advanced'` cho mỗi section
   - Section core: Badge xanh lá `🟢 CỐT LÕI` — Kiến thức bắt buộc phải nắm
   - Section advanced: Badge tím `🟣 NÂNG CAO` — Ẩn theo accordion, click mới mở
   - Mặc định chỉ hiện phần CỐT LÕI → giảm 40-50% lượng text hiển thị ban đầu

3. **Xóa Tab Quiz trùng lặp** trong Learn.tsx (đã có Quiz.tsx riêng ở sidebar)

---

### Pha 2: 📊 Nâng Cấp SVG Dataflow — "Nhìn Biểu Đồ Là Thấy Luồng Dữ Liệu"

**Mục tiêu:** SVG lớn hơn, text đọc được, có tooltip khi hover, animated step-by-step storytelling.

#### [MODIFY] [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx)

1. **Tăng kích thước SVG Dataflow**:
   - Thay đổi viewBox từ `600x150` → `800x220` (tăng 33% chiều rộng, 47% chiều cao)
   - Tăng font size text trong SVG từ 8-10px → 11-13px
   - Giãn khoảng cách giữa nodes để tránh chồng chéo (đặc biệt Stage 3, 5)

2. **Thêm Interactive Tooltip khi Hover**:
   - Khi hover lên node SVG → hiện tooltip box giải thích ngắn gọn
   - Ví dụ: Hover node "Caddy" → *"Reverse proxy tự động cấp SSL miễn phí, thay thế Nginx. Chỉ cần 3 dòng config."*
   - Tooltip dùng CSS `position: absolute` overlay, không phải SVG `<title>`

3. **Animated Step-by-Step Mode**:
   - Thêm nút "▶️ Xem Từng Bước" bên dưới mỗi SVG
   - Khi bật: Các node highlight lần lượt từ trái→phải theo timeline
   - Hiệu ứng: Node active phát sáng xanh + mũi tên chạy pulse + caption text xuất hiện từng bước
   - Giúp người xem hiểu luồng dữ liệu theo thứ tự thay vì nhìn cả sơ đồ 1 lúc

4. **Thêm Legend Box** phía trên SVG:
   - Chú giải màu sắc: 🟢 Node xử lý | 🔵 Node lưu trữ | 🟡 Node AI | ➡️ Luồng dữ liệu
   - Giúp người mới hiểu ngay ý nghĩa các thành phần

---

### Pha 3: 🗺️ Guided Learning Path — "Biết Mình Đang Ở Đâu"

**Mục tiêu:** Progress tracking, lưu tiến trình, và visual stepper giúp người học biết mình đã hoàn thành đến đâu.

#### [MODIFY] [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx)

1. **Progress Stepper Bar** ngang trên đầu tab Handbook:
   - 6 bước tương ứng 6 Stages, hiển thị dạng thanh ngang với icons
   - Trạng thái: ⬜ Chưa học | 🟡 Đang học | ✅ Đã nắm vững
   - Click vào stage bất kỳ để nhảy tới
   - Tổng kết: `"Tiến trình: 3/6 Stages (50%)"` với progress bar

2. **Nút "✅ Đánh dấu đã nắm vững"** cuối mỗi Stage:
   - Khi click → Stage chuyển trạng thái ✅ trên Stepper
   - Tự động cập nhật Radar Chart (tăng điểm tiêu chí tương ứng lên 4-5)

3. **localStorage Persistence**:
   - Lưu `rubricScores`, `completedStages`, `activeStage` vào localStorage
   - Khi reload trang → khôi phục trạng thái học tập
   - Key: `eatfitai-prep-progress`

4. **Welcome/Onboarding Box** (chỉ hiện lần đầu):
   - Hiện khi chưa có data localStorage
   - Nội dung: *"Chào mừng bạn đến với EatFitAI Prep! Hãy bắt đầu từ Stage 1 và học qua từng bước. Mỗi stage tương ứng 1 phần trong Rubric chấm điểm tốt nghiệp."*
   - Nút "Bắt đầu" → nhảy đến Stage 1

---

### Pha 4: 📝 Mở Rộng Nội Dung Rubric & Phản Biện

**Mục tiêu:** Bổ sung câu hỏi phản biện từ 12→15 theo tài liệu, thêm "cách diễn đạt trước hội đồng".

#### [MODIFY] [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx)

1. **Bổ sung 3 câu hỏi phản biện mới** (từ tài liệu 15 câu bắt buộc):
   - *"V1 release vẫn BLOCKED dù nhiều gate pass — Giải thích tại sao?"*
   - *"Gemini hết quota → App fallback ra sao?"*
   - *"Rollback Lightsail → Render thì điều kiện là gì?"*

2. **Thêm "💬 Cách Diễn Đạt Trước Hội Đồng"** cho mỗi Q&A:
   - Field mới: `speakingTip: string` — Cách nói ngắn gọn, tự tin trước giảng viên
   - Ví dụ: *"Thưa thầy/cô, em tách AI Provider riêng vì lý do độc lập scaling — khi lượng request scan tăng đột biến, em chỉ cần scale instance AI mà không ảnh hưởng backend chính."*
   - Render dưới đáp án kỹ thuật với icon 🎤 và border khác biệt

3. **Cải thiện Rubric Badge mapping**:
   - Mỗi section lý thuyết thêm badge nhỏ: `🎯 Rubric: Thiết kế → TỐT (1.0đ)`
   - Liên kết trực tiếp nội dung học → tiêu chí chấm điểm cụ thể
   - Hiệu ứng hover: tooltip hiển thị mô tả chi tiết tiêu chí

---

### Pha 5: 🔧 Kiểm Thử & Tối Ưu

#### Build & Verify
```powershell
npx tsc --noEmit --skipLibCheck
npm run build
```

#### Manual Verification
1. **Test TL;DR & phân cấp**: Mở Handbook → Chỉ thấy TL;DR + phần CỐT LÕI. Click "Xem thêm" → hiện phần NÂNG CAO
2. **Test SVG Dataflow**: Hover node → tooltip hiện. Bấm "▶️ Xem Từng Bước" → nodes highlight tuần tự
3. **Test Progress Tracking**: Học Stage 1 → bấm "Đã nắm vững" → Stepper cập nhật. Reload trang → tiến trình vẫn còn
4. **Test Q&A mới**: Mở Stage phản biện → thấy 15 câu hỏi. Click mở → thấy đáp án + "Cách diễn đạt trước hội đồng"

---

## ⚠️ User Review Required

> [!IMPORTANT]
> **Phạm vi thay đổi:** Kế hoạch này tập trung 100% vào file [Learn.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx) và [index.css](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/index.css). Không thay đổi KnowledgeMap.tsx, Infrastructure.tsx hay các view khác.

> [!WARNING]
> **Tab Quiz bị xóa:** Pha 1 sẽ xóa tab "Trắc Nghiệm" bên trong Learn.tsx vì trùng lặp chức năng với view Quiz.tsx ở sidebar. Bạn có đồng ý không?

## Open Questions

1. **Mức độ chi tiết TL;DR**: Bạn muốn TL;DR viết dạng "giải thích cho người không biết gì" hay "tóm tắt ngắn gọn cho người đã biết cơ bản"?
2. **Animated Step-by-Step**: Bạn thích mode "tự chạy animation" hay "bấm nút Next để đi từng bước"?
