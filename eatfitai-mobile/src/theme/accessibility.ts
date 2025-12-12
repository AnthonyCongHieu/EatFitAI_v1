/**
 * Accessibility labels and hints for EatFitAI
 * Use these constants to ensure consistent accessibility across the app
 */

// Home Screen
export const a11yHome = {
    fabAdd: {
        label: 'Thêm món ăn vào nhật ký',
        hint: 'Mở menu để chọn cách thêm món ăn',
    },
    calorieCard: {
        label: (remaining: number) => `Còn ${remaining} calo để đạt mục tiêu`,
        hint: 'Xem chi tiết calo hôm nay',
    },
    macroCard: {
        protein: (value: number, target?: number) =>
            target
                ? `Protein: ${value} trong ${target} gram`
                : `Protein: ${value} gram`,
        carbs: (value: number, target?: number) =>
            target ? `Carbs: ${value} trong ${target} gram` : `Carbs: ${value} gram`,
        fat: (value: number, target?: number) =>
            target
                ? `Chất béo: ${value} trong ${target} gram`
                : `Chất béo: ${value} gram`,
    },
    streakCard: {
        label: (streak: number) => `Chuỗi ${streak} ngày liên tiếp`,
        hint: 'Nhấn để xem thành tựu',
    },
    diaryEntry: {
        label: (name: string, calories: number) => `${name}, ${calories} calo`,
        deleteHint: 'Nhấn để xoá món ăn này',
    },
};

// Camera/AI Scan Screen
export const a11yCamera = {
    capture: {
        label: 'Chụp ảnh',
        hint: 'Chụp ảnh món ăn để AI nhận diện',
    },
    gallery: {
        label: 'Chọn từ thư viện',
        hint: 'Chọn ảnh có sẵn từ thư viện',
    },
    retake: {
        label: 'Chụp lại',
        hint: 'Huỷ kết quả và chụp ảnh mới',
    },
    search: {
        label: 'Tìm kiếm món ăn',
        hint: 'Chuyển sang màn hình tìm kiếm',
    },
    addToBasket: {
        label: (item: string) => `Thêm ${item} vào giỏ nguyên liệu`,
        hint: 'Lưu nguyên liệu để đề xuất công thức',
    },
    addToDiary: {
        label: (item: string) => `Thêm ${item} vào nhật ký`,
        hint: 'Thêm trực tiếp vào nhật ký hôm nay',
    },
};

// Meal Diary Screen
export const a11yDiary = {
    dateSelector: {
        label: (date: string) => `Ngày ${date}`,
        hint: 'Nhấn để mở lịch chọn ngày',
        previous: 'Xem ngày trước',
        next: 'Xem ngày sau',
    },
    mealSection: {
        label: (meal: string, calories: number) =>
            `Bữa ${meal}, tổng ${calories} calo`,
        hint: 'Danh sách món ăn trong bữa này',
    },
    foodItem: {
        label: (name: string, calories: number, portion: string) =>
            `${name}, ${calories} calo, ${portion}`,
        editHint: 'Nhấn để chỉnh sửa khẩu phần',
    },
    emptyState: {
        label: 'Chưa có món ăn nào',
        hint: 'Nhấn nút cộng để thêm món đầu tiên',
    },
};

// Profile Screen
export const a11yProfile = {
    avatar: {
        label: 'Ảnh đại diện',
        hint: 'Nhấn để thay đổi ảnh đại diện',
    },
    genderOption: {
        male: 'Giới tính nam',
        female: 'Giới tính nữ',
    },
    goalOption: {
        lose: 'Mục tiêu giảm cân',
        maintain: 'Mục tiêu duy trì cân nặng',
        gain: 'Mục tiêu tăng cân',
    },
    activityLevel: {
        sedentary: 'Ít vận động',
        light: 'Vận động nhẹ',
        moderate: 'Vận động vừa phải',
        active: 'Hoạt động nhiều',
        very_active: 'Rất năng động',
    },
    saveButton: {
        label: 'Lưu thông tin',
        hint: 'Cập nhật hồ sơ cá nhân',
    },
    logout: {
        label: 'Đăng xuất',
        hint: 'Thoát khỏi tài khoản',
    },
};

// Stats Screen
export const a11yStats = {
    weekNavigation: {
        previous: 'Tuần trước',
        next: 'Tuần sau',
        current: (range: string) => `Đang xem tuần ${range}`,
    },
    chart: {
        label: 'Biểu đồ calo hàng tuần',
        hint: 'Hiển thị calo tiêu thụ mỗi ngày',
        bar: (day: string, calories: number) => `${day}: ${calories} calo`,
    },
    summary: {
        average: (value: number) => `Trung bình ${value} calo mỗi ngày`,
        total: (value: number) => `Tổng cộng ${value} calo trong tuần`,
        target: (achieved: number, total: number) =>
            `Đạt mục tiêu ${achieved} trong ${total} ngày`,
    },
};

// Common/Shared
export const a11yCommon = {
    loading: 'Đang tải',
    error: 'Có lỗi xảy ra',
    retry: 'Thử lại',
    close: 'Đóng',
    save: 'Lưu',
    cancel: 'Huỷ',
    delete: 'Xoá',
    edit: 'Sửa',
    back: 'Quay lại',
    next: 'Tiếp theo',
    refresh: 'Làm mới dữ liệu',
};
