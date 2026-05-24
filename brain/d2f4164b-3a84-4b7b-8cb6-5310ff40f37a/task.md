# EatFitAI Production Stabilization — Task List

## Scope: Chỉ làm những gì code-verified là cần thiết

- [x] **T1: Response Compression** — Thêm gzip/brotli compression cho backend API ✅
  - `Program.cs`: AddResponseCompression + UseResponseCompression
  - Brotli (fastest) + Gzip (smallest) dual provider
  - Build succeeded: 0 errors, 0 warnings
- [x] **T2: Docs Cleanup** — Sửa claims sai trong AUTH_AND_INFRA.md + Program.cs comment ✅
  - AUTH_AND_INFRA.md: Strikethrough IMemoryCache claim, added audit note
  - Program.cs: Sửa comment AddMemoryCache misleading
- [x] **T3: staleTime micro-tune** — HomeScreen + StatsScreen water query 30s→120s ✅
  - HomeScreen.tsx: water-intake-today staleTime 30s → 2 phút
  - StatsScreen.tsx: water-intake-today staleTime 30s → 2 phút (share cache)

## Không làm (lý do)
- Firebase verify → Manual device test, chỉ user làm được
- CI/CD → Scope lớn, cần discussion riêng
- Cloud plan → Vấn đề tiền, user đã bỏ qua
