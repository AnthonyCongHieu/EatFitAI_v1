import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('AI scan production UX', () => {
  it('uses one preview progress card instead of layered processing notices', () => {
    const source = readSource('src/app/screens/ai/AIScanScreen.tsx');

    expect(source).toContain('ScanProgressCard');
    expect(source).toContain('Đang nhận diện món ăn...');
    expect(source).toContain('Đang đối chiếu dữ liệu dinh dưỡng...');
    expect(source).toContain('Sắp có kết quả, bạn kiểm tra lại trước khi lưu.');
    expect(source).not.toContain('mochiEvent="scan_processing" compact');
  });

  it('sends recognized food to review before saving to the diary', () => {
    const source = readSource('src/app/screens/ai/AIScanScreen.tsx');

    expect(source).toContain("navigation.navigate('AddMealFromVision'");
    expect(source).toContain('Kiểm tra & lưu bữa');
    expect(source).not.toContain('Thêm vào Nhật ký');
    expect(source).toContain('Cần kiểm tra');
  });
});
