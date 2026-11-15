import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date as a local calendar date. */
export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses "YYYY-MM-DD" at local noon, which keeps day arithmetic safe across DST changes. */
export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(s: ISODate): number {
  return fromISO(s).getDay();
}

/** First day of the week containing `s`. */
export function weekStart(s: ISODate, weekStartsOn: 0 | 1): ISODate {
  const diff = (dayOfWeek(s) - weekStartsOn + 7) % 7;
  return addDays(s, -diff);
}

/** Combines a local date and "HH:mm" into a Date. */
export function atTime(date: ISODate, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatTime(time: string, locale?: string): string {
  return atTime('2024-01-01', time).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(s: ISODate, opts: Intl.DateTimeFormatOptions, locale?: string): string {
  return fromISO(s).toLocaleDateString(locale, opts);
}
