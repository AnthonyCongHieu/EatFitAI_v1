const fs = require('fs');
const path = 'f:/EatFitAI_v1/eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/handleTabChange\('search'\)/g, "handleTabChange('recent')");
content = content.replace(/Tất cả/g, "Gần đây");
content = content.replace(/>\s*Món yêu thích\s*<\/ThemedText>/g, ">Yêu thích</ThemedText>");

if (!content.includes("handleTabChange('common')")) {
  const insertPos = content.indexOf('</ScrollView>');
  if (insertPos !== -1) {
    const commonChip = `
            <Pressable
              style={[S.chip, activeTab === 'common' && S.chipActive]}
              onPress={() => handleTabChange('common')}
            >
              <ThemedText style={[S.chipText, activeTab === 'common' && S.chipTextActive]}>
                Thường dùng
              </ThemedText>
            </Pressable>
`;
    content = content.slice(0, insertPos) + commonChip + content.slice(insertPos);
  }
}

fs.writeFileSync(path, content, 'utf8');
