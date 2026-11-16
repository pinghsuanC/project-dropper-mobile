import { ApiError, detailText, request, UnreachableError } from '@/api/client';
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
