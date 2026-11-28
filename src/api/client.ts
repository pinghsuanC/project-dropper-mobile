// The only place that calls fetch (CLAUDE.md "Code conventions"). Adds the auth header from
// the session and, through api/apiHeaders.ts, the Cloudflare Access headers (1100); unwraps the
// envelope, and turns failures into ApiError / CloudflareRefusedError / UnreachableError.
// Error messages never include the URL, the token or the Cloudflare values.
import { withApiHeaders } from '@/api/apiHeaders';
import type { CloudflareAccess, Envelope, ErrorDetail, HealthResponse } from '@/api/types';
import { API_PATHS, apiBaseUrl, CLOUDFLARE_ACCESS_LOGIN_HOST, REQUEST_TIMEOUT_MS } from '@/constants/config';
import { getSession } from '@/state/session';

/** The server answered with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: ErrorDetail,
  ) {
    super(`Server returned ${status}`);
    this.name = 'ApiError';
  }
}

/**
 * Cloudflare Access turned the request away before it reached the server (1100): the stored
 * service token is missing, wrong or expired. Still an ApiError, so code that only knows
 * ApiError treats it as before.
 */
export class CloudflareRefusedError extends ApiError {
  constructor(status: number) {
    super(status, null);
    this.name = 'CloudflareRefusedError';
  }
}

/** No answer: network error, server down, or timeout. */
export class UnreachableError extends Error {
  constructor() {
    super('Server unreachable');
    this.name = 'UnreachableError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Protected route: send `Authorization: Bearer <session token>`. */
  auth?: boolean;
};

/** Call a server route and return its envelope's `data`. */
export async function request<T>(path: string, { method = 'GET', body, auth = false }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getSession().token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const { response, json } = await send(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!isEnvelope<T>(json)) {
    throw new ApiError(response.status, null);
  }
  return json.data;
}

/**
 * `GET /health` (1100): resolves when the server is up and can reach its database. It has no
 * envelope. Sends the stored Cloudflare values, or `access` when given (to try scanned values
 * before saving them; null = none). Throws UnreachableError (no answer), CloudflareRefusedError,
 * or ApiError (a 503, or an answer that isn't `{ "status": "ok" }`).
 */
export async function checkHealth(access?: CloudflareAccess | null): Promise<void> {
  const { response, json } = await send(API_PATHS.health, { method: 'GET', headers: {} }, access);
  if ((json as Partial<HealthResponse> | undefined)?.status !== 'ok') {
    throw new ApiError(response.status, null);
  }
}

type SendInit = { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string };

/**
 * One request to the server: adds Accept and the API server's headers (`access` given replaces
 * the stored Cloudflare values; null = none), times out, reads the JSON and throws on a non-2xx
 * or a Cloudflare refusal. Returns the response and its JSON.
 */
async function send(
  path: string,
  { method, headers, body }: SendInit,
  access?: CloudflareAccess | null,
): Promise<{ response: Response; json: unknown }> {
  const url = apiBaseUrl() + path;
  // `access` undefined falls back to the stored values (withApiHeaders' default); null = none.
  const allHeaders = withApiHeaders(url, { Accept: 'application/json', ...headers }, access);

  const controller = new AbortController();
  // One timer for the whole request: headers *and* body, so a stalled body can't hang.
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url, { method, headers: allHeaders, body, signal: controller.signal });
    } catch {
      throw new UnreachableError();
    }

    const json = await readJson(response, controller.signal);
    if (isCloudflareRefusal(response, json)) {
      throw new CloudflareRefusedError(response.status);
    }
    if (!response.ok) {
      throw new ApiError(response.status, detailOf(json));
    }
    return { response, json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cloudflare Access answered instead of the server (1100): a 401 / 403 without our JSON
 * `detail` (the server's own errors always have one), or a redirect to Access's login page.
 */
function isCloudflareRefusal(response: Response, json: unknown): boolean {
  if (response.url?.includes(CLOUDFLARE_ACCESS_LOGIN_HOST)) return true;
  return (response.status === 401 || response.status === 403) && detailOf(json) === null;
}

/** The parsed body, or undefined when it isn't JSON. A timeout while reading is "unreachable". */
async function readJson(response: Response, signal: AbortSignal): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (signal.aborted) throw new UnreachableError();
    return undefined;
  }
}

/** An error detail as text for a dialog, or undefined when there's none. */
export function detailText(detail: ErrorDetail): string | undefined {
  if (detail === null) return undefined;
  if (typeof detail === 'string') return detail || undefined;
  // A 422 list: one "field: message" line per issue. The leading "body" says nothing to a person.
  const lines = detail.map(({ loc, msg }) => {
    const field = loc.filter((part, i) => !(i === 0 && part === 'body')).join('.');
    return field ? `${field}: ${msg}` : msg;
  });
  return lines.length > 0 ? lines.join('\n') : undefined;
}

function detailOf(json: unknown): ErrorDetail {
  if (typeof json !== 'object' || json === null) return null;
  return (json as { detail?: ErrorDetail }).detail ?? null;
}

function isEnvelope<T>(json: unknown): json is Envelope<T> {
  return typeof json === 'object' && json !== null && 'data' in json;
}
