# EatFitAI – Requirements

## I. Gi?i thi?u
- **M?c tiêu:** xây d?ng h? th?ng EatFitAI giúp ngu?i dùng theo dõi dinh du?ng, nh?t ký an u?ng, nh?n g?i ý AI.
- **Ph?m vi:** backend (.NET 8+ SQL Server) + mobile app (Expo/React Native) + tài li?u v?n hành.
- **Ð?i tu?ng:** sinh viên PTUD, mentor hu?ng d?n, ngu?i dùng th? nghi?m.

## II. Yêu c?u ch?c nang
1. **Auth & Profile:** dang ký, dang nh?p, refresh token, Google Sign-in; qu?n lý h? so, c?p nh?t ch? s? co th?.
2. **Diary & Summary:** thêm món an theo b?a, xoá/s?a, xem t?ng h?p ngày/tu?n; luu macro th?c t?.
3. **Search & Custom Dish:** tìm món t? catalog, xem chi ti?t theo gram, thêm vào nh?t ký; t?o món t? d?nh nghia.
4. **AI Services:** phân tích ?nh (nguyên li?u), g?i ý công th?c, tính l?i m?c tiêu dinh du?ng.
5. **Nutrition Targets:** xem/ap d?ng m?c tiêu hi?n t?i, l?ch s? ngu?n (USER/AI), hi?u l?c theo ngày.
6. **Admin/Seed:** danh m?c b?a an, m?c d? v?n d?ng (TDEE), d? li?u th?c ph?m m?u, views t?ng h?p.

## III. Yêu c?u phi ch?c nang
- **Hi?u nang:** API < 300ms cho các truy v?n thu?ng; mobile 60fps v?i gesture chính.
- **B?o m?t:** JWT + refresh rotation, rate limiting dang nh?p, log Serilog.
- **M? r?ng:** ki?n trúc layer (Domain/Application/Infrastructure/Api), d? c?m AI th?t, CI/CD.
- **Tuong thích:** ch?y Docker (SQL + API), mobile support Android/iOS qua Expo.
- **Ch?t lu?ng:** unit test cho service/store, lint & TypeScript strict, tài li?u d?y d?.

## IV. Môi tru?ng tri?n khai
- **Backend:** .NET 8, SQL Server, Docker compose, Serilog + Swagger.
- **Frontend:** Expo SDK 51 (React Native 0.74), Zustand, React Hook Form, Victory chart.
- **AI Mock:** interface IAiNutritionService/IAiRecipeService/IVisionService, có th? chuy?n sang d?ch v? th?t.

## V. K?t lu?n
EatFitAI hu?ng t?i 7 sprint phát tri?n:
1. Kh?i t?o ki?n trúc + auth.
2. Profile & body metrics.
3. Diary + summary.
4. Search + custom dish.
5. AI vision/recipe/nutrition.
6. Th?ng kê, polish UX, typegen.
7. Test, tài li?u, packaging.

Khi hoàn thành, h? th?ng h? tr? ngu?i dùng theo dõi dinh du?ng linh ho?t, s?n sàng m? r?ng AI và các module nâng cao.
