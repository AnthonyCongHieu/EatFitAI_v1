import fs from 'fs';
import path from 'path';

describe('Mascot reminder bubble animation', () => {
  const sourcePath = path.join(__dirname, '..', 'src', 'components', 'MascotOverlay.tsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('uses a non-spring entrance so the reminder does not shake on app open', () => {
    expect(source).toMatch(/entering=\{SlideInRight\.delay\(\d+\)\s*\.duration\(\d+\)\s*\.easing\(/);
    expect(source).not.toMatch(/entering=\{SlideInRight\.delay\(\d+\)\s*\.springify\(\)/);
  });

  it('keeps the periodic reminder nudge timing-based instead of springy', () => {
    const bubbleBounceEffect = source.match(/bubbleBounce\.value = withRepeat[\s\S]*?const floatStyle/u)?.[0] ?? '';

    expect(bubbleBounceEffect).toContain('withTiming(-2');
    expect(bubbleBounceEffect).not.toContain('withSpring');
  });
});
