function trim(value) {
  return String(value || '').trim();
}

function normalizeName(value) {
  return trim(value).toLowerCase();
}

function extractStringsFromMealDiary(rows) {
  const items = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const names = [
      row?.FoodItemName,
      row?.foodItemName,
      row?.RecipeName,
      row?.recipeName,
      row?.UserDishName,
      row?.userDishName,
      row?.Note,
      row?.note,
    ];

    for (const name of names) {
      const trimmed = trim(name);
      if (trimmed) {
        items.push(trimmed);
      }
    }
  }

  return [...new Set(items)];
}

function mealDiaryRowsContainFoodName(rows, foodName) {
  const normalizedFoodName = normalizeName(foodName);
  if (!normalizedFoodName) {
    return false;
  }

  return extractStringsFromMealDiary(rows).some((value) =>
    normalizeName(value).includes(normalizedFoodName),
  );
}

module.exports = {
  extractStringsFromMealDiary,
  mealDiaryRowsContainFoodName,
};
