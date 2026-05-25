const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\8bdaaee1-14d8-4334-a954-3e48fc1d4682\\.system_generated\\logs\\transcript.jsonl';
const targetPath = 'd:\\EatFitAI_v1\\eatfitai-prep-web\\src\\views\\Infrastructure.tsx';
const backupPath = 'd:\\EatFitAI_v1\\eatfitai-prep-web\\src\\views\\Infrastructure.tsx.bak';

if (!fs.existsSync(logPath)) {
  console.error('Log file not found:', logPath);
  process.exit(1);
}

// Backup current file
if (fs.existsSync(targetPath)) {
  fs.copyFileSync(targetPath, backupPath);
  console.log('Backed up current file to', backupPath);
}

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
let foundCode = null;

// Quét từ cuối lên đầu để tìm step có chứa tool_call write_to_file cho Infrastructure.tsx
for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.tool_calls) {
      for (const call of data.tool_calls) {
        if (call.name === 'write_to_file' && call.args && call.args.TargetFile && call.args.TargetFile.includes('Infrastructure.tsx')) {
          console.log(`Found write_to_file at step ${data.step_index}`);
          foundCode = call.args.CodeContent;
          break;
        }
      }
    }
    if (foundCode) break;
  } catch (err) {
    // ignore
  }
}

if (foundCode) {
  let cleanContent = foundCode;
  
  // Giải mã chuỗi JSON string nếu cần
  if (typeof cleanContent === 'string') {
    // Nếu chuỗi bắt đầu bằng dấu ngoặc kép và được escape, ta parse nó
    if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
      try {
        cleanContent = JSON.parse(cleanContent);
      } catch (e) {
        console.log('JSON parse failed, using raw string');
      }
    } else {
      // Đôi khi chuỗi được lưu dạng JSON raw, ta thử bọc lại để parse
      try {
        cleanContent = JSON.parse('"' + cleanContent.replace(/"/g, '\\"') + '"');
      } catch (e) {
        // Cố gắng replace các ký tự escape thủ công
        cleanContent = cleanContent
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
  }

  // Đảm bảo ghi bằng UTF-8 không có BOM (chuẩn của Node.js fs.writeFileSync)
  fs.writeFileSync(targetPath, cleanContent, 'utf-8');
  console.log('Successfully restored clean UTF-8 content to', targetPath);
} else {
  console.log('No matching file write found in the log.');
}
