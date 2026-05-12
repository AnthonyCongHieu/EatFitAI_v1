const fs = require('fs');
const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldChips = `            <Pressable
              style={[S.chip, activeTab === 'recent' && S.chipActive]}
              onPress={() => handleTabChange('search')}
            >
              <ThemedText style={[S.chipText, activeTab === 'recent' && S.chipTextActive]}>
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
fs.writeFileSync(path, content, 'utf8');
