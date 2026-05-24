# System Maximum Capacity & Data Egress Optimization

Mục tiêu của kế hoạch này là khắc phục triệt để lỗ hổng gây lãng phí Băng thông (Data Egress) và RAM (Memory OOM) trong hệ thống API tìm kiếm món ăn, đồng thời cải thiện khả năng mở rộng (maximum capacity) và trải nghiệm người dùng (UX) thông qua phân trang (pagination).

## User Review Required

> [!CAUTION]
> Các thay đổi này ảnh hưởng trực tiếp đến lõi truy vấn dữ liệu của Entity Framework Core. Bằng cách chuyển từ Client-side (Lấy toàn bộ data về RAM) sang Server-side Evaluation (Chỉ lấy đúng số lượng limit từ Database), mức sử dụng RAM và Data Egress của Supabase sẽ giảm đi hàng trăm lần. Vui lòng xác nhận sự thay đổi này.

> [!IMPORTANT]
> PostgreSQL mặc định khi dùng `ILIKE` sẽ bỏ qua hoa/thường (Case-Insensitive) nhưng KHÔNG bỏ qua dấu tiếng Việt (Accent-Insensitive). May mắn là model `FoodItem` đã có cột `FoodNameUnsigned` nên chúng ta sẽ map chuỗi tìm kiếm không dấu vào cột này. Đối với `UserFoodItem` (không có cột Unsigned), tìm kiếm sẽ phụ thuộc vào độ chính xác của dấu tiếng Việt. 

## Open Questions

Không có câu hỏi mở ở thời điểm hiện tại. Vấn đề đã được xác định rất rõ ràng từ code thực tế.

## Proposed Changes

---

### API Controllers

#### [MODIFY] `FoodController.cs`
- Thêm tham số `[FromQuery] int skip = 0` vào các endpoint:
  - `GET /api/food/search`
  - `GET /api/food/search-all`
  - `GET /api/food/recent`
- Truyền `skip` xuống tầng Service. Điều này cho phép phía Mobile App làm tính năng "Infinite Scroll" (Tải thêm).

---

### Service Layer

#### [MODIFY] `IFoodService.cs` & `FoodService.cs`
- Cập nhật chữ ký hàm (signature) để nhận thêm biến `skip`:
  - `SearchFoodItemsAsync(string searchTerm, int skip = 0, int limit = 50)`
  - `SearchAllAsync(string searchTerm, Guid? userId, int skip = 0, int limit = 50)`
  - `GetRecentFoodsAsync(Guid userId, int skip = 0, int limit = 20)`
- Tối ưu `GetRecentFoodsAsync` (hạn chế các thao tác join và in-memory nặng nề nếu có thể, thêm skip).

---

### Repository Layer (LÕI VẤN ĐỀ)

#### [MODIFY] `IFoodItemRepository.cs` & `FoodItemRepository.cs`
- Cập nhật chữ ký hàm: `SearchByNameAsync(string searchTerm, int skip = 0, int limit = 50)`
- Xóa bỏ hoàn toàn lời gọi `.ToListAsync()` sai lầm đang kéo cả DB về RAM.
- Thay thế bằng truy vấn SQL thực thụ sử dụng `EF.Functions.ILike`:
```csharp
var normalizedSearchTerm = NormalizeForSearch(searchTerm.Trim());
var items = await _context.FoodItems
    .AsNoTracking() // Tối ưu thêm memory
    .Where(fi => fi.IsActive && !fi.IsDeleted &&
                (EF.Functions.ILike(fi.FoodName, $"%{searchTerm}%") ||
                 EF.Functions.ILike(fi.FoodNameEn, $"%{searchTerm}%") ||
                 EF.Functions.ILike(fi.FoodNameUnsigned, $"%{normalizedSearchTerm}%")))
    .OrderBy(fi => fi.FoodName)
    .Skip(skip)
    .Take(limit)
    .ToListAsync();
```

#### [MODIFY] `IUserFoodItemRepository.cs` & `UserFoodItemRepository.cs`
- Cập nhật `SearchByUserAsync` để loại bỏ `.ToListAsync()` trước khi `Where`.
- Dùng `EF.Functions.ILike` để lọc ngay trên PostgreSQL.
- Sửa lại hàm `CountByUserAsync` để không bao giờ pull data về memory đếm `Count`.

## Verification Plan

### Automated Tests
- Chạy lệnh `dotnet build` để đảm bảo code compile thành công.
- Chạy `dotnet test` để kiểm tra không phá vỡ logic Unit Tests của Service/Repository.

### Manual Verification
- Sẽ sử dụng trình duyệt/cURL để test thực tế gọi API `/api/food/search?q=pho&limit=5&skip=5` và xác minh rằng log trả về dữ liệu siêu nhanh, và quan trọng nhất là SQL sinh ra có `LIMIT` và `OFFSET` thay vì truy vấn rỗng không có điều kiện.
