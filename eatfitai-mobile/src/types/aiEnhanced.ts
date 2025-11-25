// Types cho cac tinh nang AI nang cao
// Chu thich bang tieng Viet khong dau

// ============ RECIPE SUGGESTIONS ============
export interface RecipeSuggestionRequest {
    availableIngredients: string[];
    maxCookingTimeMinutes?: number;
    minMatchedIngredients?: number;
    maxResults?: number;
}

export interface RecipeSuggestion {
    recipeId: number;
    recipeName: string;
    description?: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    matchedIngredientsCount: number;
    totalIngredientsCount: number;
    matchPercentage: number;
    matchedIngredients: string[];
    missingIngredients: string[];
    allIngredients: string[];
}

export interface RecipeDetail extends RecipeSuggestion {
    ingredients: RecipeIngredientDetail[];
    instructions?: string[];
    tags?: string[];
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
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
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
