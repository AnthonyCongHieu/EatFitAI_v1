# RULES

## 1. 5 Bu?c Làm Vi?c Chu?n
1. Hi?u m?c tiêu & xác nh?n ph?m vi v?i nhóm.
2. L?p k? ho?ch chi ti?t (task nh?, estimate) và t?o branch riêng.
3. Th?c thi: code song song v?i unit test/doc, commit theo lát c?t nh?.
4. T? ki?m tra: lint, test, build, review l?i logic tru?c khi t?o PR.
5. Demo & retrospection: t?ng h?p bài h?c, c?p nh?t backlog ti?p theo.

## 2. Quy T?c Ð?t Tên
- **Branch:** `<type>/<short-desc>` (vd: `feat/auth-flow`, `fix/profile-null`).
- **Tên file C#:** PascalCase, trùng v?i l?p (vd: `UserProfileService.cs`).
- **Tên file TS/TSX:** PascalCase cho component, camelCase cho hooks & helpers (vd: `useNutritionStore.ts`).
- **Bi?n/hàm:** camelCase, const toàn c?c PascalCase, enum PascalCase.
- **Migration/SQL seed:** `yyyyMMddHHmm_<slug>.sql`.

## 3. Quy Chu?n Coding
- **C# (.NET):** s? d?ng nullable enable, pattern matching, dependency injection, không truy c?p static state tu? ti?n.
- **TypeScript/React Native:** strict mode, uu tiên hook + component thu?n (stateless), tránh `any`, s? d?ng `zod`/`react-hook-form` cho validate.
- **Comment:** ti?ng Vi?t ng?n g?n, gi?i thích “t?i sao”, không mô t? hi?n nhiên.
- **Testing:** m?i use case/service c?n ít nh?t 1 unit test; integration test cho hành vi quan tr?ng.

## 4. Git Flow
- `main` b?o v?, ch? merge qua PR dã review.
- `develop` (n?u dùng) nh?n feature branch tru?c khi merge `main`.
- Quy trình: branch -> commit nh? -> PR -> review (2 ngu?i n?u có) -> squash & merge.
- Không push tr?c ti?p lên `main`.

## 5. Commit Types (Convention)

| Type      | Ý nghia ng?n g?n                         |
|-----------|-------------------------------------------|
| feat      | Thêm tính nang m?i                        |
| fix       | S?a l?i                                   |
| chore     | Vi?c l?t v?t (config, upgrade, build)     |
| docs      | C?p nh?t tài li?u                         |
| test      | B? sung/ ch?nh s?a unit/integration test  |
| refactor  | Tái c?u trúc mã, không d?i behaviour       |

Ghi nh?: commit message d?ng `type: n?i dung`, ví d? `feat: them flow dang ky`. N?u PR ch?a nhi?u type, tách thành nhi?u commit.
