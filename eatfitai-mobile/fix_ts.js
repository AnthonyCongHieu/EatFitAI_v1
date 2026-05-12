const fs = require('fs');
const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. handleTabChange
content = content.replace(
  /const handleTabChange = \(tab: 'search' \| 'favorites'\) => {[\s\S]*?if \(tab === 'search' && showQuickSuggestions\) {[\s\S]*?\}[\s\S]*?\};/m,
  `const handleTabChange = (tab: 'recent' | 'favorites' | 'common') => {
    if (activeTab === tab) {
      setActiveTab(null);
      setItems([]);
      return;
    }
    setActiveTab(tab);
    setQuery('');
    setItems([]);
    setHasSearched(false);
    setErrorMessage(null);
    if (tab === 'favorites') loadFavorites(true);
  };`
);

// 2. runSearch
content = content.replace(
  /const runSearch = useCallback\(\n\s+async \(searchTerm: string, append = false\) => \{\n\s+if \(activeTab === 'favorites'\) return;/m,
  `const runSearch = useCallback(
    async (searchTerm: string, append = false) => {
      setActiveTab(null);`
);

// 3. handleSearch
content = content.replace(
  /const handleSearch = useCallback\(\(\) => \{\n\s+if \(activeTab === 'favorites'\) return;\n\s+runSearch\(query, false\)\.catch\(\(\) => \{\}\);\n\s+\}, \[activeTab, query, runSearch\]\);/m,
  `const handleSearch = useCallback(() => {
    runSearch(query, false).catch(() => {});
  }, [query, runSearch]);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TypeScript errors');
