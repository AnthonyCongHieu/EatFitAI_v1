#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const openapiPath = process.argv[2] || path.join(__dirname, "..", "..", "eatfitai-backend", "openapi.json");
const outputPath = path.join(__dirname, "..", "types", "api.d.ts");

if (!fs.existsSync(openapiPath)) {
  console.error(`Khong tim thay file OpenAPI: ${openapiPath}`);
  process.exit(1);
}

const cmd = `npx openapi-typescript "${openapiPath}" --output "${outputPath}"`;
console.log(`Dang tao type tu: ${openapiPath}`);
execSync(cmd, { stdio: "inherit" });
console.log(`Da tao type tai: ${outputPath}`);


