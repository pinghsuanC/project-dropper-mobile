import { MAX_UPLOAD_BYTES } from '@/constants/config';

import { strings } from '@/constants/strings';

import { addPicked, filterQueue, pickProblem, removeFile, type PickedFile, type QueuedFile } from './uploadQueue';

const MB = 1024 ** 2;
const picked = (name: string, size: number | undefined, uri = `file:///cache/${name}`): PickedFile => ({
  name,
  size,
  uri,
  mimeType: 'application/octet-stream',
});
const queued = (name: string, size: number): QueuedFile => ({
  id: `file:///cache/${name}`,
  uri: `file:///cache/${name}`,
  name,
  size,
  status: 'queued',
});

describe('addPicked', () => {
  test('picked files join the end of the queue, queued, in pick order', () => {
    const { queue, tooLarge, unknownSize } = addPicked([queued('a.txt', 1)], [picked('b.jpg', 2 * MB), picked('c.pdf', 845)]);
    expect(queue.map((f) => f.name)).toEqual(['a.txt', 'b.jpg', 'c.pdf']);
    expect(queue[1]).toMatchObject({ name: 'b.jpg', size: 2 * MB, status: 'queued', mimeType: 'application/octet-stream' });
    expect(tooLarge).toEqual([]);
    expect(unknownSize).toEqual([]);
  });

  test('each file gets its own id', () => {
    const { queue } = addPicked([], [picked('a.txt', 1), picked('b.txt', 2)]);
    expect(new Set(queue.map((f) => f.id)).size).toBe(2);
  });

  test('a file over the limit is never added, and is reported; the others are added', () => {
    const big = picked('family-video.mov', 2.4 * 1024 * MB);
    const { queue, tooLarge } = addPicked([], [picked('a.txt', 1), big]);
    expect(queue.map((f) => f.name)).toEqual(['a.txt']);
    expect(tooLarge).toEqual([big]);
  });

  test('exactly the limit is allowed; one byte more is not', () => {
    const { queue, tooLarge } = addPicked([], [picked('max.bin', MAX_UPLOAD_BYTES), picked('over.bin', MAX_UPLOAD_BYTES + 1)]);
    expect(queue.map((f) => f.name)).toEqual(['max.bin']);
    expect(tooLarge.map((f) => f.name)).toEqual(['over.bin']);
  });

  test('every too-large file is reported', () => {
    const { tooLarge } = addPicked([], [picked('a.mov', 200 * MB), picked('b.mov', 300 * MB)]);
    expect(tooLarge.map((f) => f.name)).toEqual(['a.mov', 'b.mov']);
  });

  test('a file without a size is not added, and is reported', () => {
    const { queue, unknownSize } = addPicked([], [picked('mystery', undefined)]);
    expect(queue).toEqual([]);
    expect(unknownSize.map((f) => f.name)).toEqual(['mystery']);
  });

  test('a file already queued (same name and size) is skipped silently', () => {
    const { queue, tooLarge } = addPicked([queued('a.txt', 10)], [picked('a.txt', 10, 'file:///cache/other/a.txt')]);
    expect(queue).toHaveLength(1);
    expect(tooLarge).toEqual([]);
  });

  test('the same file twice in one pick is added once', () => {
    const { queue } = addPicked([], [picked('a.txt', 10, 'file:///1/a.txt'), picked('a.txt', 10, 'file:///2/a.txt')]);
    expect(queue).toHaveLength(1);
  });

  test('same name, other size: a different file, added', () => {
    const { queue } = addPicked([queued('a.txt', 10)], [picked('a.txt', 11, 'file:///other/a.txt')]);
    expect(queue).toHaveLength(2);
  });
});

test('removeFile removes only that file', () => {
  const queue = [queued('a.txt', 1), queued('b.txt', 2)];
  expect(removeFile(queue, queue[0].id).map((f) => f.name)).toEqual(['b.txt']);
});

test('filterQueue keeps the files whose name matches', () => {
  const queue = [queued('holiday-photo.jpg', 1), queued('report-final.pdf', 2)];
  expect(filterQueue(queue, 'PHOTO').map((f) => f.name)).toEqual(['holiday-photo.jpg']);
  expect(filterQueue(queue, '')).toEqual(queue);
});

describe('pickProblem', () => {
  const u = strings.upload;
  const none: PickedFile[] = [];

  test('nothing left out: no popup', () => {
    expect(pickProblem({ tooLarge: none, unknownSize: none })).toBeNull();
  });

  test('one too large: names it, with its size and the limit', () => {
    expect(pickProblem({ tooLarge: [picked('family-video.mov', 2.4 * 1024 * MB)], unknownSize: none })).toEqual({
      kind: 'error',
      message: u.tooLargeOne('family-video.mov', '2.4 GB', '100 MB'),
    });
  });

  test('several too large: counts them', () => {
    const tooLarge = [picked('a.mov', 200 * MB), picked('b.mov', 300 * MB)];
    expect(pickProblem({ tooLarge, unknownSize: none })?.message).toBe(u.tooLargeMany(2, '100 MB'));
  });

  test('one without a size: names it', () => {
    expect(pickProblem({ tooLarge: none, unknownSize: [picked('mystery', undefined)] })?.message).toBe(
      u.unknownSizeOne('mystery'),
    );
  });

  test('several without a size: counts them', () => {
    const unknownSize = [picked('a', undefined), picked('b', undefined), picked('c', undefined)];
    expect(pickProblem({ tooLarge: none, unknownSize })?.message).toBe(u.unknownSizeMany(3));
  });

  test('both kinds in one pick: too large wins', () => {
    expect(pickProblem({ tooLarge: [picked('a.mov', 200 * MB)], unknownSize: [picked('b', undefined)] })?.message).toBe(
      u.tooLargeOne('a.mov', '200 MB', '100 MB'),
    );
  });
});
