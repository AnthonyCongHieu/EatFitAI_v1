/**
 * ipScanner.ts - Tự động tìm backend API trong mạng LAN
 *
 * Scan các dải IP phổ biến và tìm EatFitAI backend qua endpoint /discovery.
 * Hoạt động cả Expo Go và Production build (không cần native module).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertBackendApiBaseUrl } from '../config/env';
import logger from '../utils/logger';

const PORT = 5247;
const CACHE_KEY = '@eatfitai_api_url';
const DISCOVERY_TIMEOUT = 800; // ms - giảm xuống để scan nhanh hơn
const VERIFY_TIMEOUT = 1500; // ms cho verify cached IP

// Các dải IP phổ biến trong mạng LAN gia đình/văn phòng
const COMMON_SUBNETS = [
  '192.168.1', // Router phổ biến nhất (ưu tiên cao)
  '192.168.0', // TP-Link, D-Link
  '192.168.100', // Viettel, FPT modem thường dùng
  '10.68.11', // Mạng trường học
  '172.16.3', // Mạng công ty/trường học (Class B private)
  '10.0.0', // Một số mạng doanh nghiệp
  '192.168.2', // Backup subnet
  '172.16.0', // Class B private range
  '172.16.1', // Class B private range
  '172.16.2', // Class B private range
];

// IP cuối phổ biến nhất (router thường gán 1-20 cho thiết bị)
// Scan các IP này trước để tìm nhanh hơn
const PRIORITY_LAST_OCTETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 101, 254];

const SCAN_COOLDOWN_MS = 120000; // 2 phút cooldown giữa các lần scan toàn bộ

// Cache trong memory để không cần đọc AsyncStorage mỗi lần
let cachedUrl: string | null = null;
let lastScanTime = 0;
let isScanning = false;
let scanPromise: Promise<string | null> | null = null;
let hasFoundBackend = false; // Flag đánh dấu đã tìm thấy trong session này

/**
 * Fetch với timeout để tránh treo app
 */
const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
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
    const res = await fetchWithTimeout(
      `http://${ip}:${PORT}/discovery`,
      DISCOVERY_TIMEOUT,
    );
    if (res.ok) {
      const data = await res.json();
      if (data.appId === 'eatfitai') {
        logger.info(`[IPScanner] Found backend at ${ip}:${PORT}`);
        return true;
      }
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
      (_, i) => `${subnet}.${start + i}`,
    );

    const results = await Promise.all(
      batch.map(async (ip) => ((await tryIp(ip)) ? ip : null)),
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
 * Preload cached URL từ storage khi khởi động app
 */
export const preloadCachedUrl = async (): Promise<void> => {
  if (cachedUrl) return;
  const saved = await AsyncStorage.getItem(CACHE_KEY);
  if (saved) {
    cachedUrl = saved;
    logger.info(`[IPScanner] Preloaded cached URL: ${saved}`);
  }
};

/**
 * Scan nhanh: thử các IP phổ biến nhất trước
 * Ví dụ: 192.168.1.1, 192.168.1.6, 192.168.0.1, ...
 */
const quickScan = async (): Promise<string | null> => {
  logger.info('[IPScanner] Quick scan các IP phổ biến...');

  // Tạo danh sách IP ưu tiên từ tất cả subnet
  const priorityIps: string[] = [];
  for (const subnet of COMMON_SUBNETS) {
    for (const lastOctet of PRIORITY_LAST_OCTETS) {
      priorityIps.push(`${subnet}.${lastOctet}`);
    }
  }

  // Scan TẤT CẢ IP ưu tiên cùng lúc (khoảng 130 IP, rất nhanh)
  const results = await Promise.all(
    priorityIps.map(async (ip) => ((await tryIp(ip)) ? ip : null)),
  );

  const foundIp = results.find((ip) => ip !== null);
  if (foundIp) {
    const url = `http://${foundIp}:${PORT}`;
    logger.info(`[IPScanner] Quick scan tìm thấy: ${url}`);
    return url;
  }

  return null;
};

/**
 * Scan tất cả subnet để tìm backend (chạy song song các subnet)
 */
const doScan = async (): Promise<string | null> => {
  logger.info('[IPScanner] Bắt đầu scan...');

  try {
    // BƯỚC 1: Quick scan các IP phổ biến trước (< 1 giây)
    const quickResult = await quickScan();
    if (quickResult) {
      await AsyncStorage.setItem(CACHE_KEY, quickResult);
      cachedUrl = quickResult;
      hasFoundBackend = true;
      logger.info(`[IPScanner] Tìm thấy EatFitAI backend: ${quickResult}`);
      return quickResult;
    }

    // BƯỚC 2: Full scan nếu quick scan không tìm thấy
    logger.info('[IPScanner] Quick scan không tìm thấy, full scan...');
    const results = await Promise.all(
      COMMON_SUBNETS.map(async (subnet) => {
        const ip = await scanSubnet(subnet);
        return ip ? `http://${ip}:${PORT}` : null;
      }),
    );

    const foundUrl = results.find((url) => url !== null);

    if (foundUrl) {
      await AsyncStorage.setItem(CACHE_KEY, foundUrl);
      cachedUrl = foundUrl;
      hasFoundBackend = true;
      logger.info(`[IPScanner] Tìm thấy EatFitAI backend: ${foundUrl}`);
      return foundUrl;
    }
  } catch (error) {
    logger.error('[IPScanner] Scan error:', error);
  }

  logger.info('[IPScanner] Không tìm thấy backend trong các subnet phổ biến');
  return null;
};

/**
 * Singleton scan wrapper để tránh chạy nhiều scan cùng lúc
 */
export const scanForBackend = async (): Promise<string | null> => {
  if (!__DEV__) {
    return null;
  }

  const now = Date.now();

  // 1. Kiểm tra cooldown - BYPASS nếu chưa tìm thấy backend
  // Điều này cho phép app tự động quét lại khi IP thay đổi
  if (now - lastScanTime < SCAN_COOLDOWN_MS && !isScanning && hasFoundBackend) {
    logger.info('[IPScanner] Scan đang trong thời gian cooldown, trả về cached...');
    return cachedUrl;
  }

  // Nếu chưa tìm thấy backend, log và tiếp tục scan
  if (!hasFoundBackend) {
    logger.info('[IPScanner] Backend chưa được tìm thấy, bypass cooldown và scan lại...');
  }

  // 2. Nếu đang scan, trả về promise hiện tại
  if (isScanning && scanPromise) {
    logger.info('[IPScanner] Scan đang chạy, waiting...');
    return scanPromise;
  }

  lastScanTime = now;
  isScanning = true;

  scanPromise = doScan().finally(() => {
    isScanning = false;
    scanPromise = null;
  });

  return scanPromise;
};

// Flag đánh dấu đã verify trong session này chưa
let hasVerifiedThisSession = false;

/**
 * Lấy API URL - ưu tiên cache, verify 1 lần khi khởi động
 * Sau khi verify thành công, không cần verify lại trong session
 */
export const getApiUrl = async (): Promise<string | null> => {
  if (!__DEV__) {
    return null;
  }

  // 1. Nếu đã verify thành công trong session này, dùng luôn
  if (hasFoundBackend && cachedUrl) {
    return cachedUrl;
  }

  // 2. Nếu có cachedUrl trong memory và đã verify rồi, dùng luôn
  if (cachedUrl && hasVerifiedThisSession) {
    hasFoundBackend = true;
    return cachedUrl;
  }

  // 3. Thử từ memory hoặc AsyncStorage, verify 1 lần
  const urlToCheck = cachedUrl || (await AsyncStorage.getItem(CACHE_KEY));

  if (urlToCheck) {
    // Verify 1 lần duy nhất trong session
    if (!hasVerifiedThisSession) {
      hasVerifiedThisSession = true;
      const isValid = await verifyApiUrl(urlToCheck);

      if (isValid) {
        cachedUrl = urlToCheck;
        hasFoundBackend = true;
        logger.info(`[IPScanner] URL verified successfully: ${urlToCheck}`);
        return urlToCheck;
      } else {
        logger.warn('[IPScanner] Cached URL invalid, resetting state và scan lại...');
        // Reset TẤT CẢ state để cho phép scan lại ngay lập tức
        cachedUrl = null;
        hasFoundBackend = false;
        lastScanTime = 0; // Reset cooldown
        await AsyncStorage.removeItem(CACHE_KEY);
        // Continue to scan below
      }
    } else {
      // Đã verify trước đó trong session, tin tưởng cache
      cachedUrl = urlToCheck;
      hasFoundBackend = true;
      return urlToCheck;
    }
  }

  // 4. Không có cache hoặc cache invalid, scan mạng
  logger.info('[IPScanner] Bắt đầu scan mạng...');
  return scanForBackend();
};

/**
 * Reset toàn bộ state scan - gọi khi network thay đổi hoặc IP máy chủ thay đổi
 */
export const resetScanState = async (): Promise<void> => {
  if (!__DEV__) {
    return;
  }

  logger.info('[IPScanner] Đang reset toàn bộ scan state...');
  cachedUrl = null;
  hasFoundBackend = false;
  hasVerifiedThisSession = false;
  lastScanTime = 0;
  await AsyncStorage.removeItem(CACHE_KEY);
};

/**
 * Force re-scan - dùng khi user muốn tìm lại
 */
export const forceRescan = async (): Promise<string | null> => {
  if (!__DEV__) {
    return null;
  }

  logger.info('[IPScanner] Force re-scan...');
  await resetScanState();
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
  const safeUrl = assertBackendApiBaseUrl(url, 'Manual API URL');
  cachedUrl = safeUrl;
  await AsyncStorage.setItem(CACHE_KEY, safeUrl);
  logger.info(`[IPScanner] Manual URL set: ${safeUrl}`);
};
