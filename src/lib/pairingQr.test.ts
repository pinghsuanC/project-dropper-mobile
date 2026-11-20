// Reading the PC's pairing QR code (context/details/1080): JSON with `pairing_token`
// (the server repo's API.md). Anything else isn't a pairing code.
import { pairingTokenFrom } from '@/lib/pairingQr';

test('JSON with pairing_token → the token', () => {
  expect(pairingTokenFrom('{"pairing_token":"abc-123_XYZ"}')).toBe('abc-123_XYZ');
});

test('other keys, like server_url, are ignored', () => {
  expect(pairingTokenFrom(JSON.stringify({ server_url: 'http://elsewhere:8000', pairing_token: 'tok' }))).toBe('tok');
});

test.each([
  ['plain text', 'pairing-code-123'],
  ['a URL', 'https://example.com/?pairing_token=tok'],
  ['broken JSON', '{"pairing_token":'],
  ['a JSON string', '"tok"'],
  ['a JSON array', '["tok"]'],
  ['JSON null', 'null'],
  ['no token', '{"server_url":"http://pc:8000"}'],
  ['the desktop\'s pairing_code only', '{"pairing_code":"tok"}'],
  ['an empty token', '{"pairing_token":""}'],
  ['a blank token', '{"pairing_token":"   "}'],
  ['a number token', '{"pairing_token":123}'],
  ['an empty string', ''],
])('%s → null', (_label, text) => {
  expect(pairingTokenFrom(text)).toBeNull();
});
