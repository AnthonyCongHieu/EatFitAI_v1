import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Mascot water quick action navigation', () => {
  it('opens the home water controls instead of silently adding water', () => {
    const source = readSource('src/features/mochi/MoChiIslandHost.tsx');

    expect(source).toContain("navigation.navigate('AppTabs', {");
    expect(source).toContain("screen: 'HomeTab'");
    expect(source).toContain('focusWaterRequestId: Date.now()');
    expect(source).not.toContain('handleAddWater();');
  });

  it('lets HomeTab receive and focus a water request', () => {
    const tabsSource = readSource('src/app/navigation/AppTabs.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');

    expect(tabsSource).toContain('focusWaterRequestId?: number');
    expect(homeSource).toContain('route.params?.focusWaterRequestId');
    expect(homeSource).toContain('scrollViewRef={screenScrollRef}');
    expect(homeSource).toContain('setWaterCardY(e.nativeEvent.layout.y)');
    expect(homeSource).toContain('scrollTo({ y: Math.max(waterCardY - 24, 0), animated: true })');
  });
});
