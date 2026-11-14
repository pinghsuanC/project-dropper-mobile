import { registerDevice, requestChallenge, verifyChallenge } from '@/api/auth';
import { ApiError } from '@/api/client';
import { getSession } from '@/state/session';

jest.mock('@/constants/config', () => ({
  ...jest.requireActual('@/constants/config'),
  apiBaseUrl: () => 'http://server.test:8000',
}));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

function sent(): { url: string; body: unknown; headers: Record<string, string> } {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, body: JSON.parse(init.body), headers: init.headers };
}

beforeEach(() => {
  fetchMock.mockReset();
  getSession().reset();
  // A token in the session must still never reach the auth routes.
  getSession().setToken('secret-token');
});

describe('requestChallenge', () => {
  it('posts { device_id } and returns the challenge', async () => {
    respond(200, { message: 'Challenge generated.', data: { challenge: 'Y2hhbGxlbmdl' } });
    expect(await requestChallenge('dev-1')).toBe('Y2hhbGxlbmdl');
    const { url, body, headers } = sent();
    expect(url).toBe('http://server.test:8000/auth/challenge');
    expect(body).toEqual({ device_id: 'dev-1' });
    expect(headers.Authorization).toBeUndefined();
  });

  it.each([404, 403, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(requestChallenge('dev-1')).rejects.toMatchObject({ status });
  });
});

describe('verifyChallenge', () => {
  it('posts { device_id, challenge, signature } and returns the token', async () => {
    respond(200, { message: 'Challenge verified.', data: { token: 'new-token' } });
    expect(await verifyChallenge('dev-1', 'Y2hhbGxlbmdl', 'c2ln')).toBe('new-token');
    const { url, body, headers } = sent();
    expect(url).toBe('http://server.test:8000/auth/verify-challenge');
    expect(body).toEqual({ device_id: 'dev-1', challenge: 'Y2hhbGxlbmdl', signature: 'c2ln' });
    expect(headers.Authorization).toBeUndefined();
  });

  it.each([401, 403, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(verifyChallenge('dev-1', 'c', 's')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('registerDevice', () => {
  const input = { name: 'Pixel', publicKey: '-----BEGIN PUBLIC KEY-----\nAAA\n-----END PUBLIC KEY-----\n', fingerprint: 'f'.repeat(64) };

  it('posts the snake_case body with platform "android" and returns device_id', async () => {
    respond(201, { message: 'Registered device', data: { device_id: 'dev-9' } });
    expect(await registerDevice(input)).toBe('dev-9');
    const { url, body, headers } = sent();
    expect(url).toBe('http://server.test:8000/auth/register');
    expect(body).toEqual({
      name: 'Pixel',
      platform: 'android',
      public_key: input.publicKey,
      fingerprint: input.fingerprint,
    });
    expect(headers.Authorization).toBeUndefined();
  });

  it.each([400, 409, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(registerDevice(input)).rejects.toMatchObject({ status });
  });
});
