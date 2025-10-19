export const vi = {
  common: {
    close: 'Đóng',
    loading: 'Đang tải...',
    today: 'Hôm nay',
    delete: 'Xoá',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
  },
  auth: {
    loginTitle: 'Đăng nhập',
    email: 'Email',
    password: 'Mật khẩu',
    login: 'Đăng nhập',
    processing: 'Đang xử lý',
    loginWithGoogle: 'Đăng nhập với Google',
    registerQuestion: 'Chưa có tài khoản? Đăng ký',
    registerTitle: 'Đăng ký',
    displayName: 'Tên hiển thị',
    passwordConfirm: 'Nhập lại mật khẩu',
    createAccount: 'Tạo tài khoản',
    hasAccount: 'Đã có tài khoản? Đăng nhập',
  },
  home: {
    title: 'Nhật ký hôm nay',
    intake: 'Tiêu thụ',
    target: 'Mục tiêu',
    addDish: '+ Thêm món',
    aiNutrition: 'AI dinh dưỡng',
    diffEqual: 'Bạn đang bằng với mục tiêu',
    diffAbove: (kcal: number) => `Vượt ${kcal} kcal so với mục tiêu`,
    diffBelow: (kcal: number) => `Thấp hơn ${kcal} kcal so với mục tiêu`,
    empty: 'Chưa có món nào hôm nay',
  },
  search: {
    placeholder: 'Nhập từ khóa...',
    search: 'Tìm',
    noResult: 'Không tìm thấy kết quả',
    total: (n: number) => `Tổng kết quả: ${n}`,
    loading: 'Đang tìm kiếm...',
  },
  detail: {
    addTitle: 'Thêm vào nhật ký',
    grams: 'Số gram',
    meal: 'Bữa ăn',
    note: 'Ghi chú (tuỳ chọn)',
    notePlaceholder: 'VD: giảm bớt nước sốt',
    preview: (g: string) => `Tổng dinh dưỡng cho ${g || '--'} g:`,
    addButton: 'Thêm vào nhật ký',
  },
  ai: {
    needPermission: 'Cần cấp quyền camera',
    grant: 'Cấp quyền',
    capture: 'Chụp ảnh',
    retake: 'Chụp lại',
    listIngredients: 'Danh sách nguyên liệu',
    analyzing: 'Đang phân tích ảnh...',
    chooseAtLeastOne: 'Chọn ít nhất 1 nguyên liệu',
    suggest: 'Gợi ý công thức',
    suggesting: 'Đang gợi ý...',
    fromAI: 'Công thức từ AI',
  },
};

export type Dict = typeof vi;

export function t<K extends string>(key: K, ...args: any[]): string {
  const path = key.split('.');
  let cur: any = vi;
  for (const p of path) {
    if (cur == null) return key;
    cur = cur[p];
  }
  if (typeof cur === 'function') return cur(...args);
  if (typeof cur === 'string') return cur;
  return key;
}

