# KẾ HOẠCH CẢI THIỆN UI ANIMATION (IMPROVEMENT PLAN)

## MỤC TIÊU
Tinh chỉnh các hiệu ứng chuyển động (animations) trong app để mượt mà hơn (smoother) và nhanh gọn hơn (faster), giảm bớt độ nảy (too strong) gây cảm giác khó chịu.  
Tập trung vào các thành phần: `Modal`, `FAB`, và `SmartAddSheet`.

## USER REVIEW REQUIRED
> [!NOTE]
> Thay đổi này sẽ làm cho các nút bấm và modal có cảm giác "đầm" hơn, ít nảy hơn nhưng phản hồi nhanh hơn.

## PROPOSED CHANGES

### Mobile App (`eatfitai-mobile`)

#### [MODIFY] [Modal.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/Modal.tsx)
- Điều chỉnh hiệu ứng nhấn nút (Press interaction):
  - **Cũ**: `damping: 18, stiffness: 400` (Rất nảy, damping ratio ~0.45)
  - **Mới**: `damping: 30, stiffness: 300` (Đầm hơn, damping ratio ~0.86, gần đạt critical damping, không bị rung lắc).

#### [MODIFY] [FAB.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/FAB.tsx)
- Điều chỉnh hiệu ứng nhấn:
  - **Cũ**: `damping: 20, stiffness: 300` (Hơi nảy)
  - **Mới**: `damping: 30, stiffness: 300` (Đồng bộ với Modal, chắc chắn hơn).

#### [MODIFY] [SmartAddSheet.tsx](file:///d:/Project/PTUD%20eatfitAL/coding/EatFitAI_v1/eatfitai-mobile/src/components/ui/SmartAddSheet.tsx)
- Chuyển đổi hiệu ứng xuất hiện từ `duration` (thời gian cố định) sang `springify` (vật lý) để mượt mà hơn.
  - **Entrance**: `SlideInDown.duration(200)` -> `SlideInDown.springify().damping(30).stiffness(300)`.
  - **Exit**: `SlideOutDown.duration(150)` -> Giữ nguyên hoặc chỉnh nhẹ để thoát nhanh `SlideOutDown.duration(150)` (Exit animation nên nhanh và dứt khoát).

## VERIFICATION PLAN

### Manual Verification
1. **Modal**: Mở một modal bất kỳ (ví dụ modal xác nhận), nhấn thử vào backdrop hoặc nút đóng. Cảm nhận độ nảy.
2. **FAB**: Tại màn hình chính, nhấn giữ nút FAB (+). Nút phải co lại nhẹ nhàng, không bị rung.
3. **SmartAddSheet**: Bấm nút (+) để mở menu. Menu phải trượt lên một cách tự nhiên (có quán tính nhẹ) thay vì trượt đều đều.
