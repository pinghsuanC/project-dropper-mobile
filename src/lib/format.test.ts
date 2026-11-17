// File sizes, times and names in file lists (2010 FileList), as the prototype shows them.
import { FILE_NAME_MAX } from '@/constants/config';
import { fileType, formatSize, formatWhen, trimName } from '@/lib/format';

const KB = 1024;
const MB = 1024 ** 2;
const GB = 1024 ** 3;

describe('formatSize', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [KB, '1 KB'],
    [2150, '2.1 KB'],
    [845 * KB, '845 KB'],
    [MB - 1, '1024 KB'],
    [MB, '1 MB'],
    [2.3 * MB, '2.3 MB'],
    [48 * MB, '48 MB'],
    [GB, '1 GB'],
    [1.5 * GB, '1.5 GB'],
  ])('%i bytes → %s', (bytes, text) => {
    expect(formatSize(bytes)).toBe(text);
  });
});

describe('formatWhen', () => {
  const NOW = new Date(2026, 10, 13, 18, 0); // Fri 13 Nov 2026, 6 PM
  const at = (date: Date) => Math.floor(date.getTime() / 1000);

  it('today: "Today" and the time', () => {
    expect(formatWhen(at(new Date(2026, 10, 13, 16, 12)), NOW)).toBe('Today 4:12 PM');
    expect(formatWhen(at(new Date(2026, 10, 13, 0, 5)), NOW)).toBe('Today 12:05 AM');
  });

  it('yesterday, from its first to its last minute', () => {
    expect(formatWhen(at(new Date(2026, 10, 12, 23, 59)), NOW)).toBe('Yesterday');
    expect(formatWhen(at(new Date(2026, 10, 12, 0, 0)), NOW)).toBe('Yesterday');
  });

  it('earlier this year: month and day', () => {
    expect(formatWhen(at(new Date(2026, 10, 10, 9, 35)), NOW)).toBe('Nov 10');
    expect(formatWhen(at(new Date(2026, 0, 1)), NOW)).toBe('Jan 1');
  });

  it('an earlier year: with the year', () => {
    expect(formatWhen(at(new Date(2025, 10, 10)), NOW)).toBe('Nov 10, 2025');
  });

  it('just after midnight, a file from just before is "Yesterday"', () => {
    const justAfter = new Date(2026, 10, 14, 0, 1);
    expect(formatWhen(at(new Date(2026, 10, 13, 23, 58)), justAfter)).toBe('Yesterday');
  });
});

describe('trimName', () => {
  it(`keeps names of up to ${FILE_NAME_MAX} characters`, () => {
    expect(trimName('holiday-photo.jpg')).toBe('holiday-photo.jpg');
    expect(trimName('a'.repeat(FILE_NAME_MAX))).toBe('a'.repeat(FILE_NAME_MAX));
  });

  it(`cuts longer names to ${FILE_NAME_MAX} characters and adds "…"`, () => {
    expect(trimName('IMG_20261110_093512.jpg')).toBe('IMG_20261110_093512.…');
  });

  it('counts characters, not UTF-16 units', () => {
    // 15 emoji are 15 characters but 30 UTF-16 units: short enough to keep whole.
    const short = '😀'.repeat(15);
    expect(trimName(short)).toBe(short);
    const long = '😀'.repeat(FILE_NAME_MAX) + '.jpg';
    expect(trimName(long)).toBe('😀'.repeat(FILE_NAME_MAX) + '…');
  });
});

describe('fileType', () => {
  test("the extension after the last dot, in capitals", () => {
    expect(fileType('holiday-photo.jpg')).toBe('JPG');
    expect(fileType('backup.tar.gz')).toBe('GZ');
    expect(fileType('Report.Pdf')).toBe('PDF');
  });

  test('none without an extension: no dot, a leading dot only, or a trailing dot', () => {
    expect(fileType('Makefile')).toBeUndefined();
    expect(fileType('.gitignore')).toBeUndefined();
    expect(fileType('notes.')).toBeUndefined();
  });
});
