import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('production mobile readiness guardrails', () => {
  it('keeps backend and AI requests bounded instead of polling aggressively', () => {
    const appSource = readSource('App.tsx');
    const healthSource = readSource('src/services/healthService.ts');
    const aiStatusSource = readSource('src/hooks/useAiStatus.ts');
    const mobileConfigSource = readSource('src/services/mobileConfigService.ts');

    expect(appSource).toContain('refetchOnWindowFocus: false');
    expect(appSource).toContain('refetchOnReconnect: false');
    expect(appSource).toContain('return failureCount < 3');
    expect(healthSource).toContain('CLOUD_WARMUP_CACHE_MS');
    expect(healthSource).toContain('warmUpPromise');
    expect(mobileConfigSource).toContain('DEFAULT_CACHE_TTL_MS');
    expect(mobileConfigSource).toContain("'If-None-Match'");
    expect(aiStatusSource).toContain('staleTime: 60_000');
    expect(aiStatusSource).toContain('refetchInterval: false');
    expect(aiStatusSource).toContain('retry: false');
  });

  it('keeps search flows debounce-safe and latest-response-only', () => {
    const foodSearchSource = readSource('src/app/screens/diary/FoodSearchScreen.tsx');
    const foodPickerSource = readSource('src/components/ui/FoodPickerBottomSheet.tsx');
    const teachLabelSource = readSource('src/components/ui/TeachLabelBottomSheet.tsx');

    for (const source of [foodSearchSource, foodPickerSource, teachLabelSource]) {
      expect(source).toContain('searchRequestSeqRef');
      expect(source).toContain('searchRequestSeqRef.current !== requestSeq');
    }
    expect(foodPickerSource).toContain('setTimeout(() =>');
    expect(teachLabelSource).toContain('setTimeout(() =>');
  });

  it('keeps heavy app surfaces lazy loaded and avoids legacy direct AI provider calls', () => {
    const appSource = readSource('App.tsx');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const apiClientSource = readSource('src/services/apiClient.ts');

    expect(appSource).toContain('getAppNavigator');
    expect(appSource).toContain("import('./src/services/errorTracking')");
    expect(navigatorSource).toContain('lazyScreen');
    expect(navigatorSource).toContain("require('../screens/ai/AIScanScreen')");
    expect(apiClientSource).not.toContain('eatfitai-ai.duckdns.org');
    expect(apiClientSource).not.toContain('eatfitai-backend.onrender.com');
  });
});
