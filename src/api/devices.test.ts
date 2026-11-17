// `GET /devices/paired` (the server repo's API.md): the one device this phone is paired with,
// or null.
import { getPairedDevice } from '@/api/devices';
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

const PC = { device_id: '5f0c7a8e-1111-4222-8333-944445555666', name: 'PC', platform: 'desktop', paired_at: 1794363500 };

beforeEach(() => {
  fetchMock.mockReset();
  getSession().reset();
  getSession().setToken('secret-token');
});

describe('getPairedDevice', () => {
  it('sends GET /devices/paired with the session token', async () => {
    respond(200, { message: 'Paired device found.', data: { device: PC } });
    await getPairedDevice();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://server.test:8000/devices/paired');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(init.body).toBeUndefined();
  });

  it('paired: returns the device { device_id, name, platform, paired_at }', async () => {
    respond(200, { message: 'Paired device found.', data: { device: PC } });
    expect(await getPairedDevice()).toEqual(PC);
  });

  it('not paired (still 200): returns null', async () => {
    respond(200, { message: 'Not paired.', data: { device: null } });
    expect(await getPairedDevice()).toBeNull();
  });

  it.each([401, 403, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(getPairedDevice()).rejects.toMatchObject({ name: 'ApiError', status });
  });
});
