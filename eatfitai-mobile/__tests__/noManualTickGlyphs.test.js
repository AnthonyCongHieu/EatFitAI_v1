const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(mobileRoot, 'src');
const manualTickGlyphPattern = /[\u2705\u2713\u2714\u2611]/u;

function collectSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '_archive') return [];
      return collectSourceFiles(absolutePath);
    }

    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    if (entry.name.endsWith('.corrupted')) return [];

    return [absolutePath];
  });
}

describe('manual tick glyph guard', () => {
  it('keeps active app source free of text/emoji tick glyphs', () => {
    const offenders = collectSourceFiles(sourceRoot).flatMap((file) => {
      const relativePath = path.relative(mobileRoot, file);
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

      return lines
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => manualTickGlyphPattern.test(line))
        .map(({ line, lineNumber }) => `${relativePath}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });
});
