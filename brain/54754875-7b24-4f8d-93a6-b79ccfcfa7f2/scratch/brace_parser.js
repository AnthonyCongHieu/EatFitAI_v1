const fs = require('fs');

const code = fs.readFileSync('d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx', 'utf8');

let inSingleQuote = false;
let inDoubleQuote = false;
let inTemplateLiteral = false;
let inLineComment = false;
let inBlockComment = false;

let stack = [];

const lines = code.split('\n');

const startLine = 1227;
const endLine = lines.length;

for (let lineIdx = startLine - 1; lineIdx < endLine; lineIdx++) {
  const line = lines[lineIdx];
  inLineComment = false;
  
  for (let colIdx = 0; colIdx < line.length; colIdx++) {
    const char = line[colIdx];
    const nextChar = line[colIdx + 1];
    
    // Comment bypass
    if (inLineComment) continue;
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        colIdx++;
      }
      continue;
    }
    
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      colIdx++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      colIdx++;
      continue;
    }
    
    // String bypass
    if (inSingleQuote) {
      if (char === "'" && line[colIdx - 1] !== '\\') {
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (char === '"' && line[colIdx - 1] !== '\\') {
        inDoubleQuote = false;
      }
      continue;
    }
    if (inTemplateLiteral) {
      if (char === '`' && line[colIdx - 1] !== '\\') {
        inTemplateLiteral = false;
      }
      continue;
    }
    
    if (char === "'") {
      inSingleQuote = true;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }
    if (char === '`') {
      inTemplateLiteral = true;
      continue;
    }
    
    // Track braces
    if (char === '{') {
      stack.push({ line: lineIdx + 1, col: colIdx + 1, content: line.trim() });
    } else if (char === '}') {
      if (stack.length > 0) {
        stack.pop();
      } else {
        console.log(`Đóng ngoặc nhọn thừa tại Dòng ${lineIdx + 1}, Cột ${colIdx + 1}: ${line.trim()}`);
      }
    }
  }
}

console.log(`Số lượng ngoặc mở chưa đóng trong khoảng dòng ${startLine} - ${endLine}: ${stack.length}`);
stack.forEach((brace, idx) => {
  console.log(`[${idx + 1}] Dòng ${brace.line}, Cột ${brace.col}: "${brace.content.substring(0, 80)}"`);
});
