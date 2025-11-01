#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Cho phép truyền vào qua tham số CLI hoặc biến môi trường
// Ưu tiên: CLI arg -> OPENAPI_PATH -> OPENAPI_URL
const cliArg = process.argv[2];
const envPath = process.env.OPENAPI_PATH;
const envUrl = process.env.OPENAPI_URL;

const input = cliArg || envPath || envUrl;
const outputPath = path.join(__dirname, "..", "types", "api.d.ts");

if (!input) {
  console.warn(
    "[typegen] Bo qua: khong co duong dan/URL OpenAPI (truyen qua tham so, OPENAPI_PATH hoac OPENAPI_URL)."
  );
  process.exit(0);
}

const isUrl = /^https?:\/\//i.test(input);
if (!isUrl && !fs.existsSync(input)) {
  console.warn(`[typegen] Khong tim thay file OpenAPI: ${input}. Bo qua.`);
  process.exit(0);
}

const cmd = `npx openapi-typescript "${input}" --output "${outputPath}"`;
console.log(`[typegen] Dang tao type tu: ${input}`);
execSync(cmd, { stdio: "inherit" });
console.log(`[typegen] Da tao type tai: ${outputPath}`);


