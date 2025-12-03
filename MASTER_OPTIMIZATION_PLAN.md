# 🚀 MASTER OPTIMIZATION PLAN: EATFITAI

**Date**: 2025-12-03  
**Status**: FINALIZED  
**Auditor**: Antigravity (AI Agent)

---

## 1. EXECUTIVE SUMMARY

Dự án **EatFitAI** có nền tảng kiến trúc tốt (Clean Architecture, React Native, .NET Core), nhưng đang tồn tại các lỗ hổng nghiêm trọng về **Bảo mật**, **Hiệu năng** và **Quản lý bộ nhớ** có thể gây crash app hoặc mất dữ liệu khi scale lên user thật.

*   **Overall Health Score**: **B- (75/100)** (Trước khi fix) -> Mục tiêu: **A (95/100)**
*   **Critical Risks**: 4 (Security Hole, Memory Leak, API Crash, Data Integrity)

---

## 2. DETAILED FINDINGS & SOLUTIONS

### 🛑 PRIORITY 1: CRITICAL FIXES (CẤP CỨU)
*Fix ngay lập tức để đảm bảo hệ thống chạy được và an toàn.*

| # | Khu vực | Vấn đề (Problem) | Giải pháp Tối ưu (Solution) |
| :--- | :--- | :--- | :--- |
| **1.1** | **Security** | **Refresh Token Hole**: API `RefreshToken` không kiểm tra token trong DB. Hacker có thể fake token để chiếm quyền. | **Implement Token Storage**: Tạo bảng `UserTokens`, lưu hash của refresh token và validate chặt chẽ khi refresh. |
| **1.2** | **Mobile** | **Memory Crash**: `AiCameraScreen` request `base64` ảnh (10MB+ RAM) gây crash trên máy yếu. | **Stream Upload**: Bỏ `base64: true`. Upload trực tiếp file `uri` dùng `FormData` (Multipart). |
| **1.3** | **Backend** | **API Crash**: API `GET /meal-diary` trả về full history. Crash server/app khi data lớn. | **Pagination**: Implement `PagedRequest` (Page/Size) cho Service & Controller. |
| **1.4** | **Mobile** | **Encoding Error**: File `AiCameraScreen.tsx` bị lỗi encoding tiếng Việt (`L?i`, `M?y ch?`). | **Fix Encoding**: Save file as UTF-8 with BOM hoặc sửa lại text. |

### 🚀 PRIORITY 2: PERFORMANCE & SCALABILITY (TĂNG TỐC)
*Tối ưu để app mượt mà, chịu tải 10,000+ users.*

| # | Khu vực | Vấn đề (Problem) | Giải pháp Tối ưu (Solution) |
| :--- | :--- | :--- | :--- |
| **2.1** | **Database** | **Missing Indexes**: Query chậm. (Đã fix một phần). | **Apply Full Indexes**: Re-run script SQL đã fix lỗi schema để tạo đủ 7 indexes. |
| **2.2** | **Mobile** | **List Lag**: `FlatList` giật khi scroll danh sách dài. | **Optimize FlatList**: Thêm `getItemLayout`, `removeClippedSubviews`, `windowSize`. |
| **2.3** | **Mobile** | **State Chaos**: Dùng lẫn lộn `useState`/`Zustand` để fetch data. Khó cache. | **React Query Migration**: Chuyển tất cả Server State sang React Query (cache, dedup, background update). |
| **2.4** | **Backend** | **Logging**: Dùng `Console.WriteLine` (chậm, khó debug). | **Serilog/ILogger**: Chuyển sang Structured Logging. |

### 💎 PRIORITY 3: CODE QUALITY & UX (LÀM ĐẸP)
*Code sạch, dễ bảo trì, trải nghiệm người dùng tốt.*

| # | Khu vực | Vấn đề (Problem) | Giải pháp Tối ưu (Solution) |
| :--- | :--- | :--- | :--- |
| **3.1** | **Backend** | **Logic Duplication**: Logic tính dinh dưỡng lặp lại ở 2 nơi. | **NutritionService**: Extract logic tính toán ra service riêng (DRY). |
| **3.2** | **Backend** | **Input Validation**: Thiếu check data đầu vào (calo âm, ngày tương lai). | **FluentValidation**: Thêm validation rules cho tất cả DTOs. |
| **3.3** | **Mobile** | **Hardcoding**: Hardcode API paths, strings. | **Config & i18n**: Move config ra env, strings ra file resource. |
| **3.4** | **Mobile** | **Accessibility**: Font không scale. | **Dynamic Type**: Implement scaling font size theo setting OS. |

---

## 3. IMPLEMENTATION ROADMAP

### 📅 PHASE 1: STABILITY (Ngay bây giờ - 4 giờ)
1.  Fix **Refresh Token** (Backend).
2.  Fix **Pagination** (Backend).
3.  Fix **Camera Memory Leak** (Mobile).
4.  Fix **Encoding** (Mobile).

### 📅 PHASE 2: PERFORMANCE (Sprint 1 - 2 ngày)
1.  Apply **Database Indexes** (Full).
2.  Optimize **FlatList** (Mobile).
3.  Migrate **React Query** (Mobile).

### 📅 PHASE 3: POLISH (Sprint 2 - 2 ngày)
1.  Implement **Validation** & **Logging**.
2.  Refactor **Nutrition Service**.
3.  Fix **UI/UX** (Font, Flow).

---

## 4. EXPECTED OUTCOME

Sau khi hoàn thành plan này:
*   ✅ **Zero Critical Bugs**: Không còn lỗi bảo mật hay crash app.
*   ✅ **High Performance**: API response < 200ms, App scroll 60fps.
*   ✅ **Production Ready**: Code sạch, dễ bảo trì, sẵn sàng deploy.

---
**END OF PLAN**
