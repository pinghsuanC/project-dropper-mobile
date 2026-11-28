// The headers that belong only to our API server (1100), in one place, like the desktop's
// `api_session.py`. Today that's the Cloudflare Access service token. They go only on requests
// whose origin (scheme + host + port) is the API server's: never to R2's presigned URLs, and
// never to any other host the app may call later. The values are never logged or put in an error.
import type { CloudflareAccess } from '@/api/types';
import { apiBaseUrl, CLOUDFLARE_HEADERS } from '@/constants/config';

/**
 * The Cloudflare Access values, in memory. Start-up loads them from secure storage, and the
 * server-config screen sets them after saving (lib/serverConfig.ts).
 * null = send none (local dev, or not configured yet).
 */
let cloudflareAccess: CloudflareAccess | null = null;

export function setCloudflareAccess(access: CloudflareAccess | null): void {
  cloudflareAccess = access;
}

const DEFAULT_PORTS: Record<string, string> = { http: '80', https: '443' };

/** `scheme://authority` at the start, with the authority up to the path, query or fragment. */
const ORIGIN_PATTERN = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i;

/**
 * "scheme://host:port", lower-cased, with the default port filled in, or null when `url` isn't an
 * absolute http(s) URL. Parsed by hand: React Native's `URL` doesn't reliably give the scheme
 * and host. User info stays in the host (`<api host>@attacker.com` keeps its `@`), so such a URL
 * can never equal the API server's origin.
 */
function originOf(url: string): string | null {
  const match = ORIGIN_PATTERN.exec(url.trim());
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  const authority = match[2].toLowerCase();
  const defaultPort = DEFAULT_PORTS[scheme];
  if (!defaultPort || !authority) return null;

  // host, or host:port ([::1]:8000 keeps its brackets)
  const portMatch = /^(.*?)(?::(\d*))?$/.exec(authority)!;
  const host = portMatch[1];
  const port = portMatch[2] || defaultPort;
  if (!host) return null;
  return `${scheme}://${host}:${port}`;
}

/**
 * True only for our API server. Compares the origin, not a string prefix, so a host like
 * `<api host>.attacker.com` doesn't match. False when no server address is configured.
 */
export function isApiUrl(url: string): boolean {
  let base: string;
  try {
    base = apiBaseUrl();
  } catch {
    return false;
  }
  const apiOrigin = originOf(base);
  return apiOrigin !== null && originOf(url) === apiOrigin;
}

/**
 * `headers` plus the API server's own headers when `url` is the API server, as a new object.
 * `access` replaces the stored values when given (null = none), so the server-config check can
 * try scanned values before saving them. A header the caller already set is kept.
 */
export function withApiHeaders(
  url: string,
  headers: Record<string, string>,
  access: CloudflareAccess | null = cloudflareAccess,
): Record<string, string> {
  const result = { ...headers };
  if (!access || !isApiUrl(url)) return result;

  const taken = new Set(Object.keys(result).map((name) => name.toLowerCase()));
  const extra: Record<string, string> = {
    [CLOUDFLARE_HEADERS.clientId]: access.clientId,
    [CLOUDFLARE_HEADERS.accessKey]: access.accessKey,
  };
  for (const [name, value] of Object.entries(extra)) {
    if (value && !taken.has(name.toLowerCase())) result[name] = value;
  }
  return result;
}
