// The connection shown in a screen's status bar (Upload 1090, Server status 1070): Home's
// check, with "Checking…" held for MIN_CHECKING_MS.
import { act, renderHook } from '@testing-library/react-native';

import { MIN_CHECKING_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import { checkConnection } from '@/lib/homeCheck';
import { connectionSegment, useConnection } from '@/lib/useConnection';

jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn() }));
const checkMock = jest.mocked(checkConnection);
const c = strings.connection;
const wait = (ms: number) => act(async () => jest.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  jest.useFakeTimers();
  checkMock.mockReset().mockResolvedValue('paired');
});
afterEach(() => jest.useRealTimers());

test('checks once on mount: "checking", then the result no sooner than MIN_CHECKING_MS', async () => {
  const { result } = await renderHook(() => useConnection(false));
  expect(checkMock).toHaveBeenCalledTimes(1);
  await wait(MIN_CHECKING_MS - 1);
  expect(result.current.connection).toBe('checking');
  await wait(1);
  expect(result.current.connection).toBe('paired');
});

test('skipped (a testing-menu look): connected at once, no check', async () => {
  const { result } = await renderHook(() => useConnection(true));
  expect(result.current.connection).toBe('paired');
  expect(checkMock).not.toHaveBeenCalled();
});

test('recheck: "checking" again, then the new result', async () => {
  checkMock.mockResolvedValue('serverError');
  const { result } = await renderHook(() => useConnection(false));
  await wait(MIN_CHECKING_MS);
  expect(result.current.connection).toBe('serverError');
  checkMock.mockResolvedValue('unpaired');
  await act(async () => void result.current.recheck());
  expect(result.current.connection).toBe('checking');
  await wait(MIN_CHECKING_MS);
  expect(result.current.connection).toBe('unpaired');
  expect(checkMock).toHaveBeenCalledTimes(2);
});

test('a result after unmount changes nothing and causes no error', async () => {
  const errors = jest.spyOn(console, 'error');
  const { unmount } = await renderHook(() => useConnection(false));
  await unmount();
  await wait(MIN_CHECKING_MS);
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test.each([
  ['checking', c.checking, false],
  ['paired', c.connected, true],
  ['unpaired', c.notConnected, false],
  ['serverError', c.serverError, false],
] as const)('the status bar segment for %s: %s, green dot %s', (connection, text, dot) => {
  expect(connectionSegment(connection)).toEqual({ text, dot });
});
