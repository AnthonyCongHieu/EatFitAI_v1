// app.config.js - Dynamic Expo configuration with auto IP detection
const os = require('os');

/**
 * Tá»± Ä‘á»™ng tÃ¬m Ä‘á»‹a chá»‰ IP local cá»§a mÃ¡y host Ä‘á»ƒ mobile app cÃ³ thá»ƒ káº¿t ná»‘i
 * Æ¯u tiÃªn: IPv4 cá»§a WiFi/Ethernet, bá» qua loopback vÃ  virtual adapters
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;

        // Bá» qua cÃ¡c virtual adapters (Docker, WSL, VirtualBox, etc.)
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
            // Chá»‰ láº¥y IPv4, khÃ´ng pháº£i loopback, vÃ  external
            if (addr.family === 'IPv4' && !addr.internal) {
                candidates.push({
                    name,
                    address: addr.address,
                    // Æ¯u tiÃªn WiFi vÃ  Ethernet
                    priority: lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan')
                        ? 1
                        : lowerName.includes('ethernet') || lowerName.includes('eth')
                            ? 2
                            : 3,
                });
            }
        }
    }

    // Sáº¯p xáº¿p theo priority vÃ  láº¥y IP Ä‘áº§u tiÃªn
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
const e2eAutomation = process.env.EXPO_PUBLIC_E2E_AUTOMATION || '0';

module.exports = ({ config }) => {
    const existingExtra = config.extra || {};
    const existingEas = existingExtra.eas || {};
    const easProjectId =
        process.env.EXPO_EAS_PROJECT_ID ||
        process.env.EAS_PROJECT_ID ||
        existingEas.projectId;

    console.log(`[app.config.js] API_BASE_URL will be: ${apiBaseUrl}`);

    return {
        ...config,
        extra: {
            ...existingExtra,
            eas: {
                ...existingEas,
                projectId: easProjectId,
            },
            // Inject dynamic IP vÃ o extra Ä‘á»ƒ env.ts cÃ³ thá»ƒ Ä‘á»c
            apiHost: localIp,
            apiPort: apiPort,
            apiScheme: apiScheme,
            apiBaseUrl: apiBaseUrl,
            e2eAutomation,
        },
    };
};
