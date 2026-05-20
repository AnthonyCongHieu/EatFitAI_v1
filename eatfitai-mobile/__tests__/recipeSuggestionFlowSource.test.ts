import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('recipe suggestion flow source contract', () => {
  it('lets users request recipe suggestions without entering ingredients', () => {
    const source = readSource('src/app/screens/ai/RecipeSuggestionsScreen.tsx');

    expect(source).not.toContain('ingredientsToUse.length === 0 && !isDailyRecommendation) return');
    expect(source).not.toContain('(ingredients.length > 0 || isDailyRecommendation)');
    expect(source).toContain('onPress={() => searchRecipes()}');
  });

  it('does not fall back to a YouTube search page from recipe detail', () => {
    const source = readSource('src/app/screens/ai/RecipeDetailScreen.tsx');

    expect(source).not.toContain('youtube.com/results');
    expect(source).toContain('Chưa có video đã xác thực');
  });

  it('keeps recipe detail content readable around ingredients, CTA, and references', () => {
    const source = readSource('src/app/screens/ai/RecipeDetailScreen.tsx');

    expect(source).toContain('RecipeVisual');
    expect(source).toContain('buildRecipeIngredientRows');
    expect(source).toContain('formatRecipeSourceLabel');
    expect(source).not.toContain('Tình trạng nguyên liệu');
    expect(source).not.toContain('<ThemedText style={S.sourceText} numberOfLines={1}>{url}</ThemedText>');
  });

  it('labels recipe cards with practical visual badges instead of opaque points', () => {
    const source = readSource('src/app/screens/ai/RecipeSuggestionsScreen.tsx');

    expect(source).toContain('getRecipeBadgeLabel');
    expect(source).toContain('Thiếu ${recipe.missingIngredientCount} món');
    expect(source).toContain('Phù hợp ${matchValue}%');
    expect(source).not.toContain('} điểm');
  });
});
