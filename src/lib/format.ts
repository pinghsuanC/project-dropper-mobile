// File sizes, types, times and names in file lists (2010 FileList), as the prototype's `fmtSize`
// and `trimName` show them. Pure functions: callers pass `now`, so tests decide the time.
import { DATE_LOCALE, FILE_NAME_MAX } from '@/constants/config';
import { strings } from '@/constants/strings';
import { localDayNumber } from '@/lib/greeting';

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** "845 B", "2.1 KB", "2.3 MB": one decimal, without a trailing ".0". */
export function formatSize(bytes: number): string {
  let unit = 0;
  let value = bytes;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return strings.format.size[UNITS[unit]](text);
}

/** "4:12 PM": the time of day (Upload's status bar, and "Today …" in file lists). */
export function formatTime(date: Date): string {
  // ICU puts a narrow no-break space before AM/PM; show a plain one.
  return date.toLocaleTimeString(DATE_LOCALE, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ');
}

/** "Today 4:12 PM", "Yesterday", "Nov 10", or "Nov 10, 2025" for an earlier year. */
export function formatWhen(unixSeconds: number, now: Date): string {
  const then = new Date(unixSeconds * 1000);
  const daysAgo = localDayNumber(now) - localDayNumber(then);
  if (daysAgo === 0) return strings.format.today(formatTime(then));
  if (daysAgo === 1) return strings.format.yesterday;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "JPG" for "photo.jpg": the extension after the last dot, in capitals; none without one. */
export function fileType(name: string): string | undefined {
  const dot = name.lastIndexOf('.');
  // No dot, a leading dot only (".gitignore") or a trailing dot: no extension.
  if (dot <= 0 || dot === name.length - 1) return undefined;
  return name.slice(dot + 1).toUpperCase();
}

/** Names over FILE_NAME_MAX characters are cut and end in "…". Counts characters, not UTF-16 units. */
export function trimName(name: string): string {
  const characters = Array.from(name);
  return characters.length > FILE_NAME_MAX ? characters.slice(0, FILE_NAME_MAX).join('') + '…' : name;
}
