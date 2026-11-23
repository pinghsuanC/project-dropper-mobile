import {
  ApiError,
  checkHealth,
  CloudflareRefusedError,
  detailText,
  request,
  setCloudflareAccess,
  UnreachableError,
} from '@/api/client';
import { REQUEST_TIMEOUT_MS } from '@/constants/config';
import { getSession } from '@/state/session';

jest.mock('@/constants/config', () => ({
  ...jest.requireActual('@/constants/config'),
  apiBaseUrl: () => 'http://server.test:8000',
}));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function lastCall(): { url: string; init: RequestInit & { headers: Record<string, string> } } {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, init };
}

beforeEach(() => {
  fetchMock.mockReset();
  getSession().reset();
  setCloudflareAccess(null);
});

describe('successful requests', () => {
  it('prefixes the base URL, sends JSON and unwraps the envelope', async () => {
    respond(201, { message: 'ok', data: { device_id: 'abc' } });
    const data = await request<{ device_id: string }>('/auth/register', {
      method: 'POST',
      body: { name: 'Pixel' },
    });
    expect(data).toEqual({ device_id: 'abc' });
    const { url, init } = lastCall();
    expect(url).toBe('http://server.test:8000/auth/register');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Pixel' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('sends GET without a body by default', async () => {
    respond(200, { message: 'ok', data: { status: 'ok' } });
    await request('/some/path');
    const { init } = lastCall();
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});

describe('auth header', () => {
  it('adds the session token on protected calls', async () => {
    getSession().setToken('secret-token');
    respond(200, { message: 'ok', data: {} });
    await request('/protected', { auth: true });
    expect(lastCall().init.headers.Authorization).toBe('Bearer secret-token');
  });

  it('never sends the token on unprotected calls', async () => {
    getSession().setToken('secret-token');
    respond(200, { message: 'ok', data: {} });
    await request('/auth/challenge', { method: 'POST', body: {} });
    expect(lastCall().init.headers.Authorization).toBeUndefined();
  });

  it('sends no header on a protected call when there is no token', async () => {
    respond(200, { message: 'ok', data: {} });
    await request('/protected', { auth: true });
    expect(lastCall().init.headers.Authorization).toBeUndefined();
  });
});

describe('errors', () => {
  it.each([400, 401, 403, 404, 409])('%i throws ApiError with the detail', async (status) => {
    respond(status, { detail: `failed ${status}` });
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, detail: `failed ${status}` });
  });

  it('keeps a 422 detail as a list', async () => {
    const detail = [{ loc: ['body', 'device_id'], msg: 'Field required', type: 'missing' }];
    respond(422, { detail });
    await expect(request('/x')).rejects.toMatchObject({ status: 422, detail });
  });

  it('detailText: a string detail as is', () => {
    expect(detailText('Public key already registered')).toBe('Public key already registered');
  });

  it('detailText: a 422 list as "loc: msg" lines, without the leading "body"', () => {
    const detail = [
      { loc: ['body', 'public_key'], msg: 'Field required', type: 'missing' },
      { loc: ['body', 'files', 0, 'size'], msg: 'Input should be a valid integer', type: 'int_parsing' },
    ];
    expect(detailText(detail)).toBe('public_key: Field required\nfiles.0.size: Input should be a valid integer');
  });

  it('detailText: a 422 entry with only "body" in its loc is just the message', () => {
    expect(detailText([{ loc: ['body'], msg: 'Invalid JSON', type: 'json_invalid' }])).toBe('Invalid JSON');
  });

  it('detailText: nothing for a null or empty detail', () => {
    expect(detailText(null)).toBeUndefined();
    expect(detailText('')).toBeUndefined();
    expect(detailText([])).toBeUndefined();
  });

  it('uses a null detail when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    await expect(request('/x')).rejects.toMatchObject({ status: 500, detail: null });
  });

  it.each([
    ['has no detail field', { error: 'boom' }],
    ['is JSON null', null],
  ])('uses a null detail when the error JSON %s', async (_label, body) => {
    respond(500, body);
    await expect(request('/x')).rejects.toMatchObject({ status: 500, detail: null });
  });

  it('throws ApiError when a 2xx body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, detail: null });
  });

  it('throws ApiError when a 2xx body has no envelope', async () => {
    respond(200, { status: 'ok' });
    await expect(request('/x')).rejects.toMatchObject({ status: 200, detail: null });
  });

  it('throws UnreachableError when the body stalls past the timeout', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => ({
        ok: true,
        status: 200,
        // Headers arrived; the body never finishes until the request is aborted.
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () =>
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
            );
          }),
      }));
      // Attach the expectation first: the promise rejects while the timers advance.
      const outcome = expect(request('/x')).rejects.toBeInstanceOf(UnreachableError);
      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await outcome;
    } finally {
      jest.useRealTimers();
    }
  });

  it('throws UnreachableError when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(request('/x')).rejects.toBeInstanceOf(UnreachableError);
  });

  it('throws UnreachableError when the request times out', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () =>
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
            );
          }),
      );
      const pending = request('/x');
      jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
      await expect(pending).rejects.toBeInstanceOf(UnreachableError);
    } finally {
      jest.useRealTimers();
    }
  });

  it('never puts the token or the URL in an error message', async () => {
    getSession().setToken('secret-token');
    respond(401, { detail: 'expired' });
    const error = (await request('/protected', { auth: true }).catch((e: unknown) => e)) as Error;
    expect(error.message).not.toContain('secret-token');
    expect(error.message).not.toContain('server.test');
  });
});

// --- Cloudflare Access (1100) ------------------------------------------------------------

const ACCESS = { clientId: 'id.access', accessKey: 'cf-secret-key' };

/** A response that isn't JSON (Cloudflare's own pages are HTML). */
function respondHtml(status: number, url = 'http://server.test:8000/x') {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    url,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  });
}

describe('Cloudflare Access headers', () => {
  it('adds both headers to a public route when values are set', async () => {
    setCloudflareAccess(ACCESS);
    respond(200, { message: 'ok', data: {} });
    await request('/auth/challenge', { method: 'POST', body: {} });
    expect(lastCall().init.headers['CF-Access-Client-Id']).toBe('id.access');
    expect(lastCall().init.headers['CF-Access-Client-Secret']).toBe('cf-secret-key');
  });

  it('adds both next to Authorization on a protected route', async () => {
    setCloudflareAccess(ACCESS);
    getSession().setToken('secret-token');
    respond(200, { message: 'ok', data: {} });
    await request('/protected', { auth: true });
    const { headers } = lastCall().init;
    expect(headers.Authorization).toBe('Bearer secret-token');
    expect(headers['CF-Access-Client-Id']).toBe('id.access');
    expect(headers['CF-Access-Client-Secret']).toBe('cf-secret-key');
  });

  it('sends neither header when no values are set', async () => {
    respond(200, { message: 'ok', data: {} });
    await request('/x');
    expect(Object.keys(lastCall().init.headers).filter((h) => h.startsWith('CF-'))).toEqual([]);
  });

  it('stops sending them once cleared', async () => {
    setCloudflareAccess(ACCESS);
    setCloudflareAccess(null);
    respond(200, { message: 'ok', data: {} });
    await request('/x');
    expect(lastCall().init.headers['CF-Access-Client-Id']).toBeUndefined();
  });
});

describe('checkHealth', () => {
  it('GETs /health and resolves on 200 { status: "ok" } (no envelope)', async () => {
    respond(200, { status: 'ok' });
    await expect(checkHealth()).resolves.toBeUndefined();
    const { url, init } = lastCall();
    expect(url).toBe('http://server.test:8000/health');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('sends the stored values by default', async () => {
    setCloudflareAccess(ACCESS);
    respond(200, { status: 'ok' });
    await checkHealth();
    expect(lastCall().init.headers['CF-Access-Client-Id']).toBe('id.access');
  });

  it('tries the values it is given, even when none are stored', async () => {
    respond(200, { status: 'ok' });
    await checkHealth({ clientId: 'new-id', accessKey: 'new-key' });
    expect(lastCall().init.headers['CF-Access-Client-Id']).toBe('new-id');
    expect(lastCall().init.headers['CF-Access-Client-Secret']).toBe('new-key');
  });

  it('given null, sends no Cloudflare headers even when some are stored', async () => {
    setCloudflareAccess(ACCESS);
    respond(200, { status: 'ok' });
    await checkHealth(null);
    expect(lastCall().init.headers['CF-Access-Client-Id']).toBeUndefined();
  });

  it('503 (database down) → ApiError(503)', async () => {
    respond(503, { detail: 'database unavailable' });
    await expect(checkHealth()).rejects.toMatchObject({ status: 503, detail: 'database unavailable' });
  });

  it('200 without status "ok" → ApiError', async () => {
    respond(200, { status: 'starting' });
    await expect(checkHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it('no answer → UnreachableError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(checkHealth()).rejects.toBeInstanceOf(UnreachableError);
  });

  it('a Cloudflare refusal → CloudflareRefusedError', async () => {
    respondHtml(403);
    await expect(checkHealth()).rejects.toBeInstanceOf(CloudflareRefusedError);
  });
});

describe('Cloudflare refusals', () => {
  it.each([401, 403])('%i with a page that is not JSON → CloudflareRefusedError', async (status) => {
    respondHtml(status);
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CloudflareRefusedError);
    // Still an ApiError with the status, so code that only knows ApiError keeps working.
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, detail: null });
  });

  it('a redirect to the Cloudflare Access login page → CloudflareRefusedError', async () => {
    respondHtml(200, 'https://myteam.cloudflareaccess.com/cdn-cgi/access/login/server.test');
    await expect(request('/x')).rejects.toBeInstanceOf(CloudflareRefusedError);
  });

  it("the server's own 403 (JSON detail, e.g. revoked) stays an ApiError(403)", async () => {
    respond(403, { detail: 'Device revoked' });
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(CloudflareRefusedError);
    expect(error).toMatchObject({ status: 403, detail: 'Device revoked' });
  });

  it('a 5xx page that is not JSON (e.g. the tunnel is down) is not a refusal', async () => {
    respondHtml(530);
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(CloudflareRefusedError);
    expect(error).toMatchObject({ status: 530 });
  });

  it('never puts the values in an error message', async () => {
    setCloudflareAccess(ACCESS);
    respondHtml(403);
    const error = (await request('/x').catch((e: unknown) => e)) as Error;
    expect(error.message).not.toContain('cf-secret-key');
    expect(error.message).not.toContain('id.access');
    expect(JSON.stringify(error)).not.toContain('cf-secret-key');
  });
});
