// app.config.js - Dynamic Expo configuration with auto IP detection
const os = require('os');

/**
 * Tự động tìm địa chỉ IP local của máy host để mobile app có thể kết nối
 * Ưu tiên: IPv4 của WiFi/Ethernet, bỏ qua loopback và virtual adapters
 */
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
                    priority: lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan')
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
        console.log(`[app.config.js] Auto-detected IP: ${candidates[0].address} (${candidates[0].name})`);
        return candidates[0].address;
    }

    console.warn('[app.config.js] Could not auto-detect IP, falling back to localhost');
    return 'localhost';
}

const localIp = getLocalIpAddress();
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '5247';
const apiScheme = process.env.EXPO_PUBLIC_API_SCHEME || 'http';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || `${apiScheme}://${localIp}:${apiPort}`;

module.exports = ({ config }) => {
    console.log(`[app.config.js] API_BASE_URL will be: ${apiBaseUrl}`);

    return {
        ...config,
        extra: {
            ...config.extra,
            // Inject dynamic IP vào extra để env.ts có thể đọc
            apiHost: localIp,
            apiPort: apiPort,
            apiScheme: apiScheme,
            apiBaseUrl: apiBaseUrl,
        },
    };
};
