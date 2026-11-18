// `atLeast` (context/details/1060, 1090): a busy look stays on screen for a minimum time, even
// when the work behind it answers at once.
import { atLeast } from '@/lib/wait';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Whether the promise has settled, seen after letting pending callbacks run. */
async function settled(promise: Promise<unknown>) {
  let done = false;
  promise.then(
    () => (done = true),
    () => (done = true),
  );
  await Promise.resolve();
  await Promise.resolve();
  return done;
}

test('a fast promise: its value, but not before the time has passed', async () => {
  const result = atLeast(Promise.resolve('paired'), 800);
  await jest.advanceTimersByTimeAsync(799);
  expect(await settled(result)).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toBe('paired');
});

test('a slow promise is not held any longer than it takes', async () => {
  let finish!: (value: string) => void;
  const result = atLeast(new Promise<string>((resolve) => (finish = resolve)), 800);
  await jest.advanceTimersByTimeAsync(2000);
  expect(await settled(result)).toBe(false);
  finish('late');
  await expect(result).resolves.toBe('late');
});

test('a rejection is passed on, also not before the time has passed', async () => {
  const error = new Error('offline');
  const result = atLeast(Promise.reject(error), 800);
  // Attach the handler now, so the early rejection isn't reported as unhandled.
  const caught = result.catch((e: unknown) => e);
  await jest.advanceTimersByTimeAsync(799);
  expect(await settled(result)).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await expect(caught).resolves.toBe(error);
});

test('no time to wait: the promise itself, with no timer', async () => {
  const promise = Promise.resolve(1);
  expect(atLeast(promise, 0)).toBe(promise);
  expect(jest.getTimerCount()).toBe(0);
});
