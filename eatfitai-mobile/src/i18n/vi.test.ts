import { t, vi } from './vi';

describe('vi translations', () => {
  it('keeps key Vietnamese strings readable and correctly encoded', () => {
    expect(vi.common.close).toBe('Đóng');
    expect(vi.common.loading).toBe('Đang tải...');
    expect(vi.common.logoutConfirm).toContain('đăng xuất');
    expect(vi.common.appErrorDescription).toContain('khởi động lại');
    expect(vi.home.title).toBe('Nhật ký hôm nay');
    expect(vi.profile.personalInfo).toBe('Thông tin cá nhân');
    expect(vi.meals.breakfast).toBe('Bữa sáng');
    expect(vi.navigation.voice).toBe('Giọng nói');
  });

  it('formats dynamic translation helpers', () => {
    expect(vi.common.deleteItem('món ăn')).toBe('Xác nhận xóa "món ăn" khỏi nhật ký?');
    expect(vi.home.diffAbove(250)).toBe('Vượt 250 kcal so với mục tiêu');
    expect(vi.stats.daysAchieved(3, 7)).toBe('3/7 ngày');
    expect(t('home.entries', 2)).toBe('2 món');
  });

  it('does not contain mojibake markers in core strings', () => {
    const sample = [
      vi.common.close,
      vi.common.logoutConfirm,
      vi.home.title,
      vi.profile.personalInfo,
      vi.meals.lunch,
    ].join(' ');

    expect(sample).not.toMatch(/[ÃÂÄ]/);
    expect(sample).not.toContain('\uFFFD');
  });
});
