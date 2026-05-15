const DEFAULT_BUSINESS_TIME_ZONE = process.env.APP_DEFAULT_TIME_ZONE || 'Asia/Ho_Chi_Minh';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidTimeZone(timeZoneId) {
  if (!String(timeZoneId || '').trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(timeZoneId).trim() }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function resolveBusinessTimeZone(timeZoneId) {
  const explicit = String(timeZoneId || process.env.APP_TIME_ZONE || process.env.APP_DEFAULT_TIME_ZONE || '').trim();
  return isValidTimeZone(explicit) ? explicit : DEFAULT_BUSINESS_TIME_ZONE;
}

function toBusinessDateOnly(date = new Date(), timeZoneId) {
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
}

function addDaysToDateOnly(dateOnly, days) {
  const normalized = String(dateOnly || '').trim();
  const match = DATE_ONLY_PATTERN.exec(normalized);
  if (!match) {
    throw new Error(`Invalid dateOnly value: ${normalized || '<empty>'}`);
  }

  const [, year, month, day] = match;
  const shifted = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + Number(days || 0), 12));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function shiftBusinessDate(daysOffset, timeZoneId) {
  return addDaysToDateOnly(toBusinessDateOnly(new Date(), timeZoneId), daysOffset);
}

module.exports = {
  DEFAULT_BUSINESS_TIME_ZONE,
  addDaysToDateOnly,
  isValidTimeZone,
  resolveBusinessTimeZone,
  shiftBusinessDate,
  toBusinessDateOnly,
};
