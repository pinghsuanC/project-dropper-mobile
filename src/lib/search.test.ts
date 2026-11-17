import { matchesName } from './search';

test('an empty or blank search matches everything', () => {
  expect(matchesName('notes.txt', '')).toBe(true);
  expect(matchesName('notes.txt', '   ')).toBe(true);
});

test('matches part of the name, ignoring case and outer spaces', () => {
  expect(matchesName('Holiday-Photo.JPG', ' photo ')).toBe(true);
  expect(matchesName('report-final.pdf', 'FINAL')).toBe(true);
});

test('no match', () => {
  expect(matchesName('notes.txt', 'pdf')).toBe(false);
});
