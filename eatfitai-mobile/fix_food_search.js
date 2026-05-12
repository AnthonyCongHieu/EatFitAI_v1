const fs = require('fs');

const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. activeTab
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<'search' \| 'favorites'\>\('search'\);/,
  "const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'common' | null>(null);"
);

// 2. handleTabChange
content = content.replace(
  /const handleTabChange = \(tab: 'search' \| 'favorites'\) => {[\s\S]*?if \(tab === 'favorites'\) loadFavorites\(true\);\n  };/,
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

// 3. runSearch
content = content.replace(
  /async \(searchTerm: string, append = false\) => {\n\s+if \(activeTab === 'favorites'\) return;/,
  `async (searchTerm: string, append = false) => {
      setActiveTab(null);`
);

// 4. handleSearch
content = content.replace(
  /const handleSearch = useCallback\(\(\) => {\n\s+if \(activeTab === 'favorites'\) return;\n\s+runSearch\(query, false\)\.catch\(\(\) => \{\}\);\n\s+\}, \[activeTab, query, runSearch\]\);/,
  `const handleSearch = useCallback(() => {
    runSearch(query, false).catch(() => {});
  }, [query, runSearch]);`
);

// 5. useFocusEffect
content = content.replace(
  /useFocusEffect\(\n\s+useCallback\(\(\) => {\n\s+if \(showQuickSuggestions && activeTab === 'search'\) {\n\s+loadRecentFoods\(\)\.catch\(\(\) => undefined\);\n\s+loadCommonMeals\(\)\.catch\(\(\) => undefined\);\n\s+}\n\s+}, \[activeTab, loadCommonMeals, loadRecentFoods, showQuickSuggestions\]\),\n\s+\);/,
  `useFocusEffect(
    useCallback(() => {
      if (showQuickSuggestions) {
        loadRecentFoods().catch(() => undefined);
        loadCommonMeals().catch(() => undefined);
      }
    }, [loadCommonMeals, loadRecentFoods, showQuickSuggestions]),
  );`
);

// 6. remove shouldShowSuggestionShelves
content = content.replace(
  /const shouldShowSuggestionShelves = activeTab === 'search' && !query\.trim\(\);\n/,
  ``
);

// 7. searchArea conditional
content = content.replace(
  /\{activeTab === 'search' && \(\n\s+<View style=\{S\.searchArea\}>\n/,
  `<View style={S.searchArea}>\n`
);
content = content.replace(
  /<\/View>\n\s+<\/View>\n\s+\)\}\n\s+\{[/][*] ═══ Filter Chips ═══ [*][/]\}/,
  `</View>\n          </View>\n\n        {/* ═══ Filter Chips ═══ */}`
);

// 8. chips
content = content.replace(
  /style=\{\[S\.chip, activeTab === 'search' && S\.chipActive\]\}\n\s+onPress=\{\(\) => handleTabChange\('search'\)\}\n\s+>\n\s+<ThemedText style=\{\[S\.chipText, activeTab === 'search' && S\.chipTextActive\]\}>\n\s+Tất cả\n\s+<\/ThemedText>/,
  `style={[S.chip, activeTab === 'recent' && S.chipActive]}
              onPress={() => handleTabChange('recent')}
            >
              <ThemedText style={[S.chipText, activeTab === 'recent' && S.chipTextActive]}>
                Gần đây
              </ThemedText>`
);
content = content.replace(
  /style=\{\[S\.chip, activeTab === 'favorites' && S\.chipActive\]\}\n\s+onPress=\{\(\) => handleTabChange\('favorites'\)\}\n\s+>\n\s+<ThemedText style=\{\[S\.chipText, activeTab === 'favorites' && S\.chipTextActive\]\}>\n\s+Món yêu thích\n\s+<\/ThemedText>/,
  `style={[S.chip, activeTab === 'favorites' && S.chipActive]}
              onPress={() => handleTabChange('favorites')}
            >
              <ThemedText style={[S.chipText, activeTab === 'favorites' && S.chipTextActive]}>
                Yêu thích
              </ThemedText>
            </Pressable>
            <Pressable
              style={[S.chip, activeTab === 'common' && S.chipActive]}
              onPress={() => handleTabChange('common')}
            >
              <ThemedText style={[S.chipText, activeTab === 'common' && S.chipTextActive]}>
                Thường dùng
              </ThemedText>`
);

// 9. Render content replacement
const renderContentStart = content.indexOf(`{/* ═══ Content ═══ */}`);
const renderContentEnd = content.indexOf(`{/* Floating Scan Button removed`);

const newRenderContent = `{/* ═══ Content ═══ */}
        {isLoading ? (
          <View style={S.centerBox}>
            <ActivityIndicator color={P.primary} size="large" />
          </View>
        ) : errorMessage ? (
          <View style={{ marginTop: 24 }}>
            <AnimatedEmptyState
              variant="error"
              title="Tìm kiếm thất bại"
              description={errorMessage}
              primaryAction={{ label: 'Thử lại', onPress: () => activeTab === 'favorites' ? loadFavorites(true) : handleSearch() }}
            />
          </View>
        ) : activeTab === 'favorites' ? (
          <View style={S.resultsArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>YÊU THÍCH</ThemedText>
            </View>
            {visibleItems.length > 0 ? (
              <View style={{ gap: 12 }}>
                {visibleItems.map((item, idx) => (
                  <View key={getFoodItemKey(item)}>{renderItem({ item, index: idx })}</View>
                ))}
              </View>
            ) : (
              <AnimatedEmptyState variant="no-favorites" title="Chưa có món yêu thích" description="Lưu món ăn yêu thích để truy cập nhanh chóng." />
            )}
          </View>
        ) : activeTab === 'recent' ? (
          <View style={S.resultsArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>MÓN GẦN ĐÂY</ThemedText>
            </View>
            {visibleRecentFoods.length > 0 ? (
              <View style={{ gap: 12 }}>
                {visibleRecentFoods.map((item, idx) => (
                  <View key={getFoodItemKey(item)}>{renderItem({ item, index: idx })}</View>
                ))}
              </View>
            ) : (
              <AnimatedEmptyState variant="no-search-results" title="Chưa có món gần đây" description="Các món bạn thêm vào nhật ký sẽ xuất hiện ở đây." />
            )}
          </View>
        ) : activeTab === 'common' ? (
          <View style={S.resultsArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>MÓN THƯỜNG DÙNG</ThemedText>
              <Pressable onPress={handleOpenCommonMeals} hitSlop={8}>
                <ThemedText style={S.sectionAction}>Quản lý</ThemedText>
              </Pressable>
            </View>
            {commonMeals.length > 0 ? (
              <View style={{ gap: 12 }}>
                {commonMeals.map((template, idx) => (
                  <View key={template.id}>{renderCommonMeal({ template, index: idx })}</View>
                ))}
              </View>
            ) : (
              <View style={S.commonMealEmptyCard}>
                <ThemedText style={S.commonMealEmptyTitle}>
                  Chưa có món thường dùng nào
                </ThemedText>
                <ThemedText style={S.commonMealEmptyDescription}>
                  Tạo mẫu bữa ăn bạn hay lặp lại để thêm nhanh vào nhật ký.
                </ThemedText>
                <Pressable
                  onPress={handleOpenCommonMeals}
                  style={({ pressed }) => [
                    S.commonMealEmptyButton,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={P.primary} />
                  <ThemedText style={S.commonMealEmptyButtonText}>Tạo món thường dùng</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        ) : query.trim() && items.length > 0 ? (
          <View style={S.resultsArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>KẾT QUẢ CHO "{query}"</ThemedText>
            </View>
            <View style={{ gap: 12 }}>
              {visibleItems.map((item, idx) => (
                <View key={getFoodItemKey(item)}>{renderItem({ item, index: idx })}</View>
              ))}
            </View>
          </View>
        ) : query.trim() && items.length === 0 && hasSearched ? (
          <View style={{ marginTop: 24 }}>
            <AnimatedEmptyState
              variant="no-search-results"
              title="Không tìm thấy kết quả"
              description="Thử thay đổi từ khóa tìm kiếm."
            />
          </View>
        ) : (
          <View style={S.recentArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>TÌM KIẾM GẦN ĐÂY</ThemedText>
            </View>
            <View style={{ gap: 8 }}>
              {recentSearches.length > 0 ? recentSearches.map((term, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [S.recentItem, pressed && { backgroundColor: P.glassHover }]}
                  onPress={() => handleQuickSuggestion(term)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="time-outline" size={20} color={P.onSurfaceVariant} />
                    <ThemedText style={S.recentText}>{term}</ThemedText>
                  </View>
                  <Ionicons name="arrow-undo-outline" size={16} color={P.onSurfaceVariant} style={{ transform: [{ scaleX: -1 }] }} />
                </Pressable>
              )) : (
                <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 13, marginTop: 4 }}>
                  Chưa có tìm kiếm nào gần đây.
                </ThemedText>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      `;

if (renderContentStart !== -1 && renderContentEnd !== -1) {
  content = content.slice(0, renderContentStart) + newRenderContent + content.slice(renderContentEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated FoodSearchScreen.tsx');
