import {
  markMoChiNotificationActed,
  markMoChiNotificationDismissed,
  normalizeMoChiInboxItems,
  selectUnreadMoChiNotificationCount,
  toMoChiNotificationItemFromPayload,
  upsertMoChiNotificationItem,
  type MoChiNotificationItem,
} from '../src/features/mochi/mochiNotificationInbox';

const NOW = new Date('2026-05-18T13:30:00+07:00');

const makeItem = (overrides: Partial<MoChiNotificationItem> = {}): MoChiNotificationItem => ({
  id: 'meal-1-2026-05-18',
  eventType: 'meal_reminder',
  category: 'reminder',
  severity: 'active',
  source: 'orchestrator',
  title: 'Đến giờ ghi bữa',
  body: 'Nếu bạn đã ăn rồi, thêm nhanh bữa gần nhất để nhật ký liền mạch hơn.',
  ctaLabel: 'Ghi bữa',
  action: 'addMeal',
  mealTypeId: 1,
  dueAt: NOW.toISOString(),
  createdAt: NOW.toISOString(),
  ...overrides,
});

describe('mochiNotificationInbox', () => {
  it('upserts actionable items without duplicating and keeps unread count accurate', () => {
    const first = upsertMoChiNotificationItem([], makeItem(), NOW);
    const updated = upsertMoChiNotificationItem(
      first,
      makeItem({
        body: 'Bữa sáng vẫn còn trống. Ghi lại khi bạn tiện nhé.',
      }),
      NOW,
    );

    expect(updated).toHaveLength(1);
    expect(updated[0]?.body).toBe('Bữa sáng vẫn còn trống. Ghi lại khi bạn tiện nhé.');
    expect(selectUnreadMoChiNotificationCount(updated)).toBe(1);

    const acted = markMoChiNotificationActed(updated, 'meal-1-2026-05-18', NOW);

    expect(acted[0]?.readAt).toBe(NOW.toISOString());
    expect(acted[0]?.actedAt).toBe(NOW.toISOString());
    expect(acted[0]?.resolvedAt).toBe(NOW.toISOString());
    expect(selectUnreadMoChiNotificationCount(acted)).toBe(0);
  });

  it('keeps a bounded recent inbox and drops expired items', () => {
    const manyItems = Array.from({ length: 54 }, (_, index) =>
      makeItem({
        id: `notice-${index}`,
        eventType: index % 2 === 0 ? 'water_reminder' : 'meal_reminder',
        createdAt: new Date(NOW.getTime() - index * 60 * 1000).toISOString(),
      }),
    );
    const expired = makeItem({
      id: 'expired',
      expiresAt: new Date(NOW.getTime() - 1).toISOString(),
    });

    const normalized = normalizeMoChiInboxItems([...manyItems, expired], NOW);

    expect(normalized).toHaveLength(50);
    expect(normalized.some((item) => item.id === 'expired')).toBe(false);
    expect(normalized[0]?.id).toBe('notice-0');
  });

  it('dismisses important unresolved reminders with a one-hour retry window', () => {
    const dismissed = markMoChiNotificationDismissed(
      [makeItem()],
      'meal-1-2026-05-18',
      NOW,
    );

    expect(dismissed[0]?.dismissedAt).toBe(NOW.toISOString());
    expect(dismissed[0]?.retryAfter).toBe(
      new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    );
    expect(dismissed[0]?.resolvedAt).toBeUndefined();
  });

  it('keeps retry suppression when the same reminder is refreshed by the orchestrator', () => {
    const retryAfter = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
    const refreshed = upsertMoChiNotificationItem(
      [
        makeItem({
          readAt: NOW.toISOString(),
          dismissedAt: NOW.toISOString(),
          dismissCount: 1,
          retryAfter,
        }),
      ],
      makeItem({
        body: 'Bữa sáng vẫn còn trống.',
        retryAfter: undefined,
      }),
      new Date(NOW.getTime() + 60 * 1000),
    );

    expect(refreshed[0]?.body).toBe('Bữa sáng vẫn còn trống.');
    expect(refreshed[0]?.dismissCount).toBe(1);
    expect(refreshed[0]?.retryAfter).toBe(retryAfter);
  });

  it('keeps daily meal reminders distinct by meal type when repeated system notifications arrive', () => {
    const breakfast = toMoChiNotificationItemFromPayload({
      title: 'Bữa sáng còn trống',
      body: 'Ghi bữa sáng',
      data: {
        mochiEventType: 'meal_reminder',
        mealTypeId: 1,
      },
      source: 'system',
      now: NOW,
    });
    const lunch = toMoChiNotificationItemFromPayload({
      title: 'Bữa trưa còn trống',
      body: 'Ghi bữa trưa',
      data: {
        mochiEventType: 'meal_reminder',
        mealTypeId: 2,
      },
      source: 'system',
      now: NOW,
    });

    expect(breakfast?.id).toBe('meal_reminder-1-2026-05-18');
    expect(lunch?.id).toBe('meal_reminder-2-2026-05-18');
  });
});
