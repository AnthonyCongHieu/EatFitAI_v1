/* eslint-env jest, node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app', 'screens', 'stats', 'StatsScreen.tsx'),
  'utf8',
);

function readStyleBlock(styleName) {
  const match = source.match(new RegExp(`${styleName}: \\{([\\s\\S]*?)\\n  \\},`));
  if (!match) {
    throw new Error(`Could not find ${styleName} style block`);
  }

  return match[1];
}

describe('StatsScreen week card Android rendering', () => {
  it('keeps week cards stable without Android elevation glow artifacts', () => {
    const ringCard = readStyleBlock('wkRingCard');
    const chartCard = readStyleBlock('wkGlassChart');

    expect(ringCard).toContain('minHeight: 340');
    expect(chartCard).toContain('minHeight: 300');
    expect(ringCard).not.toContain('elevation');
    expect(chartCard).not.toContain('elevation');
    expect(source).toContain('weekCardGradient');
  });
});
