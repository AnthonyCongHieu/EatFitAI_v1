const fs = require('fs');

const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  // 1. activeTab definition
  if (lines[i].includes("const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');")) {
    lines[i] = "  const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'common' | null>(null);";
  }
  
  // 2. hasSearched definition
  if (lines[i].includes("const [, setHasSearched] = useState(false);")) {
    lines[i] = "  const [hasSearched, setHasSearched] = useState(false);";
  }
  
  // 3. handleTabChange declaration
  if (lines[i].includes("const handleTabChange = (tab: 'search' | 'favorites') => {")) {
    lines[i] = "  const handleTabChange = (tab: 'recent' | 'favorites' | 'common') => {";
    // We also need to fix the logic inside. We'll just replace the lines inside the function.
    lines[i+1] = "    if (activeTab === tab) { setActiveTab(null); setItems([]); return; }";
    lines[i+2] = "    setActiveTab(tab);";
    lines[i+3] = "    setQuery('');";
    lines[i+4] = "    setItems([]);";
    lines[i+5] = "    setHasSearched(false);";
    lines[i+6] = "    setErrorMessage(null);";
    lines[i+7] = "    if (tab === 'favorites') loadFavorites(true);";
    lines[i+8] = "  };";
    // Clear out the remaining original lines of the function
    for (let j = i+9; j <= i+11; j++) {
      lines[j] = "";
    }
  }
  
  // 4. runSearch declaration
  if (lines[i].includes("if (activeTab === 'favorites') return;") && lines[i-1].includes("async (searchTerm: string, append = false) => {")) {
    lines[i] = "      setActiveTab(null);";
  }
  
  // 5. handleSearch declaration
  if (lines[i].includes("const handleSearch = useCallback(() => {")) {
    // The next line is "if (activeTab === 'favorites') return;"
    if (lines[i+1].includes("if (activeTab === 'favorites') return;")) {
      lines[i+1] = ""; // remove the return
    }
    if (lines[i+3].includes("}, [activeTab, query, runSearch]);")) {
      lines[i+3] = "  }, [query, runSearch]);";
    }
  }

  // 6. useFocusEffect activeTab condition
  if (lines[i].includes("if (showQuickSuggestions && activeTab === 'search') {")) {
    lines[i] = "      if (showQuickSuggestions) {";
  }
  if (lines[i].includes("}, [activeTab, loadCommonMeals, loadRecentFoods, showQuickSuggestions]),")) {
    lines[i] = "    }, [loadCommonMeals, loadRecentFoods, showQuickSuggestions]),";
  }
  
  // 7. shouldShowSuggestionShelves
  if (lines[i].includes("const shouldShowSuggestionShelves = activeTab === 'search' && !query.trim();")) {
    lines[i] = "";
  }

  // 8. Search Input Wrapper
  if (lines[i].includes("{activeTab === 'search' && (")) {
    lines[i] = ""; // remove {activeTab === 'search' && (
    
    // Find the matching )} 
    for (let j = i + 1; j < i + 30; j++) {
      if (lines[j].includes(")}")) {
        // Confirm it's the right one by checking previous lines
        if (lines[j-1].includes("</View>") && lines[j-2].includes("</View>")) {
          lines[j] = ""; // remove )}
          break;
        }
      }
    }
  }

  // 9. Filter Chips
  if (lines[i].includes("onPress={() => handleTabChange('search')}")) {
    lines[i] = "              onPress={() => handleTabChange('recent')}";
  }
  if (lines[i].includes("style={[S.chip, activeTab === 'search' && S.chipActive]}")) {
    lines[i] = "              style={[S.chip, activeTab === 'recent' && S.chipActive]}";
  }
  if (lines[i].includes("<ThemedText style={[S.chipText, activeTab === 'search' && S.chipTextActive]}>")) {
    lines[i] = "              <ThemedText style={[S.chipText, activeTab === 'recent' && S.chipTextActive]}>";
    lines[i+1] = "                Gần đây";
  }
  if (lines[i].includes("Món yêu thích") && lines[i-1].includes("activeTab === 'favorites'")) {
    lines[i] = "                Yêu thích";
  }
}

// Write the joined lines back
let joined = lines.join('\n');

// 9b. Add the Common Meals chip after the Favorites chip
const favChipClose = `            </Pressable>
          </ScrollView>`;
const newChips = `            </Pressable>
            <Pressable
              style={[S.chip, activeTab === 'common' && S.chipActive]}
              onPress={() => handleTabChange('common')}
            >
              <ThemedText style={[S.chipText, activeTab === 'common' && S.chipTextActive]}>
                Thường dùng
              </ThemedText>
            </Pressable>
          </ScrollView>`;
joined = joined.replace(favChipClose, newChips);

// 10. Render Content logic
const renderContentStart = joined.indexOf(`{/* ═══ Content ═══ */}`);
const renderContentEnd = joined.indexOf(`{/* Floating Scan Button removed`);

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
  joined = joined.slice(0, renderContentStart) + newRenderContent + joined.slice(renderContentEnd);
}

// Format the file string by replacing empty lines to avoid clutter
fs.writeFileSync(path, joined, 'utf8');
console.log('Line-by-line script executed successfully');
