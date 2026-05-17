import { readFileSync } from 'fs';
import path from 'path';

describe('AppNavigator floating MoChi island', () => {
  it('does not mount the floating MoChi island overlay in the app navigator', () => {
    const source = readFileSync(
      path.join(__dirname, '..', 'src', 'app', 'navigation', 'AppNavigator.tsx'),
      'utf8',
    );

    expect(source).not.toContain('MoChiIslandHost');
  });
});
