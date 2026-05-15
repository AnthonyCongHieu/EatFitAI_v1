export const DEFAULT_BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
let configuredBusinessTimeZoneId: string | null = null;

export const isValidTimeZone = (timeZoneId?: string | null): timeZoneId is string => {
  if (!timeZoneId || !timeZoneId.trim()) {
    return false;
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: timeZoneId.trim() }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
};

export const getDeviceTimeZone = (): string => {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(resolved) ? resolved.trim() : DEFAULT_BUSINESS_TIME_ZONE;
};

export const setBusinessTimeZoneId = (timeZoneId?: string | null): string => {
  configuredBusinessTimeZoneId = isValidTimeZone(timeZoneId)
    ? timeZoneId.trim()
    : DEFAULT_BUSINESS_TIME_ZONE;
  return configuredBusinessTimeZoneId;
};

export const getBusinessTimeZoneId = (): string => {
  return configuredBusinessTimeZoneId ?? getDeviceTimeZone();
};

export const resolveBusinessTimeZone = (timeZoneId?: string | null): string => {
  if (isValidTimeZone(timeZoneId)) {
    return timeZoneId.trim();
  }

  return getBusinessTimeZoneId();
};

export const formatBusinessDate = (
  date: Date = new Date(),
  timeZoneId?: string | null,
): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveBusinessTimeZone(timeZoneId),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to format business date');
  }

  return `${year}-${month}-${day}`;
};

export const addDaysToDateOnly = (dateOnly: string, days: number): string => {
  const match = DATE_ONLY_PATTERN.exec(dateOnly);
  if (!match) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }

  const shifted = parseDateOnlyUtcNoon(dateOnly);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = `${shifted.getUTCMonth() + 1}`.padStart(2, '0');
  const shiftedDay = `${shifted.getUTCDate()}`.padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
};

export const daysBetweenDateOnly = (startDateOnly: string, endDateOnly: string): number => {
  const start = parseDateOnlyUtcNoon(startDateOnly).getTime();
  const end = parseDateOnlyUtcNoon(endDateOnly).getTime();
  return Math.floor((end - start) / 86_400_000);
};

const parseDateOnlyUtcNoon = (dateOnly: string): Date => {
  const match = DATE_ONLY_PATTERN.exec(dateOnly);
  if (!match) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
};
