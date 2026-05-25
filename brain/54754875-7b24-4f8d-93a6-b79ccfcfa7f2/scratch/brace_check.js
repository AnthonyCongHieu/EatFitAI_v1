const fs = require('fs');

const code = fs.readFileSync('d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx', 'utf8');

let openBraces = 0;
let closeBraces = 0;
let openParens = 0;
let closeParens = 0;

for (let i = 0; i < code.length; i++) {
  const char = code[i];
  if (char === '{') openBraces++;
  else if (char === '}') closeBraces++;
  else if (char === '(') openParens++;
  else if (char === ')') closeParens++;
}

console.log(`Curly braces: Open = ${openBraces}, Close = ${closeBraces}, Diff = ${openBraces - closeBraces}`);
console.log(`Parentheses: Open = ${openParens}, Close = ${closeParens}, Diff = ${openParens - closeParens}`);
