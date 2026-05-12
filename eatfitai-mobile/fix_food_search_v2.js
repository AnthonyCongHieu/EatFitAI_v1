const fs = require('fs');

const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. activeTab
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<'search' \| 'favorites'\>\('search'\);/,
  "const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'common' | null>(null);"
);

// 2. hasSearched
content = content.replace(
  /const \[, setHasSearched\] = useState\(false\);/,
  "const [hasSearched, setHasSearched] = useState(false);"
);

// 3. handleTabChange
const oldHandleTabChange = `  const handleTabChange = (tab: 'search' | 'favorites') => {
    setActiveTab(tab);
    setItems([]);
    setHasSearched(false);
    setErrorMessage(null);
    if (tab === 'favorites') loadFavorites(true);
    if (tab === 'search' && showQuickSuggestions) {
      loadRecentFoods().catch(() => undefined);
      loadCommonMeals().catch(() => undefined);
    }
  };`;
const newHandleTabChange = `  const handleTabChange = (tab: 'recent' | 'favorites' | 'common') => {
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
  };`;
content = content.replace(oldHandleTabChange, newHandleTabChange);

// 4. runSearch
content = content.replace(
  /const runSearch = useCallback\(\n\s*async \(searchTerm: string, append = false\) => \{\n\s*if \(activeTab === 'favorites'\) return;/,
  `const runSearch = useCallback(
    async (searchTerm: string, append = false) => {
      setActiveTab(null);`
);

// 5. handleSearch
const oldHandleSearch = `  const handleSearch = useCallback(() => {
    if (activeTab === 'favorites') return;
    runSearch(query, false).catch(() => {});
  }, [activeTab, query, runSearch]);`;
const newHandleSearch = `  const handleSearch = useCallback(() => {
    runSearch(query, false).catch(() => {});
  }, [query, runSearch]);`;
content = content.replace(oldHandleSearch, newHandleSearch);

// 6. useFocusEffect
const oldFocusEffect = `  useFocusEffect(
    useCallback(() => {
      if (showQuickSuggestions && activeTab === 'search') {
        loadRecentFoods().catch(() => undefined);
        loadCommonMeals().catch(() => undefined);
      }
    }, [activeTab, loadCommonMeals, loadRecentFoods, showQuickSuggestions]),
  );`;
const newFocusEffect = `  useFocusEffect(
    useCallback(() => {
      if (showQuickSuggestions) {
        loadRecentFoods().catch(() => undefined);
        loadCommonMeals().catch(() => undefined);
      }
    }, [loadCommonMeals, loadRecentFoods, showQuickSuggestions]),
  );`;
content = content.replace(oldFocusEffect, newFocusEffect);

// 7. Remove shouldShowSuggestionShelves
content = content.replace(
  /const shouldShowSuggestionShelves = activeTab === 'search' && !query\.trim\(\);\n/,
  ``
);

// 8. Search Input Wrapper
const oldSearchArea = `        {/* ═══ Search Input Area ═══ */}
        {activeTab === 'search' && (
          <View style={S.searchArea}>
            <View style={S.searchInputBox}>
              <Ionicons name="search" size={20} color={P.onSurfaceVariant} style={{ marginRight: 10 }} />
              <TextInput
                testID={TEST_IDS.foodSearch.queryInput}
                nativeID={TEST_IDS.foodSearch.queryInput}
                accessibilityLabel={TEST_IDS.foodSearch.queryInput}
                style={S.searchInput}
                placeholder="Tìm kiếm món ăn, công thức..."
                placeholderTextColor={P.onSurfaceVariant + '80'}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                autoFocus={autoFocus}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={P.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
          </View>
        )}`;
const newSearchArea = `        {/* ═══ Search Input Area ═══ */}
        <View style={S.searchArea}>
          <View style={S.searchInputBox}>
            <Ionicons name="search" size={20} color={P.onSurfaceVariant} style={{ marginRight: 10 }} />
            <TextInput
              testID={TEST_IDS.foodSearch.queryInput}
              nativeID={TEST_IDS.foodSearch.queryInput}
              accessibilityLabel={TEST_IDS.foodSearch.queryInput}
              style={S.searchInput}
              placeholder="Tìm kiếm món ăn, công thức..."
              placeholderTextColor={P.onSurfaceVariant + '80'}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              autoFocus={autoFocus}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={P.onSurfaceVariant} />
              </Pressable>
            )}
          </View>
        </View>`;
content = content.replace(oldSearchArea, newSearchArea);

// 9. Filter Chips
const oldChips = `            <Pressable
              style={[S.chip, activeTab === 'search' && S.chipActive]}
              onPress={() => handleTabChange('search')}
            >
              <ThemedText style={[S.chipText, activeTab === 'search' && S.chipTextActive]}>
                Tất cả
              </ThemedText>
            </Pressable>
            <Pressable
              style={[S.chip, activeTab === 'favorites' && S.chipActive]}
              onPress={() => handleTabChange('favorites')}
            >
              <ThemedText style={[S.chipText, activeTab === 'favorites' && S.chipTextActive]}>
                Món yêu thích
              </ThemedText>
            </Pressable>`;
const newChips = `            <Pressable
              style={[S.chip, activeTab === 'recent' && S.chipActive]}
              onPress={() => handleTabChange('recent')}
            >
              <ThemedText style={[S.chipText, activeTab === 'recent' && S.chipTextActive]}>
                Gần đây
              </ThemedText>
            </Pressable>
            <Pressable
              style={[S.chip, activeTab === 'favorites' && S.chipActive]}
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
              </ThemedText>
            </Pressable>`;
content = content.replace(oldChips, newChips);

// 10. Render Content replacement
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
console.log('Successfully updated FoodSearchScreen.tsx with correct search bar logic');
