const fs = require('fs');

const code = fs.readFileSync('d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx', 'utf8');
const lines = code.split('\n');

let inSingleQuote = false;
let inDoubleQuote = false;
let inTemplateLiteral = false;
let inLineComment = false;
let inBlockComment = false;

let depth = 0;
let started = false;
let startLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function Learn')) {
    started = true;
    startLine = i + 1;
    depth = 0;
  }
}

if (startLine !== -1) {
  console.log(`Bắt đầu theo dõi từ dòng ${startLine}`);
  
  for (let lineIdx = startLine - 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    inLineComment = false;
    
    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      const nextChar = line[colIdx + 1];
      
      if (inLineComment) continue;
      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          colIdx++;
        }
        continue;
      }
      
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
      
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        
        if (depth === 0 && (lineIdx + 1) < lines.length - 2) {
          console.log(`CẢNH BÁO: depth = 0 tại Dòng ${lineIdx + 1}, Cột ${colIdx + 1}!`);
          console.log(`Nội dung dòng ${lineIdx + 1}: ${line.trim()}`);
          
          console.log('--- Ngữ cảnh xung quanh dòng đóng ngoặc sớm ---');
          for (let k = Math.max(0, lineIdx-5); k <= Math.min(lines.length-1, lineIdx+5); k++) {
            console.log(`${k+1}: ${lines[k]}`);
          }
          return; // Dừng lại sau khi tìm thấy dòng đầu tiên
        }
      }
    }
  }
}
