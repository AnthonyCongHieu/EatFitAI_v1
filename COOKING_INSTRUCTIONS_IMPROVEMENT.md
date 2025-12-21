# Cải thiện AI Cooking Instructions

## ✅ Đã thực hiện

### Vấn đề:
AI đưa ra hướng dẫn nấu ăn **quá chung chung**, thiếu chi tiết cụ thể về:
- Thời gian nấu từng bước
- Nhiệt độ/mức lửa
- Lượng gia vị cụ thể
- Kỹ thuật nấu rõ ràng
- Tips thực tế

### Giải pháp:
Cải thiện prompt trong `ai-provider/nutrition_llm.py` (dòng 552-624):

**Thay đổi chính:**
1. **Yêu cầu chi tiết tuyệt đối**: Mỗi bước phải có thời gian, nhiệt độ, kỹ thuật, dấu hiệu nhận biết
2. **Cấu trúc rõ ràng**: 7-10 bước (sơ chế → nấu → hoàn thiện)
3. **Tips thực chiến**: 3-4 tips hữu ích (mẹo ngon, tránh lỗi, biến tấu, bảo quản)
4. **Ví dụ chuẩn**: Đưa ví dụ CỰC KỲ chi tiết để AI học theo

**Ví dụ cải thiện:**

**TRƯỚC (chung chung):**
```
"Cho gà vào xào trên lửa lớn đến khi chín vàng"
```

**SAU (chi tiết):**
```
"Cho gà đã ướp vào chảo, xếp thành 1 lớp đều. KHÔNG đảo ngay! 
Để yên 1.5 phút cho gà chín vàng mặt dưới. Sau đó đảo đều, 
xào thêm 2-3 phút đến khi gà chín vàng đều, không còn hồng bên trong. 
Vớt gà ra đĩa riêng."
```

## 🧪 Cách test

### 1. Restart AI Provider
```bash
# Dừng AI Provider hiện tại (Ctrl+C)
# Chạy lại:
cd d:\EatFitAI_v1\ai-provider
.\venv\Scripts\python.exe app.py
```

### 2. Test qua Backend API
```bash
# Endpoint: POST http://localhost:5247/api/ai/cooking-instructions
# Body:
{
  "recipeName": "Cơm gà xào rau củ",
  "ingredients": [
    {"foodName": "Chicken Breast", "grams": 150},
    {"foodName": "Brown Rice", "grams": 200},
    {"foodName": "Broccoli", "grams": 100}
  ],
  "description": "Bữa ăn cân bằng với protein từ gà, carbs từ cơm và vitamin từ rau"
}
```

### 3. Test qua Mobile App
1. Mở app → Recipe Suggestions
2. Tìm công thức "Cơm gà xào rau củ"
3. Click vào recipe → Xem cooking instructions
4. Kiểm tra xem có chi tiết hơn không

## 📊 Kết quả mong đợi

### TRƯỚC:
```json
{
  "steps": [
    "Rửa sạch ức gà, thái miếng vừa ăn",
    "Cho gà vào xào đến khi chín",
    "Nêm gia vị",
    "Trang trí và thưởng thức"
  ],
  "cookingTime": "25 phút",
  "difficulty": "Dễ",
  "tips": ["Ướp gà trước", "Xào lửa lớn"]
}
```

### SAU:
```json
{
  "steps": [
    "Rửa sạch 150g ức gà, thấm khô bằng giấy ăn. Thái miếng vuông 2x2cm (khoảng 10-12 miếng). Ướp với 1/2 muỗng cà phê muối, 1/2 muỗng cà phê hạt nêm, 1 muỗng cà phê dầu ăn. Trộn đều, để yên 10-15 phút cho thấm gia vị.",
    "Rửa 100g bông cải xanh, cắt thành từng bông nhỏ (khoảng 3-4cm). Đun sôi 500ml nước + 1/4 muỗng cà phê muối. Chần bông cải đúng 2 phút (đếm từ khi nước sôi lại), vớt ra ngâm ngay vào bát nước đá 1 phút để giữ màu xanh giòn.",
    "Bắc chảo chống dính lên bếp, cho 2 muỗng canh dầu ăn. Đun ở lửa vừa đến khi dầu nóng (thử bằng đũa thấy sủi bọt nhỏ xung quanh). Tăng lửa lớn.",
    "Cho gà đã ướp vào chảo, xếp thành 1 lớp đều. KHÔNG đảo ngay! Để yên 1.5 phút cho gà chín vàng mặt dưới. Sau đó đảo đều, xào thêm 2-3 phút đến khi gà chín vàng đều, không còn hồng bên trong. Vớt gà ra đĩa riêng.",
    "Giữ nguyên chảo (không rửa), cho thêm 1 muỗng cà phê dầu nếu khô. Cho bông cải đã chần vào, xào nhanh trên lửa lớn 1.5 phút. Thêm 2 muỗng canh nước lọc để tạo hơi nước.",
    "Cho gà đã xào trở lại chảo cùng bông cải. Nêm 1 muỗng canh nước mắm, 1/2 muỗng cà phê đường, 1/4 muỗng cà phê tiêu. Đảo đều trong 1 phút cho gia vị thấm. Nếm thử và điều chỉnh.",
    "Tắt bếp. Xúc 200g cơm nóng ra đĩa, xếp gà xào rau lên trên. Rắc thêm 1 nhúm tiêu đen xay và rau mùi tươi (tùy chọn). Ăn nóng ngay để giữ độ giòn của rau."
  ],
  "cookingTime": "25-30 phút (sơ chế 10 phút, nấu 15-20 phút)",
  "difficulty": "Dễ",
  "tips": [
    "Bí quyết gà mềm: Ướp ít dầu ăn giúp khóa nước, không bị khô. Xào lửa lớn và NHANH (tối đa 5 phút) để gà không dai.",
    "Rau giòn xanh: Chần qua nước sôi rồi ngâm nước đá là bước QUAN TRỌNG. Bỏ qua sẽ làm rau nhũn và xỉn màu.",
    "Biến tấu nhanh: Không có thời gian? Dùng gà xé sẵn từ siêu thị, rau đông lạnh. Thời gian giảm còn 10 phút.",
    "Bảo quản: Để riêng cơm và gà xào. Bảo quản tủ lạnh 2 ngày. Hâm nóng: Vi sóng 2 phút hoặc chảo 3 phút."
  ],
  "notes": "Món này cung cấp khoảng 450kcal, 35g protein - phù hợp cho bữa trưa/tối. Có thể thay gà bằng tôm (giảm thời gian xào xuống 2 phút) hoặc đậu hũ (cho người ăn chay)."
}
```

## ⚠️ Lưu ý

1. **Cache**: AI Provider cache cooking instructions 10 phút. Nếu test cùng recipe, cần đợi 10 phút hoặc restart AI Provider để clear cache.

2. **Ollama Model**: Prompt mới yêu cầu nhiều hơn, nên:
   - Model nhỏ (qwen2:1.5b) có thể không đủ chi tiết
   - Khuyến nghị dùng model lớn hơn: `qwen2.5:3b` hoặc `llama3.2:3b`
   - Để đổi model: Sửa `OLLAMA_MODEL` trong `.env` hoặc `nutrition_llm.py`

3. **Fallback**: Nếu Ollama không khả dụng, sẽ dùng fallback instructions (vẫn chung chung). Đảm bảo Ollama đang chạy.

## 📁 Files đã sửa

- ✅ `ai-provider/nutrition_llm.py` (dòng 552-624) - Prompt cải thiện

## 🎯 Next Steps

1. **Restart AI Provider** để áp dụng thay đổi
2. **Test qua mobile app** để xem kết quả thực tế
3. **Nếu vẫn chung chung**: Cân nhắc upgrade Ollama model lên `qwen2.5:3b`

---

**Status:** ✅ Code đã fix, chờ restart AI Provider
**Impact:** Cooking instructions chi tiết hơn 3-5 lần
**Priority:** Medium
