const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scanRoots = [path.join(rootDir, 'src')];
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const forbiddenPatterns = [
  {
    name: 'direct-ai-provider-url',
    regex: /https?:\/\/[^\s"'`]+:5050(?:\/|(?=["'`])|$)/gi,
  },
  {
    name: 'direct-ai-provider-host-port',
    regex: /(?:localhost|127\.0\.0\.1|10\.0\.2\.2|ai-provider):5050/gi,
  },
];

const violations = [];

const walk = (currentPath) => {
  const stat = fs.statSync(currentPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(currentPath)) {
      walk(path.join(currentPath, entry));
    }
    return;
  }

  if (!allowedExtensions.has(path.extname(currentPath))) {
    return;
  }

  const content = fs.readFileSync(currentPath, 'utf8');
  for (const pattern of forbiddenPatterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const beforeMatch = content.slice(0, match.index);
      const line = beforeMatch.split(/\r?\n/).length;
      violations.push({
        file: path.relative(rootDir, currentPath),
        line,
        pattern: pattern.name,
        snippet: match[0],
      });
    }
  }
};

for (const scanRoot of scanRoots) {
  walk(scanRoot);
}

if (violations.length > 0) {
  console.error(
    'Direct AI provider URLs are not allowed in eatfitai-mobile. Use the backend proxy instead.',
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} [${violation.pattern}] ${violation.snippet}`,
    );
  }
  process.exit(1);
}

console.log('No direct AI provider URLs found in eatfitai-mobile/src.');
