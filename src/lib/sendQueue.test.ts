// Sending the Upload queue (1090): checksum each file, one prepare-batch-upload, a PUT per file
// one at a time, then finish-batch-upload with the files whose PUT worked. It reports into the
// session store (so it outlives the screen) and never throws. Part 3: every file not confirmed
// ends `failed` with a "sent of total" outcome; `sendQueue('failed')` is Retry failed; a send
// whose run was replaced (a reset) writes nothing more.
import { ApiError, UnreachableError } from '@/api/client';
import { finishBatchUpload, prepareBatchUpload } from '@/api/files';
import { putFile, UploadError } from '@/api/upload';
import { DEFAULT_CONTENT_TYPE } from '@/constants/config';
import { fileChecksum } from '@/lib/crypto';
import { sendQueue } from '@/lib/sendQueue';
import type { QueuedFile } from '@/lib/uploadQueue';
import { getSession } from '@/state/session';

jest.mock('@/api/files', () => ({ prepareBatchUpload: jest.fn(), finishBatchUpload: jest.fn() }));
jest.mock('@/api/upload', () => ({ ...jest.requireActual('@/api/upload'), putFile: jest.fn() }));
jest.mock('@/lib/crypto', () => ({ fileChecksum: jest.fn() }));
// "Preparing…" is held for MIN_PREPARING_MS; 0 here, except where a test holds it.
let mockMinPreparing = 0;
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'MIN_PREPARING_MS', {
    get: () => mockMinPreparing,
  }),
);

const prepareMock = jest.mocked(prepareBatchUpload);
const finishMock = jest.mocked(finishBatchUpload);
const putMock = jest.mocked(putFile);
const checksumMock = jest.mocked(fileChecksum);

const PC = 'pc-device-id';
const file = (name: string, size: number, mimeType?: string): QueuedFile => ({
  id: `file:///cache/${name}`,
  uri: `file:///cache/${name}`,
  name,
  size,
  mimeType,
  status: 'queued',
});
const A = file('a.png', 100, 'image/png');
const B = file('b.bin', 200);
const C = file('c.txt', 300, 'text/plain');
const hashOf = (uri: string) => uri.slice(-1).repeat(64);
const urlOf = (ref: string) => `https://r2.test/${ref}?sig=secret`;
const idOf = (ref: string) => `id-${ref}`;

/** prepare answers for every requested file, in request order. */
function prepareEchoes() {
  prepareMock.mockImplementation(async (_receiver, files) =>
    files.map((f) => ({ client_ref: f.client_ref, file_id: idOf(f.client_ref), upload_url: urlOf(f.client_ref) })),
  );
}

const session = () => getSession();
const queue = () => session().uploadQueue;
/** The running count as the screen shows it (the run id left out). */
const count = () => {
  const sending = session().uploadSending;
  return sending && { current: sending.current, total: sending.total };
};

beforeEach(() => {
  jest.resetAllMocks();
  mockMinPreparing = 0;
  session().reset();
  session().setPairedWith({ pcName: 'PC', deviceId: PC });
  session().setUploadQueue([A, B, C]);
  checksumMock.mockImplementation(async (uri) => hashOf(uri));
  prepareEchoes();
  putMock.mockResolvedValue(undefined);
  finishMock.mockImplementation(async (ids) => ids);
});

describe('the requests', () => {
  test('one prepare-batch-upload to the paired PC, client_ref q0… in queue order', async () => {
    await sendQueue();
    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(prepareMock).toHaveBeenCalledWith(PC, [
      { client_ref: 'q0', file_name: 'a.png', size: 100, content_type: 'image/png', checksum: hashOf(A.uri) },
      { client_ref: 'q1', file_name: 'b.bin', size: 200, content_type: DEFAULT_CONTENT_TYPE, checksum: hashOf(B.uri) },
      { client_ref: 'q2', file_name: 'c.txt', size: 300, content_type: 'text/plain', checksum: hashOf(C.uri) },
    ]);
  });

  test("each file's checksum is taken from its own uri", async () => {
    await sendQueue();
    expect(checksumMock.mock.calls.map(([uri]) => uri)).toEqual([A.uri, B.uri, C.uri]);
  });

  test('each file is PUT to its own upload_url, matched by client_ref even when the server reorders', async () => {
    prepareMock.mockImplementation(async (_r, files) =>
      [...files].reverse().map((f) => ({ client_ref: f.client_ref, file_id: idOf(f.client_ref), upload_url: urlOf(f.client_ref) })),
    );
    await sendQueue();
    expect(putMock.mock.calls.map(([uri, url]) => [uri, url])).toEqual([
      [A.uri, urlOf('q0')],
      [B.uri, urlOf('q1')],
      [C.uri, urlOf('q2')],
    ]);
  });

  test('PUTs run one at a time: the next starts only after the previous ends', async () => {
    const events: string[] = [];
    putMock.mockImplementation(async (uri) => {
      events.push(`start ${uri}`);
      await Promise.resolve();
      events.push(`end ${uri}`);
    });
    await sendQueue();
    expect(events).toEqual([`start ${A.uri}`, `end ${A.uri}`, `start ${B.uri}`, `end ${B.uri}`, `start ${C.uri}`, `end ${C.uri}`]);
  });

  test('one finish-batch-upload with every file_id, after the last PUT', async () => {
    await sendQueue();
    expect(finishMock).toHaveBeenCalledTimes(1);
    expect(finishMock).toHaveBeenCalledWith([idOf('q0'), idOf('q1'), idOf('q2')]);
    expect(finishMock.mock.invocationCallOrder[0]).toBeGreaterThan(putMock.mock.invocationCallOrder[2]);
  });

  test('only queued files are sent; others stay as they are', async () => {
    const failed: QueuedFile = { ...file('old.txt', 5), status: 'failed' };
    session().setUploadQueue([failed, A]);
    await sendQueue();
    expect(prepareMock.mock.calls[0][1].map((f) => f.file_name)).toEqual(['a.png']);
    expect(queue()).toEqual([failed]);
  });
});

describe('progress in the store', () => {
  test('on start every file is waiting and the count reads 0 (preparing)', async () => {
    let seen: { statuses: string[]; sending: unknown } | null = null;
    checksumMock.mockImplementation(async (uri) => {
      seen ??= { statuses: queue().map((f) => f.status), sending: count() };
      return hashOf(uri);
    });
    await sendQueue();
    expect(seen).toEqual({ statuses: ['waiting', 'waiting', 'waiting'], sending: { current: 0, total: 3 } });
  });

  test('during each PUT: that file is sending, the ones after it wait, and the count is n of m', async () => {
    const seen: { names: string[]; statuses: string[]; sending: unknown }[] = [];
    putMock.mockImplementation(async () => {
      seen.push({ names: queue().map((f) => f.name), statuses: queue().map((f) => f.status), sending: count() });
    });
    await sendQueue();
    // A file whose PUT worked leaves the list (upload-in-progress.png: "Sending 2 of 3", 2 rows).
    expect(seen).toEqual([
      { names: ['a.png', 'b.bin', 'c.txt'], statuses: ['sending', 'waiting', 'waiting'], sending: { current: 1, total: 3 } },
      { names: ['b.bin', 'c.txt'], statuses: ['sending', 'waiting'], sending: { current: 2, total: 3 } },
      { names: ['c.txt'], statuses: ['sending'], sending: { current: 3, total: 3 } },
    ]);
  });

  test('a file starts sending at 0%', async () => {
    let progress: number | undefined;
    putMock.mockImplementationOnce(async () => {
      progress = queue()[0].progress;
    });
    await sendQueue();
    expect(progress).toBe(0);
  });

  test("the PUT's progress reaches the file's row", async () => {
    let during: number | undefined;
    putMock.mockImplementationOnce(async (_uri, _url, onProgress) => {
      onProgress(0.4);
      during = queue().find((f) => f.id === A.id)?.progress;
    });
    await sendQueue();
    expect(during).toBe(0.4);
  });
});

describe('all sent', () => {
  test('the files leave the queue, nothing is sending, and the outcome says how many', async () => {
    await sendQueue();
    expect(queue()).toEqual([]);
    expect(session().uploadSending).toBeNull();
    expect(session().uploadOutcome).toEqual({ kind: 'sent', count: 3 });
  });

  test('files added to the store meanwhile are kept, queued', async () => {
    const late = file('late.txt', 9);
    putMock.mockImplementationOnce(async () => {
      session().setUploadQueue((q) => [...q, late]);
    });
    await sendQueue();
    expect(queue()).toEqual([late]);
  });
});

describe('failures: the files not confirmed end Failed, outcome "sent of total"; never throws', () => {
  const allFailed = () => {
    expect(queue().map((f) => `${f.name}:${f.status}`)).toEqual(['a.png:failed', 'b.bin:failed', 'c.txt:failed']);
    expect(queue().every((f) => f.progress === undefined)).toBe(true);
    expect(session().uploadSending).toBeNull();
    expect(session().uploadOutcome).toEqual({ kind: 'partial', sent: 0, total: 3 });
  };

  test('a checksum fails: nothing is prepared or PUT', async () => {
    checksumMock.mockRejectedValueOnce(new Error('unreadable'));
    await expect(sendQueue()).resolves.toBeUndefined();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
    allFailed();
  });

  test.each([
    ['404 receiver gone', new ApiError(404, 'x')],
    ['401', new ApiError(401, 'x')],
    ['403', new ApiError(403, 'x')],
    ['offline', new UnreachableError()],
  ])('prepare fails (%s): nothing is PUT', async (_name, error) => {
    prepareMock.mockRejectedValueOnce(error);
    await expect(sendQueue()).resolves.toBeUndefined();
    expect(putMock).not.toHaveBeenCalled();
    expect(finishMock).not.toHaveBeenCalled();
    allFailed();
  });

  test('prepare answers without a file: none is PUT', async () => {
    prepareMock.mockResolvedValueOnce([{ client_ref: 'q0', file_id: 'id-q0', upload_url: urlOf('q0') }]);
    await sendQueue();
    expect(putMock).not.toHaveBeenCalled();
    allFailed();
  });

  test('one PUT fails: the others still go and are sent; that one ends Failed, "2 of 3"', async () => {
    putMock.mockImplementation(async (uri) => {
      if (uri === B.uri) throw new UploadError(403);
    });
    await sendQueue();
    expect(putMock).toHaveBeenCalledTimes(3);
    expect(finishMock).toHaveBeenCalledWith([idOf('q0'), idOf('q2')]);
    expect(queue()).toEqual([{ ...B, status: 'failed' }]);
    expect(session().uploadSending).toBeNull();
    expect(session().uploadOutcome).toEqual({ kind: 'partial', sent: 2, total: 3 });
  });

  test('while the next file sends, a failed one reads Waiting (not sending, no ✕)', async () => {
    let seen: string[] = [];
    putMock.mockImplementation(async (uri) => {
      if (uri === A.uri) throw new UploadError(500);
      seen = queue().map((f) => `${f.name}:${f.status}`);
    });
    await sendQueue();
    expect(seen).toEqual(['a.png:waiting', 'c.txt:sending']);
  });

  test('every PUT fails: finish is not called', async () => {
    putMock.mockRejectedValue(new UploadError(null));
    await sendQueue();
    expect(finishMock).not.toHaveBeenCalled();
    allFailed();
  });

  test.each([
    ['409 (an upload missing or the wrong size)', new ApiError(409, 'x')],
    ['404', new ApiError(404, 'x')],
    ['offline', new UnreachableError()],
  ])('finish fails, %s: strict, none marked, so every file ends Failed, "0 of 3"', async (_name, error) => {
    finishMock.mockRejectedValueOnce(error);
    await sendQueue();
    allFailed();
  });

  test('finish confirms fewer files than sent: the rest end Failed, "1 of 3"', async () => {
    finishMock.mockResolvedValueOnce([idOf('q0')]);
    await sendQueue();
    expect(queue()).toEqual([
      { ...B, status: 'failed' },
      { ...C, status: 'failed' },
    ]);
    expect(session().uploadOutcome).toEqual({ kind: 'partial', sent: 1, total: 3 });
  });

  test('failed files come first, in their order; files that were not part of the send follow', async () => {
    const late = file('late.txt', 9);
    putMock.mockImplementationOnce(async () => {
      session().setUploadQueue((q) => [...q, late]);
    });
    finishMock.mockRejectedValueOnce(new ApiError(409, 'x'));
    await sendQueue();
    expect(queue().map((f) => `${f.name}:${f.status}`)).toEqual([
      'a.png:failed',
      'b.bin:failed',
      'c.txt:failed',
      'late.txt:queued',
    ]);
  });
});

describe("Retry failed: sendQueue('failed')", () => {
  const failed = (f: QueuedFile): QueuedFile => ({ ...f, status: 'failed' });

  test('sends only the failed files, as a new send (fresh checksum and prepare)', async () => {
    const fresh = file('new.txt', 7);
    session().setUploadQueue([failed(A), fresh, failed(C)]);
    await sendQueue('failed');
    expect(checksumMock.mock.calls.map(([uri]) => uri)).toEqual([A.uri, C.uri]);
    expect(prepareMock.mock.calls[0][1].map((f) => [f.client_ref, f.file_name])).toEqual([
      ['q0', 'a.png'],
      ['q1', 'c.txt'],
    ]);
    expect(queue()).toEqual([fresh]);
    expect(session().uploadOutcome).toEqual({ kind: 'sent', count: 2 });
  });

  test('the failed files turn Waiting while it runs', async () => {
    session().setUploadQueue([failed(A), failed(B)]);
    let seen: string[] = [];
    checksumMock.mockImplementationOnce(async (uri) => {
      seen = queue().map((f) => f.status);
      return hashOf(uri);
    });
    await sendQueue('failed');
    expect(seen).toEqual(['waiting', 'waiting']);
  });

  test('a retry that fails again: Failed again, with its own count', async () => {
    session().setUploadQueue([failed(A), failed(B)]);
    putMock.mockImplementation(async (uri) => {
      if (uri === A.uri) throw new UploadError(null);
    });
    await sendQueue('failed');
    expect(queue()).toEqual([failed(A)]);
    expect(session().uploadOutcome).toEqual({ kind: 'partial', sent: 1, total: 2 });
  });

  test('no failed files: nothing is sent', async () => {
    await sendQueue('failed');
    expect(prepareMock).not.toHaveBeenCalled();
    expect(queue()).toEqual([A, B, C]);
  });
});

describe('a reset during a send (the phone sent back to Register) is not undone', () => {
  test('reset before a PUT ends: the send writes nothing more into the store', async () => {
    putMock.mockImplementationOnce(async (_uri, _url, onProgress) => {
      session().reset();
      onProgress(0.5);
    });
    await sendQueue();
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadSending).toBeNull();
    expect(session().uploadOutcome).toBeNull();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(finishMock).not.toHaveBeenCalled();
  });

  test('reset during a PUT that then fails: no later file is sent, nothing written back', async () => {
    putMock.mockImplementationOnce(async () => {
      session().reset();
      throw new UploadError(null);
    });
    await sendQueue();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadSending).toBeNull();
    expect(session().uploadOutcome).toBeNull();
  });

  test("an old send's progress never reaches a file with the same id after a reset", async () => {
    putMock.mockImplementationOnce(async (_uri, _url, onProgress) => {
      session().reset();
      session().setUploadQueue([A]);
      onProgress(0.5);
    });
    await sendQueue();
    expect(session().uploadQueue).toEqual([A]);
  });

  test('reset during finish: nothing written back', async () => {
    finishMock.mockImplementationOnce(async (ids) => {
      session().reset();
      return ids;
    });
    await sendQueue();
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadOutcome).toBeNull();
  });

  test('reset during a prepare that then fails: nothing written back', async () => {
    prepareMock.mockImplementationOnce(async () => {
      session().reset();
      throw new ApiError(401, 'x');
    });
    await sendQueue();
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadOutcome).toBeNull();
  });

  test('reset while preparing: nothing is prepared and nothing written back', async () => {
    checksumMock.mockImplementationOnce(async (uri) => {
      session().reset();
      return hashOf(uri);
    });
    await sendQueue();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadOutcome).toBeNull();
  });

  test('a new send started after the reset is left alone by the old one', async () => {
    let releaseOld!: () => void;
    putMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseOld = resolve;
        }),
    );
    const old = sendQueue();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    session().reset();
    session().setPairedWith({ pcName: 'PC', deviceId: PC });
    const D = file('d.txt', 4);
    session().setUploadQueue([D]);
    let newRun: unknown;
    putMock.mockImplementationOnce(async () => {
      newRun = session().uploadSending;
      releaseOld();
      await new Promise((r) => setTimeout(r, 0));
      expect(session().uploadSending).toEqual(newRun);
    });
    await sendQueue();
    await old;
    expect(session().uploadOutcome).toEqual({ kind: 'sent', count: 1 });
    expect(queue()).toEqual([]);
  });
});

describe('when there is nothing to do', () => {
  test('not paired: no request, nothing changes', async () => {
    session().setPairedWith(null);
    await sendQueue();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(queue()).toEqual([A, B, C]);
    expect(session().uploadOutcome).toBeNull();
  });

  test('no queued file: no request', async () => {
    session().setUploadQueue([]);
    await sendQueue();
    expect(checksumMock).not.toHaveBeenCalled();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(session().uploadOutcome).toBeNull();
  });

  test('already sending: a second call does nothing', async () => {
    session().setUploadSending({ run: 99, current: 1, total: 2 });
    await sendQueue();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(session().uploadSending).toEqual({ run: 99, current: 1, total: 2 });
  });

  test('a new send clears the last outcome first', async () => {
    session().setUploadOutcome({ kind: 'partial', sent: 1, total: 2 });
    let during: unknown = 'unset';
    checksumMock.mockImplementationOnce(async (uri) => {
      during = session().uploadOutcome;
      return hashOf(uri);
    });
    await sendQueue();
    expect(during).toBeNull();
  });

  test('each send gets its own run id', async () => {
    const runs: number[] = [];
    checksumMock.mockImplementation(async (uri) => {
      runs.push(session().uploadSending?.run ?? -1);
      return hashOf(uri);
    });
    await sendQueue();
    session().setUploadQueue([file('x.txt', 1)]);
    await sendQueue();
    expect(new Set(runs).size).toBe(2);
  });
});

describe('"Preparing…" is held for MIN_PREPARING_MS', () => {
  const HOLD = 600;
  beforeEach(() => {
    mockMinPreparing = HOLD;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  test('even when checksums and prepare answer at once, the first file waits for it', async () => {
    const send = sendQueue();
    await jest.advanceTimersByTimeAsync(HOLD - 1);
    expect(count()).toEqual({ current: 0, total: 3 });
    expect(putMock).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(putMock).toHaveBeenCalled();
    await send;
    expect(session().uploadOutcome).toEqual({ kind: 'sent', count: 3 });
  });

  test('a prepare that fails still fails every file, after the wait', async () => {
    prepareMock.mockRejectedValue(new UnreachableError());
    const send = sendQueue();
    await jest.advanceTimersByTimeAsync(HOLD - 1);
    expect(session().uploadOutcome).toBeNull();
    expect(count()).toEqual({ current: 0, total: 3 });
    await jest.advanceTimersByTimeAsync(1);
    await send;
    expect(session().uploadOutcome).toEqual({ kind: 'partial', sent: 0, total: 3 });
    expect(queue().map((f) => f.status)).toEqual(['failed', 'failed', 'failed']);
  });

  test('a reset during the wait: nothing is sent and nothing written back', async () => {
    const send = sendQueue();
    await jest.advanceTimersByTimeAsync(HOLD / 2);
    session().reset();
    await jest.advanceTimersByTimeAsync(HOLD);
    await send;
    expect(putMock).not.toHaveBeenCalled();
    expect(session().uploadQueue).toEqual([]);
    expect(session().uploadOutcome).toBeNull();
  });
});
