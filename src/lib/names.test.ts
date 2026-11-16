// The name filter both Register fields use (context/details/1050).
import { cleanName } from '@/lib/names';

test('keeps letters, digits, spaces, - and _', () => {
  expect(cleanName('Pixel 8_pro-2')).toBe('Pixel 8_pro-2');
});

test('keeps letters of any language', () => {
  expect(cleanName('José 名前 Мария')).toBe('José 名前 Мария');
});

test('keeps combining marks (an accent typed as its own character, Hindi vowel signs)', () => {
  expect(cleanName('José')).toBe('José');
  expect(cleanName('हिंदी')).toBe('हिंदी');
});

test('drops punctuation, symbols and emoji', () => {
  expect(cleanName('Al!ex@#.$ 📱 phone')).toBe('Alex phone');
});

test('collapses repeated spaces into one', () => {
  expect(cleanName('My   Android  phone')).toBe('My Android phone');
});

test('drops tabs and line breaks', () => {
  expect(cleanName('My\tphone\n')).toBe('Myphone');
});

test("doesn't trim, so a space can be typed between words", () => {
  expect(cleanName('Alex ')).toBe('Alex ');
  expect(cleanName(' Alex')).toBe(' Alex');
});
