# Premium Mesh Mobile Theme Rollout

## Mục tiêu

Đưa hướng thiết kế **Premium Mesh Wallet** từ mockup
`docs/mockups/home-background-options-v2.html` vào app Expo/React Native hiện tại dưới dạng một visual theme riêng, có thể bật trong màn **Cá nhân**.

Phạm vi v1:

- Home
- Nhật ký
- AiCamera / Quét món
- Thống kê
- Cá nhân
- Bottom command bar và MoChi hub sheet

Không đổi navigation hiện tại: nút giữa bottom bar vẫn là **MoChi hub**. Màn Scan vẫn mở qua route `AiCamera`.

## Quyết định đã chốt

- Thêm visual theme variant: `emeraldNebula | premiumMesh`.
- Premium Mesh chỉ active khi app đang ở dark mode và user chọn variant Premium Mesh.
- Light mode giữ giao diện sáng hiện tại để tránh lệch palette.
- Không thêm library mới. Dùng sẵn `expo-linear-gradient`, `expo-blur`, `react-native-svg`, `react-native-reanimated`.
- Không sửa backend, API, store data shape, route names, test IDs, hoặc text tiếng Việt ngoài phần setting mới.

## Implementation Tasks

### Task 1 - Theme preference và token

Files dự kiến:

- `eatfitai-mobile/src/theme/ThemeProvider.tsx`
- `eatfitai-mobile/src/theme/emeraldNebula.ts`
- `eatfitai-mobile/src/theme/index.ts`

Việc cần làm:

- Thêm type `VisualThemeVariant = 'emeraldNebula' | 'premiumMesh'`.
- Thêm AsyncStorage key riêng, ví dụ `@eatfitai_visual_theme_variant`.
- Expose từ `useAppTheme()`:
  - `visualTheme`
  - `setVisualTheme`
  - `isPremiumMeshActive`
- Tạo palette Premium Mesh dùng lại:
  - `bg: '#05070d'`
  - `surfaceLow: 'rgba(15,22,37,0.86)'`
  - `surface: 'rgba(26,31,47,0.84)'`
  - `surfaceHigh: 'rgba(37,43,63,0.86)'`
  - `surfaceHighest: 'rgba(47,54,75,0.92)'`
  - `primary: '#4be277'`
  - `primaryContainer: '#22c55e'`
  - `cyan: '#32d7f0'`
  - `violet: '#9d7cff'`
  - `text: '#dee1f7'`
  - `muted: '#9aa9c1'`
  - `border: 'rgba(226,232,240,0.12)'`
- Tạo hook quyết định palette cho main app surfaces, ví dụ `useMainSurfacePalette()`, để các màn phụ vẫn có thể dùng `useEN()` cũ.

### Task 2 - Reusable Premium Mesh surfaces

Files dự kiến:

- `eatfitai-mobile/src/components/ui/PremiumMeshBackground.tsx`
- `eatfitai-mobile/src/components/ui/PremiumMeshSurface.tsx`

Việc cần làm:

- `PremiumMeshBackground` render:
  - base dark gradient
  - ambient glow xanh/cyan/violet
  - diagonal mesh panes
  - subtle dot/grid texture bằng View/LinearGradient, không dùng ảnh raster
- `PremiumMeshSurface` chuẩn hóa card glass:
  - radius 20-28 tùy size
  - border màu `rgba(226,232,240,0.10-0.16)`
  - shadow mềm
  - fallback Android dùng màu solid/rgba ổn định, tránh lỗi hai màu đã từng ghi chú trong codebase.
- Component phải nhận `children`, `style`, `padding`, `radius`, `variant`.

### Task 3 - Áp vào 5 surfaces chính

Files dự kiến:

- `eatfitai-mobile/src/app/screens/HomeScreen.tsx`
- `eatfitai-mobile/src/app/screens/diary/MealDiaryScreen.tsx`
- `eatfitai-mobile/src/app/screens/ai/AIScanScreen.tsx`
- `eatfitai-mobile/src/app/screens/stats/StatsScreen.tsx`
- `eatfitai-mobile/src/app/screens/ProfileScreen.tsx`

Việc cần làm:

- Khi `isPremiumMeshActive`, wrap root bằng `PremiumMeshBackground`.
- Giữ nguyên logic fetch, optimistic update, delete, scan, barcode, navigation.
- Chỉ đổi visual layer:
  - root background
  - card/surface background
  - border
  - shadow/glow
  - active chip/tab color
  - scan/result panels
- Home cần bám mockup nhất:
  - header vẫn dùng `WelcomeHeader`
  - dashboard calorie card dùng glass surface
  - week strip nổi trên mesh
  - empty diary vẫn dùng MoChi notice hiện tại
- AiCamera không chuyển thành tab; chỉ restyle chính màn `AiCamera`.

### Task 4 - Setting chọn theme trong Cá nhân

Files dự kiến:

- `eatfitai-mobile/src/app/screens/ProfileScreen.tsx`

Việc cần làm:

- Giữ row sáng/tối hiện tại.
- Thêm row **Kiểu giao diện** trong menu group cài đặt.
- Bấm row mở modal/bottom sheet chọn:
  - Emerald Nebula
  - Premium Mesh
- Khi user đang light mode và chọn Premium Mesh:
  - lưu preference Premium Mesh
  - UI vẫn dùng light theme cho tới khi dark mode bật
  - copy phụ trong sheet cần nói rõ: Premium Mesh áp dụng cho chế độ tối.

### Task 5 - Bottom command bar và MoChi hub

Files dự kiến:

- `eatfitai-mobile/src/components/navigation/CustomTabBar.tsx`
- `eatfitai-mobile/src/components/ui/SmartAddSheet.tsx`

Việc cần làm:

- Khi Premium Mesh active:
  - bottom bar dùng glass surface, border mềm, shadow sâu giống mockup.
  - MoChi dock giữ mascot hiện tại, chỉ đổi halo/core colors.
  - active tab dùng green `#4be277`.
  - SmartAddSheet dùng surface Premium Mesh, không đổi các command hiện có.
- Không đổi route `MoChiHub`, không đổi test IDs trong navigation.

## Git Hygiene / Commit Plan

Worktree hiện có nhiều thay đổi không thuộc task Premium Mesh. Tuyệt đối không dùng:

```bash
git add -A
git checkout -- .
git reset --hard
```

Commit nên tách theo task:

1. Docs plan
   ```bash
   git add docs/superpowers/plans/2026-05-19-premium-mesh-mobile-theme.md
   git commit -m "docs: add premium mesh mobile theme rollout plan"
   ```

2. Theme core
   ```bash
   git add eatfitai-mobile/src/theme/ThemeProvider.tsx \
     eatfitai-mobile/src/theme/emeraldNebula.ts \
     eatfitai-mobile/src/theme/index.ts
   git commit -m "feat(mobile): add premium mesh visual theme preference"
   ```

3. Shared surfaces
   ```bash
   git add eatfitai-mobile/src/components/ui/PremiumMeshBackground.tsx \
     eatfitai-mobile/src/components/ui/PremiumMeshSurface.tsx
   git commit -m "feat(mobile): add premium mesh surface primitives"
   ```

4. Main screens
   ```bash
   git add eatfitai-mobile/src/app/screens/HomeScreen.tsx \
     eatfitai-mobile/src/app/screens/diary/MealDiaryScreen.tsx \
     eatfitai-mobile/src/app/screens/ai/AIScanScreen.tsx \
     eatfitai-mobile/src/app/screens/stats/StatsScreen.tsx \
     eatfitai-mobile/src/app/screens/ProfileScreen.tsx
   git commit -m "feat(mobile): apply premium mesh to core app screens"
   ```

5. Navigation surfaces
   ```bash
   git add eatfitai-mobile/src/components/navigation/CustomTabBar.tsx \
     eatfitai-mobile/src/components/ui/SmartAddSheet.tsx
   git commit -m "feat(mobile): style command surfaces for premium mesh"
   ```

6. Tests
   ```bash
   git add eatfitai-mobile/__tests__
   git commit -m "test(mobile): cover premium mesh theme behavior"
   ```

Push sau khi từng commit đã sạch scope:

```bash
git status --short
git push -u origin "$(git branch --show-current)"
```

Nếu branch hiện tại không đúng task, tạo branch mới trước khi implement:

```bash
git switch -c codex/premium-mesh-mobile-theme
```

Chỉ làm khi đã xử lý hoặc stash có chủ đích các thay đổi không liên quan.

## Validation Plan

Chạy tối thiểu:

```bash
cd eatfitai-mobile
npm run typecheck
npm test -- --runInBand
```

Nếu có thiết bị/emulator Android:

```bash
npm run device:full-tab-ui-smoke:android
npm run device:scan-entry:android
npm run device:stats-profile-smoke:android
npm run device:visual-ui-audit:bottom-nav:android
```

Visual acceptance:

- So sánh với `docs/mockups/home-background-options-v2.html`.
- Home có nền mesh không trống và dashboard card nổi rõ.
- Nhật ký, Scan, Thống kê, Cá nhân dùng cùng palette Premium Mesh.
- Bottom bar vẫn giữ MoChi hub ở giữa.
- Không có text tràn ngang trên màn nhỏ.
- Scan route vẫn mở từ MoChi hub và flow capture/result không đổi.

## Rollback

- User có thể chọn lại `Emerald Nebula` trong Cá nhân.
- Nếu cần rollback code, revert từng commit theo task thay vì revert cả branch.
