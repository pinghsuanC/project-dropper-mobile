// Files routes (the server repo's API.md). `GET /files/sent`: the files this phone sent that
// the PC hasn't downloaded yet (the sender is the session's device; nothing identifies it in the
// request). `prepare-batch-upload` / `finish-batch-upload`: sending the Upload queue (1090).
import { finishBatchUpload, getSentFiles, prepareBatchUpload } from '@/api/files';
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

const RECEIVER = '5f0c7a8e-1111-4222-8333-944445555666';
const CHECKSUM = 'ab'.repeat(32);
const BATCH = [
  { client_ref: 'q0', file_name: 'dog.png', size: 21800, content_type: 'image/png', checksum: CHECKSUM },
  { client_ref: 'q1', file_name: 'notes.txt', size: 812, content_type: 'application/octet-stream', checksum: CHECKSUM },
];
const PREPARED = [
  { client_ref: 'q0', file_id: 'f-0', upload_url: 'https://r2.test/put-0?sig=x' },
  { client_ref: 'q1', file_id: 'f-1', upload_url: 'https://r2.test/put-1?sig=y' },
];

describe('prepareBatchUpload', () => {
  it('sends POST /files/prepare-batch-upload with the token and the exact snake_case body', async () => {
    respond(201, { message: '2 upload(s) prepared.', data: { files: PREPARED } });
    await prepareBatchUpload(RECEIVER, BATCH);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://server.test:8000/files/prepare-batch-upload');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body)).toEqual({ receiver_id: RECEIVER, files: BATCH });
  });

  it('returns data.files', async () => {
    respond(201, { message: '2 upload(s) prepared.', data: { files: PREPARED } });
    expect(await prepareBatchUpload(RECEIVER, BATCH)).toEqual(PREPARED);
  });

  it.each([401, 403, 404, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(prepareBatchUpload(RECEIVER, BATCH)).rejects.toMatchObject({ name: 'ApiError', status });
  });
});

describe('finishBatchUpload', () => {
  it('sends POST /files/finish-batch-upload with the token and { file_ids }', async () => {
    respond(200, { message: '2 file(s) uploaded.', data: { file_ids: ['f-0', 'f-1'] } });
    await finishBatchUpload(['f-0', 'f-1']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://server.test:8000/files/finish-batch-upload');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body)).toEqual({ file_ids: ['f-0', 'f-1'] });
  });

  it('returns data.file_ids', async () => {
    respond(200, { message: '1 file(s) uploaded.', data: { file_ids: ['f-0'] } });
    expect(await finishBatchUpload(['f-0'])).toEqual(['f-0']);
  });

  it.each([401, 403, 404, 409, 422])('throws ApiError on %i', async (status) => {
    respond(status, { detail: 'x' });
    await expect(finishBatchUpload(['f-0'])).rejects.toMatchObject({ name: 'ApiError', status });
  });
});
