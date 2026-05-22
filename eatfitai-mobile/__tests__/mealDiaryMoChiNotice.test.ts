import {
  resolveMealDiaryMoChiNotice,
} from '../src/features/mochi/mealDiaryMoChiNotice';

describe('Meal diary MoChi notice', () => {
  it('only renders the current meal notice before the next meal window starts', () => {
    const selectedDate = new Date(2026, 4, 22);
    const now = new Date(2026, 4, 22, 1, 53);

    const breakfastNotice = resolveMealDiaryMoChiNotice({
      mealType: 1,
      entryCount: 0,
      selectedDate,
      now,
    });

    expect(breakfastNotice).toMatchObject({
      mochiEvent: 'meal_reminder',
      title: 'Bữa này đang đợi bạn đó! 🍽️',
      ctaLabel: 'Ghi bữa',
      isOverdue: false,
    });
    expect(breakfastNotice?.poseKey).toBeUndefined();
    expect(resolveMealDiaryMoChiNotice({ mealType: 2, entryCount: 0, selectedDate, now })).toBeNull();
    expect(resolveMealDiaryMoChiNotice({ mealType: 3, entryCount: 0, selectedDate, now })).toBeNull();
  });

  it('renders previous empty meals as annoyed once the next meal window is active', () => {
    const selectedDate = new Date(2026, 4, 22);
    const now = new Date(2026, 4, 22, 11, 30);

    const breakfastNotice = resolveMealDiaryMoChiNotice({
      mealType: 1,
      entryCount: 0,
      selectedDate,
      now,
    });
    const lunchNotice = resolveMealDiaryMoChiNotice({
      mealType: 2,
      entryCount: 0,
      selectedDate,
      now,
    });

    expect(breakfastNotice).toMatchObject({
      mochiEvent: 'meal_reminder',
      title: 'Bữa sáng trễ hẹn rồi đó nha! 😤',
      ctaLabel: 'Ghi ngay',
      poseKey: 'angry',
      isOverdue: true,
    });
    expect(breakfastNotice?.message).toContain('Tớ vẫn chưa thấy bữa sáng');
    expect(lunchNotice).toMatchObject({
      title: 'Bữa này đang đợi bạn đó! 🍽️',
      isOverdue: false,
    });
    expect(resolveMealDiaryMoChiNotice({ mealType: 3, entryCount: 0, selectedDate, now })).toBeNull();
  });

  it('does not render a meal notice once the meal already has entries', () => {
    expect(
      resolveMealDiaryMoChiNotice({
        mealType: 2,
        entryCount: 1,
        selectedDate: new Date(2026, 4, 22),
        now: new Date(2026, 4, 22, 14),
      }),
    ).toBeNull();
  });

  it('does not render notices for a future diary date', () => {
    const notice = resolveMealDiaryMoChiNotice({
      mealType: 3,
      entryCount: 0,
      selectedDate: new Date(2026, 4, 23),
      now: new Date(2026, 4, 22, 22),
    });

    expect(notice).toBeNull();
  });

  it('keeps the sequence through dinner and hides later meals', () => {
    const selectedDate = new Date(2026, 4, 22);
    const now = new Date(2026, 4, 22, 18, 5);

    expect(
      resolveMealDiaryMoChiNotice({ mealType: 1, entryCount: 0, selectedDate, now }),
    ).toMatchObject({ title: 'Bữa sáng trễ hẹn rồi đó nha! 😤', isOverdue: true });
    expect(
      resolveMealDiaryMoChiNotice({ mealType: 2, entryCount: 0, selectedDate, now }),
    ).toMatchObject({ title: 'Bữa trưa trễ hẹn rồi đó nha! 😤', isOverdue: true });
    expect(
      resolveMealDiaryMoChiNotice({ mealType: 3, entryCount: 0, selectedDate, now }),
    ).toMatchObject({ title: 'Bữa này đang đợi bạn đó! 🍽️', isOverdue: false });
    expect(resolveMealDiaryMoChiNotice({ mealType: 4, entryCount: 0, selectedDate, now })).toBeNull();
  });
});
