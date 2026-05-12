const fs = require('fs');
const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/activeTab === 'search'/g, "activeTab === 'recent'");
content = content.replace(/const visibleRecentFoods = filteredRecentFoods\.items;\s+const visibleRecentFoods = filteredRecentFoods\.items;/g, "const visibleRecentFoods = filteredRecentFoods.items;");

fs.writeFileSync(path, content, 'utf8');
