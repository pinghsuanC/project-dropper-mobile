// The only place that calls fetch (CLAUDE.md "Code conventions"). Adds the auth header from
// the session, unwraps the envelope, and turns failures into ApiError / UnreachableError.
// Error messages never include the URL or the token.
import type { Envelope, ErrorDetail } from '@/api/types';
import { apiBaseUrl, REQUEST_TIMEOUT_MS } from '@/constants/config';
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
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getSession().token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = apiBaseUrl() + path;
  const controller = new AbortController();
  // One timer for the whole request: headers *and* body, so a stalled body can't hang.
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new UnreachableError();
    }

    const json = await readJson(response, controller.signal);
    if (!response.ok) {
      throw new ApiError(response.status, detailOf(json));
    }
    if (!isEnvelope<T>(json)) {
      throw new ApiError(response.status, null);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
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

function detailOf(json: unknown): ErrorDetail {
  if (typeof json !== 'object' || json === null) return null;
  return (json as { detail?: ErrorDetail }).detail ?? null;
}

function isEnvelope<T>(json: unknown): json is Envelope<T> {
  return typeof json === 'object' && json !== null && 'data' in json;
}
