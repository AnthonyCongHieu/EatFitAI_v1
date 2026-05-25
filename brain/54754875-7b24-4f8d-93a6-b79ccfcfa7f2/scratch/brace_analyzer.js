const fs = require('fs');

const code = fs.readFileSync('d:/EatFitAI_v1/eatfitai-prep-web/src/views/Learn.tsx', 'utf8');
const lines = code.split('\n');

let depth = 0;
let learnStarted = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('export default function Learn')) {
    learnStarted = true;
  }
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
    }
  }
  
  if (learnStarted && depth === 0) {
    console.log(`Hàm Learn bị đóng ngoặc sớm (depth = 0) tại dòng ${i+1}!`);
    console.log(`Nội dung dòng ${i+1}: ${line}`);
    // In thêm 5 dòng trước và sau để quan sát
    console.log('--- NGỮ CẢNH ---');
    for (let k = Math.max(0, i-5); k <= Math.min(lines.length-1, i+5); k++) {
      console.log(`${k+1}: ${lines[k]}`);
    }
    break;
  }
}
