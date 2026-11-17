// Home's greeting and date line (context/details/1060).
import { strings } from '@/constants/strings';
import { dateText, greetingText, localDayNumber, partOfDay } from '@/lib/greeting';

const at = (hours: number, minutes = 0) => new Date(2026, 10, 13, hours, minutes); // Fri 13 Nov 2026

describe('partOfDay', () => {
  it.each([
    [0, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ] as const)('%i:00 → %s', (hour, part) => {
    expect(partOfDay(hour)).toBe(part);
  });
});

describe('greetingText', () => {
  it('uses the part of day and the user name', () => {
    expect(greetingText(at(9), 'Alex')).toBe(strings.home.greeting.morning('Alex'));
    expect(greetingText(at(14, 30), 'Alex')).toBe(strings.home.greeting.afternoon('Alex'));
    expect(greetingText(at(20), 'Alex')).toBe(strings.home.greeting.evening('Alex'));
  });

  it('switches at exactly 12:00 and 18:00', () => {
    expect(greetingText(at(11, 59), 'Alex')).toBe(strings.home.greeting.morning('Alex'));
    expect(greetingText(at(12, 0), 'Alex')).toBe(strings.home.greeting.afternoon('Alex'));
    expect(greetingText(at(18, 0), 'Alex')).toBe(strings.home.greeting.evening('Alex'));
  });

  it.each([null, ''])('no user name (%j) → "friend"', (userName) => {
    expect(greetingText(at(14), userName)).toBe(strings.home.greeting.afternoon(strings.home.friend));
  });
});

describe('dateText', () => {
  it('weekday, short month and day, as in the prototype', () => {
    expect(dateText(at(9))).toBe('Friday, Nov 13');
  });
});

describe('localDayNumber', () => {
  it('is the same all day and one more the next day', () => {
    expect(localDayNumber(at(0, 0))).toBe(localDayNumber(new Date(2026, 10, 13, 23, 59)));
    expect(localDayNumber(new Date(2026, 10, 14, 0, 0)) - localDayNumber(at(23, 59))).toBe(1);
  });

  it('counts days since 1970-01-01', () => {
    expect(localDayNumber(new Date(1970, 0, 1, 12))).toBe(0);
    expect(localDayNumber(new Date(1970, 0, 2, 0))).toBe(1);
  });
});
