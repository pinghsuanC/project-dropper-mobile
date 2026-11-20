// Reading the PC's pairing QR code (context/details/1080). The QR holds JSON with
// `pairing_token` (and `server_url`, which the app doesn't use: it only talks to its own
// server), as in the server repo's API.md.

/** The pairing code in a scanned QR's text, or null when it isn't a pairing QR code. */
export function pairingTokenFrom(text: string): string | null {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const token = (payload as Record<string, unknown>).pairing_token;
  return typeof token === 'string' && token.trim() !== '' ? token : null;
}
