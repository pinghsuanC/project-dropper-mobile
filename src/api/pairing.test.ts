// `POST /pairing-request/claim` (the server repo's API.md): claims the PC's pairing code.
import { ApiError } from '@/api/client';
import { claimPairing } from '@/api/pairing';
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

const PC = { device_id: '5f0c7a8e-1111-4222-8333-944445555666', name: 'PC', platform: 'desktop' };

beforeEach(() => {
  fetchMock.mockReset();
  getSession().reset();
  getSession().setToken('secret-token');
});

describe('claimPairing', () => {
  it('posts exactly { pairing_token } with the session token', async () => {
    respond(200, { message: 'Pairing successfully claimed.', data: { paired_with: PC } });
    await claimPairing('tok-123');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://server.test:8000/pairing-request/claim');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body)).toEqual({ pairing_token: 'tok-123' });
  });

  it('returns paired_with: { device_id, name, platform }', async () => {
    respond(200, { message: 'Pairing successfully claimed.', data: { paired_with: PC } });
    expect(await claimPairing('tok-123')).toEqual(PC);
  });

  it.each([
    [401, 'Not authenticated'],
    [403, 'Device revoked'],
    [404, 'Pairing code is invalid or expired.'],
    [409, 'Already paired with other device. Unpair first.'],
    [409, 'That device is already paired. Unpair it first.'],
    [422, [{ loc: ['body', 'pairing_token'], msg: 'Field required', type: 'missing' }]],
  ])('throws ApiError on %i (%j)', async (status, detail) => {
    respond(status, { detail });
    const error = await claimPairing('tok-123').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status });
  });
});
