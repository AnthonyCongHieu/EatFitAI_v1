# Kế hoạch Sửa lỗi Giao diện Nút Header & Tối ưu hóa Mobile

Kế hoạch này khắc phục lỗi nút chuyển đổi theme (`.theme-toggle-btn`) bị co cụm biến dạng và đè lên nút "Tải APK" (`.btn-nav`) ở các màn hình laptop/tablet trung gian (từ 1025px đến 1180px), đồng thời đảm bảo hiển thị hoàn hảo trên giao diện di động.

## User Review Required

> [!IMPORTANT]
> **Giải pháp an toàn và tối ưu nhất:**
> Chúng tôi đề xuất giải pháp **không thay đổi các breakpoint 1024px hiện tại** (để tránh ảnh hưởng tới layout của hệ thống Bento grid), mà thay vào đó sẽ:
> 1. Sử dụng thuộc tính `flex-shrink: 0` để giữ nguyên hình dáng nút và ngăn chữ "Tải APK" bị ngắt dòng.
> 2. Thêm một media query trung gian từ `1025px` đến `1180px` để tự động thu nhỏ nhẹ khoảng cách và padding của các mục menu desktop. Việc này giúp thanh menu co giãn thông minh trên các màn hình laptop nhỏ mà không bị đè chữ hay tràn lấn.

## Proposed Changes

### [CSS Stylesheet]

#### [MODIFY] [styles.css](file:///d:/EatFitAI_v1/download-site/styles.css)

* **Bước 1: Ngăn chặn co cụm méo mó của Theme Toggle**
  Thêm `flex-shrink: 0;` vào quy tắc `.theme-toggle-btn` để đảm bảo nút luôn là hình tròn hoàn hảo `36px` x `36px` ở mọi điều kiện ép layout.
  ```css
  .theme-toggle-btn {
    /* ... giữ nguyên các style cũ ... */
    flex-shrink: 0; /* Ngăn nút bị ép thành hình bầu dục */
  }
  ```

* **Bước 2: Bảo vệ nút Tải APK trên Header**
  Thêm `flex-shrink: 0;` và `white-space: nowrap;` vào quy tắc `.nav-actions .btn-nav` để nút không bị co cụm và chữ "Tải APK" luôn nằm trên một hàng ngang sạch sẽ.
  ```css
  .nav-actions .btn-nav {
    /* ... giữ nguyên các style cũ ... */
    flex-shrink: 0;
    white-space: nowrap;
  }
  ```

* **Bước 3: Tối ưu hóa không gian ngang cho màn hình Laptop nhỏ (1025px - 1180px)**
  Thêm media query bổ sung để thu nhỏ nhẹ khoảng cách các link menu khi màn hình bị hẹp ngang, chừa chỗ cho các nút hành động bên phải:
  ```css
  /* Tối ưu hóa khoảng trống cho màn hình Laptop trung gian */
  @media (min-width: 1025px) and (max-width: 1180px) {
    .nav-links {
      gap: 4px !important;
      padding: 3px !important;
    }
    .nav-links a {
      padding: 6px 12px !important;
      font-size: 0.82rem !important;
    }
    .nav-actions {
      gap: 8px !important;
    }
    .nav-actions .btn-nav {
      padding: 8px 16px !important;
      font-size: 0.82rem !important;
    }
  }
  ```

## Verification Plan

### Automated Tests
- Sử dụng subagent `browser` để tải lại trang `http://localhost:3000` ở các viewport:
  - `1050px` (để kiểm tra xem menu đã co giãn đẹp mắt chưa, nút Tải APK có bị vỡ dòng và nút Theme có bị méo không).
  - `1200px` và `1440px` (để đảm bảo giao diện PC vẫn bình thường).
  - `375px` và `768px` (để đảm bảo giao diện Mobile không bị lỗi hay ảnh hưởng).
- Chụp ảnh màn hình nghiệm thu và lưu lại để đối chiếu.

### Manual Verification
- Xác minh trực quan các ảnh chụp màn hình sau khi sửa đổi để đảm bảo không còn hiện tượng chồng chéo, co cụm hay tràn chữ.
