// Quote of the day (context/details/1060): one quote from assets/quotes.json per calendar day,
// in list order. No server route.
import type { Quote } from '@/state/session';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import quotes from '../../assets/quotes.json';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The quote for the date's local calendar day: the same all day, the next one tomorrow. */
export function quoteForDate(date: Date): Quote {
  // Count days from the local date (UTC of the local y/m/d), so time zones and DST don't
  // move the change away from local midnight.
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  return quotes[day % quotes.length];
}
