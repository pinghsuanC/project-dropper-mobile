// Quote of the day (context/details/1060): picked from assets/quotes.json by calendar day.
import { quoteForDate } from '@/lib/quotes';

import quotes from '../../assets/quotes.json';

const day = (d: number, hours = 9) => new Date(2026, 10, d, hours);

it('gives a quote from the list', () => {
  expect(quotes.map((q) => q.text)).toContain(quoteForDate(day(13)).text);
});

it('the same quote all day', () => {
  expect(quoteForDate(day(13, 0)).text).toBe(quoteForDate(day(13, 23)).text);
});

it('the next day gives the next quote', () => {
  const i = quotes.findIndex((q) => q.text === quoteForDate(day(13)).text);
  expect(quoteForDate(day(14)).text).toBe(quotes[(i + 1) % quotes.length].text);
});

it('wraps around after the last quote', () => {
  const texts = Array.from({ length: quotes.length + 1 }, (_, n) => quoteForDate(day(1 + n)).text);
  expect(texts.at(-1)).toBe(texts[0]);
  expect(new Set(texts.slice(0, quotes.length)).size).toBe(quotes.length);
});
