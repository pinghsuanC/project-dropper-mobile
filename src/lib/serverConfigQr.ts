// Reading the PC's server-config QR code (context/details/1100). The QR holds JSON with only
// the Cloudflare Access service token: `{ cloudflare_client_id, cloudflare_access_key }`. Both
// are null when the PC's env doesn't set them (local dev, no tunnel).
import type { CloudflareAccess } from '@/api/types';

/** What a server-config QR code says: a tunnel with its token, or no tunnel at all. */
export type ServerConfig = { kind: 'tunnel'; access: CloudflareAccess } | { kind: 'noTunnel' };

type Options = {
  /** Accept a code with both values null as "no tunnel". Only on local (CLOUDFLARE_ACCESS_REQUIRED off). */
  allowNoTunnel: boolean;
};

/** The server config in a scanned QR's text, or null when it isn't a server-config code. */
export function serverConfigFrom(text: string, { allowNoTunnel }: Options): ServerConfig | null {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;

  const { cloudflare_client_id: clientId, cloudflare_access_key: accessKey } = payload as Record<string, unknown>;
  if (clientId === null && accessKey === null) return allowNoTunnel ? { kind: 'noTunnel' } : null;
  if (!isFilled(clientId) || !isFilled(accessKey)) return null;
  return { kind: 'tunnel', access: { clientId, accessKey } };
}

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
