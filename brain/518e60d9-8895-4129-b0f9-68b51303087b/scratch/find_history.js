const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\8bdaaee1-14d8-4334-a954-3e48fc1d4682\\.system_generated\\logs\\transcript.jsonl';
const outputPath = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\518e60d9-8895-4129-b0f9-68b51303087b\\scratch\\recovered_infra.tsx';

if (!fs.existsSync(logPath)) {
  console.error('Log file not found:', logPath);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
console.log(`Total lines read: ${lines.length}`);

let foundCode = null;

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
    // ignore parse errors for incomplete lines
  }
}

if (foundCode) {
  // Unescape the string if it was stored as JSON string
  let cleanContent = foundCode;
  if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
    try {
      cleanContent = JSON.parse(cleanContent);
    } catch (e) {
      // fallback
    }
  }
  fs.writeFileSync(outputPath, cleanContent, 'utf-8');
  console.log('Successfully recovered to', outputPath);
} else {
  console.log('No matching file write found in the log.');
}
