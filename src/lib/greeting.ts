// Home's greeting and date line (context/details/1060). Pure functions of the time given,
// so tests and the screen's clock decide what "now" is.
import { DATE_LOCALE } from '@/constants/config';
import { strings } from '@/constants/strings';

export type PartOfDay = 'morning' | 'afternoon' | 'evening';

/** Morning before 12:00, afternoon before 18:00, evening after (as in the prototype). */
export function partOfDay(hour: number): PartOfDay {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** "Good afternoon, Alex", or "…, friend" when no user name is stored. */
export function greetingText(now: Date, userName: string | null): string {
  return strings.home.greeting[partOfDay(now.getHours())](userName || strings.home.friend);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The date's local calendar day as a whole number (days since 1970-01-01), counted from the
 * local year, month and day, so DST and time zones never move a day boundary off midnight.
 */
export function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** "Friday, Nov 13". */
export function dateText(now: Date): string {
  return now.toLocaleDateString(DATE_LOCALE, { weekday: 'long', month: 'short', day: 'numeric' });
}
