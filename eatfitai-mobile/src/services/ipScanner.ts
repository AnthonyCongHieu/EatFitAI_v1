/**
 * ipScanner.ts - Tự động tìm backend API trong mạng LAN
 * 
 * Scan các dải IP phổ biến và tìm EatFitAI backend qua endpoint /discovery.
 * Hoạt động cả Expo Go và Production build (không cần native module).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PORT = 5247;
const CACHE_KEY = '@eatfitai_api_url';
const DISCOVERY_TIMEOUT = 500; // ms cho mỗi IP
const VERIFY_TIMEOUT = 1500; // ms cho verify cached IP

// Các dải IP phổ biến trong mạng LAN gia đình/văn phòng
const COMMON_SUBNETS = [
    '192.168.100', // Viettel, FPT modem thường dùng
    '192.168.1',   // Router phổ biến
    '192.168.0',   // TP-Link, D-Link
    '10.0.0',      // Một số mạng doanh nghiệp
    '192.168.2',   // Backup subnet
];

// Cache trong memory để không cần đọc AsyncStorage mỗi lần
let cachedUrl: string | null = null;

/**
 * Fetch với timeout để tránh treo app
 */
const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Kiểm tra một IP có phải EatFitAI backend không
 */
const tryIp = async (ip: string): Promise<boolean> => {
    try {
        const res = await fetchWithTimeout(`http://${ip}:${PORT}/discovery`, DISCOVERY_TIMEOUT);
        if (res.ok) {
            const data = await res.json();
            return data.appId === 'eatfitai';
        }
    } catch {
        // IP không có server hoặc không phải EatFitAI - bỏ qua
    }
    return false;
};

/**
 * Scan một subnet (vd: 192.168.1.1 -> 192.168.1.254)
 * Scan theo batch để tăng tốc
 */
const scanSubnet = async (subnet: string): Promise<string | null> => {
    const batchSize = 25; // Scan 25 IP cùng lúc

    for (let start = 1; start <= 254; start += batchSize) {
        const batch = Array.from(
            { length: Math.min(batchSize, 255 - start) },
            (_, i) => `${subnet}.${start + i}`
        );

        const results = await Promise.all(
            batch.map(async (ip) => ((await tryIp(ip)) ? ip : null))
        );

        const foundIp = results.find((ip) => ip !== null);
        if (foundIp) return foundIp;
    }

    return null;
};

/**
 * Verify một URL có còn hoạt động không
 */
export const verifyApiUrl = async (url: string): Promise<boolean> => {
    try {
        const res = await fetchWithTimeout(`${url}/discovery`, VERIFY_TIMEOUT);
        if (res.ok) {
            const data = await res.json();
            return data.appId === 'eatfitai';
        }
    } catch {
        // URL không còn valid
    }
    return false;
};

/**
 * Scan tất cả subnet để tìm backend
 */
export const scanForBackend = async (): Promise<string | null> => {
    console.log('[IPScanner] Bắt đầu scan mạng LAN...');

    for (const subnet of COMMON_SUBNETS) {
        console.log(`[IPScanner] Đang scan ${subnet}.x ...`);
        const ip = await scanSubnet(subnet);

        if (ip) {
            const url = `http://${ip}:${PORT}`;
            // Lưu vào cache
            await AsyncStorage.setItem(CACHE_KEY, url);
            cachedUrl = url;
            console.log(`[IPScanner] ✅ Tìm thấy EatFitAI backend: ${url}`);
            return url;
        }
    }

    console.log('[IPScanner] ❌ Không tìm thấy backend trong các subnet phổ biến');
    return null;
};

/**
 * Lấy API URL - verify cached trước, scan nếu cần
 */
export const getApiUrl = async (): Promise<string | null> => {
    // 1. Thử cached trong memory
    if (cachedUrl) {
        if (await verifyApiUrl(cachedUrl)) {
            return cachedUrl;
        }
        console.log('[IPScanner] Cached URL không còn valid, sẽ scan lại...');
    }

    // 2. Thử từ AsyncStorage
    const saved = await AsyncStorage.getItem(CACHE_KEY);
    if (saved) {
        if (await verifyApiUrl(saved)) {
            cachedUrl = saved;
            console.log(`[IPScanner] Dùng URL từ storage: ${saved}`);
            return saved;
        }
        console.log('[IPScanner] Saved URL không còn valid, sẽ scan lại...');
    }

    // 3. Scan mạng tìm backend
    return scanForBackend();
};

/**
 * Force re-scan - dùng khi user muốn tìm lại
 */
export const forceRescan = async (): Promise<string | null> => {
    console.log('[IPScanner] Force re-scan...');
    cachedUrl = null;
    await AsyncStorage.removeItem(CACHE_KEY);
    return scanForBackend();
};

/**
 * Lấy cached URL (không verify, dùng cho sync access)
 */
export const getCachedApiUrl = (): string | null => cachedUrl;

/**
 * Set URL thủ công (bypass scan)
 */
export const setManualApiUrl = async (url: string): Promise<void> => {
    cachedUrl = url;
    await AsyncStorage.setItem(CACHE_KEY, url);
    console.log(`[IPScanner] URL đặt thủ công: ${url}`);
};
