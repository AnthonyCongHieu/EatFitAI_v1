// Types cho cac tinh nang AI nang cao
// Chu thich bang tieng Viet khong dau

// ============ RECIPE SUGGESTIONS ============
export interface RecipeSuggestionRequest {
  availableIngredients: string[];
  availableFoodItemIds?: number[];
  ingredientHints?: RecipeIngredientHint[];
  mode?: 'auto' | 'ingredient_combo' | 'daily_recommendation';
  date?: string;
  mealTypeId?: number;
  maxCookingTimeMinutes?: number;
  minMatchedIngredients?: number;
  maxResults?: number;
  remainingCalories?: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
}

export interface RecipeIngredientHint {
  foodItemId?: number | null;
  name?: string | null;
  confidence?: number | null;
}

export interface RecipeSuggestion {
  recipeId: number;
  recipeName: string;
  description?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalGrams?: number;
  imageUrl?: string;
  imageVariants?: {
    thumbUrl?: string | null;
    mediumUrl?: string | null;
  } | null;
  cookTimeMinutes?: number;
  difficulty?: string;
  servingCount?: number;
  matchedIngredientsCount: number;
  totalIngredientsCount: number;
  matchPercentage: number;
  matchScore?: number;
  scoreReasons?: string[];
  missingIngredientCount?: number;
  suggestionGroup?: 'readyNow' | 'needsMore' | 'dailyRecommendation' | string;
  canCookNow?: boolean;
  guideStatus?: string;
  sourceUrls?: string[];
  youtubeVideo?: RecipeYoutubeVideo | null;
  prepItems?: string[];
  availableIngredients?: string[];
  matchedIngredients: string[];
  missingIngredients: string[];
  allIngredients: string[];
}

export interface RecipeDetail extends RecipeSuggestion {
  ingredients: RecipeIngredientDetail[];
  instructions?: string[];
  videoUrl?: string; // URL video YouTube để embed
  tags?: string[];
  youtubeVideo?: RecipeYoutubeVideo | null;
  guideStatus?: string;
  sourceUrls?: string[];
  credibilityScore?: number;
}

export interface RecipeCookingGuide {
  recipeId?: number;
  recipeName?: string;
  prepItems?: string[];
  steps: string[];
  cookingTimeMinutes?: number;
  difficulty?: string;
  tips?: string[];
  sourceUrls?: string[];
  youtubeVideo?: RecipeYoutubeVideo | null;
  guideStatus?: string;
}

export interface RecipeYoutubeVideo {
  videoId?: string;
  title?: string;
  channelTitle?: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface RecipeIngredientDetail {
  foodItemId: number;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ============ NUTRITION INSIGHTS ============
export interface NutritionInsightRequest {
  analysisDays?: number;
  includeMealTiming?: boolean;
  includeMacroAnalysis?: boolean;
}

export interface NutritionInsight {
  adherenceScore: number;
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  currentTarget: NutritionTargetDto;
  recommendations: NutritionRecommendation[];
  mealTimingInsight?: MealTimingInsight;
  macroDistributionInsight?: MacroDistributionInsight;
  progressTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  daysAnalyzed: number;
}

export interface NutritionTargetDto {
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
}

export interface NutritionRecommendation {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  suggestedValue?: number;
  reasoning: string;
}

export interface MealTimingInsight {
  averageMealsPerDay: number;
  commonMealTimes: string[];
  suggestedDistribution: Record<string, number>;
  insights: string[];
}

export interface MacroDistributionInsight {
  proteinPercentage: number;
  carbsPercentage: number;
  fatPercentage: number;
  recommendedProteinPercentage: number;
  recommendedCarbsPercentage: number;
  recommendedFatPercentage: number;
  balanceQuality: 'excellent' | 'good' | 'needs_improvement';
  insights: string[];
}

// ============ ADAPTIVE TARGETS ============
export interface AdaptiveTargetRequest {
  analysisDays?: number;
  autoApply?: boolean;
}

export interface AdaptiveTarget {
  currentTarget: NutritionTargetDto;
  suggestedTarget: NutritionTargetDto;
  adjustmentReasons: string[];
  confidenceScore: number;
  applied: boolean;
}

// ============ VISION DETECTION ENHANCEMENTS ============
export interface DetectionHistoryRequest {
  days?: number;
  maxResults?: number;
  onlyUnmapped?: boolean;
}

export interface DetectionHistory {
  detectionId: number;
  detectedAt: string;
  detectedLabels: string[];
  mappedFoodNames: string[];
  unmappedCount: number;
  averageConfidence: number;
}

export interface UnmappedLabelsStats {
  [label: string]: number;
}

export interface FoodItemSuggestion {
  foodItemId: number;
  foodName: string;
  matchScore: number;
  reasoning: string;
}

export interface EnhancedTeachLabelRequest {
  label: string;
  foodItemId: number;
  minConfidence?: number;
  applyToSimilar?: boolean;
  notes?: string;
}
