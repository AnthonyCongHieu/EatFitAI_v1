import { navigateRoot } from '../../app/navigation/navigationRef';
import type { MoChiNotificationAction } from './mochiNotificationInbox';

export const performMoChiNotificationAction = (
  action: MoChiNotificationAction,
  mealTypeId?: number,
): void => {
  switch (action) {
    case 'addWater':
      navigateRoot('AppTabs', {
        screen: 'HomeTab',
        params: {
          source: 'water-quick-action',
          focusWaterRequestId: Date.now(),
        },
      });
      return;
    case 'viewProgress':
      navigateRoot('AppTabs', {
        screen: 'StatsTab',
        params: {
          source: 'weekly-review',
          focusWeeklyReview: true,
        },
      });
      return;
    case 'viewDiary':
      navigateRoot('AppTabs', { screen: 'MealDiary' });
      return;
    case 'openNotifications':
      navigateRoot('NotificationCenter');
      return;
    case 'addMeal':
      navigateRoot('FoodSearch', {
        autoFocus: true,
        showQuickSuggestions: true,
        returnToDiaryOnSave: true,
        defaultMealType: mealTypeId as 1 | 2 | 3 | 4 | undefined,
      });
      return;
    case 'dismiss':
    default:
      return;
  }
};
