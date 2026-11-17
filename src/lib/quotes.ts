// Quote of the day (context/details/1060): one quote from assets/quotes.json per calendar day,
// in list order. No server route.
import { localDayNumber } from '@/lib/greeting';
import type { Quote } from '@/state/session';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import quotes from '../../assets/quotes.json';

/** The quote for the date's local calendar day: the same all day, the next one tomorrow. */
export function quoteForDate(date: Date): Quote {
  return quotes[localDayNumber(date) % quotes.length];
}
