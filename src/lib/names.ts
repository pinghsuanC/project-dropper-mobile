// The filter for the user name and the device name (context/details/1050). TextField runs
// it on every change, before its length limit. It doesn't trim: the screen trims on submit,
// so a space can still be typed between words.

/**
 * Anything that isn't a letter (any language), a combining mark (accents typed separately,
 * Indic vowel signs), a digit, a space, `-` or `_`.
 */
const NOT_ALLOWED = /[^\p{L}\p{M}\p{N} _-]/gu;
const REPEATED_SPACES = / {2,}/g;

export function cleanName(text: string): string {
  return text.replace(NOT_ALLOWED, '').replace(REPEATED_SPACES, ' ');
}
