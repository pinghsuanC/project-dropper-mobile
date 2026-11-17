// `GET /files/sent` (the server repo's API.md): the files this phone sent that the PC hasn't
// downloaded yet. The sender is the session's device; nothing identifies it in the request.
import { getSentFiles } from '@/api/files';
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

const FILES = [
  { file_id: 'f-2', file_name: 'dog.png', size: 21800, status: 'uploaded', receiver_name: 'PC', created_at: 1794363378 },
  { file_id: 'f-1', file_name: 'notes.txt', size: 2150, status: 'pending', receiver_name: 'PC', created_at: 1794360000 },
];

beforeEach(() => {
  fetchMock.mockReset();
  getSession().reset();
  getSession().setToken('secret-token');
});

describe('getSentFiles', () => {
  it('sends GET /files/sent with the session token and no body or sender', async () => {
    respond(200, { message: '2 file(s) waiting.', data: FILES });
    await getSentFiles();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://server.test:8000/files/sent');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(init.body).toBeUndefined();
  });

  it("returns the envelope's data, in the server's order", async () => {
    respond(200, { message: '2 file(s) waiting.', data: FILES });
    expect(await getSentFiles()).toEqual(FILES);
  });

  it('nothing waiting (still 200): an empty list', async () => {
    respond(200, { message: '0 file(s) waiting.', data: [] });
    expect(await getSentFiles()).toEqual([]);
  });

  it.each([401, 403, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(getSentFiles()).rejects.toMatchObject({ name: 'ApiError', status });
  });
});
