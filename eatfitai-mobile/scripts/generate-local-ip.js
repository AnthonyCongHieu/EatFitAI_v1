/**
 * Script này chạy trước khi start Expo để generate file chứa IP local
 * Giải quyết vấn đề Constants.expoConfig.extra không accessible trong runtime
 */
const os = require('os');
const fs = require('fs');
const path = require('path');

function readEnvFileValue(envFilePath, key) {
  if (!fs.existsSync(envFilePath)) {
    return undefined;
  }

  const lines = fs.readFileSync(envFilePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const currentKey = trimmed.slice(0, separatorIndex).trim();
    if (currentKey !== key) {
      continue;
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    return rawValue.replace(/^['"]|['"]$/g, '');
  }

  return undefined;
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    // Bỏ qua các virtual adapters (Docker, WSL, VirtualBox, etc.)
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('docker') ||
      lowerName.includes('veth') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('wsl')
    ) {
      continue;
    }

    for (const addr of addrs) {
      // Chỉ lấy IPv4, không phải loopback, và external
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({
          name,
          address: addr.address,
          // Ưu tiên WiFi và Ethernet
          priority:
            lowerName.includes('wi-fi') ||
            lowerName.includes('wifi') ||
            lowerName.includes('wlan')
              ? 1
              : lowerName.includes('ethernet') || lowerName.includes('eth')
                ? 2
                : 3,
        });
      }
    }
  }

  // Sắp xếp theo priority và lấy IP đầu tiên
  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates.length > 0) {
    console.log(
      `[generate-local-ip] Detected IP: ${candidates[0].address} (${candidates[0].name})`,
    );
    return candidates[0].address;
  }

  console.warn('[generate-local-ip] Could not auto-detect IP, falling back to localhost');
  return 'localhost';
}

// Lấy IP và các config
const localIp = getLocalIpAddress();
const developmentEnvPath = path.join(__dirname, '..', '.env.development');
const explicitBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  readEnvFileValue(developmentEnvPath, 'EXPO_PUBLIC_API_BASE_URL');
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '5247';
const apiScheme = process.env.EXPO_PUBLIC_API_SCHEME || 'http';
const apiBaseUrl = explicitBaseUrl || `${apiScheme}://${localIp}:${apiPort}`;

// Generate file TypeScript
const outputPath = path.join(__dirname, '..', 'src', 'config', 'generated-api-config.ts');
const content = `// File được tự động generate bởi scripts/generate-local-ip.js
// KHÔNG CHỈNH SỬA TRỰC TIẾP - file sẽ bị overwrite khi chạy 'npm run start'
// Generated at: ${new Date().toISOString()}

/**
 * API Host IP được auto-detect từ network interfaces của máy dev
 */
export const GENERATED_API_HOST = '${localIp}';

/**
 * Port của backend API
 */
export const GENERATED_API_PORT = '${apiPort}';

/**
 * HTTP scheme (http hoặc https)
 */
export const GENERATED_API_SCHEME = '${apiScheme}';

/**
 * Full API Base URL, dùng trực tiếp trong axios/fetch
 */
export const GENERATED_API_BASE_URL = '${apiBaseUrl}';
`;

fs.writeFileSync(outputPath, content, 'utf-8');
console.log(`[generate-local-ip] Generated config: ${outputPath}`);
console.log(`[generate-local-ip] API_BASE_URL: ${apiBaseUrl}`);
