// Home's connection check (context/details/1060): GET /auth/me confirms the session and that
// the server answers, then the paired device decides the look.
import { checkConnection } from '@/lib/homeCheck';
import { getSession } from '@/state/session';

jest.mock('@/constants/config', () => ({
  ...jest.requireActual('@/constants/config'),
  apiBaseUrl: () => 'http://server.test:8000',
}));

const mockGetPairedDevice = jest.fn();
jest.mock('@/api/devices', () => ({ getPairedDevice: () => mockGetPairedDevice() }));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}
const meOk = () => respond(200, { message: 'ok', data: { device_id: 'dev-1', name: 'Pixel', platform: 'android' } });
const PC = { device_id: '5f0c7a8e-1111-4222-8333-944445555666', name: 'DESKTOP-01', platform: 'desktop', paired_at: 1794363500 };

beforeEach(() => {
  fetchMock.mockReset();
  mockGetPairedDevice.mockReset().mockResolvedValue(PC);
  getSession().reset();
  getSession().setToken('secret-token');
});

it('calls GET /auth/me with the session token', async () => {
  meOk();
  await checkConnection();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://server.test:8000/auth/me');
  expect(init.headers.Authorization).toBe('Bearer secret-token');
});

it('paired: returns "paired" and puts the PC in the session', async () => {
  meOk();
  expect(await checkConnection()).toBe('paired');
  expect(getSession().pairedWith).toEqual({ pcName: 'DESKTOP-01' });
});

it('not paired (device null): returns "unpaired" and clears pairedWith', async () => {
  getSession().setPairedWith({ pcName: 'OLD-PC' });
  mockGetPairedDevice.mockResolvedValue(null);
  meOk();
  expect(await checkConnection()).toBe('unpaired');
  expect(getSession().pairedWith).toBeNull();
});

it.each([401, 403, 500])('/auth/me answers %i: "serverError", paired device not asked', async (status) => {
  respond(status, { detail: 'x' });
  expect(await checkConnection()).toBe('serverError');
  expect(mockGetPairedDevice).not.toHaveBeenCalled();
});

it('server unreachable: "serverError", never throws', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(checkConnection()).resolves.toBe('serverError');
});

it('getPairedDevice fails: "serverError", pairedWith unchanged', async () => {
  getSession().setPairedWith({ pcName: 'OLD-PC' });
  mockGetPairedDevice.mockRejectedValue(new Error('boom'));
  meOk();
  expect(await checkConnection()).toBe('serverError');
  expect(getSession().pairedWith).toEqual({ pcName: 'OLD-PC' });
});
