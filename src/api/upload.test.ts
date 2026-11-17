// The PUT of a file's bytes to its presigned `upload_url` (R2, not the API server; 1090).
// No auth header ever goes to R2, the url is never in an error, and a non-2xx answer is a
// failure (expo-file-system's upload resolves on any status).
import * as fileSystem from 'expo-file-system';
import type { UploadOptions } from 'expo-file-system';

import { putFile, UploadError } from '@/api/upload';
import { UPLOAD_STALL_TIMEOUT_MS } from '@/constants/config';
import { getSession } from '@/state/session';

const fs = fileSystem as unknown as typeof import('../../__mocks__/expo-file-system');
const URI = 'file:///cache/report.pdf';
const URL = 'https://r2.test/bucket/key?X-Amz-Signature=secret-sig';

beforeEach(() => {
  fs.mockUpload.mockReset().mockResolvedValue({ status: 200, body: '', headers: {} });
  getSession().reset();
  getSession().setToken('secret-token');
});

test('PUTs the file at the uri to the url, as raw bytes', async () => {
  await putFile(URI, URL, () => {});
  expect(fs.mockUpload).toHaveBeenCalledTimes(1);
  const [uri, url, options] = fs.mockUpload.mock.calls[0];
  expect(uri).toBe(URI);
  expect(url).toBe(URL);
  expect(options?.httpMethod).toBe('PUT');
  expect(options?.uploadType).toBe(fs.UploadType.BINARY_CONTENT);
});

test('sends no Authorization header (the token never goes to R2)', async () => {
  await putFile(URI, URL, () => {});
  const options = fs.mockUpload.mock.calls[0][2];
  expect(JSON.stringify(options?.headers ?? {})).not.toMatch(/authorization|secret-token/i);
});

test('reports progress as 0–1', async () => {
  fs.mockUpload.mockImplementationOnce(async (_uri, _url, options) => {
    options?.onProgress?.({ bytesSent: 25, totalBytes: 100 });
    options?.onProgress?.({ bytesSent: 100, totalBytes: 100 });
    return { status: 200, body: '', headers: {} };
  });
  const progress = jest.fn();
  await putFile(URI, URL, progress);
  expect(progress.mock.calls).toEqual([[0.25], [1]]);
});

test('progress with an unknown total reads 0, never NaN', async () => {
  fs.mockUpload.mockImplementationOnce(async (_uri, _url, options) => {
    options?.onProgress?.({ bytesSent: 10, totalBytes: 0 });
    return { status: 200, body: '', headers: {} };
  });
  const progress = jest.fn();
  await putFile(URI, URL, progress);
  expect(progress).toHaveBeenCalledWith(0);
});

test.each([200, 201, 204])('%i resolves', async (status) => {
  fs.mockUpload.mockResolvedValueOnce({ status, body: '', headers: {} });
  await expect(putFile(URI, URL, () => {})).resolves.toBeUndefined();
});

test.each([400, 403, 500])('%i from R2 is an UploadError with that status', async (status) => {
  fs.mockUpload.mockResolvedValueOnce({ status, body: '<Error>...</Error>', headers: {} });
  await expect(putFile(URI, URL, () => {})).rejects.toMatchObject({ name: 'UploadError', status });
});

test('a failed request (offline, cancelled) is an UploadError with no status', async () => {
  fs.mockUpload.mockRejectedValueOnce(new Error(`network error for ${URL}`));
  await expect(putFile(URI, URL, () => {})).rejects.toMatchObject({ name: 'UploadError', status: null });
});

describe('stall timeout (no progress for UPLOAD_STALL_TIMEOUT_MS cancels the PUT)', () => {
  /** An upload that never ends on its own: it rejects only when its signal aborts. */
  function hangingUpload(onStart?: (options: UploadOptions | undefined) => void) {
    fs.mockUpload.mockImplementationOnce(
      (_uri, _url, options) =>
        new Promise((_resolve, reject) => {
          onStart?.(options);
          options?.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
        }),
    );
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('passes an AbortSignal to the upload', async () => {
    await putFile(URI, URL, () => {});
    expect(fs.mockUpload.mock.calls[0][2]?.signal).toBeInstanceOf(AbortSignal);
  });

  test('no progress for the whole timeout: cancelled, an UploadError with no status', async () => {
    hangingUpload();
    const result = putFile(URI, URL, () => {}).catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS);
    expect(await result).toMatchObject({ name: 'UploadError', status: null });
  });

  test('just under the timeout it keeps going', async () => {
    let signal: AbortSignal | undefined;
    hangingUpload((options) => (signal = options?.signal));
    void putFile(URI, URL, () => {}).catch(() => {});
    await jest.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
  });

  test('each progress report restarts the wait, so a slow but moving upload is not cancelled', async () => {
    let options: UploadOptions | undefined;
    hangingUpload((o) => (options = o));
    void putFile(URI, URL, () => {}).catch(() => {});
    for (let i = 1; i <= 3; i++) {
      await jest.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS - 1);
      options?.onProgress?.({ bytesSent: i, totalBytes: 10 });
    }
    expect(options?.signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS);
    expect(options?.signal?.aborted).toBe(true);
  });

  test('a finished upload leaves no timer behind', async () => {
    await putFile(URI, URL, () => {});
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a failed upload leaves no timer behind', async () => {
    fs.mockUpload.mockRejectedValueOnce(new Error('offline'));
    await putFile(URI, URL, () => {}).catch(() => {});
    expect(jest.getTimerCount()).toBe(0);
  });
});

test('the error never carries the presigned url', async () => {
  fs.mockUpload.mockRejectedValueOnce(new Error(`network error for ${URL}`));
  const error = await putFile(URI, URL, () => {}).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UploadError);
  expect(String(error)).not.toContain('r2.test');
  expect(JSON.stringify(error)).not.toContain('secret-sig');
  expect((error as Error).message).not.toContain('secret-sig');
});
