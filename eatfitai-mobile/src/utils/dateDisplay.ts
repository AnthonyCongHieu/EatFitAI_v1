const VI_LOCALE = 'vi-VN';
const DATE_CHIP_LABELS = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'] as const;
const DEFAULT_RELATIVE_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
};
const SHORT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};
const SHORT_WEEKDAY_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
};
const MONTH_YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};
const WEEK_RANGE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
};

export interface RelativeDateLabelOptions {
  includeTomorrow?: boolean;
  fallbackOptions?: Intl.DateTimeFormatOptions;
  now?: Date;
  todayLabel?: string;
  yesterdayLabel?: string;
  tomorrowLabel?: string;
}

export const isSameCalendarDay = (left: Date, right: Date): boolean => {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
};

export const formatDateChipLabel = (date: Date): string => {
  return DATE_CHIP_LABELS[date.getDay()] ?? DATE_CHIP_LABELS[0];
};

export const formatRelativeDateLabel = (
  date: Date,
  options: RelativeDateLabelOptions = {},
): string => {
  const now = options.now ?? new Date();

  if (isSameCalendarDay(date, now)) {
    return options.todayLabel ?? 'H\u00f4m nay';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) {
    return options.yesterdayLabel ?? 'H\u00f4m qua';
  }

  if (options.includeTomorrow) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (isSameCalendarDay(date, tomorrow)) {
      return options.tomorrowLabel ?? 'Ng\u00e0y mai';
    }
  }

  return date.toLocaleDateString(VI_LOCALE, options.fallbackOptions ?? DEFAULT_RELATIVE_DATE_OPTIONS);
};

export const formatShortTime = (date: Date): string => {
  return date.toLocaleTimeString(VI_LOCALE, SHORT_TIME_OPTIONS);
};

export const formatShortWeekdayLabel = (date: Date): string => {
  return date.toLocaleDateString(VI_LOCALE, SHORT_WEEKDAY_OPTIONS);
};

export const formatWeekRangeLabel = (startDate: Date | string): string => {
  const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return `${start.toLocaleDateString(VI_LOCALE, WEEK_RANGE_OPTIONS)} - ${end.toLocaleDateString(VI_LOCALE, WEEK_RANGE_OPTIONS)}`;
};

export const formatMonthYearLabel = (date: Date): string => {
  return date.toLocaleDateString(VI_LOCALE, MONTH_YEAR_OPTIONS);
};
