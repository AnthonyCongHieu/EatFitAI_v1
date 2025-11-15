// Khai báo các screen của Stack gốc
// - Login, Register: màn hình xác thực
// - AppTabs: nhóm Tab chính sau khi đăng nhập
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  AppTabs: undefined;
  FoodSearch: undefined;
  FoodDetail: { foodId: string };
  CustomDish: undefined;
  AiCamera: undefined;
  AiNutrition: undefined;
  NutritionSuggest: undefined;
  AddMealFromVision: import('../../types/navigation').AddMealFromVisionParams;
  MealDiary: undefined;
};
