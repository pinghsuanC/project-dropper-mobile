// The clock Home re-reads so its greeting, date and quote stay current (1060).
import { act, renderHook } from '@testing-library/react-native';

import { CLOCK_TICK_MS } from '@/constants/config';
import { useNow } from '@/lib/useNow';

const START = new Date(2026, 10, 13, 17, 59, 30);

beforeEach(() => jest.useFakeTimers({ now: START }));
afterEach(() => jest.useRealTimers());

it('starts at the current time', async () => {
  const { result } = await renderHook(() => useNow());
  expect(result.current.getTime()).toBe(START.getTime());
});

it('moves on after each tick', async () => {
  const { result } = await renderHook(() => useNow());
  await act(async () => jest.advanceTimersByTime(CLOCK_TICK_MS));
  expect(result.current.getTime()).toBe(START.getTime() + CLOCK_TICK_MS);
});

it('stops ticking once unmounted', async () => {
  const clear = jest.spyOn(globalThis, 'clearInterval');
  const { unmount } = await renderHook(() => useNow());
  await unmount();
  expect(clear).toHaveBeenCalled();
  clear.mockRestore();
});
