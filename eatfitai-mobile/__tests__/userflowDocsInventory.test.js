const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('USERFLOW current function inventory', () => {
  const userflow = read('docs/USERFLOW.md');

  test('documents current normal app surfaces', () => {
    [
      'Welcome','Login','Register','VerifyEmail','ForgotPassword','Onboarding','Home','MealDiary','FoodSearch','FoodDetail','CustomDish','CommonMeals','Stats','Profile','BodyMetrics','GoalSettings','WeightHistory','ChangePassword',
    ].forEach((screenName) => expect(userflow).toContain(screenName));
  });

  test('documents current AI app surfaces and backend-proxied routes', () => {
    [
      'AIScan','AiCamera','AddMealFromVision','VisionHistory','RecipeSuggestions','RecipeDetail','NutritionInsights','NutritionSettings','DietaryRestrictions','Voice','/api/ai/vision/detect','/api/ai/labels/teach','/api/voice/parse','/api/voice/execute','Không gọi trực tiếp AI provider',
    ].forEach((token) => expect(userflow).toContain(token));
  });
});
